import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   CORS
========================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* =========================
   Versão
========================= */
const FUNCTION_VERSION = "2026-01-18_v2";

/* =========================
   Types
========================= */
type ReqBody = {
  prompt: string;
  forceLevel?: string | number;
  occurredAt?: string;
};

/* =========================
   Helpers básicos
========================= */
function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
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

/* =========================
   Gemini helpers (inalterados)
========================= */
async function listModels(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const resp = await fetch(url, { method: "GET" });
  const text = await safeReadText(resp);
  if (!resp.ok) throw new Error(`ListModels HTTP ${resp.status}: ${text}`);
  return JSON.parse(text)?.models ?? [];
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

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 4500,
        },
      }),
    }
  );

  const raw = await safeReadText(resp);
  if (!resp.ok) {
    throw new Error(`GenerateContent HTTP ${resp.status} (${modelName}): ${raw}`);
  }

  const data = JSON.parse(raw);
  const refinedText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!refinedText.trim()) {
    throw new Error(`IA retornou vazio (${modelName})`);
  }

  return refinedText;
}

/* =========================
   Main
========================= */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`[ATIV] refine-report ${FUNCTION_VERSION}`);

    /* -------- ENV -------- */
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const renewUrl =
      Deno.env.get("RENEW_CHECKOUT_URL") || "LINK_PLACEHOLDER_HOTMART";

    if (!apiKey || !supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({
        refinedText:
          "⚠️ FALHA TÉCNICA ⚠️\n\nConfiguração de ambiente incompleta.",
        code: "MISCONFIG",
      });
    }

    /* -------- BODY -------- */
    const body = (await req.json()) as ReqBody;
    const prompt = (body?.prompt ?? "").trim();
    const forceLevel = (body?.forceLevel ?? "NÃO INFORMADO").toString();

    if (!prompt) {
      return jsonResponse({
        refinedText: "ERRO: campo 'prompt' vazio.",
      });
    }

    /* -------- AUTH -------- */
    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse({
        refinedText:
          "⚠️ ACESSO NEGADO ⚠️\n\nSessão inválida. Faça login novamente.",
        code: "UNAUTHORIZED",
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } =
      await supabaseAuth.auth.getUser();

    if (userErr || !userData?.user?.id) {
      return jsonResponse({
        refinedText:
          "⚠️ ACESSO NEGADO ⚠️\n\nSessão expirada. Faça login novamente.",
        code: "UNAUTHORIZED",
      });
    }

    const userId = userData.user.id;

    /* -------- PROFILE CHECK -------- */
    const supabaseSrv = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: profile, error: profErr } = await supabaseSrv
      .from("profiles")
      .select("is_active, expires_at, role")
      .eq("id", userId)
      .single();

    if (profErr || !profile) {
      return jsonResponse({
        refinedText:
          "⚠️ FALHA TÉCNICA ⚠️\n\nPerfil inconsistente.",
        code: "PROFILE_MISSING",
      });
    }

    if (profile.role !== "admin") {
      if (profile.is_active === false) {
        return jsonResponse({
          refinedText:
            "⚠️ ACESSO BLOQUEADO ⚠️\n\nConta inativa. Procure o administrador.",
          code: "INACTIVE",
        });
      }

      if (profile.expires_at) {
        const exp = new Date(profile.expires_at);
        if (exp <= new Date()) {
          return jsonResponse({
            refinedText:
              "⚠️ ACESSO EXPIRADO ⚠️\n\nSeu período de uso deste recurso foi encerrado.\n\nClique para renovar:\n" +
              renewUrl,
            code: "EXPIRED",
            renewUrl,
          });
        }
      }
    }

    /* -------- PROMPT (inalterado) -------- */
    const nowBR = nowInBrazil();

    const systemInstruction = `
ATUE EXCLUSIVAMENTE COMO: Redator Técnico Operacional e Perito em Documentação de Segurança Privada.
CONTEXTO LEGAL:
- Lei 14.967/2024.
- Código Penal (Art. 23 e 25).
OBJETIVO:
Converter o relato bruto em RELATÓRIO DE OCORRÊNCIA OPERACIONAL.
NÍVEL DE FORÇA APLICADO: ${forceLevel}
DATA/HORA: ${nowBR.formatted}
`.trim();

    const finalText = `${systemInstruction}\n\nRELATO BRUTO:\n${prompt}`;

    /* -------- MODEL SELECTION -------- */
    const models = await listModels(apiKey);
    const supported = models
      .filter(supportsGenerateContent)
      .map((m: any) => m.name.replace(/^models\//, ""));

    const candidates = [
      Deno.env.get("GEMINI_MODEL"),
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ].filter(Boolean) as string[];

    const modelList = Array.from(
      new Set([...candidates.filter((c) => supported.includes(c)), ...supported])
    );

    let refinedText = "";
    let lastErr: string | null = null;

    for (const modelName of modelList) {
      try {
        refinedText = await generateWithModel({
          apiKey,
          modelName,
          text: finalText,
        });
        break;
      } catch (e: any) {
        lastErr = e?.message ?? String(e);
      }
    }

    if (!refinedText) {
      throw new Error(`Falha ao gerar texto: ${lastErr}`);
    }

    return jsonResponse({ refinedText });
  } catch (error: any) {
    console.error("ERRO CRÍTICO:", error);
    return jsonResponse({
      refinedText:
        "⚠️ FALHA TÉCNICA ⚠️\n\nErro interno ao processar solicitação.",
    });
  }
});
