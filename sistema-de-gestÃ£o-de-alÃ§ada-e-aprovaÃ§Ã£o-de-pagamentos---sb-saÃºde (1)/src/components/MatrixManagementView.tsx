import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MatrizAlcada, RegraAlcada, RiskLevel } from '../types';
import {
  TableProperties,
  Layers,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  History,
  Sparkles,
  Shield,
  Edit,
  Download,
  Info,
} from 'lucide-react';

export const MatrixManagementView: React.FC = () => {
  const { currentUser } = useAuth();

  const [matrices, setMatrices] = useState<MatrizAlcada[]>([]);
  const [selectedMatrixId, setSelectedMatrixId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('TODOS');

  // Modal for new version
  const [showNewVersionModal, setShowNewVersionModal] = useState<boolean>(false);
  const [novaVersao, setNovaVersao] = useState<string>('Rev. 01');
  const [novoTitulo, setNovoTitulo] = useState<string>('Política de Alçada — Revisão 2026/2028');
  const [historicoAlteracoes, setHistoricoAlteracoes] = useState<string>('Atualização dos tetos mensais e alçadas de suprimentos e TI.');

  const fetchMatrices = async () => {
    setLoading(true);
    try {
      const res = await api.getMatrixVersions();
      setMatrices(res.matrices || []);
      const active = res.matrices.find((m) => m.status === 'VIGENTE') || res.matrices[0];
      if (active) setSelectedMatrixId(active.id);
    } catch (err) {
      console.error('Failed to load matrices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrices();
  }, []);

  const selectedMatrix = matrices.find((m) => m.id === selectedMatrixId) || matrices[0];

  const filteredRules = (selectedMatrix?.regras || []).filter((r) => {
    if (selectedRisk !== 'TODOS' && r.risco !== selectedRisk) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = r.processoNome.toLowerCase().includes(q);
      const matchId = r.processoId.toLowerCase().includes(q);
      const matchCargos = (r.cargosHabilitados1 || []).join(' ').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCargos) return false;
    }
    return true;
  });

  const handleCreateVersion = async () => {
    if (!novaVersao) return;
    try {
      await api.createMatrixVersion({
        baseMatrixId: selectedMatrix?.id,
        novaVersao,
        titulo: novoTitulo,
        historicoAlteracoes,
      });
      setShowNewVersionModal(false);
      await fetchMatrices();
    } catch (e) {
      console.error('Failed to create matrix version', e);
    }
  };

  const handlePublish = async (matrixId: string) => {
    if (!confirm('Deseja publicar esta versão como a nova Matriz VIGENTE oficial da SB Saúde?')) return;
    try {
      await api.publishMatrix(matrixId);
      await fetchMatrices();
    } catch (e) {
      console.error('Failed to publish matrix', e);
    }
  };

  const formatCurrency = (val: number) => {
    if (!val || val === 0) return 'Conforme alçada máxima';
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Versioning Bar */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
                <TableProperties className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Matriz de Alçadas e Delegação de Autoridade (POL-DIR-01)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Catálogo corporativo com todos os 34 processos cadastrados, limites por evento, tetos mensais e cargos habilitados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Version Selector */}
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-600">Versão:</span>
              <select
                value={selectedMatrixId}
                onChange={(e) => setSelectedMatrixId(e.target.value)}
                className="bg-transparent text-xs text-blue-600 font-bold focus:outline-none cursor-pointer"
              >
                {matrices.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white text-slate-800">
                    {m.codigo} — {m.versao} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Create Version Button */}
            {currentUser?.roles.includes('ADMINISTRADOR') && (
              <button
                onClick={() => setShowNewVersionModal(true)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Nova Versão / Revisão</span>
              </button>
            )}

            {/* Publish Button if draft */}
            {selectedMatrix?.status === 'RASCUNHO' && currentUser?.roles.includes('ADMINISTRADOR') && (
              <button
                onClick={() => handlePublish(selectedMatrix.id)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Publicar como VIGENTE</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Matrix Metadata Pill */}
        {selectedMatrix && (
          <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Status:</span>
              <span className={`font-bold ${
                selectedMatrix.status === 'VIGENTE' ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {selectedMatrix.status}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Período de Vigência:</span>
              <span className="text-slate-800">{selectedMatrix.vigenciaInicio} a {selectedMatrix.vigenciaFim}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Aprovação Formal:</span>
              <span className="text-slate-800">{selectedMatrix.aprovacao}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total de Regras Ativas:</span>
              <span className="font-mono font-bold text-blue-600">{selectedMatrix.regras?.length || 0} processos</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por processo, cargo habilitado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition"
          >
            <option value="TODOS">Todos os Níveis de Risco</option>
            <option value="BAIXO">Risco Baixo</option>
            <option value="MEDIO">Risco Médio</option>
            <option value="ALTO">Risco Alto</option>
          </select>
          <span className="text-xs text-slate-500">
            {filteredRules.length} processo(s)
          </span>
        </div>
      </div>

      {/* Matrix Rules Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 rounded-l-lg">Nº / Processo</th>
                <th className="py-3 px-4">Risco</th>
                <th className="py-3 px-4">Alçada por Evento</th>
                <th className="py-3 px-4">Teto Mensal</th>
                <th className="py-3 px-4">Nível Requerido</th>
                <th className="py-3 px-4">1ª Alçada (Coord./Superv.)</th>
                <th className="py-3 px-4">2ª Alçada (Gerência)</th>
                <th className="py-3 px-4 rounded-r-lg">3ª / 4ª Alçada (Diretoria)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRules.map((regra, idx) => (
                <tr key={regra.id || idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-blue-600 font-bold">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="font-bold text-slate-800 mt-0.5">{regra.processoNome}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{regra.processoId}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      regra.risco === 'ALTO'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : regra.risco === 'MEDIO'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {regra.risco}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(regra.alçadaPorEvento)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {formatCurrency(regra.tetoMensal)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold whitespace-nowrap">
                      {regra.nivelMaximoRequerido}ª Alçada
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-800 max-w-xs truncate">
                      {(regra.cargosHabilitados1 || []).join(', ') || '—'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-800 max-w-xs truncate">
                      {(regra.cargosHabilitados2 || []).join(', ') || '—'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-800 max-w-xs truncate">
                      {(regra.cargosHabilitados3 || []).join(', ') || 'Diretoria Executiva'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nova Versão da Matriz */}
      {showNewVersionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Criar Nova Revisão da Matriz POL-DIR-01</span>
            </h3>
            <p className="text-xs text-slate-500">
              Isso criará uma versão em Rascunho clonando todas as 34 regras vigentes. As solicitações antigas continuarão vinculadas à versão em que foram submetidas para auditoria.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Código da Versão *</label>
                <input
                  type="text"
                  value={novaVersao}
                  onChange={(e) => setNovaVersao(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Título Descritivo *</label>
                <input
                  type="text"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Histórico de Alterações / Motivação</label>
                <textarea
                  rows={3}
                  value={historicoAlteracoes}
                  onChange={(e) => setHistoricoAlteracoes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowNewVersionModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateVersion}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200"
              >
                Criar Rascunho de Versão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
