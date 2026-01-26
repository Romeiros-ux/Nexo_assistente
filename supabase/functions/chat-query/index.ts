import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

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

const SYSTEM_PROMPT = `Você é um assistente institucional especializado em educação municipal.

REGRAS CRÍTICAS:
1. Responda APENAS com base nos documentos fornecidos abaixo.
2. NUNCA use conhecimento externo ou invente informações.
3. Se a informação não estiver nos documentos, diga claramente: "Não encontrei essa informação nos documentos disponíveis."
4. Cite as fontes (nome do documento) quando possível.

FORMATO DA RESPOSTA (use sempre que aplicável):
- Comece com um resumo direto da resposta
- Se houver dados numéricos, apresente-os claramente
- Se a pergunta exigir análise, estruture em tópicos
- Finalize com as fontes consultadas

CONTEXTO DO USUÁRIO:
- Perfil: {role}
- Unidade: {unit}
`;

type DocMatch = {
  id: string;
  title: string;
  extracted_text: string;
  thematic_area: string | null;
  doc_kind: string | null;
  reference_year: number | null;
  rank: number;
};

function looksLikeTotalEmployeesQuestion(query: string) {
  const q = query.toLowerCase();
  const hasEmployees = /(funcion|servidor|colaborador)/.test(q);
  const hasTotal = /(total|quantos|quantidade|soma)/.test(q);
  // Intenção: perguntas sobre total de pessoal (normalmente por secretaria/unidade)
  return hasEmployees && hasTotal;
}

function looksLikeEducationSecretariatQuestion(query: string) {
  const q = query.toLowerCase();
  const hasSecretariat = /\bsecretaria\b/.test(q);
  const hasEducation = /(educa|smec)/.test(q);
  return hasSecretariat && hasEducation;
}

function countLinesContainingNeedle(extractedText: string, needle: string) {
  if (!extractedText) return 0;
  const n = needle.toLowerCase();
  const lines = extractedText.split(/\r?\n/);
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // pula cabeçalho típico
    if (i === 0 && /(matr[íi]cula|nome\s+divis[aã]o|nome\s+cargo)/i.test(line)) continue;
    if (line.toLowerCase().includes(n)) count += 1;
  }
  return count;
}

function trySumCargoQuantCsv(extractedText: string): { total: number; rows: number } | null {
  if (!extractedText) return null;
  const head = extractedText.slice(0, 80).toLowerCase();
  // Heurística: CSV típico do documento "Cargo Atual,Quant."
  if (!head.includes("cargo") || !head.includes("quant")) return null;

  const lines = extractedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  let total = 0;
  let rows = 0;

  // pula cabeçalho
  for (const line of lines.slice(1)) {
    const lastComma = line.lastIndexOf(",");
    if (lastComma === -1) continue;

    const qtyRaw = line.slice(lastComma + 1).trim();
    // Mantém apenas dígitos (aceita "1", "1.234", etc.)
    const qtyDigits = qtyRaw.replace(/[^0-9]/g, "");
    if (!qtyDigits) continue;

    const qty = Number.parseInt(qtyDigits, 10);
    if (!Number.isFinite(qty)) continue;

    total += qty;
    rows += 1;
  }

  if (rows === 0) return null;
  return { total, rows };
}

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function extractPersonNameFromCargoQuestion(query: string): string | null {
  // Ex.: "Qual o cargo do Marcelo ...?" / "Qual é o cargo de ...?"
  const q = query.trim();
  const m = q.match(/\bcargo\b\s+d[oe]\s+(.+?)(?:[\?\.!…]|$)/i);
  if (!m?.[1]) return null;
  const name = normalizeSpaces(m[1]);
  // Evita capturar trechos muito curtos/ruins
  if (name.length < 6) return null;
  return name;
}

