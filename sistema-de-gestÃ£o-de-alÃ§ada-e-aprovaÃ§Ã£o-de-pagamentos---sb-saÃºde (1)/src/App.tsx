import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { MyQueueView } from './components/MyQueueView';
import { RequestsListView } from './components/RequestsListView';
import { NewRequestForm } from './components/NewRequestForm';
import { MatrixManagementView } from './components/MatrixManagementView';
import { FinancialConferenceView } from './components/FinancialConferenceView';
import { TreasuryView } from './components/TreasuryView';
import { AuditTrailView } from './components/AuditTrailView';
import { SGQRepositoryView } from './components/SGQRepositoryView';
import { UsersManagementView } from './components/UsersManagementView';
import { LoginView } from './components/LoginView';
import { RequestDetailModal } from './components/RequestDetailModal';
import { api } from './services/api';
import { Solicitacao, DashboardData } from './types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [requests, setRequests] = useState<Solicitacao[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<Solicitacao | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, dashRes] = await Promise.all([
        api.getRequests(),
        api.getDashboardMetrics(),
      ]);
      setRequests(reqRes.requests || []);
      setDashboardData(dashRes);
    } catch (err) {
      console.error('Error fetching core system data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Calculate pending counters for tabs
  const myQueueCount = requests.filter((r) => {
    if (!currentUser) return false;
    if (r.status === 'DEVOLVIDA' && r.solicitanteId === currentUser.id) return true;
    const pendingEtapa = r.cadeiaAprovacao?.find((e) => e.status === 'PENDENTE');
    if (!pendingEtapa) return false;

    if (r.solicitanteId === currentUser.id) return false;

    if (pendingEtapa.aprovadorDesignadoId === currentUser.id) return true;
    if (pendingEtapa.nivel === 1 && currentUser.roles.includes('APROVADOR_1')) return true;
    if (pendingEtapa.nivel === 2 && currentUser.roles.includes('APROVADOR_2')) return true;
    if (pendingEtapa.nivel === 3 && currentUser.roles.includes('APROVADOR_3')) return true;
    if (pendingEtapa.nivel === 4 && currentUser.roles.includes('APROVADOR_4')) return true;
    return false;
  }).length;

  const financeCount = requests.filter((r) => r.status === 'AGUARDANDO_FINANCEIRO').length;
  const treasuryCount = requests.filter((r) => r.status === 'LIBERADA_PAGAMENTO').length;

  const handleOpenDetail = (req: Solicitacao) => {
    setSelectedRequest(req);
  };

  const handleCreateSuccess = (newReq: Solicitacao) => {
    showToast(`Solicitação ${newReq.numero} criada com sucesso na ${newReq.alcadaAplicavelLabel}!`);
    loadData();
    setActiveTab('ALL_REQUESTS');
  };

  // If user is not authenticated, display the Corporate Login Portal
  if (!currentUser) {
    return <LoginView />;
  }

  const isAdmin = currentUser.roles.includes('ADMINISTRADOR');

  return (
    <div className="flex flex-col h-screen w-full font-sans bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* Sleek White Top Header */}
      <Header
        onOpenNewRequest={() => setActiveTab('NEW_REQUEST')}
        onNewRequestClick={() => setActiveTab('NEW_REQUEST')}
        onViewSGQClick={() => setActiveTab('SGQ')}
      />

      {/* Main Workspace: Sidebar Navigation + Dynamic View Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sleek Dark Sidebar */}
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          myQueueCount={myQueueCount}
          financeCount={financeCount}
          treasuryCount={treasuryCount}
        />

        {/* Dynamic Viewport Container */}
        <main className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto bg-slate-50">
          
          {/* Global Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center space-x-3 border border-slate-700 animate-bounce">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* View Routing */}
          <div className="w-full max-w-7xl mx-auto space-y-6">
            {activeTab === 'DASHBOARD' && (
              <DashboardView
                stats={dashboardData}
                dashboardData={dashboardData}
                requests={requests}
                onOpenRequest={handleOpenDetail}
                onNavigateTab={(t: string) => {
                  if (t === 'NOVA_SOLICITACAO' || t === 'NEW_REQUEST') setActiveTab('NEW_REQUEST');
                  else if (t === 'SOLICITACOES' || t === 'ALL_REQUESTS') setActiveTab('ALL_REQUESTS');
                  else if (t === 'MATRIZ' || t === 'MATRIX') setActiveTab('MATRIX');
                  else if (t === 'AUDITORIA' || t === 'AUDIT') setActiveTab('AUDIT');
                  else if (t === 'MY_QUEUE' || t === 'MINHA_FILA') setActiveTab('MY_QUEUE');
                  else setActiveTab(t);
                }}
                onNavigateQueue={() => setActiveTab('MY_QUEUE')}
              />
            )}

            {(activeTab === 'MY_QUEUE' || activeTab === 'MINHA_FILA') && (
              <MyQueueView
                requests={requests}
                onOpenRequest={handleOpenDetail}
                onNavigateTab={(t: string) => setActiveTab(t === 'NOVA_SOLICITACAO' ? 'NEW_REQUEST' : t)}
              />
            )}

            {(activeTab === 'ALL_REQUESTS' || activeTab === 'SOLICITACOES') && (
              <RequestsListView
                requests={requests}
                onOpenRequest={handleOpenDetail}
                onOpenExportModal={() => showToast('Relatório FOR-FIN-01 consolidado pronto para impressão/exportação.')}
                onNewRequestClick={() => setActiveTab('NEW_REQUEST')}
              />
            )}

            {(activeTab === 'NEW_REQUEST' || activeTab === 'NOVA_SOLICITACAO') && (
              <NewRequestForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setActiveTab('DASHBOARD')}
              />
            )}

            {(activeTab === 'MATRIX' || activeTab === 'MATRIZ') && (
              <MatrixManagementView />
            )}

            {(activeTab === 'FINANCIAL' || activeTab === 'FINANCEIRO') && (
              <FinancialConferenceView
                requests={requests}
                onOpenRequest={handleOpenDetail}
                onRefresh={loadData}
              />
            )}

            {(activeTab === 'TREASURY' || activeTab === 'TESOURARIA') && (
              <TreasuryView
                requests={requests}
                onOpenRequest={handleOpenDetail}
                onRefresh={loadData}
              />
            )}

            {(activeTab === 'AUDIT' || activeTab === 'AUDITORIA') && (
              <AuditTrailView />
            )}

            {activeTab === 'SGQ' && (
              <SGQRepositoryView />
            )}

            {(activeTab === 'USERS' || activeTab === 'USUARIOS') && (
              isAdmin ? (
                <UsersManagementView />
              ) : (
                <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-xl mx-auto shadow-sm my-12 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Acesso Restrito ao Administrador
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      De acordo com a política corporativa <strong>POL-DIR-01</strong> e as normas de governança e segregação de funções SGQ (ISO 9001:2015), o gerenciamento de contas, papéis e permissões é restrito a administradores.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('DASHBOARD')}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar ao Dashboard</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      {/* Modal: Interactive FOR-FIN-01 Detail & Decision Station */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRefresh={loadData}
        />
      )}

      {/* Sleek White Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-medium shrink-0 gap-1">
        <div>FOR-FIN-01 — Processo de Registro de Alçada e Aprovação de Pagamentos</div>
        <div>Em conformidade com a Política POL-DIR-01 (ISO 9001:2015)</div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Trilha de Auditoria Segura &bull; Sessão Ativa</span>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

