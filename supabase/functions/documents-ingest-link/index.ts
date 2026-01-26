import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
// Use unpdf for Deno Edge - it doesn't require WebWorkers
import { extractText } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripHtml(html: string) {
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = noScripts.replace(/<[^>]+>/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

// Extensões de arquivo que podemos baixar e processar
const DOWNLOADABLE_EXTS = [
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt",
  "ppt", "pptx", "odt", "ods", "odp", "rtf", "html", "htm",
  "xml", "json", "md", "markdown"
];

function getExtFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.([a-z0-9]+)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function getExtFromContentType(ct: string): string | null {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/rtf": "rtf",
    "text/csv": "csv",
    "text/plain": "txt",
    "text/html": "html",
    "application/xml": "xml",
    "text/xml": "xml",
    "application/json": "json",
    "text/markdown": "md",
  };
  const lower = ct.toLowerCase().split(";")[0].trim();
  return map[lower] ?? null;
}

function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      const absoluteUrl = new URL(href, baseUrl).href;
      const ext = getExtFromUrl(absoluteUrl);
      if (ext && DOWNLOADABLE_EXTS.includes(ext)) {
        links.push(absoluteUrl);
      }
    } catch {
      // URL inválida, ignorar
    }
  }

  // Remove duplicatas
  return [...new Set(links)];
}

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
  published_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  tags_auto: string[];
  keywords_auto: string[];
};

function clampList(items: unknown, max = 20): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

async function classifyWithAI(extractedText: string, meta: { title: string; url: string }) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const system =
    "Você é um classificador institucional. Responda APENAS com base no texto fornecido. " +
    "Se um campo não puder ser inferido com segurança, retorne null. " +
    "Não invente dados nem use conhecimento externo.";

  const prompt =
    `Título: ${meta.title}\n` +
    `URL: ${meta.url}\n\n` +
    "Conteúdo principal capturado (pode estar truncado):\n" +
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

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

async function extractPdfText(arrayBuffer: ArrayBuffer, opts?: { maxPages?: number; maxChars?: number }) {
  const maxChars = opts?.maxChars ?? 200_000;

  try {
    const result = await extractText(new Uint8Array(arrayBuffer), { mergePages: true });
    const text = String((result as { text: string }).text ?? "");
    console.log(`PDF attachment extracted: ${text.length} chars`);
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  } catch (e) {
    console.error("Error parsing PDF attachment:", e);
    return "";
  }
}

