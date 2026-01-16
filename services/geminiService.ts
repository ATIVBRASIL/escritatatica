import { supabase } from '../supabaseClient';

export const refineIncidentReport = async (text: string, forceLevel: string) => {
  try {
    // Pegando as coordenadas direto do cliente que configuramos
    const { data: { publicUrl } } = { data: { publicUrl: 'https://dbbzehyummpjyedxmsme.supabase.co/functions/v1/refine-report' } };
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYnplaHl1bW1wanllZHhtc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Njc4MTMsImV4cCI6MjA4NDE0MzgxM30.sFH5-IG1ZmUh5OpXZrsg0aogm-Qt2CyF6eyrCaGAOlQ';

    console.log("Iniciando incursão no servidor...");

    const response = await fetch(publicUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`, // Usando a chave que você me passou
        'apikey': anonKey
      },
      body: JSON.stringify({ prompt: text, forceLevel: forceLevel })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na comunicação com o servidor');
    }

    const result = await response.json();
    return result.refinedText;

  } catch (error) {
    console.error("PANE NA COMUNICAÇÃO:", error);
    throw error;
  }
};

export const generateMotivationalMessage = () => {
  return "Força e Honra, Tenente. O relatório está a caminho.";
};