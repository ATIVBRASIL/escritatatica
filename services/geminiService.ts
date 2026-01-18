import { supabase } from '../supabaseClient';
import { ForceLevel } from '../types';

// Interface para tipar a resposta do Backend
interface RefineResponse {
  refinedText: string;
  code?: string;
  renewUrl?: string;
  debug?: string;
}

/**
 * Envia o relato para refinamento na Edge Function 'refine-report'
 * Utiliza o método nativo 'invoke' para garantir autenticação automática.
 */
export const refineIncidentReport = async (rawText: string, forceLevel: ForceLevel): Promise<string> => {
  try {
    console.log("Iniciando protocolo de envio via Supabase Invoke...");

    // 1. VERIFICAÇÃO DE SESSÃO LOCAL
    // Garante que o cliente tem uma sessão antes de tentar invocar
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.warn("Sem sessão ativa no cliente.");
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    // 2. DISPARO BLINDADO (INVOKE)
    // O Supabase injeta automaticamente: Authorization (Bearer Token) e apikey.
    const { data, error } = await supabase.functions.invoke<RefineResponse>('refine-report', {
      body: { 
        prompt: rawText,
        forceLevel: forceLevel 
      }
    });

    // 3. TRATAMENTO DE ERROS DE INFRAESTRUTURA (Rede, 500, etc)
    if (error) {
      console.error("Erro de Infraestrutura (Invoke):", error);
      // Se for um erro de sessão que o invoke capturou
      if (error instanceof Error && error.message.includes("Auth")) {
         throw new Error("Sessão expirada. Faça login novamente.");
      }
      throw new Error("Erro de comunicação com o QG. Tente novamente.");
    }

    // 4. TRATAMENTO DE RESPOSTAS LÓGICAS DO BACKEND
    // O backend retorna 200 OK mesmo para erros de negócio, precisamos ler o 'code'.
    
    if (!data) {
      throw new Error("O QG retornou uma resposta vazia.");
    }

    if (data.code === 'UNAUTHORIZED' || data.code === 'NO_PROFILE') {
      throw new Error("Sessão inválida ou perfil não encontrado. Faça login novamente.");
    }

    if (data.code === 'EXPIRED') {
      // Repassa o erro estruturado para o App.tsx abrir o popup de renovação
      // eslint-disable-next-line no-throw-literal
      throw { 
        code: "EXPIRED", 
        renewUrl: data.renewUrl || "https://treinamentos.ativbrasil.com.br",
        message: "Acesso expirado." 
      };
    }

    if (data.code === 'MISCONFIG' || data.code === 'CRITICAL') {
      console.error("Erro Crítico no Backend:", data.debug || data.refinedText);
      throw new Error(`Falha técnica no servidor. Contate o suporte.`);
    }

    // 5. SUCESSO
    return data.refinedText || "";

  } catch (err: any) {
    // Se o erro já tem o formato especial (ex: EXPIRED), lança ele direto
    if (err.code && err.renewUrl) throw err;

    console.error("Falha Tática no Serviço:", err);
    throw err;
  }
};

/**
 * Mensagem motivacional simples (mantida para compatibilidade)
 */
export const generateMotivationalMessage = async (): Promise<string> => {
  return "Mantenha o foco na missão. Sua segurança é prioridade."; 
};