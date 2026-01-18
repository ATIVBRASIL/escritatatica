import { ForceLevel } from '../types';
import { supabase } from '../supabaseClient';

// URL da Edge Function
const FUNCTION_URL =
  "https://dbbzehyummpjyedxmsme.supabase.co/functions/v1/refine-report";

// ANON KEY (publica) — usada no header `apikey`
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYnplaHl1bW1wanllZHhtc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Njc4MTMsImV4cCI6MjA4NDE0MzgxM30.sFH5-IG1ZmUh5OpXZrsg0aogm-Qt2CyF6eyrCaGAOlQ";

export const refineIncidentReport = async (text: string, level: ForceLevel) => {
  try {
    console.log("Enviando para o QG:", text.substring(0, 40) + "...");

    // 1) Sessão atual
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr || !session?.access_token) {
      throw new Error("Sessão inválida. Faça login novamente.");
    }

    // 2) Chamada da Edge Function (token do usuário + apikey)
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // obrigatório para muitos setups de Edge Function
        apikey: SUPABASE_ANON_KEY,
        // identidade do usuário logado
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        prompt: text,
        forceLevel: level,
      }),
    });

    // 3) Se não for OK, capturar resposta para diagnóstico e mensagens
    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      console.error("Edge Function HTTP error:", response.status, raw);

      // Padroniza erros mais comuns
      if (response.status === 401 || response.status === 403) {
        // alguns casos: token expirado, headers ausentes, policy
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      throw new Error(`Erro HTTP ${response.status}: ${raw || "Sem detalhes"}`);
    }

    // 4) Parse JSON (agora com ok garantido)
    const data = await response.json().catch(() => null);

    // Fluxo novo: backend pode devolver code/renewUrl
    if (data?.code === "UNAUTHORIZED") {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (data?.code === "EXPIRED") {
      const err: any = new Error("ACESSO_EXPIRADO");
      err.code = "EXPIRED";
      err.renewUrl = data?.renewUrl;
      throw err;
    }

    if (!data?.refinedText) {
      console.error("Payload inesperado:", data);
      throw new Error("Resposta inválida da Edge Function.");
    }

    return data.refinedText;
  } catch (error) {
    console.error("Falha Tática no Serviço:", error);
    throw error;
  }
};

// Mantida para compatibilidade
export const generateMotivationalMessage = async () => {
  return "Mantenha o foco na missão. Sua segurança é prioridade.";
};
