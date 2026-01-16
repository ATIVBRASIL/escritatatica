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
  X
} from 'lucide-react';
import { COLORS, APP_STRINGS } from './constants';
import { TacticalButton, TacticalCard, Header, Disclaimer } from './components/TacticalComponents';
import { ForceScale } from './components/ForceScale';
import { ForceLevel, IncidentReport, FORCE_LEVEL_DETAILS } from './types';
import { refineIncidentReport, generateMotivationalMessage } from './services/geminiService';

// --- Phases of the Application ---
enum AppPhase {
  WELCOME,
  MOOD_CHECK, 
  READINESS,
  INCIDENT_LEVEL,
  INCIDENT_DETAILS,
  PROCESSING,
  RESULT
}

const MOOD_QUESTIONS = [
  {
    question: "Como está seu nível de energia combativa (mental/física) agora?",
    options: ["Alta / Pronto para tudo", "Média / Operacional", "Baixa / Cansado", "Exausto / Preciso de Força"]
  },
  {
    question: "Qual o principal 'inimigo' interno você enfrenta hoje?",
    options: ["Ansiedade / Medo", "Estresse Financeiro/Familiar", "Tédio / Falta de Propósito", "Nenhum / Foco Total"]
  },
  {
    question: "Que tipo de munição mental você precisa?",
    options: ["Coragem / Bravura", "Paciência / Sabedoria", "Disciplina / Foco", "Esperança / Fé"]
  }
];

