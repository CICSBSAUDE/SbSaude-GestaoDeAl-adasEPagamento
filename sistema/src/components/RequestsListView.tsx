import React, { useState } from 'react';
import { Solicitacao } from '../types';
import {
  Search,
  Download,
  Eye,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';

interface RequestsListViewProps {
  requests: Solicitacao[];
  onOpenRequest: (request: Solicitacao) => void;
  onOpenExportModal: () => void;
  onNewRequestClick: () => void;
  onRefresh?: () => void;
}

export const RequestsListView: React.FC<RequestsListViewProps> = ({
  requests,
  onOpenRequest,
  onOpenExportModal,
  onNewRequestClick,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedArea, setSelectedArea] = useState<string>('TODAS');
  const [selectedRisk, setSelectedRisk] = useState<string>('TODOS');

  // Extract unique areas
  const areas = Array.from(new Set(requests.map((r) => r.areaSolicitante))).filter(Boolean);

  const filtered = requests.filter((r) => {
    // Status
    if (selectedStatus !== 'TODOS' && r.status !== selectedStatus) return false;
    // Area
    if (selectedArea !== 'TODAS' && r.areaSolicitante !== selectedArea) return false;
    // Risk
    if (selectedRisk !== 'TODOS' && r.nivelRisco !== selectedRisk) return false;
    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNum = r.numero.toLowerCase().includes(q);
      const matchForn = r.fornecedorFavorecido.toLowerCase().includes(q);
      const matchObj = r.objetoDespesa.toLowerCase().includes(q);
      const matchSol = r.solicitanteNome.toLowerCase().includes(q);
      const matchProc = r.processoNome.toLowerCase().includes(q);
      const matchCpf = r.cpfCnpj?.toLowerCase().includes(q);
      if (!matchNum && !matchForn && !matchObj && !matchSol && !matchProc && !matchCpf) {
        return false;
      }
    }
    return true;
  });

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Registro de Solicitações (FOR-FIN-01)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta consolidada de autorizações de pagamento, trilha de assinaturas e alçadas da POL-DIR-01.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenExportModal}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Exportar Relatório</span>
          </button>
          <button
            onClick={onNewRequestClick}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Solicitação</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="AGUARDANDO_1_ALCADA">Aguardando 1ª Alçada</option>
              <option value="AGUARDANDO_2_ALCADA">Aguardando 2ª Alçada</option>
              <option value="AGUARDANDO_3_ALCADA">Aguardando 3ª Alçada</option>
              <option value="AGUARDANDO_4_ALCADA">Aguardando 4ª Alçada</option>
              <option value="AGUARDANDO_FINANCEIRO">Aguardando Financeiro</option>
              <option value="LIBERADA_PAGAMENTO">Liberada para Pagamento</option>
              <option value="PAGAMENTO_EFETUADO">Pagamento Efetuado (Concluído)</option>
              <option value="REPROVADA">Reprovada</option>
              <option value="DEVOLVIDA_CORRECAO">Devolvida para Correção</option>
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            >
              <option value="TODAS">Todas as Áreas Solicitantes</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            >
              <option value="TODOS">Todos os Níveis de Risco</option>
              <option value="BAIXO">Risco Baixo</option>
              <option value="MEDIO">Risco Médio</option>
              <option value="ALTO">Risco Alto (OPME / ANS / Jurídico)</option>
            </select>
          </div>

        </div>

        {/* Results summary tag */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Exibindo <strong className="text-blue-600">{filtered.length}</strong> de{' '}
            {requests.length} solicitação(ões)
          </span>
          {(selectedStatus !== 'TODOS' || selectedArea !== 'TODAS' || selectedRisk !== 'TODOS' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedStatus('TODOS');
                setSelectedArea('TODAS');
                setSelectedRisk('TODOS');
                setSearchTerm('');
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs p-6">
            Nenhuma solicitação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">ID FOR-FIN-01</th>
                  <th className="py-3 px-5">Processo & Objeto</th>
                  <th className="py-3 px-5">Solicitante & Área</th>
                  <th className="py-3 px-5">Favorecido / CNPJ</th>
                  <th className="py-3 px-5 text-right">Valor Total</th>
                  <th className="py-3 px-5 text-center">Risco</th>
                  <th className="py-3 px-5">Alçada</th>
                  <th className="py-3 px-5">Vencimento</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {r.numero}
                      <span className="block text-[9px] text-slate-400 font-sans font-normal">
                        {r.dataSolicitacao}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-800 truncate max-w-xs">{r.processoNome}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-xs">{r.objetoDespesa}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-medium text-slate-800">{r.solicitanteNome}</p>
                      <p className="text-[10px] text-slate-400">{r.areaSolicitante}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-medium text-slate-800">{r.fornecedorFavorecido}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.cpfCnpj || '—'}</p>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-right text-slate-800 font-mono whitespace-nowrap">
                      {formatCurrency(r.valorTotal)}
                    </td>
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.nivelRisco === 'ALTO'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : r.nivelRisco === 'MEDIO'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {r.nivelRisco}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                        {r.alcadaAplicavelMaxima}ª Alçada
                      </span>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-slate-700">
                          {new Date(r.dataVencimento).toLocaleDateString('pt-BR')}
                        </span>
                        {r.alertaVencimentoProximo && (
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-bold border border-red-200">
                            {r.diasUteisAteVencimento}d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.status.startsWith('AGUARDANDO_')
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : r.status === 'LIBERADA_PAGAMENTO'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : r.status === 'PAGAMENTO_EFETUADO'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onOpenRequest(r)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white font-bold text-xs border border-slate-200 hover:border-blue-600 transition flex items-center space-x-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Abrir</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

