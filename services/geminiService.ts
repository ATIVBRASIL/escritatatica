import { supabase } from '../supabaseClient';

/**
 * Função que envia o relato para o refino na Edge Function segura.
 * Cumpre o requisito 3.A (The Vault) do PRD.
 */
export const refineIncidentReport = async (rawDescription: string, forceLevel: string) => {
  try {
    // Chama a Edge Function que você acabou de dar deploy
    const { data, error } = await supabase.functions.invoke('refine-report', {
      body: { rawDescription, forceLevel },
    });

    if (error) throw error;

    return data.refinedDescription;
  } catch (error) {
    console.error("Falha na extração de dados táticos:", error);
    throw new Error("Erro ao processar o relatório via servidor seguro.");
  }
};

/**
 * Mensagem motivacional simples (pode ser mantida localmente ou movida depois)
 */
export const generateMotivationalMessage = () => {
  return "Mantenha a postura, Guerreiro. Sua caneta é sua melhor defesa após a crise.";
};