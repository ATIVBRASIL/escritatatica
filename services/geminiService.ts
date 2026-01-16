import { supabase } from '../supabaseClient';

export const refineIncidentReport = async (text: string, forceLevel: string) => {
  try {
    // 1. Invocação da Edge Function
    const { data, error } = await supabase.functions.invoke('refine-report', {
      body: { prompt: text, forceLevel }, // Mudamos rawDescription para prompt
    });

    if (error) throw error;

    // 2. Retorno do texto refinado
    return data.refinedText; // Mudamos refinedDescription para refinedText
  } catch (error) {
    console.error("Falha na extração de dados táticos:", error);
    throw new Error("Erro ao processar o relatório via servidor seguro.");
  }
};

export const generateMotivationalMessage = () => {
  return "Mantenha a postura, Guerreiro. Sua caneta é sua melhor defesa após a crise.";
};