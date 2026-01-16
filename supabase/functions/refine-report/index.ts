import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { prompt, forceLevel } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) throw new Error("Chave API não encontrada no servidor.")

    // Mudança de calibre: Usando v1 e gemini-1.5-flash de forma direta
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Aja como um oficial experiente. Refine este relato policial: ${prompt}. Nível de força: ${forceLevel}` }] }]
      })
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(`Erro do Gemini: ${data.error.message}`)
    }

    const refinedText = data.candidates[0].content.parts[0].text

    return new Response(
      JSON.stringify({ refinedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})