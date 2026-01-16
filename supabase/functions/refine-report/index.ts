import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lida com requisições de segurança (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rawDescription, forceLevel } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    // 2. Chamada de Inteligência ao Gemini (Blindada no Servidor)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Aja como um especialista jurídico em segurança privada. Refine este relato operacional: "${rawDescription}". Nível de força utilizado: ${forceLevel}. Retorne um texto técnico e fundamentado.`
          }]
        }]
      })
    })

    const data = await response.json()
    const refinedText = data.candidates[0].content.parts[0].text

    return new Response(JSON.stringify({ refinedDescription: refinedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})