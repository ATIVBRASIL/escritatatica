import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import { TacticalButton, TacticalCard } from './components/TacticalComponents';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        alert('Informe um e-mail válido.');
        return;
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          console.error('[AUTH] signUp error:', error);
          alert(error.message);
          return;
        }

        // Em muitos projetos, signUp exige confirmação de e-mail.
        // Mesmo assim, se houver sessão, ela pode aparecer aqui.
        console.log('[AUTH] signUp data:', data);

        alert('Cadastro realizado. Verifique seu e-mail para confirmar o acesso.');
        return;
      }

      // LOGIN
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        console.error('[AUTH] signIn error:', error);
        alert(error.message);
        return;
      }

      console.log('[AUTH] signIn data:', data);

      // Confere imediatamente se a sessão ficou disponível
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      console.log('[AUTH] getSession:', { sessionData, sessionErr });

      if (sessionErr || !sessionData?.session?.access_token) {
        alert(
          'Login efetuado, porém a sessão não foi persistida no navegador.\n\n' +
          '1) Faça Ctrl+F5\n' +
          '2) Tente novamente\n' +
          '3) Se persistir, envie print da aba Network (POST /token) do Supabase.'
        );
        return;
      }

      // Sucesso: o App.tsx (onAuthStateChange) deve assumir daqui.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <TacticalCard className="w-full max-w-md border-[#C5A059]/30">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1C1C1E] rounded-xl flex items-center justify-center border border-[#C5A059]/40 mx-auto mb-4">
            <ShieldCheck size={32} color="#C5A059" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">ESCRITA TÁTICA ATIV</h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">Acesso Restrito</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              type="email"
              placeholder="E-mail funcional"
              className="w-full bg-black border border-gray-800 rounded p-3 pl-10 text-white focus:border-[#C5A059] outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              type="password"
              placeholder="Senha de acesso"
              className="w-full bg-black border border-gray-800 rounded p-3 pl-10 text-white focus:border-[#C5A059] outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          <TacticalButton fullWidth type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isSignUp ? 'Criar Conta' : 'Entrar no Sistema')}
          </TacticalButton>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-xs text-gray-500 hover:text-[#C5A059] transition-colors uppercase font-bold"
        >
          {isSignUp ? 'Já possui acesso? Clique aqui' : 'Primeiro acesso? Cadastre-se'}
        </button>
      </TacticalCard>
    </div>
  );
};
