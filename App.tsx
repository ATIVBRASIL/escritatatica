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

// ... (imports permanecem os mesmos)

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
  
  // Novo estado para controle de uso (Prevenção de Abuso)
  const [dailyUsageCount, setDailyUsageCount] = useState(0); 
  const DAILY_LIMIT = 5;
  const CHAR_LIMIT = 2000;

  // ... (Efeito de geolocalização permanece igual) [cite: 19, 20]

  // REMOVIDO: handlePanic [cite: 21]

  const processReport = async () => {
    if (dailyUsageCount >= DAILY_LIMIT) {
      alert("Limite operacional diário atingido (5/5).");
      return;
    }
    
    setPhase(AppPhase.PROCESSING);
    const refinedText = await refineIncidentReport(report.rawDescription, report.forceLevel);
    setReport(prev => ({
      ...prev,
      refinedDescription: refinedText,
      legalJustification: FORCE_LEVEL_DETAILS[prev.forceLevel].legal
    }));
    
    setDailyUsageCount(prev => prev + 1); // Incrementa o uso
    setPhase(AppPhase.RESULT);
  };

  // ... (handleCopy, toggleMic, handleReset permanecem iguais) [cite: 24, 26, 28]

  // --- Renderers Atualizados ---

  const renderDetailsInput = () => (
    <div className="animate-slide-up">
      <Header title="Relato do Incidente" subtitle="Descreva os fatos de forma direta" />

      <TacticalCard className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-[#C5A059] text-xs font-bold uppercase">Entrevista Tática Digital</label>
          {/* Contador de Caracteres Implementado */}
          <span className={`text-[10px] font-mono ${report.rawDescription.length >= CHAR_LIMIT ? 'text-red-500' : 'text-gray-500'}`}>
            {report.rawDescription.length} / {CHAR_LIMIT}
          </span>
        </div>
        
        <div className="mb-4">
           <p className="text-sm text-gray-400 mb-2 italic">"Relate a agressão injusta. O meio utilizado foi moderado?"</p>
        </div>

        <textarea
          className="w-full h-40 bg-black/50 border border-gray-700 rounded p-4 text-white focus:border-[#C5A059] focus:outline-none resize-none font-['Inter']"
          placeholder="Ex: Eu estava no posto quando o indivíduo tentou entrar..."
          value={report.rawDescription}
          maxLength={CHAR_LIMIT} // Trava de 2.000 caracteres 
          onChange={(e) => setReport(prev => ({ ...prev, rawDescription: e.target.value }))}
        ></textarea>

        <div className="mt-4 flex justify-between items-center">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin size={12} /> {report.location ?
            `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}` : "Buscando GPS..."}
          </span>
          <button 
            onClick={toggleMic}
            className={`p-3 rounded-full transition-colors ${isListening ?
            'bg-red-900/50 text-red-500 animate-pulse' : 'bg-gray-800 text-[#C5A059] hover:bg-gray-700'}`}
          >
            <Mic size={20} />
          </button>
        </div>
      </TacticalCard>

      <TacticalButton 
        fullWidth 
        disabled={report.rawDescription.length < 10 || dailyUsageCount >= DAILY_LIMIT}
        className={(report.rawDescription.length < 10 || dailyUsageCount >= DAILY_LIMIT) ? 'opacity-50' : ''}
        onClick={processReport}
      >
        {dailyUsageCount >= DAILY_LIMIT ? "Limite Diário Atingido" : "Processar com IA"} <FileText size={18} />
      </TacticalButton>
      
      {dailyUsageCount >= DAILY_LIMIT && (
        <p className="text-center text-red-500 text-[10px] mt-2 uppercase font-bold tracking-tighter">
          Atingiu o limite de 5 relatos hoje.
        </p>
      )}
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

          {/* O BOTÃO SOS FOI REMOVIDO DAQUI [cite: 73, 74] */}
        </div>
      </header>

      <main className="max-w-md mx-auto p-5 pb-10">
        {/* ... (as fases de renderização permanecem as mesmas) [cite: 75] */}
      </main>
    </div>
  );
};

export default App;
