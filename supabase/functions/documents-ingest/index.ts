import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import * as mammoth from "https://esm.sh/mammoth@1.9.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
// Use unpdf for Deno Edge - it doesn't require WebWorkers
import { extractText } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Classification = {
  thematic_area: string | null;
  doc_kind:
    | "normativo"
    | "relatorio"
    | "plano"
    | "avaliacao"
    | "dados_estatisticos"
    | "manual_orientacao"
    | "outro";
  reference_year: number | null;
  published_at: string | null; // YYYY-MM-DD
  valid_from: string | null;
  valid_to: string | null;
  tags_auto: string[];
  keywords_auto: string[];
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getExt(path: string) {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

function normalizeTitleForKey(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function clampList(items: unknown, max = 20): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

async function classifyWithAI(extractedText: string, meta: { title: string; type: string }) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const system =
    "Você é um classificador institucional. Responda APENAS com base no texto fornecido. " +
    "Se um campo não puder ser inferido com segurança, retorne null. " +
    "Não invente dados nem use conhecimento externo.";

  const prompt =
    `Título: ${meta.title}\n` +
    `Tipo/arquivo: ${meta.type}\n\n` +
    "Texto extraído (pode estar truncado):\n" +
    extractedText.slice(0, 20000);

  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "classify_document",
          description: "Classifica e extrai metadados do documento.",
          parameters: {
            type: "object",
            properties: {
              thematic_area: { type: ["string", "null"] },
              doc_kind: {
                type: "string",
                enum: [
                  "normativo",
                  "relatorio",
                  "plano",
                  "avaliacao",
                  "dados_estatisticos",
                  "manual_orientacao",
                  "outro",
                ],
              },
              reference_year: { type: ["integer", "null"] },
              published_at: { type: ["string", "null"], description: "YYYY-MM-DD" },
              valid_from: { type: ["string", "null"], description: "YYYY-MM-DD" },
              valid_to: { type: ["string", "null"], description: "YYYY-MM-DD" },
              tags_auto: { type: "array", items: { type: "string" } },
              keywords_auto: { type: "array", items: { type: "string" } },
            },
            required: [
              "thematic_area",
              "doc_kind",
              "reference_year",
              "published_at",
              "valid_from",
              "valid_to",
              "tags_auto",
              "keywords_auto",
            ],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "classify_document" } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Rate limits exceeded");
    if (resp.status === 402) throw new Error("Payment required");
    const t = await resp.text();
    throw new Error(`AI gateway error (${resp.status}): ${t}`);
  }

  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  const argsStr = call?.function?.arguments;
  if (!argsStr || typeof argsStr !== "string") throw new Error("Missing tool output");

  const parsed = JSON.parse(argsStr);
  const result: Classification = {
    thematic_area: typeof parsed.thematic_area === "string" ? parsed.thematic_area : null,
    doc_kind: parsed.doc_kind ?? "outro",
    reference_year: typeof parsed.reference_year === "number" ? parsed.reference_year : null,
    published_at: typeof parsed.published_at === "string" ? parsed.published_at : null,
    valid_from: typeof parsed.valid_from === "string" ? parsed.valid_from : null,
    valid_to: typeof parsed.valid_to === "string" ? parsed.valid_to : null,
    tags_auto: clampList(parsed.tags_auto),
    keywords_auto: clampList(parsed.keywords_auto),
  };

  return result;
}

async function extractTextFromBuffer(ext: string, buf: ArrayBuffer): Promise<string> {
  // Arquivos de texto simples
  if (["txt", "csv", "md", "markdown", "json", "xml", "html", "htm", "rtf"].includes(ext)) {
    return new TextDecoder("utf-8").decode(new Uint8Array(buf));
  }

  // Excel
  if (ext === "xlsx" || ext === "xls" || ext === "ods") {
    try {
      const wb = XLSX.read(buf, { type: "array" });
      const parts: string[] = [];
      for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        parts.push(`# ${name}\n${csv}`);
      }
      return parts.join("\n\n");
    } catch (e) {
      console.error("Error parsing spreadsheet:", e);
      return "";
    }
  }

  // Word
  if (ext === "docx" || ext === "odt") {
    try {
      const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
      return value ?? "";
    } catch (e) {
      console.error("Error parsing document:", e);
      return "";
    }
  }

  // PDF - usando unpdf que funciona em Deno Edge sem WebWorkers
  if (ext === "pdf") {
    try {
      const result = await extractText(new Uint8Array(buf), { mergePages: true });
      // unpdf returns { text: string } when mergePages is true
      const text = String((result as { text: string }).text ?? "");
      console.log(`PDF extracted: ${text.length} chars`);
      return text;
    } catch (e) {
      console.error("Error parsing PDF with unpdf:", e);
      return "";
    }
  }

  // PowerPoint (extrai texto básico via XLSX que também lê PPTX)
  if (ext === "pptx" || ext === "ppt" || ext === "odp") {
    try {
      // PPTX usa estrutura similar a XLSX internamente
      const wb = XLSX.read(buf, { type: "array" });
      const parts: string[] = [];
      for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) parts.push(csv);
      }
      return parts.join("\n\n") || "[Apresentação - conteúdo não extraído automaticamente]";
    } catch {
      return "[Apresentação - conteúdo não extraído automaticamente]";
    }
  }

  // Outros formatos
  console.log(`Unsupported format: ${ext}`);
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId } = await req.json();
    if (!documentId) return jsonResponse(400, { error: "documentId is required" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return jsonResponse(401, { error: "Missing auth token" });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) return jsonResponse(401, { error: "Invalid session" });
    const userId = userData.user.id;

    const { data: isTi, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "ti",
    });
    if (roleErr) throw roleErr;
    if (!isTi) return jsonResponse(403, { error: "Not authorized" });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: doc, error: docErr } = await admin
      .from("documents")
      .select(
        "id, title, type, unit_id, thematic_area, storage_bucket, storage_path, source_type, source_url",
      )
      .eq("id", documentId)
      .maybeSingle();
    if (docErr) throw docErr;
    if (!doc) return jsonResponse(404, { error: "Document not found" });

    if (!doc.storage_bucket || !doc.storage_path) {
      return jsonResponse(400, { error: "Document has no storage file" });
    }

    const { data: fileBlob, error: dlErr } = await admin.storage
      .from(doc.storage_bucket)
      .download(doc.storage_path);
    if (dlErr) throw dlErr;
    if (!fileBlob) throw new Error("Empty download");

    const buf = await fileBlob.arrayBuffer();
    const ext = getExt(doc.storage_path) || getExt(doc.title) || "";
    const extractedText = await extractTextFromBuffer(ext, buf);

    // Só classifica se houver texto extraído
    let classification: Classification = {
      thematic_area: null,
      doc_kind: "outro",
      reference_year: null,
      published_at: null,
      valid_from: null,
      valid_to: null,
      tags_auto: [],
      keywords_auto: [],
    };

    if (extractedText && extractedText.length > 50) {
      classification = await classifyWithAI(extractedText, {
        title: doc.title,
        type: ext || doc.type,
      });
    }

    const titleKey = normalizeTitleForKey(doc.title);
    const thematic = (classification.thematic_area ?? doc.thematic_area ?? "").toLowerCase();
    const scopeUnit = doc.unit_id ?? null;
    const groupKey = `t:${doc.type}|a:${thematic}|u:${scopeUnit ?? "global"}|k:${titleKey}`;

    // tenta "colar" em um grupo existente quando muito similar
    const { data: similars, error: simErr } = await userClient.rpc("find_similar_documents", {
      _title: doc.title,
      _type: doc.type,
      _thematic_area: classification.thematic_area,
      _unit_id: doc.unit_id,
    });
    if (simErr) throw simErr;

    let finalGroupKey = groupKey;
    const best = Array.isArray(similars) ? similars[0] : null;
    if (best?.id && typeof best.similarity === "number" && best.similarity >= 0.68) {
      const { data: bestRow } = await admin
        .from("documents")
        .select("group_key")
        .eq("id", best.id)
        .maybeSingle();
      if (bestRow?.group_key) finalGroupKey = bestRow.group_key;
    }

    const { error: upErr } = await admin
      .from("documents")
      .update({
        source_type: "file",
        extracted_text: extractedText,
        thematic_area: classification.thematic_area,
        doc_kind: classification.doc_kind,
        reference_year: classification.reference_year,
        published_at: classification.published_at,
        valid_from: classification.valid_from,
        valid_to: classification.valid_to,
        tags_auto: classification.tags_auto,
        keywords_auto: classification.keywords_auto,
        group_key: finalGroupKey,
      })
      .eq("id", doc.id);
    if (upErr) throw upErr;

    // recalcula vigente/substituído
    const { error: refErr } = await userClient.rpc("refresh_document_status_for_group", {
      _group_key: finalGroupKey,
    });
    if (refErr) throw refErr;

    return jsonResponse(200, {
      ok: true,
      extracted_chars: extractedText.length,
      classification,
      group_key: finalGroupKey,
    });
  } catch (e: unknown) {
    console.error("documents-ingest error:", e);
    let msg = "Unknown error";
    if (e instanceof Error) {
      msg = e.message;
    } else if (typeof e === "string") {
      msg = e;
    } else if (e && typeof e === "object" && "message" in e) {
      msg = String((e as any).message);
    } else {
      msg = JSON.stringify(e);
    }
    const status = msg.includes("Rate limits") ? 429 : msg.includes("Payment required") ? 402 : 500;
    return jsonResponse(status, { error: msg });
  }
});
