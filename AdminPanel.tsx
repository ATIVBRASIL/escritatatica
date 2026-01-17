import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import {
  Users, CheckCircle, XCircle, RefreshCcw, ArrowLeft,
  Loader2, Download, Upload, UserPlus, Trash2, CheckSquare, Square, Calendar, FileEdit, Clock, Zap
} from 'lucide-react';
import { TacticalButton, TacticalCard } from './components/TacticalComponents';

interface AdminPanelProps { onBack: () => void; }

// --- UTILITÁRIOS ---

const toISODate = (v: any): string => {
  if (!v) return '';
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

// --- COMPONENTE: EDITOR DE DATA ---
const DateEditor = ({ initialValue, onSave }: { initialValue: any, onSave: (isoDate: string | null) => void }) => {
  const formatToDisplay = (iso: string) => {
    if (!iso) return '';
    const datePart = iso.split('T')[0];
    const [y, m, d] = datePart.split('-');
    return (y && m && d) ? `${d}/${m}/${y}` : '';
  };

  const [value, setValue] = useState(formatToDisplay(toISODate(initialValue)));

  useEffect(() => { setValue(formatToDisplay(toISODate(initialValue))); }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    else if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    setValue(v);
  };

  const handleBlur = () => {
    if (!value) { onSave(null); return; }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split('/');
      const isoDate = `${y}-${m}-${d}`;
      if (isoDate !== toISODate(initialValue)) onSave(isoDate);
    } else {
      setValue(formatToDisplay(toISODate(initialValue)));
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="DD/MM/AAAA"
      className="bg-transparent border-b border-gray-800 text-[#C5A059] focus:border-[#C5A059] focus:outline-none cursor-text w-24 text-center tracking-wide placeholder-gray-700 hover:border-gray-600 transition-colors"
    />
  );
};

// --- COMPONENTE PRINCIPAL ---

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAllProfiles = async () => {
    setLoading(true);
    // Certifique-se de que a coluna daily_limit existe no banco, senão ela virá null
    const { data } = await supabase.from('profiles').select('*').order('email', { ascending: true });
    if (data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => { fetchAllProfiles(); }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const updateProfileField = async (id: string, field: string, value: any) => {
    // Atualiza localmente para parecer instantâneo (Optimistic UI)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    
    // Envia para o banco
    await supabase.from('profiles').update({ [field]: value }).eq('id', id);
    
    // Recarrega para garantir sincronia (opcional, pode remover se quiser mais performance)
    // fetchAllProfiles(); 
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

        {/* Barra de Ferramentas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <TacticalButton onClick={() => fileInputRef.current?.click()} variant="outline" className="text-[10px]">
            <Upload size={14} className="mr-2" /> Importar CSV
          </TacticalButton>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" />

          <TacticalButton onClick={() => {}} variant="outline" className="text-[10px]">
            <Download size={14} className="mr-2" /> Exportar Lista
          </TacticalButton>

          <TacticalButton onClick={() => alert("Função em desenvolvimento")} className="text-[10px] bg-blue-900/20 text-blue-400">
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

        {/* Lista de Operadores */}
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
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Expira: 
                        <DateEditor 
                          initialValue={profile.expires_at}
                          onSave={(newValue) => updateProfileField(profile.id, 'expires_at', newValue)}
                        />
                      </span>
                    </div>
                  </div>

                  {/* PAINEL DE MUNIÇÃO (EDITÁVEL) */}
                  <div className="flex gap-8 px-4 border-x border-gray-800 hidden lg:flex">
                    <div className="text-center group relative">
                      <p className="text-[8px] text-gray-500 uppercase flex items-center justify-center gap-1">
                        <Zap size={8} /> Munição
                      </p>
                      <div className="flex items-center justify-center gap-1 text-[#C5A059] font-bold text-sm mt-1">
                        <span className={profile.daily_usage_count >= (profile.daily_limit || 5) ? "text-red-500" : ""}>
                          {profile.daily_usage_count || 0}
                        </span>
                        <span className="text-gray-700">/</span>
                        
                        <input
                          type="number"
                          min="0"
                          title="Clique para editar o limite diário"
                          className="w-8 bg-transparent border-b border-transparent hover:border-gray-700 focus:border-[#C5A059] text-center focus:outline-none text-[#C5A059] p-0 transition-colors"
                          value={profile.daily_limit ?? 5} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) updateProfileField(profile.id, 'daily_limit', val);
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-[8px] text-gray-500 uppercase">Total</p>
                      <p className="text-white font-bold text-sm mt-1">{profile.total_usage_count || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex-1 md:w-48 relative">
                      <FileEdit size={12} className="absolute left-2 top-2 text-gray-600" />
                      <input
                        placeholder="Notas Administrativas..."
                        value={profile.admin_notes || ''}
                        onBlur={(e) => updateProfileField(profile.id, 'admin_notes', (e.target as HTMLInputElement).value)}
                        className="w-full bg-black/40 border border-gray-800 rounded p-1.5 pl-7 text-[10px] focus:border-[#C5A059] outline-none text-white placeholder-gray-700"
                      />
                    </div>

                    <button
                      onClick={() => updateProfileField(profile.id, 'is_active', !profile.is_active)}
                      className={`px-4 py-2 rounded text-[10px] font-bold uppercase transition-all ${profile.is_active ? 'bg-green-900/20 text-green-500 border border-green-500/30 hover:bg-green-900/30' : 'bg-red-900/20 text-red-500 border border-red-500/30 hover:bg-red-900/30'}`}
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