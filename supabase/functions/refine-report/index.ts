import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Carimbo de versão (mude a cada deploy para validar)
const FUNCTION_VERSION = "2026-01-16_v3";

type ReqBody = {
  prompt: string;
  forceLevel?: string | number;
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

async function listModels(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const resp = await fetch(url, { method: "GET" });

  const text = await safeReadText(resp);
  if (!resp.ok) {
    throw new Error(`ListModels HTTP ${resp.status}: ${text}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`ListModels: resposta não-JSON: ${text}`);
  }

  // Formato típico: { models: [ { name, supportedGenerationMethods / supportedActions }, ... ] }
  const models = Array.isArray(data?.models) ? data.models : [];
  return models;
}

function supportsGenerateContent(model: any): boolean {
  // Alguns retornos usam supportedGenerationMethods, outros supportedActions.
  const a = model?.supportedGenerationMethods ?? model?.supportedActions ?? [];
  if (!Array.isArray(a)) return false;
  return a.includes("generateContent");
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
        temperature: 0.5,
        maxOutputTokens: 2500,
      },
    }),
  });

  const raw = await safeReadText(resp);

  if (!resp.ok) {
    // Retorna o corpo completo para diagnóstico
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

  const refinedText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "";

  if (!refinedText.trim()) {
    throw new Error(`IA retornou vazio (${modelName}).`);
  }

  return refinedText;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Confirma versão em log
    console.log(`[ATIV] Function version: ${FUNCTION_VERSION}`);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Chave API (GEMINI_API_KEY) não configurada no ambiente.");

    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";

    const body = (await req.json()) as ReqBody;
    const prompt = (body?.prompt ?? "").trim();
    const forceLevel = (body?.forceLevel ?? "NÃO INFORMADO").toString();

    if (!prompt) {
      return jsonResponse({ refinedText: "ERRO: campo 'prompt' vazio." }, 200);
    }

    // Instrução “cérebro”
    const systemInstruction = `
ATUE COMO: Oficial Instrutor de Segurança Privada e Perito em Redação Policial.

CONTEXTO LEGAL (2026):
- Lei 14.967/2024 (Estatuto da Segurança Privada).
- Código Penal (Art 23 e 25 - Excludentes de Ilicitude).

MISSÃO:
Transformar o relato informal do vigilante em um RELATÓRIO OPERACIONAL TÉCNICO, JURÍDICO E DETALHADO.

NÍVEL DE FORÇA APLICADO: ${forceLevel}
(Você DEVE justificar este nível citando a "Proporcionalidade" e a "Necessidade" para repelir a agressão).

REGRAS DE OURO:
1. NÃO entregue textos curtos. Seja prolixo e detalhista.
2. Substitua TODAS as gírias por termos cultos e técnicos.
3. Nunca use primeira pessoa ("Eu"). Use "Este agente" ou "A equipe".
4. Siga estritamente o modelo abaixo.

--- MODELO DE RESPOSTA OBRIGATÓRIO ---

RELATÓRIO DE OCORRÊNCIA OPERACIONAL
DATA/HORA: (Data atual)
LOCAL: (Extrair do relato)
NATUREZA: (Ex: Vias de Fato / Perturbação / Invasão)

1. HISTÓRICO DOS FATOS:
(2 ou 3 parágrafos narrando início, desenvolvimento e fim. Detalhe postura da equipe e reação do indivíduo.)

2. DA INTERVENÇÃO TÁTICA E USO DA FORÇA:
Diante da hostilidade apresentada, foi imperativo o emprego do Uso Progressivo da Força no Nível ${forceLevel}.
A ação pautou-se estritamente nos princípios da legalidade, necessidade e proporcionalidade, visando cessar a ameaça iminente
e preservar a integridade física dos envolvidos. (Complete a justificativa com coerência técnica.)

3. DESFECHO:
(A situação foi normalizada... Descreva acionamento da PM, condução, registro, liberação etc.)

TERMOS TÉCNICOS:
1. (Termo 1): (Significado)
2. (Termo 2): (Significado)
3. (Termo 3): (Significado)
-------------------------------------------
`.trim();

    const finalText = `${systemInstruction}\n\nRELATO BRUTO:\n${prompt}`;

    // 1) Lista modelos se debug ligado
    let models: any[] = [];
    if (debug) {
      models = await listModels(apiKey);

      // Mostra um resumo: nome e se suporta generateContent
      const summary = models.slice(0, 50).map((m) => ({
        name: m?.name,
        supportsGenerateContent: supportsGenerateContent(m),
        supported: m?.supportedGenerationMethods ?? m?.supportedActions ?? [],
      }));
      console.log("[ATIV] MODELS AVAILABLE (first 50):", JSON.stringify(summary, null, 2));
    }

    // 2) Seleção de modelo
    const envModel = Deno.env.get("GEMINI_MODEL")?.trim();
    const candidateModels = [
      envModel,                 // se você setar GEMINI_MODEL no Supabase, ele tenta primeiro
      "gemini-1.5-pro-001",
      "gemini-1.5-flash-001",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ].filter(Boolean) as string[];

    // Se temos lista (debug), preferir modelos realmente suportados
    if (models.length > 0) {
      const supported = models
        .filter(supportsGenerateContent)
        .map((m) => (m.name || "").replace(/^models\//, ""))
        .filter(Boolean);

      // Coloca modelos suportados primeiro (se coincidirem com candidates)
      const preferred = candidateModels.filter((c) => supported.includes(c));
      const fallback = supported.slice(0, 10); // top 10 suportados como fallback
      const merged = Array.from(new Set([...preferred, ...fallback, ...candidateModels]));
      candidateModels.length = 0;
      candidateModels.push(...merged);
    }

    // 3) Tenta gerar com fallback
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
      throw new Error(
        `Falha ao gerar texto. Último erro: ${lastErr ?? "desconhecido"}`
      );
    }

    return jsonResponse({ refinedText }, 200);
  } catch (error: any) {
    console.error("ERRO CRÍTICO:", error?.message ?? error);

    return jsonResponse({
      refinedText:
        `⚠️ FALHA TÉCNICA ⚠️\n\n` +
        `Erro: ${error?.message ?? error}\n\n` +
        `Ação recomendada:\n` +
        `1) Rode a chamada com ?debug=1 para listar modelos.\n` +
        `2) Configure GEMINI_MODEL com um modelo que suporte generateContent.\n` +
        `3) Verifique logs para confirmar a versão e o modelName usado.\n`,
    }, 200);
  }
});
