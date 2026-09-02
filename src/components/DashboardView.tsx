import React from 'react';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Layers,
  Activity,
  Flame,
  FileSpreadsheet,
  FileCheck,
} from 'lucide-react';
import { Solicitacao } from '../types';

interface DashboardViewProps {
  stats?: any;
  dashboardData?: any;
  requests: Solicitacao[];
  onOpenRequest: (request: Solicitacao) => void;
  onNavigateTab: (tab: any) => void;
  onNavigateQueue?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  dashboardData,
  requests,
  onOpenRequest,
  onNavigateTab,
  onNavigateQueue,
}) => {
  const currentData = stats || dashboardData || {};
  const kpis = currentData?.kpis || {};
  const porAlcada = currentData?.porAlcada || {};
  const porRisco = currentData?.porRisco || {};
  const matriz = currentData?.matrizVigente || {};

  // High priority requests (due in <= 5 business days or high risk pending)
  const urgentRequests = requests
    .filter(
      (r) =>
        r.status !== 'PAGAMENTO_EFETUADO' &&
        r.status !== 'CANCELADA'
    )
    .slice(0, 6);

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const highRiskCount = porRisco.alto ?? requests.filter(r => r.nivelRisco === 'ALTO').length ?? 0;
  const pendingApprovals = kpis.aguardandoAprovacao ?? requests.filter(r => r.status.startsWith('AGUARDANDO_')).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Aguardando Ação */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
              Aguardando Aprovação
            </div>
            <div className="text-2xl font-bold text-red-600">
              {String(pendingApprovals).padStart(2, '0')}
            </div>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>+{kpis.proximasVencimento ?? 0} vencendo em 5d úteis</span>
          </div>
        </div>

        {/* Card 2: Volume em Aprovação */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
              Volume em Aprovação
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {formatCurrency(kpis.valorTotalEmAprovacao ?? 0)}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2">
            {pendingApprovals} solicitações ativas
          </div>
        </div>

        {/* Card 3: Volume Liquidado / Teto */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
              Total Liquidado (Pago)
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(kpis.valorTotalPago ?? 0)}
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
              <span>Teto Mensal Geral</span>
              <span className="font-semibold text-slate-700">0%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-[0%] bg-red-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Card 4: Risco Alto / Fracionamento */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
              Risco Alto Identificado
            </div>
            <div className="text-2xl font-bold text-red-600">
              {String(highRiskCount).padStart(2, '0')}
            </div>
          </div>
          <div className="text-[10px] text-red-500 font-semibold mt-2">
            Requer parecer e alçada 3ª/4ª
          </div>
        </div>

      </div>

      {/* Main Grid: Left Table (col-span 2) + Right Sidebar Actions/Ceiling (col-span 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Pending Requests Table */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-800">
                Solicitações Pendentes (Regra 4 Olhos & Alçadas)
              </h2>
              <p className="text-[11px] text-slate-500">
                Processos em andamento aguardando validação sob a POL-DIR-01
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('SOLICITACOES')}
              className="text-xs text-red-600 font-bold hover:underline"
            >
              Ver todas ({requests.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase">
                    ID / FOR-FIN-01
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase">
                    Processo / Favorecido
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">
                    Valor
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase text-center">
                    Risco
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase">
                    Status Atual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {urgentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      Nenhuma solicitação pendente no momento.
                    </td>
                  </tr>
                ) : (
                  urgentRequests.map((r) => {
                    const isHigh = r.nivelRisco === 'ALTO';
                    const isMed = r.nivelRisco === 'MEDIO';

                    let statusDotColor = 'bg-red-400';
                    let statusLabel = `${r.alcadaAplicavelMaxima}ª Alçada Pendente`;

                    if (r.status === 'AGUARDANDO_FINANCEIRO') {
                      statusDotColor = 'bg-amber-400';
                      statusLabel = 'Aguardando Financeiro';
                    } else if (r.status === 'LIBERADA_PAGAMENTO') {
                      statusDotColor = 'bg-emerald-400';
                      statusLabel = 'Liberada p/ Tesouraria';
                    } else if (r.status === 'PAGAMENTO_EFETUADO') {
                      statusDotColor = 'bg-emerald-600';
                      statusLabel = 'Pago (Liquidado)';
                    } else if (r.status === 'REPROVADA') {
                      statusDotColor = 'bg-red-500';
                      statusLabel = 'Reprovada';
                    }

                    return (
                      <tr
                        key={r.id}
                        onClick={() => onOpenRequest(r)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="text-xs font-bold text-slate-800 font-mono">
                            {r.numero}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {r.dataSolicitacao} &bull; {r.areaSolicitante}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-xs text-slate-800 truncate max-w-xs">
                            {r.processoNome}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {r.fornecedorFavorecido}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-right text-slate-800 font-mono whitespace-nowrap">
                          {formatCurrency(r.valorTotal)}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                              isHigh
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : isMed
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {r.nivelRisco}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusDotColor}`}></div>
                            <span className="text-xs text-slate-600 font-medium">
                              {statusLabel}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Column (1 Col): Quick Action & Ceiling Monitoring */}
        <aside className="flex flex-col gap-6">
          
          {/* Action Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-800">Ação Rápida</h3>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => onNavigateTab('MINHA_FILA')}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar Minha Fila de Solicitações</span>
              </button>
            </div>
          </div>

          {/* Ceiling Monitoring Widget */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-800">
                Monitoramento de Tetos (POL-DIR-01)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Mensal</span>
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                  <span>Rede Prestadores (P01)</span>
                  <span className="text-red-600">0%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-[0%] bg-red-500 rounded-full"></div>
                </div>
                <div className="text-[10px] text-slate-400">R$ 0 / R$ 500k</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                  <span>Reembolso Assistencial (P02)</span>
                  <span className="text-blue-600">0%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-[0%] bg-blue-600 rounded-full"></div>
                </div>
                <div className="text-[10px] text-slate-400">R$ 0 / R$ 20k</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                  <span>Treinamentos e RH (P18)</span>
                  <span className="text-emerald-600">0%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-[0%] bg-emerald-500 rounded-full"></div>
                </div>
                <div className="text-[10px] text-slate-400">R$ 0 / R$ 20k</div>
              </div>

              {/* Split purchase alert */}
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-1">
                <div className="text-[10px] font-bold text-amber-800 uppercase mb-0.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Alerta de Fracionamento (POL-DIR-01 7.2)</span>
                </div>
                <div className="text-[11px] text-amber-700 leading-tight">
                  Sistema monitora emissões sucessivas de mesmo CNPJ em janela de 30 dias para impedir fracionamento de alçada.
                </div>
              </div>
            </div>
          </div>

        </aside>

      </div>

      {/* Lower Row: Alçada Distribution + Risk Criteria Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tier Distribution Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <Layers className="w-4 h-4 text-red-600" />
              <span>Enquadramento por Alçada Máxima Requerida</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">POL-DIR-01</span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>1ª Alçada (Coordenação / Supervisão)</span>
                <span className="font-bold text-slate-800">{porAlcada.alcada1 ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-400 h-full rounded-full w-[0%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>2ª Alçada (Gerência da Área)</span>
                <span className="font-bold text-slate-800">{porAlcada.alcada2 ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full w-[0%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>3ª Alçada (Diretoria de Operações / Financeira)</span>
                <span className="font-bold text-slate-800">{porAlcada.alcada3 ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-600 h-full rounded-full w-[0%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>4ª Alçada (Diretoria Executiva / Conselho)</span>
                <span className="font-bold text-slate-800">{porAlcada.alcada4 ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-700 h-full rounded-full w-[0%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Qualitative Risk Criteria Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <Activity className="w-4 h-4 text-red-600" />
              <span>Critérios de Risco Assistencial & Regulatório (Item 6.3)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">RN ANS nº 518</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-700">BAIXO</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{porRisco.baixo ?? 0}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Rotina operacional</p>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-700">MÉDIO</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{porRisco.medio ?? 0}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Impacto tático</p>
            </div>

            <div className="p-3 rounded-lg bg-red-50/70 border border-red-200">
              <span className="text-[10px] font-bold text-red-600">ALTO</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{porRisco.alto ?? 0}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">OPME / ANS / Liminares</p>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-600 space-y-0.5">
            <p className="font-semibold text-slate-700">Elevação de Alçada Obrigatória:</p>
            <p>&bull; Despesas com OPME sob medida ou urgência cirúrgica</p>
            <p>&bull; Decisões judiciais, TAC ou notificações regulatórias ANS</p>
          </div>
        </div>

      </div>

    </div>
  );
};

