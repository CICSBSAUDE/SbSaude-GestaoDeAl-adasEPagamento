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
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shadow-blue-200">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800">Minha Fila de Solicitações</h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                {myQueueRequests.length} solicitação(ões)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Solicitante: <strong className="text-slate-700">{currentUser.name}</strong> &bull; Cargo: <span className="text-blue-600 font-semibold">{currentUser.cargo}</span> ({currentUser.area})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {currentUser.roles.map((role) => (
            <span
              key={role}
              className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold border border-slate-200"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Queue Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {myQueueRequests.length === 0 ? (
          <div className="py-12 text-center p-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3 border border-slate-200">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Nenhuma solicitação encontrada</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Você ainda não originou nenhuma solicitação FOR-FIN-01 no sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">ID FOR-FIN-01</th>
                  <th className="py-3 px-5">Processo / Favorecido</th>
                  <th className="py-3 px-5">Solicitante</th>
                  <th className="py-3 px-5 text-right">Valor Total</th>
                  <th className="py-3 px-5">Alçada</th>
                  <th className="py-3 px-5">Vencimento</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myQueueRequests.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-blue-600">
                        {r.numero}
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-800 truncate max-w-xs">{r.processoNome}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{r.fornecedorFavorecido}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-slate-800">{r.solicitanteNome}</p>
                        <p className="text-[10px] text-slate-400">{r.areaSolicitante}</p>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-right text-slate-800 font-mono whitespace-nowrap">
                        {formatCurrency(r.valorTotal)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                          {r.alcadaAplicavelMaxima}ª Alçada
                        </span>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-slate-700 text-xs">
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
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1 ml-auto cursor-pointer"
                        >
                          <span>Acompanhar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
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

