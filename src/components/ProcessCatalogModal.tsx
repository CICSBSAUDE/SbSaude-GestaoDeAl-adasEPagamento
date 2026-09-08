import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { ProcessItem, RiskLevel } from '../types';
import { useAuth } from '../context/AuthContext';

interface ProcessCatalogModalProps {
  onClose: () => void;
}

export const ProcessCatalogModal: React.FC<ProcessCatalogModalProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.roles.includes('ADMINISTRADOR');

  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<ProcessItem>>({
    name: '',
    code: '',
    description: '',
    natureza: 'OPERACIONAL',
    riscoPadrao: 'MEDIO',
    requerJustificativaTecnica: false,
    permiteParcelamento: false,
  });

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const res = await api.getProcesses();
      setProcesses(res.processes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      natureza: 'OPERACIONAL',
      riscoPadrao: 'MEDIO',
      requerJustificativaTecnica: false,
      permiteParcelamento: false,
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (proc: ProcessItem) => {
    setEditingId(proc.id);
    setFormData({
      name: proc.name,
      code: proc.code,
      description: proc.description,
      natureza: proc.natureza,
      riscoPadrao: proc.riscoPadrao,
      requerJustificativaTecnica: proc.requerJustificativaTecnica,
      permiteParcelamento: proc.permiteParcelamento,
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o processo "${name}"? Essa ação pode afetar as regras de alçada.`)) return;
    try {
      await api.deleteProcess(id);
      showToast('Processo removido com sucesso!');
      fetchProcesses();
    } catch (err) {
      alert('Erro ao remover processo.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Nome do processo é obrigatório.');
      return;
    }
    
    try {
      if (editingId) {
        await api.updateProcess(editingId, formData);
        showToast('Processo atualizado com sucesso!');
      } else {
        await api.createProcess(formData);
        showToast('Processo criado com sucesso!');
      }
      setIsEditing(false);
      fetchProcesses();
    } catch (err) {
      alert('Erro ao salvar processo.');
    }
  };

  const filtered = processes.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-5xl w-full p-0 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Catálogo de Processos e Objetos</h3>
            <p className="text-xs text-slate-500 mt-1">Gerencie os processos padronizados que podem compor a Matriz de Alçada.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {toastMessage && (
          <div className="bg-emerald-50 text-emerald-800 px-4 py-2 border-b border-emerald-200 text-xs font-bold text-center flex items-center justify-center space-x-2 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* List Area */}
          <div className={`flex-1 flex flex-col ${isEditing ? 'hidden md:flex md:w-1/2 border-r border-slate-200' : 'w-full'}`}>
            <div className="p-4 bg-white border-b border-slate-100 shrink-0 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar processos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
              {isAdmin && !isEditing && (
                <button
                  onClick={handleOpenNew}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Processo</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="text-center py-10 text-sm text-slate-500">Carregando processos...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-500">Nenhum processo encontrado.</div>
              ) : (
                filtered.map(proc => (
                  <div key={proc.id} className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{proc.code}</span>
                          <span className="text-xs font-bold text-slate-800">{proc.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mb-2">{proc.description}</div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{proc.natureza}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${proc.riscoPadrao === 'ALTO' ? 'bg-red-50 text-red-700 border border-red-200' : proc.riscoPadrao === 'MEDIO' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>RISCO {proc.riscoPadrao}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition pl-3">
                          <button onClick={() => handleOpenEdit(proc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(proc.id, proc.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Form Area */}
          {isEditing && (
            <div className="w-full md:w-1/2 bg-white flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h4 className="font-bold text-slate-800 text-sm">
                  {editingId ? 'Editar Processo' : 'Novo Processo'}
                </h4>
                <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 rounded hover:bg-slate-100 transition">
                  Cancelar
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <form id="process-form" onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Objeto / Processo *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="Ex: Aquisição de Equipamentos de TI"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Código (Opcional)</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                      placeholder="Ex: PRC-TI-001"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      placeholder="Descreva o escopo e os detalhes do processo..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Natureza</label>
                      <select
                        value={formData.natureza}
                        onChange={e => setFormData({...formData, natureza: e.target.value as any})}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="OPERACIONAL">OPERACIONAL</option>
                        <option value="ASSISTENCIAL">ASSISTENCIAL</option>
                        <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                        <option value="JURIDICO">JURIDICO</option>
                        <option value="MARKETING">MARKETING</option>
                        <option value="RH">RH</option>
                        <option value="TI">TI</option>
                        <option value="FINANCEIRO">FINANCEIRO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Risco Padrão</label>
                      <select
                        value={formData.riscoPadrao}
                        onChange={e => setFormData({...formData, riscoPadrao: e.target.value as any})}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="BAIXO">BAIXO</option>
                        <option value="MEDIO">MÉDIO</option>
                        <option value="ALTO">ALTO</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.requerJustificativaTecnica}
                        onChange={e => setFormData({...formData, requerJustificativaTecnica: e.target.checked})}
                        className="rounded text-blue-600 focus:ring-blue-500/20 border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-700">Requer Justificativa Técnica/Parecer</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.permiteParcelamento}
                        onChange={e => setFormData({...formData, permiteParcelamento: e.target.checked})}
                        className="rounded text-blue-600 focus:ring-blue-500/20 border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-700">Permite Pagamento Parcelado</span>
                    </label>
                  </div>
                </form>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
                <button
                  type="submit"
                  form="process-form"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition"
                >
                  Salvar Processo
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};