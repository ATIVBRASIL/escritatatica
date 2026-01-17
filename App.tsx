import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Mic, 
  FileText, 
  AlertOctagon, 
  CheckCircle2, 
  ArrowRight,
  RotateCcw,
  Share,
  HeartHandshake,
  X,
  Loader2,
  LogOut,
  Settings
} from 'lucide-react';

// Importações de Componentes e Serviços
import { COLORS, APP_STRINGS } from './constants';
import { TacticalButton, TacticalCard, Header, Disclaimer } from './components/TacticalComponents';
import { ForceScale } from './components/ForceScale';
import { ForceLevel, IncidentReport, FORCE_LEVEL_DETAILS } from './types';
import { refineIncidentReport, generateMotivationalMessage } from './services/geminiService';

// Infraestrutura Supabase e Autenticação
import { supabase } from './supabaseClient';
import { Auth } from './Auth';
import { AdminPanel } from './AdminPanel';

// --- Fases da Aplicação ---
enum AppPhase {
  WELCOME,
  MOOD_CHECK, 
  READINESS,
  INCIDENT_LEVEL,
  INCIDENT_DETAILS,
  PROCESSING,
  RESULT
}

const App: React.FC = () => {
  // --- Estados de Sessão e Perfil ---
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false); // Controle do Painel CMD

  // --- Estados de Operação ---
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

  const DAILY_LIMIT = 5; 
  const CHAR_LIMIT = 2000;

  // --- Monitoramento de Acesso ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email);
      else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- BUSCA E CRIAÇÃO AUTOMÁTICA DE PERFIL ---
  const fetchProfile = async (userId: string, email?: string) => {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      const { data: newData } = await supabase
        .from('profiles')
        .insert([{ 
          id: userId, 
          email: email, 
          is_active: false, 
          daily_usage_count: 0,
          total_usage_count: 0
        }])
        .select()
        .single();
      if (newData) setUserProfile(newData);
    } else {
      setUserProfile(data);
    }

    // Atualiza o último acesso
    if (userId) {
        await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', userId);
    }
    setLoading(false);
  };

  // --- Lógica de Processamento com IA ---
  const processReport = async () => {
    // Verificações de Segurança (Assinatura e Limites)
    if (userProfile?.expires_at && new Date(userProfile.expires_at) < new Date()) {
      alert("⚠️ ASSINATURA EXPIRADA: Seu período de acesso terminou.");
      return;
    }

    if (!userProfile?.is_active) {
      alert("⚠️ ACESSO RESTRITO: Sua conta aguarda ativação pelo administrador.");
      return;
    }

    if (userProfile.daily_usage_count >= DAILY_LIMIT) {
      alert("❌ LIMITE DIÁRIO: Você já utilizou seus 5 relatos de hoje.");
      return;
    }
    
    // Inicia o processamento visual
    setPhase(AppPhase.PROCESSING);
    
    try {
      // Chama a função que conecta com o Gemini (Backend)
      const refinedText = await refineIncidentReport(report.rawDescription, report.forceLevel);
      
      // Atualiza contagem de uso no Banco de Dados
      const nextUsage = (userProfile.daily_usage_count || 0) + 1;
      const totalUsage = (userProfile.total_usage_count || 0) + 1;

      await supabase
        .from('profiles')
        .update({ 
          daily_usage_count: nextUsage,
          total_usage_count: totalUsage,
          last_active_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      // Atualiza estado local
      setUserProfile({ ...userProfile, daily_usage_count: nextUsage, total_usage_count: totalUsage });
      
      // Salva o resultado e muda para a tela de Resultado
      setReport(prev => ({
        ...prev,
        refinedDescription: refinedText,
        legalJustification: FORCE_LEVEL_DETAILS[prev.forceLevel].legal
      }));
      
      setPhase(AppPhase.RESULT);

    } catch (error) {
      console.error("Erro no processamento:", error);
      alert("Erro ao processar. Tente novamente.");
      setPhase(AppPhase.INCIDENT_DETAILS);
    }
  };

  // --- TELA 1: Entrada de Dados ---
  const renderDetailsInput = () => (
    <div className="animate-slide-up">
      <Header title="Relato do Incidente" subtitle="Descreva os fatos com precisão" />
      <TacticalCard className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-[#C5A059] text-xs font-bold uppercase tracking-widest">Relato Técnico</label>
          <span className={`text-[10px] font-mono ${report.rawDescription.length >= CHAR_LIMIT ? 'text-red-500' : 'text-gray-500'}`}>
            {report.rawDescription.length} / {CHAR_LIMIT}
          </span>
        </div>
        <textarea
          className="w-full h-40 bg-black/50 border border-gray-700 rounded p-4 text-white focus:border-[#C5A059] focus:outline-none resize-none"
          placeholder="Ex: Durante patrulhamento no setor Alpha, a equipe visualizou um indivíduo..."
          value={report.rawDescription}
          maxLength={CHAR_LIMIT}
          onChange={(e) => setReport(prev => ({ ...prev, rawDescription: e.target.value }))}
        ></textarea>
        <div className="mt-3 flex justify-between items-center text-[10px] uppercase font-bold">
           <span className="text-gray-500">Munição: {DAILY_LIMIT - (userProfile?.daily_usage_count || 0)}/5</span>
           {userProfile?.is_active ? <span className="text-green-500">Acesso Liberado</span> : <span className="text-red-500">Assinatura Pendente</span>}
        </div>
      </TacticalCard>

      <TacticalButton 
        fullWidth 
        disabled={report.rawDescription.length < 10 || (userProfile?.daily_usage_count || 0) >= DAILY_LIMIT || !userProfile?.is_active}
        onClick={processReport}
      >
        {(!userProfile?.is_active) ? "Assine para Processar" : ((userProfile?.daily_usage_count || 0) >= DAILY_LIMIT ? "Munição Esgotada" : "Gerar Relatório IA")} 
        <FileText size={18} className="ml-2" />
      </TacticalButton>
    </div>
  );

  // --- TELA 2: Processando (Loading) ---
  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center h-64 animate-fade-in space-y-4">
      <Loader2 className="animate-spin text-[#C5A059]" size={48} />
      <p className="text-[#C5A059] font-bold tracking-widest animate-pulse">PROCESSANDO INTELIGÊNCIA...</p>
      <p className="text-gray-500 text-xs">Analisando fatos e ajustando terminologia jurídica.</p>
    </div>
  );

  // --- TELA 3: Resultado Final ---
  const renderResult = () => (
    <div className="animate-slide-up">
      <Header title="Relatório Finalizado" subtitle="Pronto para o Boletim de Ocorrência" />
      
      <TacticalCard className="mb-4 border-l-4 border-l-[#C5A059]">
        <div className="flex justify-between items-center mb-4">
           <span className="text-[#C5A059] font-bold text-xs uppercase tracking-widest">Texto Reescrito</span>
           <button 
             onClick={() => {
                navigator.clipboard.writeText(report.refinedDescription);
                alert("Copiado com sucesso!");
             }}
             className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
           >
             <FileText size={14} /> COPIAR
           </button>
        </div>
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono bg-black/30 p-3 rounded">
          {report.refinedDescription}
        </div>
      </TacticalCard>

      <div className="grid grid-cols-2 gap-3">
        <TacticalButton 
          variant="secondary"
          onClick={() => {
            // Limpa o texto para um novo relato
            setReport(prev => ({ ...prev, rawDescription: '', refinedDescription: '' }));
            setPhase(AppPhase.INCIDENT_DETAILS);
          }}
        >
          <RotateCcw size={18} className="mr-2" /> Novo Relato
        </TacticalButton>

        <TacticalButton 
           onClick={() => {
             const textToShare = `*BOLETIM TÁTICO*\n\n${report.refinedDescription}`;
             if (navigator.share) {
               navigator.share({ title: 'Relatório Policial', text: textToShare });
             } else {
               navigator.clipboard.writeText(textToShare);
               alert("Texto copiado para compartilhamento!");
             }
           }}
        >
           <Share size={18} className="mr-2" /> Compartilhar
        </TacticalButton>
      </div>
    </div>
  );

  // --- Renderização Principal ---
  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-[#C5A059]" size={40} /></div>;
  if (!session) return <Auth />;
  if (showAdmin) return <AdminPanel onBack={() => setShowAdmin(false)} />;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans">
      {/* Barra Superior */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-[#1C1C1E] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <ShieldCheck size={18} color={COLORS.AGED_GOLD} />
           <span className="font-bold text-sm tracking-wider">ATIV</span>
        </div>
        
        <div className="flex items-center gap-3">
          {session.user.email === 'coachmilitar@gmail.com' && (
            <button 
              onClick={() => setShowAdmin(true)}
              className="text-[10px] font-bold text-[#C5A059] uppercase border border-[#C5A059]/30 px-2 py-1 rounded hover:bg-[#C5A059]/10 flex items-center gap-1"
            >
              <Settings size={12} /> Painel CMD
            </button>
          )}
          <a href="https://ativbrasil.com.br/" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-green-500 uppercase border border-green-500/30 px-2 py-1 rounded">Cursos</a>
          <button onClick={() => supabase.auth.signOut()} className="text-gray-500 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-md mx-auto p-5 pb-10">
        <div className="mb-4 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Operador: {session.user.email}</p>
        </div>

        {/* Gerenciador de Telas */}
        {phase === AppPhase.WELCOME && (
          <div className="text-center py-10 animate-fade-in">
            <h2 className="text-white font-bold text-xl mb-6 italic">Pronto para a Missão?</h2>
            <TacticalButton fullWidth onClick={() => setPhase(AppPhase.INCIDENT_DETAILS)}>
              Iniciar Escrita Tática <ArrowRight size={18} className="ml-2" />
            </TacticalButton>
          </div>
        )}

        {phase === AppPhase.INCIDENT_DETAILS && renderDetailsInput()}
        {phase === AppPhase.PROCESSING && renderProcessing()}
        {phase === AppPhase.RESULT && renderResult()}
        
      </main>
    </div>
  );
};

export default App;