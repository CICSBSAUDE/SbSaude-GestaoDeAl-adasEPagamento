import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Solicitacao } from '../types';
import {
  Inbox,
  CheckCircle,
  ArrowRight,
  UserCheck,
  Plus,
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

  // Filter requests relevant to current logged-in persona
  const myQueueRequests = requests.filter((r) => {
    // 1. Solicitante: requests created by me
    if (currentUser.roles.includes('SOLICITANTE') && r.solicitanteId === currentUser.id) {
      return true;
    }
    // 2. Approver: pending in current active stage
    if (r.status.startsWith('AGUARDANDO_') && r.cadeiaAprovacao) {
      const pendingEtapa = r.cadeiaAprovacao.find((e) => e.status === 'PENDENTE');
      if (pendingEtapa) {
        if (pendingEtapa.aprovadorDesignadoId === currentUser.id) return true;
        const matchRole =
          (pendingEtapa.nivel === 1 && currentUser.roles.includes('APROVADOR_1')) ||
          (pendingEtapa.nivel === 2 && currentUser.roles.includes('APROVADOR_2')) ||
          (pendingEtapa.nivel === 3 && currentUser.roles.includes('APROVADOR_3')) ||
          (pendingEtapa.nivel === 4 && currentUser.roles.includes('APROVADOR_4'));
        if (matchRole) return true;
      }
    }
    // 3. Finance
    if (
      currentUser.roles.includes('FINANCEIRO') &&
      (r.status === 'AGUARDANDO_FINANCEIRO' || r.status === 'EM_CONFERENCIA_FINANCEIRA')
    ) {
      return true;
    }
    // 4. Treasury
    if (currentUser.roles.includes('TESOURARIA') && r.status === 'LIBERADA_PAGAMENTO') {
      return true;
    }
    // 5. Admin
    if (currentUser.roles.includes('ADMINISTRADOR') || currentUser.roles.includes('COMPLIANCE')) {
      return true;
    }
    return false;
  });

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleCreate = () => {
    if (onOpenNewRequest) onOpenNewRequest();
    else onNavigateTab('NOVA_SOLICITACAO');
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
              <h2 className="text-sm font-bold text-slate-800">Minha Fila de Trabalho</h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                {myQueueRequests.length} pendência(s)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Usuário: <strong className="text-slate-700">{currentUser.name}</strong> &bull; Cargo: <span className="text-blue-600 font-semibold">{currentUser.cargo}</span> ({currentUser.area})
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
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 border border-emerald-100">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Fila Vazia</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Não há nenhuma solicitação pendente sob sua responsabilidade direta no momento.
            </p>
            {currentUser.roles.includes('SOLICITANTE') && (
              <button
                onClick={handleCreate}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
              >
                + Criar Nova Solicitação
              </button>
            )}
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
                  const isCreatedByMe = r.solicitanteId === currentUser.id;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-blue-600">
                        {r.numero}
                        {isCreatedByMe && (
                          <span className="block text-[9px] text-slate-400 font-sans font-medium">
                            (Criado por você)
                          </span>
                        )}
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
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1 ml-auto"
                        >
                          <span>Avaliar</span>
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