async function downloadAndSaveFile(
  admin: any,
  url: string,
  documentId: string,
  index: number
): Promise<{ storagePath: string; ext: string; size: number; extractedText?: string } | null> {
  try {
    console.log(`Downloading file: ${url}`);
    const resp = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Lovable-Ingest/1.0",
        Accept: "*/*",
      },
    });

    if (!resp.ok) {
      console.warn(`Failed to download ${url}: ${resp.status}`);
      return null;
    }

    const contentType = resp.headers.get("content-type") || "";
    let ext = getExtFromUrl(url) || getExtFromContentType(contentType) || "bin";
    
    const blob = await resp.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const size = arrayBuffer.byteLength;

    // Limite de 50MB por arquivo
    if (size > 50 * 1024 * 1024) {
      console.warn(`File too large: ${url} (${size} bytes)`);
      return null;
    }

    const fileName = sanitizeFileName(`attached-${index + 1}.${ext}`);
    const storagePath = `${documentId}/${Date.now()}-${fileName}`;

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(storagePath, new Uint8Array(arrayBuffer), {
        contentType: contentType || undefined,
        upsert: false,
      });

    if (uploadError) {
      console.error(`Upload error for ${url}:`, uploadError.message);
      return null;
    }

    let extractedText: string | undefined;
    if (ext === "pdf") {
      const t = await extractPdfText(arrayBuffer);
      if (t.trim()) extractedText = t;
    }

    console.log(`Saved attached file: ${storagePath}`);
    return { storagePath, ext, size, extractedText };
  } catch (err) {
    console.error(`Error downloading ${url}:`, err);
    return null;
  }
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
      .select("id, title, type, unit_id, source_url")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr) throw docErr;
    if (!doc) return jsonResponse(404, { error: "Document not found" });
    if (!doc.source_url) return jsonResponse(400, { error: "Document has no source_url" });

    let url = String(doc.source_url).trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    console.log(`Processing URL: ${url}`);

    // Primeiro, verificamos se o link é diretamente para um arquivo
    const headResp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "Lovable-Ingest/1.0",
      },
    });

    const contentType = headResp.headers.get("content-type") || "";
    const urlExt = getExtFromUrl(url);
    const ctExt = getExtFromContentType(contentType);
    const isDirectFile = (urlExt && DOWNLOADABLE_EXTS.includes(urlExt) && urlExt !== "html" && urlExt !== "htm") ||
                         (ctExt && !["html", "htm"].includes(ctExt) && DOWNLOADABLE_EXTS.includes(ctExt));

    let extractedText = "";
    let downloadedFiles: Array<{ url: string; storagePath: string; ext: string; size: number; extractedText?: string }> = [];

    if (isDirectFile) {
      // Link direto para arquivo - baixa e salva
      console.log("Detected direct file link, downloading...");
      const saved = await downloadAndSaveFile(admin, url, documentId, 0);
      if (saved) {
        downloadedFiles.push({ url, ...saved });
        
        // Atualiza o documento com o storage path do arquivo principal
        await admin
          .from("documents")
          .update({
            storage_bucket: "documents",
            storage_path: saved.storagePath,
          })
          .eq("id", documentId);

        // Para links diretos (ex.: PDF), já extraímos texto aqui para que entre na busca.
        extractedText = saved.extractedText?.trim()
          ? saved.extractedText
          : `[Arquivo baixado: ${url}]\n\nTipo: ${saved.ext}\nTamanho: ${Math.round(saved.size / 1024)} KB`;
      }
    } else {
      // É uma página HTML - extrai texto e procura arquivos vinculados
      const pageResp = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "Lovable-Ingest/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      const html = await pageResp.text();
      extractedText = stripHtml(html);

      // Extrai links para arquivos
      const fileLinks = extractLinksFromHtml(html, url);
      console.log(`Found ${fileLinks.length} downloadable file links`);

      // Baixa até 10 arquivos anexados (limite para não sobrecarregar)
      const maxFiles = Math.min(fileLinks.length, 10);
      for (let i = 0; i < maxFiles; i++) {
        const fileUrl = fileLinks[i];
        const saved = await downloadAndSaveFile(admin, fileUrl, documentId, i);
        if (saved) {
          downloadedFiles.push({ url: fileUrl, ...saved });
        }
      }

      // Adiciona informação sobre arquivos baixados ao texto extraído
      if (downloadedFiles.length > 0) {
        extractedText += "\n\n--- Arquivos anexados baixados ---\n";
        downloadedFiles.forEach((f, i) => {
          extractedText += `${i + 1}. ${f.url} (${f.ext}, ${Math.round(f.size / 1024)} KB)\n`;
        });
      }

      // Inclui o conteúdo dos PDFs anexados (capado) para que sejam pesquisáveis.
      // (Sem isso, o documento do link só indexa a página HTML e não o conteúdo dos PDFs.)
      const MAX_TOTAL_APPEND = 500_000;
      for (const f of downloadedFiles) {
        if (!f.extractedText?.trim()) continue;
        if (extractedText.length >= MAX_TOTAL_APPEND) break;
        const remaining = MAX_TOTAL_APPEND - extractedText.length;
        const chunk = f.extractedText.slice(0, Math.max(0, remaining - 1000));
        extractedText += `\n\n--- ANEXO PDF: ${f.url} ---\n${chunk}\n---`;
      }
    }

    const classification = await classifyWithAI(extractedText, { title: doc.title, url });
    const titleKey = normalizeTitleForKey(doc.title);
    const thematic = (classification.thematic_area ?? "").toLowerCase();
    const groupKey = `t:${doc.type}|a:${thematic}|u:${doc.unit_id ?? "global"}|k:${titleKey}`;

    const { error: upErr } = await admin
      .from("documents")
      .update({
        source_type: "link",
        source_url: url,
        extracted_text: extractedText,
        thematic_area: classification.thematic_area,
        doc_kind: classification.doc_kind,
        reference_year: classification.reference_year,
        published_at: classification.published_at,
        valid_from: classification.valid_from,
        valid_to: classification.valid_to,
        tags_auto: classification.tags_auto,
        keywords_auto: classification.keywords_auto,
        group_key: groupKey,
        attached_files_count: downloadedFiles.length,
      })
      .eq("id", doc.id);
    if (upErr) throw upErr;

    const { error: refErr } = await userClient.rpc("refresh_document_status_for_group", {
      _group_key: groupKey,
    });
    if (refErr) throw refErr;

    return jsonResponse(200, {
      ok: true,
      extracted_chars: extractedText.length,
      classification,
      group_key: groupKey,
      downloaded_files: downloadedFiles.length,
      files: downloadedFiles.map((f) => ({ url: f.url, ext: f.ext, size: f.size })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("Rate limits") ? 429 : msg.includes("Payment required") ? 402 : 500;
    return jsonResponse(status, { error: msg });
  }
});
