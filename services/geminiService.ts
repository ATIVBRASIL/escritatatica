import { supabase } from '../supabaseClient';
import { ForceLevel } from '../types';

// Função principal de reescrita
export const refineIncidentReport = async (text: string, level: ForceLevel) => {
  try {
    console.log("Enviando para o QG:", text.substring(0, 20) + "...");

    // O segredo está aqui: body: { prompt: text, ... }
    // Isso garante que o backend receba na variável 'prompt' correta.
    const { data, error } = await supabase.functions.invoke('refine-report', {
      body: { 
        prompt: text, 
        forceLevel: level 
      }
    });

    if (error) {
      console.error("Erro do Supabase Functions:", error);
      throw new Error(error.message || 'Falha na comunicação com o servidor');
    }

    if (!data || !data.refinedText) {
      throw new Error('A IA não retornou o texto refinado.');
    }

    return data.refinedText;

  } catch (error) {
    console.error("Falha Tática no Serviço:", error);
    throw error;
  }
};

// Função secundária (opcional, mantendo para não quebrar importações)
export const generateMotivationalMessage = async () => {
  return "Mantenha o foco na missão. Sua segurança é prioridade.";
};