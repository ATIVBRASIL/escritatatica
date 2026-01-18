import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as decodeJwt } from "https://deno.land/x/djwt@v2.9/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Carimbo de versão (mude quando quiser confirmar em logs)
const FUNCTION_VERSION = "2026-01-18_v2";

type ReqBody = {
  prompt: string;
  forceLevel?: string | number;
  occurredAt?: string;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function safeReadText(resp: Response) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

function nowInBrazil(): { iso: string; formatted: string } {
  const now = new Date();

  const iso = now.toISOString();

  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  return { iso, formatted };
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function getUserIdFromJwt(token: string): string | null {
  try {
    const payload: any = decodeJwt(token);
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

async function listModels(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const resp = await fetch(url, { method: "GET" });

  const text = await safeReadText(resp);
  if (!resp.ok) throw new Error(`ListModels HTTP ${resp.status}: ${text}`);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`ListModels: resposta não-JSON: ${text}`);
  }

  return Array.isArray(data?.models) ? data.models : [];
}

function supportsGenerateContent(model: any): boolean {
  const a = model?.supportedGenerationMethods ?? model?.supportedActions ?? [];
  return Array.isArray(a) && a.includes("generateContent");
}

async function generateWithModel(params: {
  apiKey: string;
  modelName: string;
  text: string;
}) {
  const { apiKey, modelName, text } = params;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 4500,
      },
    }),
  });

  const raw = await safeReadText(resp);
  if (!resp.ok) {
    throw new Error(`GenerateContent HTTP ${resp.status} (${modelName}): ${raw}`);
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`GenerateContent: resposta não-JSON (${modelName}): ${raw}`);
  }

  if (data?.error?.message) {
    throw new Error(`Erro Google (${modelName}): ${data.error.message}`);
  }

  const refinedText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!refinedText.trim()) throw new Error(`IA retornou vazio (${modelName}).`);

  return refinedText;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`[ATIV] Function version: ${FUNCTION_VERSION}`);

    // =========================
    // AUTH (robusto)
    // =========================
    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse({
        refinedText: "⚠️ ACESSO NEGADO ⚠️\n\nSessão inválida. Faça login novamente.",
        code: "UNAUTHORIZED",
      }, 200);
    }

    const userId = getUserIdFromJwt(token);
    if (!userId) {
      return jsonResponse({
        refinedText: "⚠️ ACESSO NEGADO ⚠️\n\nToken inválido. Faça login novamente.",
        code: "UNAUTHORIZED",
      }, 200);
    }

    // =========================
    // Verifica perfil (service role)
    // =========================
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return jsonResponse({
        refinedText:
          "⚠️ FALHA TÉCNICA ⚠️\n\nErro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.",
        code: "MISCONFIG",
      }, 200);
    }

    // Busca profile diretamente via REST (service role) — evita RLS e evita validar JWT via auth.getUser()
    const profResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      method: "GET",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    });

    const profRaw = await safeReadText(profResp);
    if (!profResp.ok) {
      return jsonResponse({
        refinedText:
          "⚠️ FALHA TÉCNICA ⚠️\n\nErro ao verificar perfil de acesso.",
        code: "PROFILE_CHECK_FAILED",
        debug: profRaw.slice(0, 400),
      }, 200);
    }

    let profData: any[] = [];
    try {
      profData = JSON.parse(profRaw);
    } catch {
      profData = [];
    }

    const profile = Array.isArray(profData) ? profData[0] : null;

    if (!profile) {
      return jsonResponse({
        refinedText:
          "⚠️ ACESSO NEGADO ⚠️\n\nPerfil não encontrado. Procure o administrador.",
        code: "NO_PROFILE",
      }, 200);
    }

    // is_active
    if (!profile?.is_active) {
      return jsonResponse({
        refinedText:
          "⚠️ ACESSO RESTRITO ⚠️\n\nSua conta aguarda ativação pelo administrador.",
        code: "INACTIVE",
      }, 200);
    }

    // expires_at
    const expiresAt = profile?.expires_at ? new Date(profile.expires_at) : null;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      const renewUrl = Deno.env.get("RENEW_URL") || "LINK_PLACEHOLDER_HOTMART";
      return jsonResponse({
        refinedText:
          "⚠️ ACESSO EXPIRADO ⚠️\n\nAcesso expirado. Clique aqui para renovar.",
        code: "EXPIRED",
        renewUrl,
      }, 200);
    }

    // =========================
    // IA
    // =========================
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({
        refinedText:
          "⚠️ FALHA TÉCNICA ⚠️\n\nErro: GEMINI_API_KEY não configurada no ambiente.",
        code: "MISCONFIG",
      }, 200);
    }

    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";

    const body = (await req.json()) as ReqBody;
    const prompt = (body?.prompt ?? "").trim();
    const forceLevel = (body?.forceLevel ?? "NÃO INFORMADO").toString();

    if (!prompt) {
      return jsonResponse({ refinedText: "ERRO: campo 'prompt' vazio.", code: "BAD_REQUEST" }, 200);
    }

    const nowBR = nowInBrazil();

    const systemInstruction = `
ATUE EXCLUSIVAMENTE COMO: Redator Técnico Operacional e Perito em Documentação de Segurança Privada.

CONTEXTO LEGAL:
- Lei 14.967/2024 (Estatuto da Segurança Privada).
- Código Penal (Art. 23 e 25 - Excludentes de Ilicitude).

OBJETIVO:
Converter o relato bruto em RELATÓRIO DE OCORRÊNCIA OPERACIONAL (técnico, impessoal, cronológico e juridicamente consistente).

NÍVEL DE FORÇA APLICADO: ${forceLevel}
(Obrigatório justificar por NECESSIDADE, PROPORCIONALIDADE e ADEQUAÇÃO, vinculando a conduta do indivíduo e a cessação da ameaça.)

DATA/HORA DA LAVRATURA DO RELATÓRIO (OBRIGATÓRIO USAR EXATAMENTE): ${nowBR.formatted} (horário de Brasília)

REGRAS OBRIGATÓRIAS:
0) PROIBIDO: saudações, prefácios, textos educativos, “apresento”, “é com a devida atenção”, cartas ao leitor, explicações fora do relatório.
1) A resposta DEVE iniciar IMEDIATAMENTE com a linha: "RELATÓRIO DE OCORRÊNCIA OPERACIONAL".
2) Proibido primeira pessoa ("eu", "nós"). Use "Este agente", "A equipe", "O vigilante", "A guarnição".
3) Substitua gírias e coloquialismos por terminologia técnica.
4) Não crie seções extras. Siga o modelo.

--- MODELO OBRIGATÓRIO (INÍCIO DA RESPOSTA) ---

RELATÓRIO DE OCORRÊNCIA OPERACIONAL
DATA/HORA: ${nowBR.formatted}
LOCAL: (Extrair do relato; se ausente, escrever "Não informado no relato")
NATUREZA: (Classificação objetiva: Perturbação do Sossego / Tentativa de Invasão / Vias de Fato / Desobediência / Ameaça etc.)

1. HISTÓRICO DOS FATOS:
(2 a 3 parágrafos, cronológicos, descrevendo: acionamento/constatação, comportamento do indivíduo, sinais observáveis, verbalizações e medidas iniciais.)

2. DA INTERVENÇÃO TÁTICA E DO USO PROGRESSIVO DA FORÇA:
(Descrever intervenção e justificar o nível ${forceLevel} por NECESSIDADE, PROPORCIONALIDADE e ADEQUAÇÃO. Indicar objetivos: cessar ameaça, resguardar integridade, preservar patrimônio e manter ordem.)

3. DESFECHO:
(Descrever estabilização e encaminhamentos: acionamento da PM, condução, identificação, atendimento médico, registro e liberação, conforme aplicável.)

TERMOS TÉCNICOS:
1. (Termo aplicado no relatório): (Definição objetiva)
2. (Termo aplicado no relatório): (Definição objetiva)
3. (Termo aplicado no relatório): (Definição objetiva)

--- FIM DO MODELO ---
`.trim();

    const finalText = `${systemInstruction}\n\nRELATO BRUTO:\n${prompt}`;

    // DEBUG: lista modelos disponíveis (sem expor apiKey)
    let models: any[] = [];
    if (debug) {
      models = await listModels(apiKey);
      const summary = models.slice(0, 50).map((m) => ({
        name: m?.name,
        supportsGenerateContent: supportsGenerateContent(m),
        supported: m?.supportedGenerationMethods ?? m?.supportedActions ?? [],
      }));
      console.log("[ATIV] MODELS AVAILABLE (first 50):", JSON.stringify(summary, null, 2));
    }

    const envModel = Deno.env.get("GEMINI_MODEL")?.trim();
    const baseCandidates = [
      envModel,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro-001",
      "gemini-1.5-flash-001",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ].filter(Boolean) as string[];

    let candidateModels = [...baseCandidates];

    if (models.length > 0) {
      const supported = models
        .filter(supportsGenerateContent)
        .map((m) => (m.name || "").replace(/^models\//, ""))
        .filter(Boolean);

      const preferred = baseCandidates.filter((c) => supported.includes(c));
      const fallback = supported.slice(0, 10);
      candidateModels = Array.from(new Set([...preferred, ...fallback, ...baseCandidates]));
    }

    let refinedText = "";
    let lastErr: string | null = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[ATIV] Trying model: ${modelName}`);
        refinedText = await generateWithModel({ apiKey, modelName, text: finalText });
        console.log(`[ATIV] Success with model: ${modelName}`);
        break;
      } catch (e: any) {
        lastErr = e?.message ?? String(e);
        console.error(`[ATIV] Failed model ${modelName}:`, lastErr);
      }
    }

    if (!refinedText) {
      throw new Error(`Falha ao gerar texto. Último erro: ${lastErr ?? "desconhecido"}`);
    }

    return jsonResponse({ refinedText }, 200);
  } catch (error: any) {
    console.error("ERRO CRÍTICO:", error?.message ?? error);

    return jsonResponse({
      refinedText:
        `⚠️ FALHA TÉCNICA ⚠️\n\n` +
        `Erro: ${error?.message ?? error}\n`,
      code: "CRITICAL",
    }, 200);
  }
});