function buildSearchNeedles(query: string): string[] {
  const needles: string[] = [];
  const maybeName = extractPersonNameFromCargoQuestion(query);
  if (maybeName) needles.push(maybeName);

  // Captura identificadores numéricos relevantes (ex.: "DECRETO Nº 3.154")
  // Isso é crucial para Diário Oficial: a palavra "decreto" aparece muitas vezes;
  // sem o número, o recorte tende a cair no primeiro decreto do arquivo.
  const decreeMatch = query.match(/\bdecreto\b[^0-9]{0,20}([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{3,})/i);
  if (decreeMatch?.[1]) {
    const raw = normalizeSpaces(decreeMatch[1]);
    const digitsOnly = raw.replace(/\D+/g, "");
    if (raw) needles.push(raw);
    if (digitsOnly && digitsOnly !== raw) needles.push(digitsOnly);
  }

  // Outros números longos na pergunta (ex.: "1822/2018", "3154")
  const numberish = query.match(/\b\d{3,}(?:[\./-]\d{2,4})*\b/g);
  if (numberish && numberish.length > 0) {
    for (const n of numberish.slice(0, 5)) {
      const raw = normalizeSpaces(n);
      const digitsOnly = raw.replace(/\D+/g, "");
      if (raw) needles.push(raw);
      if (digitsOnly && digitsOnly !== raw) needles.push(digitsOnly);
    }
  }

  // fallback: palavras relevantes (evita stopwords curtas)
  const tokens = query
    .toLowerCase()
    .replace(/[^\w\sáéíóúãõâêîôûç]/gi, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    // Mantém palavras (>=4) e também tokens numéricos (>=3) para não perder buscas como "3.154" -> "154".
    .filter((t) => t.length >= 4 || /^\d{3,}$/.test(t))
    .slice(0, 10);

  needles.push(...tokens);

  // Remove duplicados preservando ordem
  return [...new Set(needles.map((n) => normalizeSpaces(n)))].filter(Boolean);
}

function extractLineWindow(text: string, hitIndex: number, linesBefore = 4, linesAfter = 6) {
  // Garante que o índice esteja dentro do texto
  const safeIdx = Math.max(0, Math.min(text.length - 1, hitIndex));

  let start = text.lastIndexOf("\n", safeIdx);
  if (start === -1) start = 0;

  // Expande para algumas linhas antes
  for (let i = 0; i < linesBefore; i++) {
    const prev = text.lastIndexOf("\n", Math.max(0, start - 2));
    if (prev === -1) {
      start = 0;
      break;
    }
    start = prev;
  }

  let end = text.indexOf("\n", safeIdx);
  if (end === -1) end = text.length;

  // Expande para algumas linhas depois
  for (let i = 0; i < linesAfter; i++) {
    const next = text.indexOf("\n", Math.min(text.length, end + 1));
    if (next === -1) {
      end = text.length;
      break;
    }
    end = next;
  }

  const snippet = text.slice(Math.max(0, start), Math.min(text.length, end));
  return snippet.trim();
}

function extractRelevantSnippet(fullText: string, query: string): {
  snippet: string;
  matchedNeedle: string | null;
} {
  if (!fullText) return { snippet: "", matchedNeedle: null };
  const needles = buildSearchNeedles(query);
  const lower = fullText.toLowerCase();

  const isStrongNeedle = (needle: string) => /\d/.test(needle);

  // Prioriza o maior needle (ex.: nome completo), depois o menor índice (mais cedo no texto)
  let best: { needle: string; idx: number } | null = null;
  for (const needle of needles) {
    const n = needle.toLowerCase();
    if (!n || n.length < 4) continue;
    const idx = lower.indexOf(n);
    if (idx === -1) continue;

    if (!best) {
      best = { needle, idx };
      continue;
    }

    // Regras de prioridade:
    // 1) "agulhas" numéricas (ex.: 3.154) ganham de palavras genéricas (ex.: decreto)
    // 2) depois, maior comprimento
    // 3) empate: ocorrência mais cedo no texto
    const strong = isStrongNeedle(needle);
    const bestStrong = isStrongNeedle(best.needle);
    const betterByStrength = strong && !bestStrong;
    const tieStrength = strong === bestStrong;
    const betterByLength = needle.length > best.needle.length;
    const tieByLength = needle.length === best.needle.length;
    const betterByPosition = idx < best.idx;

    if (betterByStrength || (tieStrength && (betterByLength || (tieByLength && betterByPosition)))) {
      best = { needle, idx };
    }
  }

  // Se não achou nada, mantém comportamento anterior (início do documento)
  if (!best) {
    return { snippet: fullText.slice(0, 15000), matchedNeedle: null };
  }

  const snippet = extractLineWindow(fullText, best.idx, 6, 10);
  // Se por algum motivo o texto não tem quebras de linha, aplica janela por caracteres
  if (!snippet) {
    const from = Math.max(0, best.idx - 3000);
    const to = Math.min(fullText.length, best.idx + 6000);
    return { snippet: fullText.slice(from, to), matchedNeedle: best.needle };
  }

  // Hard cap para evitar prompts enormes
  const capped = snippet.length > 15000 ? snippet.slice(0, 15000) : snippet;
  return { snippet: capped, matchedNeedle: best.needle };
}

function tryExtractCargoFromSnippet(personName: string, snippet: string): {
  matricula?: string;
  cargo: string;
  lotacao?: string;
  rawLine: string;
} | null {
  if (!personName || !snippet) return null;
  const lowerName = personName.toLowerCase();
  const lines = snippet.split(/\r?\n/).map((l) => l.trim());
  const hit = lines.find((l) => l.toLowerCase().includes(lowerName));
  if (!hit) return null;

  // Heurística para CSV: matricula,nome,cargo,lotacao
  const cols = hit.split(",").map((c) => c.trim());
  if (cols.length >= 3) {
    const matricula = cols[0] || undefined;
    const cargo = cols[2];
    const lotacao = cols[3] || undefined;
    if (cargo) {
      return { matricula, cargo, lotacao, rawLine: hit };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, conversationId } = await req.json();
    if (!query || typeof query !== "string") {
      return jsonResponse(400, { error: "query is required" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!geminiKey) {
      return jsonResponse(500, { error: "GOOGLE_AI_API_KEY not configured" });
    }

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

    // Obtém contexto do usuário
    const { data: profileData } = await userClient
      .from("profiles")
      .select("full_name, unit_id")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: roleData } = await userClient.rpc("user_primary_role", { _user_id: userId });
    const userRole = roleData || "usuário";
    const userUnit = profileData?.unit_id ? "(unidade vinculada)" : "Global";

    // Atalho: perguntas de total de funcionários.
    // Quando houver um documento no formato "Cargo Atual,Quant.", somamos de forma determinística
    // (evita depender da IA para fazer contas e evita respostas de "não encontrado").
    if (looksLikeEducationSecretariatQuestion(query)) {
      // Para "secretaria de educação", tentamos contar diretamente no cadastro nominal (CSV grande)
      // usando um needle robusto, pois o CSV pode conter vírgulas dentro do nome da divisão.
      const needle = "Secretaria Municipal de Educ";
      const { data: staffDocs } = await userClient
        .from("documents")
        .select("id, title, extracted_text")
        .eq("status", "vigente")
        .or(
          [
            "title.ilike.%Cadastro de trabalhadores%",
            "title.ilike.%Matrícula e cargo%",
            "title.ilike.%Matricula e cargo%",
          ].join(","),
        )
        .limit(3);

      if (Array.isArray(staffDocs) && staffDocs.length > 0) {
        // Preferimos o maior (normalmente o cadastro completo)
        const sorted = [...(staffDocs as any[])].sort(
          (a, b) => String(b.extracted_text ?? "").length - String(a.extracted_text ?? "").length,
        );

        for (const d of sorted) {
          const text = String(d.extracted_text ?? "");
          const count = countLinesContainingNeedle(text, needle);
          if (count <= 0) continue;

          const answer =
            `📌 Resposta\n\n` +
            `Nos documentos fornecidos, foram encontrados **${count}** registro(s) de funcionários vinculados à **Secretaria Municipal de Educação** (linhas contendo "${needle}").\n\n` +
            `Observação: esta contagem é baseada no cadastro nominal (linhas do CSV) e depende exatamente de como a lotação/divisão está preenchida no documento.\n\n` +
            `Fontes consultadas:\n- ${d.title}`;

          return jsonResponse(200, {
            answer,
            sources: [{ documentId: d.id, documentName: d.title }],
          });
        }
      }
      // Se não achou em cadastro nominal, cai no fluxo padrão (IA)
    }

    if (looksLikeTotalEmployeesQuestion(query)) {
      const { data: maybeTotals } = await userClient
        .from("documents")
        .select("id, title, extracted_text")
        .eq("status", "vigente")
        .ilike("extracted_text", "Cargo Atual,Quant%")
        .limit(3);

      if (Array.isArray(maybeTotals) && maybeTotals.length > 0) {
        for (const d of maybeTotals as any[]) {
          const sum = trySumCargoQuantCsv(String(d.extracted_text ?? ""));
          if (!sum) continue;

          // Observação: o documento pode representar o quadro geral; deixamos explícito que o total
          // é o somatório do próprio documento.
          const answer =
            `📌 Resposta\n\n` +
            `Somando a coluna **Quant.** do documento **${d.title}**, o total é **${sum.total}** funcionário(s).\n\n` +
            `Observação: este número é o total *conforme esse documento* (soma das quantidades por cargo).\n\n` +
            `Fontes consultadas:\n- ${d.title}`;

          return jsonResponse(200, {
            answer,
            sources: [{ documentId: d.id, documentName: d.title }],
          });
        }
      }
    }

    // Atalho: perguntas do tipo "Qual o cargo de <NOME>?" podem ser respondidas
    // com busca direta por trecho (sem depender de FTS/recortes do início do arquivo).
    const maybePerson = extractPersonNameFromCargoQuestion(query);
    if (maybePerson) {
      const { data: snips, error: snipErr } = await userClient.rpc("search_document_snippets", {
        _needle: maybePerson,
        _limit: 3,
      });

      if (!snipErr && Array.isArray(snips) && snips.length > 0) {
        // Tenta resposta determinística a partir da linha CSV do trecho
        for (const s of snips) {
          const parsed = tryExtractCargoFromSnippet(maybePerson, String((s as any).snippet ?? ""));
          if (parsed) {
            const answerLines: string[] = [];
            answerLines.push(`Cargo de ${maybePerson}: ${parsed.cargo}.`);
            if (parsed.matricula) answerLines.push(`Matrícula: ${parsed.matricula}.`);
            if (parsed.lotacao) answerLines.push(`Lotação/órgão: ${parsed.lotacao}.`);

            return jsonResponse(200, {
              answer: answerLines.join("\n"),
              sources: snips.map((row: any) => ({ documentId: row.id, documentName: row.title })),
            });
          }
        }

        // Se não conseguiu parsear, usa os trechos como contexto para a IA
        let snippetContext = "";
        const sources = snips.map((row: any) => ({ id: row.id, title: row.title }));
        for (const row of snips as any[]) {
          snippetContext += `\n\n---\nDOCUMENTO: ${row.title}\n`;
          snippetContext += `Trecho localizado por: ${maybePerson}\n`;
          snippetContext += `\nCONTEÚDO (trecho relevante do documento):\n${String(row.snippet ?? "")}\n---`;
        }

        const systemPrompt = SYSTEM_PROMPT.replace("{role}", userRole).replace("{unit}", userUnit);
        const userPrompt = `DOCUMENTOS DISPONÍVEIS:\n${snippetContext}\n\nPERGUNTA DO USUÁRIO:\n${query}\n\nResponda com base APENAS nos documentos acima.`;

        const aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }],
            generationConfig: {
              maxOutputTokens: 2000,
              temperature: 0.7,
            },
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error("AI error:", aiResp.status, errText);
          return jsonResponse(500, { error: "Erro ao processar com IA" });
        }

        const aiData = await aiResp.json();
        const answer = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar uma resposta.";
        return jsonResponse(200, {
          answer,
          sources: sources.map((s) => ({ documentId: s.id, documentName: s.title })),
        });
      }
    }

    // Busca documentos relevantes usando full-text search
    const searchTerms = query
      .toLowerCase()
      .replace(/[^\w\sáéíóúãõâêîôûç]/gi, " ")
      .split(/\s+/)
      .filter((t: string) => t.length > 2)
      .slice(0, 10)
      .join(" & ");

    let docs: DocMatch[] = [];

    if (searchTerms) {
      const { data: ftsData, error: ftsErr } = await userClient
        .from("documents")
        .select("id, title, extracted_text, thematic_area, doc_kind, reference_year")
        .textSearch("content_tsv", searchTerms, { type: "websearch" })
        .eq("status", "vigente")
        .limit(5);

      if (!ftsErr && ftsData) {
        docs = ftsData.map((d: any, i: number) => ({ ...d, rank: i + 1 }));
      }
    }

    // Fallback: busca por ILIKE no conteúdo e no título se FTS não retornar resultados
    if (docs.length === 0) {
      const keywords = query
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 5)
        // Remove sufixos comuns em português para melhorar matching
        .map((k: string) => k.replace(/(ões|ões|ários|ários|ores|ores|ias|ias|es|s)$/gi, ''));

      if (keywords.length > 0) {
        // Busca no conteúdo extraído
        const contentFilters = keywords.map((k: string) => `extracted_text.ilike.%${k}%`);
        // Busca também no título (importante para documentos com nomes descritivos)
        const titleFilters = keywords.map((k: string) => `title.ilike.%${k}%`);
        const allFilters = [...contentFilters, ...titleFilters].join(",");

        const { data: ilikeData } = await userClient
          .from("documents")
          .select("id, title, extracted_text, thematic_area, doc_kind, reference_year")
          .eq("status", "vigente")
          .or(allFilters)
          .limit(5);

        if (ilikeData) {
          docs = ilikeData.map((d: any, i: number) => ({ ...d, rank: i + 1 }));
        }
      }
    }

    // Monta contexto dos documentos
    let documentContext = "";
    const sources: Array<{ id: string; title: string }> = [];

    for (const doc of docs) {
      if (!doc.extracted_text) continue;

      // Em vez de enviar apenas o início do arquivo (o que falha para planilhas/CSVs grandes),
      // buscamos o termo no texto completo e enviamos um recorte relevante.
      const { snippet, matchedNeedle } = extractRelevantSnippet(doc.extracted_text, query);
      const text = snippet;

      documentContext += `\n\n---\nDOCUMENTO: ${doc.title}\n`;
      if (doc.thematic_area) documentContext += `Área: ${doc.thematic_area}\n`;
      if (doc.doc_kind) documentContext += `Tipo: ${doc.doc_kind}\n`;
      if (doc.reference_year) documentContext += `Ano: ${doc.reference_year}\n`;
      if (matchedNeedle) documentContext += `Trecho localizado por: ${matchedNeedle}\n`;
      documentContext += `\nCONTEÚDO (trecho relevante do documento):\n${text}\n---`;
      
      sources.push({ id: doc.id, title: doc.title });
    }

    if (!documentContext.trim()) {
      return jsonResponse(200, {
        answer: "Não encontrei documentos relevantes para responder à sua pergunta. Verifique se os documentos foram cadastrados e processados corretamente.",
        sources: [],
      });
    }

    // Prepara o prompt do sistema
    const systemPrompt = SYSTEM_PROMPT
      .replace("{role}", userRole)
      .replace("{unit}", userUnit);

    const userPrompt = `DOCUMENTOS DISPONÍVEIS:
${documentContext}

PERGUNTA DO USUÁRIO:
${query}

Responda com base APENAS nos documentos acima.`;

    // Chama Google Gemini para processar consulta
    const aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return jsonResponse(429, { error: "Rate limits exceeded. Tente novamente em alguns segundos." });
      }
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      return jsonResponse(500, { error: "Erro ao processar com IA" });
    }

    const aiData = await aiResp.json();
    const answer = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar uma resposta.";

    return jsonResponse(200, {
      answer,
      sources: sources.map((s) => ({ documentId: s.id, documentName: s.title })),
    });
  } catch (e) {
    console.error("chat-query error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse(500, { error: msg });
  }
});
