import { ForceLevel } from '../types';

// ⚠️ URL DA EDGE FUNCTION (fixa)
const FUNCTION_URL =
  "https://dbbzehyummpjyedxmsme.supabase.co/functions/v1/refine-report";

// ⚠️ ANON KEY (publica, segura para frontend)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYnplaHl1bW1wanllZHhtc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Njc4MTMsImV4cCI6MjA4NDE0MzgxM30.sFH5-IG1ZmUh5OpXZrsg0aogm-Qt2CyF6eyrCaGAOlQ";

export const refineIncidentReport = async (
  text: string,
  level: ForceLevel
) => {
  try {
    console.log("Enviando para o QG:", text.substring(0, 40) + "...");

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ✅ AUTORIZAÇÃO EXPLÍCITA
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        prompt: text,
        forceLevel: level,
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error("Resposta bruta:", raw);
      throw new Error(`Erro HTTP ${response.status}: ${raw}`);
    }

    const data = await response.json();

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