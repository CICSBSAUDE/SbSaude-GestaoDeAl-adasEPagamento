import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Clock,
  User,
  Layers,
  CheckCircle,
  FileText,
  Lock,
} from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('TODAS');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        entidade: selectedEntity !== 'TODAS' ? selectedEntity : undefined,
      });
      setLogs(res.logs || []);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedEntity]);

  const filtered = logs.filter((l) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = l.descricao.toLowerCase().includes(q);
      const matchUser = l.usuarioNome.toLowerCase().includes(q);
      const matchNum = l.solicitacaoNumero?.toLowerCase().includes(q);
      const matchAcao = l.acao.toLowerCase().includes(q);
      if (!matchDesc && !matchUser && !matchNum && !matchAcao) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <span>Trilha de Auditoria Digital Imutável</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-mono border border-blue-200 dark:border-blue-800/50 font-bold">
                  ISO 9001:2015 7.5
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registro cronológico não-repudiável de todas as ações, transições de status, aprovações de alçadas e liquidações.
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm block">
              {logs.length}
            </span>
            <span>Eventos Auditados</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por descrição, usuário, número da solicitação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
          />
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
          >
            <option value="TODAS">Todas as Entidades</option>
            <option value="SOLICITACAO">Solicitações</option>
            <option value="APROVACAO">Aprovações de Alçada</option>
            <option value="CONFERENCIA_FINANCEIRA">Conferência Financeira</option>
            <option value="PAGAMENTO">Pagamento Tesouraria</option>
            <option value="MATRIZ_ALCADA">Matriz de Alçadas</option>
            <option value="USUARIO">Usuários & Permissões</option>
            <option value="AUTENTICACAO">Autenticação & Acessos</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">Carregando logs de auditoria...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">Nenhum registro encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Data / Hora (UTC-3)</th>
                  <th className="py-3 px-4">Usuário / Cargo</th>
                  <th className="py-3 px-4">Entidade</th>
                  <th className="py-3 px-4">Ação Realizada</th>
                  <th className="py-3 px-4">Descrição do Evento</th>
                  <th className="py-3 px-4">IP / Origem</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800 dark:text-slate-100">{log.usuarioNome}</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{log.usuarioCargo}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                        {log.entidade}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                      {log.acao}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm">
                      <p className="truncate">{log.descricao}</p>
                      {log.solicitacaoNumero && (
                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          Ref: {log.solicitacaoNumero}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(log.valoresAnteriores || log.valoresPosteriores) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-700 transition"
                        >
                          Payload
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Dados do Evento de Auditoria ({selectedLog.acao})</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Descrição:</span>
                <p className="text-slate-800 dark:text-slate-200">{selectedLog.descricao}</p>
              </div>

              {selectedLog.valoresAnteriores && (
                <div>
                  <span className="text-amber-700 dark:text-amber-400 block text-[10px] uppercase font-bold mb-1">
                    Estado Anterior:
                  </span>
                  <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-amber-800 dark:text-amber-300 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.valoresAnteriores, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.valoresPosteriores && (
                <div>
                  <span className="text-blue-700 dark:text-blue-400 block text-[10px] uppercase font-bold mb-1">
                    Estado Posterior (Gravado):
                  </span>
                  <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.valoresPosteriores, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
