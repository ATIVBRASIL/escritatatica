import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  ArrowRight,
  RotateCcw,
  Share,
  Loader2,
  LogOut,
  Settings
} from 'lucide-react';

import { COLORS } from './constants';
import { TacticalButton, TacticalCard, Header } from './components/TacticalComponents';
import { ForceLevel, IncidentReport, FORCE_LEVEL_DETAILS } from './types';
import { refineIncidentReport } from './services/geminiService';

import { supabase } from './supabaseClient';
import { Auth } from './Auth';
import { AdminPanel } from './AdminPanel';

/* =========================
   Fases
========================= */
enum AppPhase {
  WELCOME,
  INCIDENT_DETAILS,
  PROCESSING,
  RESULT
}

const DAILY_LIMIT = 5;
const CHAR_LIMIT = 2000;

const App: React.FC = () => {
  /* =========================
     Sessão / Perfil
  ========================= */
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  /* =========================
     Operação
  ========================= */
  const [phase, setPhase] = useState<AppPhase>(AppPhase.WELCOME);
  const [report, setReport] = useState<IncidentReport>({
    timestamp: new Date().toISOString(),
    location: null,
    officerReady: false,
    forceLevel: ForceLevel.LEVEL_1,
    rawDescription: '',
    refinedDescription: '',
    legalJustification: ''
  });

  /* =========================
     Sessão Auth
  ========================= */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchProfile(data.session.user.id, data.session.user.email);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) fetchProfile(s.user.id, s.user.email);
      else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* =========================
     Perfil
  ========================= */
  const fetchProfile = async (userId: string, email?: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (data) {
      setUserProfile(data);
    } else {
      const { data: created } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email,
          is_active: false,
          daily_usage_count: 0,
          total_usage_count: 0
        }])
        .select()
        .single();

      if (created) setUserProfile(created);
    }

    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);

    setLoading(false);
  };

  /* =========================
     IA
  ========================= */
  const processReport = async () => {
    if (!userProfile?.is_active) {
      alert("⚠️ Sua conta ainda não está ativa.");
      return;
    }

    if (userProfile?.expires_at && new Date(userProfile.expires_at) < new Date()) {
      alert("⚠️ Seu acesso expirou.");
      return;
    }

    if (userProfile.daily_usage_count >= DAILY_LIMIT) {
      alert("❌ Limite diário atingido.");
      return;
    }

    setPhase(AppPhase.PROCESSING);

    try {
      const refinedText = await refineIncidentReport(
        report.rawDescription,
        report.forceLevel
      );

      const nextUsage = (userProfile.daily_usage_count || 0) + 1;

      await supabase.from('profiles').update({
        daily_usage_count: nextUsage,
        total_usage_count: (userProfile.total_usage_count || 0) + 1,
        last_active_at: new Date().toISOString()
      }).eq('id', session.user.id);

      setUserProfile({ ...userProfile, daily_usage_count: nextUsage });

      setReport(prev => ({
        ...prev,
        refinedDescription: refinedText,
        legalJustification: FORCE_LEVEL_DETAILS[prev.forceLevel].legal
      }));

      setPhase(AppPhase.RESULT);

    } catch (error: any) {
      console.error("Erro IA:", error);

      if (error?.code === "EXPIRED") {
        const renew = window.confirm(
          "⚠️ ACESSO EXPIRADO\n\nDeseja renovar agora?"
        );
        if (renew && error?.renewUrl) {
          window.open(error.renewUrl, "_blank");
        }
        setPhase(AppPhase.INCIDENT_DETAILS);
        return;
      }

      if (error?.message?.includes("Sessão")) {
        alert("Sessão expirada. Faça login novamente.");
        await supabase.auth.signOut();
        return;
      }

      alert("Erro ao processar. Tente novamente.");
      setPhase(AppPhase.INCIDENT_DETAILS);
    }
  };

  /* =========================
     Renderizações
  ========================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C5A059]" size={40} />
      </div>
    );
  }

  if (!session) return <Auth />;
  if (showAdmin) return <AdminPanel onBack={() => setShowAdmin(false)} />;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 border-b border-[#1C1C1E] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} color={COLORS.AGED_GOLD} />
          <span className="font-bold text-sm">ATIV</span>
        </div>

        <div className="flex items-center gap-3">
          {session.user.email === 'coachmilitar@gmail.com' && (
            <button
              onClick={() => setShowAdmin(true)}
              className="text-[10px] font-bold text-[#C5A059] uppercase border border-[#C5A059]/30 px-2 py-1 rounded"
            >
              <Settings size={12} /> CMD
            </button>
          )}
          <button onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-md mx-auto p-5">
        {phase === AppPhase.WELCOME && (
          <div className="text-center py-10">
            <h2 className="text-xl font-bold mb-6">Pronto para a missão?</h2>
            <TacticalButton fullWidth onClick={() => setPhase(AppPhase.INCIDENT_DETAILS)}>
              Iniciar Escrita Tática <ArrowRight size={18} className="ml-2" />
            </TacticalButton>
          </div>
        )}

        {phase === AppPhase.INCIDENT_DETAILS && (
          <>
            <Header title="Relato do Incidente" subtitle="Descreva os fatos" />
            <TacticalCard>
              <textarea
                className="w-full h-40 bg-black/50 border border-gray-700 rounded p-4"
                value={report.rawDescription}
                maxLength={CHAR_LIMIT}
                onChange={e => setReport({ ...report, rawDescription: e.target.value })}
              />
            </TacticalCard>

            <TacticalButton
              fullWidth
              disabled={report.rawDescription.length < 10}
              onClick={processReport}
            >
              Gerar Relatório IA <FileText size={18} className="ml-2" />
            </TacticalButton>
          </>
        )}

        {phase === AppPhase.PROCESSING && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="animate-spin text-[#C5A059]" size={48} />
            <p className="mt-4 text-[#C5A059]">Processando inteligência…</p>
          </div>
        )}

        {phase === AppPhase.RESULT && (
          <>
            <Header title="Relatório Finalizado" subtitle="Pronto para uso" />
            <TacticalCard>
              <pre className="whitespace-pre-wrap">
                {report.refinedDescription}
              </pre>
            </TacticalCard>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <TacticalButton
                variant="secondary"
                onClick={() => {
                  setReport({ ...report, rawDescription: '', refinedDescription: '' });
                  setPhase(AppPhase.INCIDENT_DETAILS);
                }}
              >
                <RotateCcw size={18} /> Novo
              </TacticalButton>

              <TacticalButton
                onClick={() => navigator.clipboard.writeText(report.refinedDescription)}
              >
                <Share size={18} /> Copiar
              </TacticalButton>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
