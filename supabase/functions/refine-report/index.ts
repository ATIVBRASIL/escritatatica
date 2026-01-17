import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("ACESSO NEGADO: Usuário não identificado.")
    }

    const { prompt, forceLevel } = await req.json()

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error("ERRO DE LOGÍSTICA: Chave API não encontrada.")
    }

    console.log("Iniciando operação com Gemini 2.5 Flash...")

    // ATENÇÃO: Atualizado para o modelo vigente em 2026 (gemini-2.5-flash)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Você é um oficial experiente da Polícia Militar. Reescreva o seguinte relato de forma técnica, impessoal e jurídica para um Boletim de Ocorrência.
              
              Nível de formalidade exigido: ${forceLevel}.
              
              Relato original: "${prompt}"`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    )

    const data = await response.json()

    if (!response.ok || data.error) {
      console.error("ERRO NO FRONT DA IA:", data.error || data)
      // Se o 2.5 falhar, tenta o 2.0 como fallback (segurança)
      const errorMessage = data.error?.message || "Erro desconhecido."
      throw new Error(`Falha na IA: ${errorMessage}`)
    }

    const refinedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar o texto."

    return new Response(
      JSON.stringify({ refinedText }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error("ERRO GERAL:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})