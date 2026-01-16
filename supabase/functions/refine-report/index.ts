import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Liberação de segurança (CORS)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 2. Coleta de dados do site
    const { prompt, forceLevel } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) throw new Error("ERRO: A chave GEMINI_API_KEY não foi lida pelo servidor.")

    // 3. Comunicação com a IA do Google
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Aja como um oficial experiente. Refine este relato policial: ${prompt}. Nível de força: ${forceLevel}` }] }]
      })
    })

    const data = await response.json()

    // 4. Verificação de resposta da IA
    if (data.error) {
      throw new Error(`Erro do Gemini: ${data.error.message}`)
    }

    const refinedText = data.candidates[0].content.parts[0].text

    // 5. Envio do sucesso de volta para o site
    return new Response(
      JSON.stringify({ refinedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // 6. Se houver qualquer pane, o servidor enviará a mensagem de erro real
    return new Response(
      JSON.stringify({ error: error.message, status: "Pane Interna" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})