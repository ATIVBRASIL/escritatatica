import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 1. Tratamento de CORS (Pre-flight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Setup do Cliente Supabase (Modo Admin)
    // As chaves são injetadas automaticamente pelo ambiente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuração de Servidor incompleta (Chaves de API ausentes).");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Validação do Usuário (Quem está chamando?)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Token de autorização ausente.");
    }

    // O método getUser valida o JWT criptograficamente (mais seguro que decode simples)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      console.error("Erro Auth:", userError);
      return new Response(
        JSON.stringify({ refinedText: "Sessão inválida.", code: "UNAUTHORIZED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 4. Verificação de Perfil (Agora usando o cliente oficial)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Erro Perfil:", profileError);
      // Tentativa de autocorreção: Se não tem perfil, cria um básico agora mesmo
      if (!profile) {
          await supabaseAdmin.from('profiles').insert([{ id: user.id, email: user.email, is_active: true }]);
      }
      // Mesmo criando, vamos pedir retry para garantir consistência na próxima
      return new Response(
        JSON.stringify({ refinedText: "Perfil não encontrado. Tente novamente.", code: "NO_PROFILE" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (!profile.is_active) {
      return new Response(
        JSON.stringify({ refinedText: "Conta inativa. Contate o comando.", code: "INACTIVE" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 5. Inteligência Artificial (Gemini)
    const { prompt, forceLevel } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!apiKey) throw new Error("Chave da IA não configurada.");

    const modelName = "gemini-1.5-flash"; // Modelo rápido e eficiente
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const systemPrompt = `
      ATUE COMO: Perito em Relatórios Policiais.
      MISSÃO: Reescrever o relato abaixo em linguagem técnica, formal e jurídica.
      NÍVEL DE FORÇA: ${forceLevel || "Não informado"}.
      REGRAS: Sem introduções. Apenas o texto do relatório. Use termos como "A equipe", "O indivíduo".
    `;

    const geminiResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nRELATO: ${prompt}` }] }]
      })
    });

    const geminiData = await geminiResp.json();
    const refinedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!refinedText) {
      throw new Error("A IA não retornou texto válido.");
    }

    return new Response(
      JSON.stringify({ refinedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Erro Crítico:", error.message);
    return new Response(
      JSON.stringify({ 
        refinedText: `Erro no QG: ${error.message}`, 
        code: "CRITICAL",
        debug: error.message 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});