import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { MyQueueView } from './components/MyQueueView';
import { RequestsListView } from './components/RequestsListView';
import { NewRequestForm } from './components/NewRequestForm';
import { MatrixManagementView } from './components/MatrixManagementView';
import { FinancialTreasuryView } from './components/FinancialTreasuryView';
import { AuditTrailView } from './components/AuditTrailView';
import { SGQRepositoryView } from './components/SGQRepositoryView';
import { UsersManagementView } from './components/UsersManagementView';
import { LoginView } from './components/LoginView';
import { RequestDetailModal } from './components/RequestDetailModal';
import { api } from './services/api';
import { Solicitacao, DashboardData, SystemNotification, isFinancialUser } from './types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');

  useEffect(() => {
    if (currentUser) {
      const isAdmin = currentUser.roles?.includes('ADMINISTRADOR');
      const isFin = isFinancialUser(currentUser);
      const isLevelAbove2 = currentUser.roles?.some(r => r === 'APROVADOR_3' || r === 'APROVADOR_4') ||
        currentUser.cargo?.toLowerCase().includes('diretor') ||
        currentUser.cargo?.toLowerCase().includes('conselh');
      const showDashboard = isFin || isAdmin || isLevelAbove2;
      if (!showDashboard) {
        setActiveTab('NEW_REQUEST');
      }
    }
  }, [currentUser]);
  const [requests, setRequests] = useState<Solicitacao[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<Solicitacao | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sb_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sb_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

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

  // Calculate counters for tabs: "Minha Fila" strictly reflects requests made by the logged-in user
  const isFinancial = isFinancialUser(currentUser);
  const myQueueCount = requests.filter((r) => {
    if (!currentUser) return false;
    const isOwner =
      r.solicitanteId === currentUser.id ||
      (r.solicitanteEmail && r.solicitanteEmail.toLowerCase() === currentUser.email?.toLowerCase());
    if (!isOwner) return false;
    if (r.status === 'CANCELADA' || r.status === 'PAGAMENTO_EFETUADO' || r.status === 'REPROVADA') {
      return false;
    }
    return true;
  }).length;

  const financeCount = requests.filter((r) => r.status === 'AGUARDANDO_FINANCEIRO').length;
  const treasuryCount = requests.filter((r) => r.status === 'LIBERADA_PAGAMENTO').length;

  const handleOpenDetail = (req: Solicitacao) => {
    setSelectedRequest(req);
  };

  const handleCreateSuccess = (newReq: Solicitacao) => {
    showToast(`Solicitação ${newReq.numero} criada com sucesso na ${newReq.alcadaAplicavelLabel}!`);
    loadData();
    setActiveTab(isFinancial ? 'ALL_REQUESTS' : 'MY_QUEUE');
  };

  const handleNotificationClick = async (notif: SystemNotification) => {
    // 1. If notification is linked to a specific request ID or number
    if (notif.solicitacaoId || notif.solicitacaoNumero) {
      let targetReq = requests.find(
        (r) =>
          (notif.solicitacaoId && r.id === notif.solicitacaoId) ||
          (notif.solicitacaoNumero && r.numero === notif.solicitacaoNumero)
      );

      // If not in state yet, try fetching fresh from API
      if (!targetReq && notif.solicitacaoId) {
        try {
          const res = await api.getRequestById(notif.solicitacaoId);
          if (res?.request) {
            targetReq = res.request;
          }
        } catch (err) {
          console.warn('Could not load target request directly:', err);
        }
      }

      if (targetReq) {
        // Direct to contextual tab
        if (targetReq.status === 'AGUARDANDO_FINANCEIRO' && currentUser?.roles.includes('FINANCEIRO')) {
          setActiveTab('FINANCIAL');
        } else if (targetReq.status === 'LIBERADA_PAGAMENTO' && currentUser?.roles.includes('TESOURARIA')) {
          setActiveTab('TREASURY');
        } else if (
          targetReq.status === 'DEVOLVIDA_CORRECAO' ||
          targetReq.status === 'DEVOLVIDA_FINANCEIRO' ||
          targetReq.solicitanteId === currentUser?.id
        ) {
          setActiveTab('MY_QUEUE');
        } else if (notif.targetTab) {
          setActiveTab(notif.targetTab);
        } else {
          setActiveTab('ALL_REQUESTS');
        }

        setSelectedRequest(targetReq);
        showToast(`Exibindo solicitação ${targetReq.numero}...`);
        return;
      }
    }

    // 2. If notification specifies a target module tab
    if (notif.targetTab) {
      setActiveTab(notif.targetTab);
      showToast(`Navegando para ${notif.title}...`);
      return;
    }

    // 3. Fallback inference based on notification title/message content
    const text = `${notif.title} ${notif.message}`.toLowerCase();
    if (text.includes('aprovador') || text.includes('usuário') || text.includes('senha')) {
      if (currentUser?.roles.includes('ADMINISTRADOR')) setActiveTab('USERS');
    } else if (text.includes('matriz')) {
      setActiveTab('MATRIX');
    } else if (text.includes('sgq') || text.includes('manual')) {
      setActiveTab('SGQ');
    } else if (text.includes('financeir') || text.includes('conferência')) {
      setActiveTab('FINANCIAL');
    } else if (text.includes('tesouraria') || text.includes('pagamento')) {
      setActiveTab('TREASURY');
    } else if (text.includes('auditoria')) {
      setActiveTab('AUDIT');
    } else {
      setActiveTab('ALL_REQUESTS');
    }
  };

  // If user is not authenticated, display the Corporate Login Portal
  if (!currentUser) {
    return <LoginView />;
  }

  const isAdmin = currentUser.roles.includes('ADMINISTRADOR');

  return (
    <div className="flex flex-col h-screen w-full font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      
      {/* Sleek Top Header */}
      <Header
        onOpenNewRequest={() => setActiveTab('NEW_REQUEST')}
        onNewRequestClick={() => setActiveTab('NEW_REQUEST')}
        onViewSGQClick={() => setActiveTab('SGQ')}
        onNotificationClick={handleNotificationClick}
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
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Dynamic Viewport Container */}
        <main className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          
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
              isFinancial ? (
                <RequestsListView
                  requests={requests}
                  onOpenRequest={handleOpenDetail}
                  onOpenExportModal={() => showToast('Relatório consolidado pronto para impressão/exportação.')}
                />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-8 text-center max-w-xl mx-auto shadow-sm my-12 space-y-4 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/50 shadow-sm">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Acesso Restrito ao Setor Financeiro
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      A visualização consolidada de todas as solicitações da instituição é restrita aos colaboradores do Financeiro, Controladoria, Tesouraria e Administradores.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('MY_QUEUE')}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Ir para Minha Fila</span>
                    </button>
                  </div>
                </div>
              )
            )}

            {(activeTab === 'NEW_REQUEST' || activeTab === 'NOVA_SOLICITACAO') && (
              <NewRequestForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setActiveTab('DASHBOARD')}
              />
            )}

            {(activeTab === 'MATRIX' || activeTab === 'MATRIZ') && (
              isAdmin ? (
                <MatrixManagementView />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center max-w-xl mx-auto shadow-sm my-12 space-y-4 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900/50 shadow-sm">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Acesso Restrito ao Administrador
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      A visualização e edição da <strong>Matriz de Alçadas</strong> é restrita aos administradores do sistema conforme os padrões de governança corporativa.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('DASHBOARD')}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-red-600/20 cursor-pointer"
                    >
                      <span>Voltar ao Dashboard</span>
                    </button>
                  </div>
                </div>
              )
            )}

            {(activeTab === 'FINANCIAL' || activeTab === 'FINANCEIRO' || activeTab === 'TREASURY' || activeTab === 'TESOURARIA') && (
              (isAdmin || isFinancial) ? (
                <FinancialTreasuryView
                  requests={requests}
                  onOpenRequest={handleOpenDetail}
                  onRefresh={loadData}
                  initialSubTab={activeTab === 'TREASURY' || activeTab === 'TESOURARIA' ? 'TREASURY' : 'CONFERENCE'}
                />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center max-w-xl mx-auto shadow-sm my-12 space-y-4 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900/50 shadow-sm">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Acesso Restrito ao Financeiro e Tesouraria
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      O módulo de <strong>Conferência Fiscal, Retenções e Liquidação Bancária</strong> é restrito aos colaboradores das áreas de Financeiro, Tesouraria, Contas a Pagar e Administradores.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('DASHBOARD')}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-red-600/20 cursor-pointer"
                    >
                      <span>Voltar ao Dashboard</span>
                    </button>
                  </div>
                </div>
              )
            )}

            {(activeTab === 'AUDIT' || activeTab === 'AUDITORIA') && (
              <AuditTrailView />
            )}

            {activeTab === 'SGQ' && (
              <SGQRepositoryView isAdmin={isAdmin} />
            )}

            {(activeTab === 'USERS' || activeTab === 'USUARIOS') && (
              isAdmin ? (
                <UsersManagementView />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center max-w-xl mx-auto shadow-sm my-12 space-y-4 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900/50 shadow-sm">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Acesso Restrito ao Administrador
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      De acordo com a política corporativa e as normas de governança e segregação de funções SGQ (ISO 9001:2015), o gerenciamento de contas, papéis e permissões é restrito a administradores.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('DASHBOARD')}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-red-600/20 cursor-pointer"
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

      {/* Modal: Interactive Detail & Decision Station */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRefresh={loadData}
        />
      )}

    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