const App: React.FC = () => {
  // --- State ---
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
  const [checklist, setChecklist] = useState({
    uniform: false,
    cnv: false
  });
  const [isListening, setIsListening] = useState(false);

  // Mood State
  const [moodAnswers, setMoodAnswers] = useState<string[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);

  // --- Effects ---
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setReport(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
        },
        (err) => console.log("Geo error or denied", err)
      );
    }
  }, []);

  // --- Handlers ---
  const handlePanic = () => {
    alert("BOTÃO DE PÂNICO ACIONADO: Coordenadas enviadas para supervisão.");
  };

  const processReport = async () => {
    setPhase(AppPhase.PROCESSING);
    const refinedText = await refineIncidentReport(report.rawDescription, report.forceLevel);
    
    setReport(prev => ({
      ...prev,
      refinedDescription: refinedText,
      legalJustification: FORCE_LEVEL_DETAILS[prev.forceLevel].legal
    }));
    
    setPhase(AppPhase.RESULT);
  };

  const handleCopy = () => {
    if (report.refinedDescription) {
      navigator.clipboard.writeText(report.refinedDescription);
      alert("Copiado com sucesso! O relatório está na área de transferência.");
    }
  };

  const toggleMic = () => {
    if (!isListening) {
      setIsListening(true);
      setTimeout(() => {
        setReport(prev => ({
          ...prev,
          rawDescription: prev.rawDescription + (prev.rawDescription ? " " : "") + "O indivíduo veio pra cima de mim na portaria."
        }));
        setIsListening(false);
      }, 2000);
    }
  };

  const handleReset = () => {
    setReport({
      timestamp: new Date().toISOString(),
      location: null,
      officerReady: false,
      forceLevel: ForceLevel.LEVEL_1,
      rawDescription: '',
      refinedDescription: '',
      legalJustification: ''
    });
    setChecklist({ uniform: false, cnv: false });
    setPhase(AppPhase.WELCOME);
    setMoodAnswers([]);
    setCurrentQuestionIdx(0);
    setDailyMessage(null);
  };

  // --- Mood Handlers ---
  const startMoodCheck = () => {
    setMoodAnswers([]);
    setCurrentQuestionIdx(0);
    setDailyMessage(null);
    setPhase(AppPhase.MOOD_CHECK);
  };

  const handleMoodAnswer = async (answer: string) => {
    const newAnswers = [...moodAnswers, answer];
    setMoodAnswers(newAnswers);

    if (currentQuestionIdx < MOOD_QUESTIONS.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setLoadingMessage(true);
      const message = await generateMotivationalMessage(newAnswers);
      setDailyMessage(message);
      setLoadingMessage(false);
    }
  };

  // --- Renderers ---

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
      <div className="w-24 h-24 border-2 border-[#C5A059] rounded-full flex items-center justify-center relative">
        <ShieldCheck size={48} color={COLORS.AGED_GOLD} />
        <div className="absolute inset-0 rounded-full border border-[#C5A059] opacity-30 animate-ping"></div>
      </div>
      
      <div>
        <h1 className="text-3xl sm:text-4xl font-['Montserrat'] font-black uppercase text-white tracking-widest mb-2">
          ATIV <span className="text-[#C5A059]">BRASIL</span>
        </h1>
        <p className="text-gray-400 font-['Inter']">Sistema de Inteligência e Escrita Tática</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <TacticalButton fullWidth onClick={() => setPhase(AppPhase.READINESS)}>
          Iniciar Turno / Ocorrência
        </TacticalButton>

        <TacticalButton 
          fullWidth 
          variant="secondary" 
          onClick={startMoodCheck}
          className="text-xs py-3"
        >
          <HeartHandshake size={16} /> Suporte Moral (QAP)
        </TacticalButton>
      </div>
    </div>
  );

  const renderMoodCheck = () => {
    if (loadingMessage) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in space-y-4">
           <div className="w-12 h-12 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[#C5A059] font-['Montserrat'] text-sm tracking-widest uppercase">Buscando Mensagem...</p>
        </div>
      );
    }

    if (dailyMessage) {
      return (
        <div className="animate-slide-up flex flex-col h-full justify-center">
          <div className="relative bg-[#1C1C1E] border border-[#C5A059] p-8 rounded-lg shadow-2xl shadow-[#C5A059]/10">
            <button 
              onClick={() => setPhase(AppPhase.WELCOME)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="flex justify-center mb-6">
              <HeartHandshake size={40} className="text-[#C5A059]" />
            </div>

            <h3 className="text-center font-['Montserrat'] font-bold text-white text-lg mb-4 uppercase tracking-wider">
              Mensagem do Dia
            </h3>
            
            <div className="mb-6 text-center">
              <p className="text-lg text-gray-200 font-['Inter'] italic leading-relaxed">
                "{dailyMessage}"
              </p>
            </div>

            <TacticalButton fullWidth onClick={() => setPhase(AppPhase.WELCOME)}>
              QAP (Recebido)
            </TacticalButton>
          </div>
        </div>
      );
    }

    const currentQ = MOOD_QUESTIONS[currentQuestionIdx];

    return (
      <div className="animate-slide-up">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-['Montserrat'] font-bold text-[#C5A059] uppercase">
              Check-in Operacional
            </h2>
            <span className="text-xs text-gray-500 font-bold">
              {currentQuestionIdx + 1} / {MOOD_QUESTIONS.length}
            </span>
         </div>
         
         <p className="text-white text-lg font-['Inter'] mb-8">
           {currentQ.question}
         </p>

         <div className="space-y-3">
           {currentQ.options.map((option, idx) => (
             <button
               key={idx}
               onClick={() => handleMoodAnswer(option)}
               className="w-full text-left p-4 rounded bg-[#1C1C1E] border border-gray-700 hover:border-[#C5A059] hover:bg-[#2A2A2D] transition-all text-gray-300 font-medium"
             >
               {option}
             </button>
           ))}
         </div>
         
         <button 
           onClick={() => setPhase(AppPhase.WELCOME)}
           className="mt-8 text-xs text-gray-500 hover:text-white underline w-full text-center"
         >
           Cancelar
         </button>
      </div>
    );
  };

  const renderReadiness = () => (
    <div className="animate-slide-up">
      <Header title="Prontidão Operacional" subtitle="Verificação obrigatória pré-incidente" />
      
      <TacticalCard className="mb-6 space-y-4">
        <div className="flex items-center gap-4 p-2">
          <input 
            type="checkbox" 
            id="uniform" 
            className="w-6 h-6 accent-[#C5A059] bg-transparent border-gray-600 rounded focus:ring-0"
            checked={checklist.uniform}
            onChange={(e) => setChecklist(prev => ({ ...prev, uniform: e.target.checked }))}
          />
          <label htmlFor="uniform" className="text-lg font-['Montserrat'] font-bold text-gray-200">
            Uniforme Completo
          </label>
        </div>
        <div className="h-px bg-gray-800"></div>
        <div className="flex items-center gap-4 p-2">
          <input 
            type="checkbox" 
            id="cnv" 
            className="w-6 h-6 accent-[#C5A059] bg-transparent border-gray-600 rounded focus:ring-0"
            checked={checklist.cnv}
            onChange={(e) => setChecklist(prev => ({ ...prev, cnv: e.target.checked }))}
          />
          <label htmlFor="cnv" className="text-lg font-['Montserrat'] font-bold text-gray-200">
            CNV e Documentos em Dia
          </label>
        </div>
      </TacticalCard>

      <TacticalButton 
        fullWidth 
        disabled={!checklist.uniform || !checklist.cnv}
        className={(!checklist.uniform || !checklist.cnv) ? 'opacity-50 cursor-not-allowed' : ''}
        onClick={() => {
          setReport(prev => ({ ...prev, officerReady: true }));
          setPhase(AppPhase.INCIDENT_LEVEL);
        }}
      >
        Confirmar e Prosseguir <ArrowRight size={18} />
      </TacticalButton>
    </div>
  );

  const renderLevelSelector = () => (
    <div className="animate-slide-up">
      <Header title="Nível de Força" subtitle="Selecione o nível máximo atingido na ocorrência" />
      
      <ForceScale 
        selectedLevel={report.forceLevel} 
        onSelect={(lvl) => setReport(prev => ({ ...prev, forceLevel: lvl }))} 
      />

      <TacticalButton 
        fullWidth 
        onClick={() => setPhase(AppPhase.INCIDENT_DETAILS)}
      >
        Continuar <ArrowRight size={18} />
      </TacticalButton>
    </div>
  );

  const renderDetailsInput = () => (
    <div className="animate-slide-up">
      <Header title="Relato do Incidente" subtitle="Descreva os fatos de forma direta" />

      <TacticalCard className="mb-6">
        <label className="block text-[#C5A059] text-xs font-bold uppercase mb-2">Entrevista Tática Digital</label>
        
        <div className="mb-4">
           <p className="text-sm text-gray-400 mb-2 italic">"Relate a agressão injusta. O meio utilizado foi moderado?"</p>
        </div>

        <textarea
          className="w-full h-40 bg-black/50 border border-gray-700 rounded p-4 text-white focus:border-[#C5A059] focus:outline-none resize-none font-['Inter']"
          placeholder="Ex: Eu estava no posto quando o indivíduo tentou entrar..."
          value={report.rawDescription}
          onChange={(e) => setReport(prev => ({ ...prev, rawDescription: e.target.value }))}
        ></textarea>

        <div className="mt-4 flex justify-between items-center">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin size={12} /> {report.location ? `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}` : "Buscando GPS..."}
          </span>
          <button 
            onClick={toggleMic}
            className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-900/50 text-red-500 animate-pulse' : 'bg-gray-800 text-[#C5A059] hover:bg-gray-700'}`}
          >
            <Mic size={20} />
          </button>
        </div>
      </TacticalCard>

      <TacticalButton 
        fullWidth 
        disabled={report.rawDescription.length < 10}
        className={report.rawDescription.length < 10 ? 'opacity-50' : ''}
        onClick={processReport}
      >
        Processar com IA <FileText size={18} />
      </TacticalButton>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 border-4 border-[#1C1C1E] rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#C5A059] rounded-full border-t-transparent animate-spin"></div>
        <ShieldCheck className="absolute inset-0 m-auto text-[#C5A059]" size={32} />
      </div>
      <h2 className="text-xl font-['Montserrat'] font-bold text-white mb-2">Processando Inteligência</h2>
      <p className="text-gray-400 text-sm max-w-xs">{APP_STRINGS.PROCESSING}</p>
    </div>
  );

  const renderResult = () => (
    <div className="animate-slide-up pb-20">
       <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-['Montserrat'] font-extrabold text-[#C5A059] uppercase">Relatório Final</h1>
        <div className="flex items-center gap-2 px-2 py-1 bg-green-900/20 border border-green-800 rounded text-green-500 text-[10px] uppercase font-bold">
           <CheckCircle2 size={12} /> Validado
        </div>
      </div>

      <div className="space-y-4">
        <div className={`p-3 rounded border-l-4 ${FORCE_LEVEL_DETAILS[report.forceLevel].borderColor} bg-[#1C1C1E]`}>
           <span className="text-xs text-gray-400 uppercase block">Nível de Força Aplicado</span>
           <span className={`font-bold font-['Montserrat'] ${FORCE_LEVEL_DETAILS[report.forceLevel].color}`}>
             {report.forceLevel} - {FORCE_LEVEL_DETAILS[report.forceLevel].label}
           </span>
        </div>

        <TacticalCard>
           <div className="flex items-center gap-2 mb-2 text-[#C5A059]">
              <ShieldCheck size={16} />
              <span className="text-xs font-bold uppercase">Amparo Legal</span>
           </div>
           <p className="text-sm text-gray-300 font-medium">
             {report.legalJustification}
           </p>
        </TacticalCard>

        <div className="grid gap-4">
          <div className="p-4 rounded bg-[#0A0A0A] border border-gray-800">
             <span className="text-xs text-gray-500 uppercase block mb-2">Seu Relato (Bruto)</span>
             <p className="text-sm text-gray-400 italic">"{report.rawDescription}"</p>
          </div>

          <div className="p-4 rounded bg-[#1C1C1E] border border-[#C5A059]/40 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                <ShieldCheck size={100} />
             </div>
             
             <span className="text-xs text-[#C5A059] uppercase block mb-2 font-bold">Escrita Tática (Refinada)</span>
             <p className="text-sm text-white leading-relaxed whitespace-pre-line">
               {report.refinedDescription}
             </p>
             
             <div className="mt-4 pt-3 border-t border-gray-800 flex justify-end">
                <span className="text-[10px] text-[#C5A059] flex items-center gap-1">
                   <ShieldCheck size={10} /> {APP_STRINGS.COMPLIANCE_SEAL}
                </span>
             </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
           <TacticalButton fullWidth onClick={handleCopy}>
              <Share size={18} /> Copiar Relatório Tático
           </TacticalButton>
        </div>
        
        <div className="flex justify-center mt-4">
             <button onClick={handleReset} className="text-gray-500 text-sm flex items-center gap-2 hover:text-white transition-colors">
                <RotateCcw size={14} /> Novo Relatório
             </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-[#C5A059] selection:text-black">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-[#1C1C1E] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-[#1C1C1E] rounded flex items-center justify-center border border-[#C5A059]/20">
              <ShieldCheck size={18} color={COLORS.AGED_GOLD} />
           </div>
           <span className="font-['Montserrat'] font-bold text-sm tracking-wider">ATIV</span>
        </div>
        
        <div className="flex items-center gap-2">
          <a 
            href="https://ativbrasil.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-900/20 text-green-500 border border-green-500/50 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide hover:bg-green-600 hover:text-white transition-all text-center"
          >
             Treinamentos
          </a>

          <button 
             onClick={handlePanic}
             className="bg-red-900/20 text-[#D32F2F] border border-[#D32F2F]/50 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 animate-pulse hover:bg-[#D32F2F] hover:text-white transition-all"
          >
             <AlertOctagon size={14} /> SOS
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-5 pb-10">
        {phase === AppPhase.WELCOME && renderWelcome()}
        {phase === AppPhase.MOOD_CHECK && renderMoodCheck()}
        {phase === AppPhase.READINESS && renderReadiness()}
        {phase === AppPhase.INCIDENT_LEVEL && renderLevelSelector()}
        {phase === AppPhase.INCIDENT_DETAILS && renderDetailsInput()}
        {phase === AppPhase.PROCESSING && renderProcessing()}
        {phase === AppPhase.RESULT && renderResult()}

        {phase !== AppPhase.MOOD_CHECK && <Disclaimer />}
      </main>
    </div>
  );
};

export default App;
