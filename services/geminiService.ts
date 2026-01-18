import { ForceLevel } from '../types';
import { supabase } from '../supabaseClient';

// URL da Edge Function
const FUNCTION_URL =
  "https://dbbzehyummpjyedxmsme.supabase.co/functions/v1/refine-report";

// ANON KEY (pública) — usada no header `apikey`
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYnplaHl1bW1wanllZHhtc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Njc4MTMsImV4cCI6MjA4NDE0MzgxM30.sFH5-IG1ZmUh5OpXZrsg0aogm-Qt2CyF6eyrCaGAOlQ";

export const refineIncidentReport = async (text: string, level: ForceLevel) => {
  try {
    console.log("Enviando para o QG:", text.substring(0, 40) + "...");

    // 1) Pega sessão atual
    let {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) {
      throw new Error("Sessão inválida. Faça login novamente.");
    }

    // 2) Se não houver token, tenta refresh
    if (!session?.access_token) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !refreshed?.session?.access_token) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }
      session = refreshed.session;
    }

    // 3) Chamada da Edge Function (token do usuário + apikey)
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        prompt: text,
        forceLevel: level,
      }),
    });

    // 4) Se não for OK, captura a resposta para diagnóstico
    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      console.error("Edge Function HTTP error:", response.status, raw);

      if (response.status === 401 || response.status === 403) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      throw new Error(`Erro HTTP ${response.status}: ${raw || "Sem detalhes"}`);
    }

    // 5) Parse JSON
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
