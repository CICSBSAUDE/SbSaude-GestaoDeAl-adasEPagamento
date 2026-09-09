import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Solicitacao } from '../types';
import {
  Inbox,
  CheckCircle,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface MyQueueViewProps {
  requests: Solicitacao[];
  onOpenRequest: (request: Solicitacao) => void;
  onNavigateTab: (tab: any) => void;
  onOpenNewRequest?: () => void;
}

export const MyQueueView: React.FC<MyQueueViewProps> = ({
  requests,
  onOpenRequest,
  onNavigateTab,
  onOpenNewRequest,
}) => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  // Filter requests strictly to show only those created/submitted by the logged-in user
  const myQueueRequests = requests.filter((r) => {
    if (!currentUser) return false;
    return (
      r.solicitanteId === currentUser.id ||
      (r.solicitanteEmail && r.solicitanteEmail.toLowerCase() === currentUser.email?.toLowerCase())
    );
  });

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Profile Summary */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shadow-blue-200">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Minha Fila de Solicitações</h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-900/40">
                {myQueueRequests.length} solicitação(ões)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Solicitante: <strong className="text-slate-700 dark:text-slate-200">{currentUser.name}</strong> &bull; Cargo: <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentUser.cargo}</span> ({currentUser.area})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {currentUser.roles.map((role) => (
            <span
              key={role}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-semibold border border-slate-200 dark:border-slate-700"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Queue Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {myQueueRequests.length === 0 ? (
          <div className="py-12 text-center p-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3 border border-slate-200 dark:border-slate-700">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Nenhuma solicitação encontrada</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Você ainda não originou nenhuma solicitação no sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
               <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-5">ID da Solicitação</th>
                  <th className="py-3 px-5">Processo / Favorecido</th>
                  <th className="py-3 px-5">Solicitante</th>
                  <th className="py-3 px-5 text-right">Valor Total</th>
                  <th className="py-3 px-5">Alçada</th>
                  <th className="py-3 px-5">Vencimento</th>
                  <th className="py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myQueueRequests.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      onClick={() => onOpenRequest(r)}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer group"
                      title="Clique para visualizar e acompanhar a solicitação"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                        {r.numero}
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">{r.processoNome}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{r.fornecedorFavorecido}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{r.solicitanteNome}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{r.areaSolicitante}</p>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-right text-slate-800 dark:text-slate-100 font-mono whitespace-nowrap">
                        {formatCurrency(r.valorTotal)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                          {r.alcadaAplicavelMaxima}ª Alçada
                        </span>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">
                            {new Date(r.dataVencimento).toLocaleDateString('pt-BR')}
                          </span>
                          {r.alertaVencimentoProximo && (
                            <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[9px] font-bold border border-red-200 dark:border-red-800/50">
                              {r.diasUteisAteVencimento}d
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status.startsWith('AGUARDANDO_')
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                            : r.status === 'LIBERADA_PAGAMENTO'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
                            : r.status === 'PAGAMENTO_EFETUADO'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                        }`}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

