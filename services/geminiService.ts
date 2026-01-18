import { ForceLevel } from '../types';
import { supabase } from '../supabaseClient';

/* =========================
   Edge Function
========================= */
const FUNCTION_URL =
  "https://dbbzehyummpjyedxmsme.supabase.co/functions/v1/refine-report";

/* =========================
   Serviço principal
========================= */
export const refineIncidentReport = async (
  text: string,
  level: ForceLevel
) => {
  try {
    console.log("Enviando para o QG:", text.substring(0, 40) + "...");

    // 1) Obtém sessão atual
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr || !session?.access_token) {
      throw new Error("Sessão inválida. Faça login novamente.");
    }

    // 2) Chamada da Edge Function com token do usuário
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        prompt: text,
        forceLevel: level,
      }),
    });

    const data = await response.json();

    // 3) Tratamento de respostas controladas da function
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

/* =========================
   Compatibilidade mantida
========================= */
export const generateMotivationalMessage = async () => {
  return "Mantenha o foco na missão. Sua segurança é prioridade.";
};
