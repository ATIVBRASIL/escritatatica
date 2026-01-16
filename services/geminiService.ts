import { GoogleGenAI } from "@google/genai";
import { ForceLevel, FORCE_LEVEL_DETAILS } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const refineIncidentReport = async (
  rawText: string,
  level: ForceLevel
): Promise<string> => {
  const levelInfo = FORCE_LEVEL_DETAILS[level];
  
  const systemInstruction = `
    Você é um instrutor especialista em relatórios de segurança privada no Brasil. 
    Sua tarefa é reescrever relatos informais de vigilantes transformando-os em linguagem técnica, jurídica e profissional (Escrita Tática).
    
    Diretrizes:
    1. Substitua gírias por termos técnicos (ex: "veio pra cima" -> "progrediu de forma hostil").
    2. Enfatize a proporcionalidade e o uso progressivo da força.
    3. O relato deve justificar o nível de força utilizado: ${level} - ${levelInfo.label}.
    4. Base legal: ${levelInfo.legal}.
    5. Mantenha a objetividade. Não invente fatos, apenas refine a narrativa.
    6. O tom deve ser: Direto, Técnico e Protetor.
  `;

  const prompt = `
    Relato original do vigilante: "${rawText}"
    
    Reescreva este relato para um Livro de Ocorrência, focando na justificativa do uso de força nível ${level}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Low temperature for factual/consistent output
      }
    });

    return response.text || "Não foi possível processar o relato.";
  } catch (error) {
    console.error("Erro ao processar relatório:", error);
    return "Erro ao conectar com a Inteligência ATIV. Utilize o texto original.";
  }
};

export const generateMotivationalMessage = async (answers: string[]): Promise<string> => {
  const systemInstruction = `
    Você é um Capelão e Mentor Tático de Forças Especiais. 
    Sua missão é fornecer suporte moral, espiritual (viés bíblico ou estoico universal) e psicológico para agentes de segurança.
    Fale de "Guerreiro para Guerreiro". Use linguagem breve, impactante e encorajadora.
  `;

  const prompt = `
    Analise o estado do operador baseado nestas 3 respostas e gere uma "Mensagem do Dia":
    1. Nível de Energia/Alerta: ${answers[0]}
    2. Principal Desafio Atual: ${answers[1]}
    3. Necessidade Espiritual/Mental: ${answers[2]}

    Gere uma mensagem curta (max 50 palavras). Pode citar um versículo bíblico ou frase de sabedoria que se encaixe no contexto tático.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, 
      }
    });

    return response.text || "Mantenha o foco e a fé. Sua missão é importante.";
  } catch (error) {
    console.error("Erro ao gerar mensagem:", error);
    return "Sistema offline. Lembre-se: A disciplina é a ponte entre metas e realizações.";
  }
};