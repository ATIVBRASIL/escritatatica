import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import {
  Users, CheckCircle, XCircle, RefreshCcw, ArrowLeft,
  Loader2, Download, Upload, UserPlus, Trash2, CheckSquare, Square, Calendar, FileEdit, Clock
} from 'lucide-react';
import { TacticalButton, TacticalCard } from './components/TacticalComponents';

interface AdminPanelProps { onBack: () => void; }

/**
 * Normaliza qualquer formato comum de data para "YYYY-MM-DD" (compatível com <input type="date">).
 * Aceita:
 * - "YYYY-MM-DD"
 * - "YYYY-MM-DDTHH:mm:ss..."
 * - "DD/MM/YYYY" ou "DD/MM/YY" (assume 20xx quando YY)
 * - Date ou timestamp
 */
const toISODate = (v: any): string => {
  if (!v) return '';

  if (typeof v === 'string') {
    // Já está no formato esperado pelo input
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    // ISO com hora -> corta para YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);

    // BR: DD/MM/YYYY ou DD/MM/YY
    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(v)) {
      const [dd, mm, yyRaw] = v.split('/');
      const yyyy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw; // assume século 2000
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Tenta converter como Date (Date, timestamp, string parseável)
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

/** Exibe ISO "YYYY-MM-DD" como "DD/MM/AAAA" */
const formatDateBR = (v: any): string => {
  const iso = toISODate(v);
  if (!iso) return '---';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAllProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('email', { ascending: true });
    if (data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => { fetchAllProfiles(); }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const updateProfileField = async (id: string, field: string, value: any) => {
    await supabase.from('profiles').update({ [field]: value }).eq('id', id);
    fetchAllProfiles();
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 animate-fade-in text-gray-200 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} /> <span className="text-[10px] font-bold uppercase tracking-widest text-white">Retornar</span>
          </button>
          <h1 className="text-[#C5A059] font-bold tracking-tighter text-xl uppercase italic">Painel do Comandante ATIV</h1>
        </div>

        {/* Barra de Ferramentas Operacionais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <TacticalButton onClick={() => fileInputRef.current?.click()} variant="outline" className="text-[10px]">
            <Upload size={14} className="mr-2" /> Importar CSV
          </TacticalButton>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" />

          <TacticalButton onClick={() => {}} variant="outline" className="text-[10px]">
            <Download size={14} className="mr-2" /> Exportar Lista
          </TacticalButton>

          <TacticalButton onClick={() => alert("Cadastre no Auth primeiro")} className="text-[10px] bg-blue-900/20 text-blue-400">
            <UserPlus size={14} className="mr-2" /> + Recrutar
          </TacticalButton>

          <TacticalButton
            onClick={() => {}}
            disabled={selectedIds.length === 0}
            className={`text-[10px] ${selectedIds.length > 0 ? 'bg-red-900/40 text-red-500' : 'opacity-30'}`}
          >
            <Trash2 size={14} className="mr-2" /> Excluir ({selectedIds.length})
          </TacticalButton>
        </div>

        {/* Tabela de Operadores */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C5A059]" size={40} /></div>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <TacticalCard key={profile.id} className={`border-l-4 ${profile.is_active ? 'border-l-green-600' : 'border-l-red-600'}`}>
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <button onClick={() => toggleSelect(profile.id)} className="text-gray-600">
                    {selectedIds.includes(profile.id) ? <CheckSquare size={20} className="text-[#C5A059]" /> : <Square size={20} />}
                  </button>

                  <div className="flex-1">
                    <p className="text-white font-bold text-xs mb-1">{profile.email}</p>

                    <div className="flex flex-wrap gap-4 text-[9px] uppercase font-bold text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        Visto: {profile.last_active_at ? new Date(profile.last_active_at).toLocaleDateString() : '---'}
                      </span>

                      {/* AJUSTE AQUI: exibição BR + input sempre em ISO */}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Expira: {formatDateBR(profile.expires_at)}
                        <input
                          type="date"
                          value={toISODate(profile.expires_at)}
                          onChange={(e) => updateProfileField(profile.id, 'expires_at', e.target.value)}
                          className="bg-transparent border-none text-[#C5A059] focus:outline-none cursor-pointer"
                        />
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-8 px-4 border-x border-gray-800 hidden lg:flex">
                    <div className="text-center">
                      <p className="text-[8px] text-gray-500 uppercase">Diário</p>
                      <p className="text-[#C5A059] font-bold text-sm">{profile.daily_usage_count || 0}/5</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-gray-500 uppercase">Total</p>
                      <p className="text-white font-bold text-sm">{profile.total_usage_count || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex-1 md:w-48 relative">
                      <FileEdit size={12} className="absolute left-2 top-2 text-gray-600" />
                      <input
                        placeholder="Notas Administrativas..."
                        value={profile.admin_notes || ''}
                        onBlur={(e) => updateProfileField(profile.id, 'admin_notes', (e.target as HTMLInputElement).value)}
                        className="w-full bg-black/40 border border-gray-800 rounded p-1.5 pl-7 text-[10px] focus:border-[#C5A059] outline-none text-white"
                      />
                    </div>

                    <button
                      onClick={() => updateProfileField(profile.id, 'is_active', !profile.is_active)}
                      className={`px-4 py-2 rounded text-[10px] font-bold uppercase transition-all ${profile.is_active ? 'bg-green-900/20 text-green-500 border border-green-500/30' : 'bg-red-900/20 text-red-500 border border-red-500/30'}`}
                    >
                      {profile.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
              </TacticalCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
