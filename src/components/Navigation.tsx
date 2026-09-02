import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  FileSpreadsheet,
  PlusCircle,
  TableProperties,
  ClipboardCheck,
  Landmark,
  ShieldAlert,
  FileCheck2,
  CheckCircle2,
  Users,
  LogOut,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isFinancialUser } from '../types';

export type NavTab =
  | 'DASHBOARD'
  | 'MY_QUEUE'
  | 'MINHA_FILA'
  | 'ALL_REQUESTS'
  | 'SOLICITACOES'
  | 'NEW_REQUEST'
  | 'NOVA_SOLICITACAO'
  | 'MATRIX'
  | 'MATRIZ'
  | 'FINANCIAL'
  | 'FINANCEIRO'
  | 'TREASURY'
  | 'TESOURARIA'
  | 'AUDIT'
  | 'AUDITORIA'
  | 'SGQ'
  | 'USERS'
  | 'USUARIOS';

interface NavigationProps {
  activeTab: string;
  onTabChange?: (tab: any) => void;
  onSelectTab?: (tab: any) => void;
  myQueueCount?: number;
  financeCount?: number;
  pendingFinanceCount?: number;
  treasuryCount?: number;
  pendingTreasuryCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onSelectTab,
  myQueueCount = 0,
  financeCount = 0,
  pendingFinanceCount = 0,
  treasuryCount = 0,
  pendingTreasuryCount = 0,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.roles?.includes('ADMINISTRADOR');
  const isFinancial = isFinancialUser(currentUser);

  const handleSelect = (tabId: string) => {
    if (onTabChange) onTabChange(tabId);
    else if (onSelectTab) onSelectTab(tabId);
  };

  const fCount = financeCount || pendingFinanceCount || 0;
  const tCount = treasuryCount || pendingTreasuryCount || 0;

  const isCurrent = (tab1: string, tab2: string) => {
    return activeTab === tab1 || activeTab === tab2;
  };

  return (
    <nav
      className={`bg-slate-900 text-slate-300 flex flex-col p-3 gap-1 shrink-0 select-none overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out border-r border-slate-800 ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Section 1: Main Navigation Header & Toggle Button */}
      <div className="flex items-center justify-between px-2 mb-2 min-h-[30px]">
        {!isCollapsed && (
          <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest transition-opacity duration-200">
            Navegação Principal
          </div>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
              isCollapsed ? 'mx-auto' : 'ml-auto'
            }`}
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-slate-300 hover:text-white" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-white" />
            )}
          </button>
        )}
      </div>

      {/* Dashboard (Visible for financial, admins, and approval level > 2) */}
      {(() => {
        const isLevelAbove2 = currentUser?.roles?.some(r => r === 'APROVADOR_3' || r === 'APROVADOR_4') ||
          currentUser?.cargo?.toLowerCase().includes('diretor') ||
          currentUser?.cargo?.toLowerCase().includes('conselh');
        const showDashboard = isFinancial || isAdmin || isLevelAbove2;
        if (!showDashboard) return null;
        return (
          <button
            onClick={() => handleSelect('DASHBOARD')}
            title={isCollapsed ? 'Dashboard' : undefined}
            className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer ${
              isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
            } ${
              isCurrent('DASHBOARD', 'DASHBOARD')
                ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-slate-700/50'
                : 'hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-slate-400 shrink-0" />
            {!isCollapsed && <span className="flex-1 truncate">Dashboard</span>}
          </button>
        );
      })()}

      {/* Minha Fila */}
      <button
        onClick={() => handleSelect('MY_QUEUE')}
        title={isCollapsed ? `Minha Fila (${myQueueCount})` : undefined}
        className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer relative ${
          isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
        } ${
          isCurrent('MY_QUEUE', 'MINHA_FILA')
            ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-slate-700/50'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="relative">
            <Inbox className="w-4 h-4 text-slate-400 shrink-0" />
            {isCollapsed && myQueueCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-600 text-[9px] text-white w-4 h-4 rounded-full font-bold flex items-center justify-center shadow-sm">
                {myQueueCount > 9 ? '9+' : myQueueCount}
              </span>
            )}
          </div>
          {!isCollapsed && <span className="truncate">Minha Fila</span>}
        </div>
        {!isCollapsed && myQueueCount > 0 && (
          <span className="bg-red-600 text-[10px] text-white px-2 py-0.5 rounded-full font-bold shadow-sm shadow-red-900/40 shrink-0">
            {myQueueCount}
          </span>
        )}
      </button>

      {/* Solicitações (Visível apenas para usuários do Financeiro / Controladoria / Admin) */}
      {isFinancial && (
        <button
          onClick={() => handleSelect('ALL_REQUESTS')}
          title={isCollapsed ? 'Solicitações (FOR-FIN-01)' : undefined}
          className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
          } ${
            isCurrent('ALL_REQUESTS', 'SOLICITACOES')
              ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-slate-700/50'
              : 'hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
          {!isCollapsed && <span className="flex-1 truncate">Solicitações (FOR-FIN-01)</span>}
        </button>
      )}

      {/* Nova Solicitação */}
      <button
        onClick={() => handleSelect('NEW_REQUEST')}
        title={isCollapsed ? '+ Nova Solicitação' : undefined}
        className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer ${
          isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
        } ${
          isCurrent('NEW_REQUEST', 'NOVA_SOLICITACAO')
            ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950/50 ring-1 ring-red-500'
            : 'text-red-400 hover:bg-slate-800/70 hover:text-red-300'
        }`}
      >
        <PlusCircle className={`w-4 h-4 shrink-0 ${isCurrent('NEW_REQUEST', 'NOVA_SOLICITACAO') ? 'text-white' : 'text-red-500'}`} />
        {!isCollapsed && <span className="flex-1 font-bold truncate">+ Nova Solicitação</span>}
      </button>

      {/* Financeiro & Tesouraria (Unificado - Restrito a Administrador e Financeiro/Tesouraria) */}
      {(isAdmin || isFinancial) && (
        <button
          onClick={() => handleSelect('FINANCIAL')}
          title={isCollapsed ? `Financeiro & Tesouraria (${fCount + tCount})` : undefined}
          className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer relative ${
            isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
          } ${
            isCurrent('FINANCIAL', 'FINANCEIRO') || isCurrent('TREASURY', 'TESOURARIA')
              ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-slate-700/50'
              : 'hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="relative">
              <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
              {isCollapsed && fCount + tCount > 0 && (
                <span className={`absolute -top-1.5 -right-2 ${fCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'} text-[9px] w-4 h-4 rounded-full font-bold flex items-center justify-center shadow-sm`}>
                  {fCount + tCount > 9 ? '9+' : fCount + tCount}
                </span>
              )}
            </div>
            {!isCollapsed && <span className="truncate">Financeiro & Tesouraria</span>}
          </div>
          {!isCollapsed && fCount + tCount > 0 && (
            <div className="flex items-center space-x-1 shrink-0">
              {fCount > 0 && (
                <span className="bg-amber-500 text-[10px] text-slate-950 px-1.5 py-0.5 rounded-full font-bold" title={`${fCount} pendentes de conferência`}>
                  {fCount}
                </span>
              )}
              {tCount > 0 && (
                <span className="bg-emerald-500 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold" title={`${tCount} liberadas para pagamento`}>
                  {tCount}
                </span>
              )}
            </div>
          )}
        </button>
      )}

      {/* Section 2: Governance & Compliance */}
      <div className="mt-4 pt-2 border-t border-slate-800/80">
        {!isCollapsed ? (
          <div className="text-[10px] uppercase text-slate-500 font-bold px-2 mb-2 tracking-widest transition-opacity duration-200">
            Governança & Controle
          </div>
        ) : (
          <div className="h-2" />
        )}
      </div>

      {/* Matriz de Alçada (Restrito a Administradores) */}
      {isAdmin && (
        <button
          onClick={() => handleSelect('MATRIX')}
          title={isCollapsed ? 'Matriz de Alçada (POL-DIR-01)' : undefined}
          className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
          } ${
            isCurrent('MATRIX', 'MATRIZ')
              ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-slate-700/50'
              : 'hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <TableProperties className="w-4 h-4 text-slate-400 shrink-0" />
          {!isCollapsed && <span className="flex-1 truncate">Matriz de Alçada</span>}
        </button>
      )}

      {/* Trilha de Auditoria (Admin) */}
      {isAdmin && (
        <button
          onClick={() => handleSelect('AUDIT')}
          title={isCollapsed ? 'Auditoria Imutável' : undefined}
          className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
          } ${
            isCurrent('AUDIT', 'AUDITORIA')
              ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-slate-700/50'
              : 'hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
          {!isCollapsed && <span className="flex-1 truncate">Auditoria Imutável</span>}
        </button>
      )}

      {/* Política de Alçada */}
      <button
        onClick={() => handleSelect('SGQ')}
        title={isCollapsed ? 'POLÍTICA DE ALÇADA' : undefined}
        className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer ${
          isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
        } ${
          isCurrent('SGQ', 'SGQ')
            ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-slate-700/50'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <FileCheck2 className="w-4 h-4 text-slate-400 shrink-0" />
        {!isCollapsed && <span className="flex-1 truncate">POLÍTICA DE ALÇADA</span>}
      </button>

      {/* Section: Administration (Only visible for ADMINISTRADOR) */}
      {isAdmin && (
        <>
          <div className="mt-4 pt-2 border-t border-slate-800/80">
            {!isCollapsed ? (
              <div className="text-[10px] uppercase text-slate-500 font-bold px-2 mb-2 tracking-widest flex items-center justify-between transition-opacity duration-200">
                <span>Governança & SGQ</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Admin
                </span>
              </div>
            ) : (
              <div className="h-2" />
            )}
          </div>

          <button
            onClick={() => handleSelect('USERS')}
            title={isCollapsed ? 'Usuários & Permissões (Admin)' : undefined}
            className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-left cursor-pointer ${
              isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
            } ${
              isCurrent('USERS', 'USUARIOS')
                ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-amber-500/50'
                : 'hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            {!isCollapsed && <span className="flex-1 truncate">Usuários & Permissões</span>}
          </button>
        </>
      )}

      {/* Compliance Indicator & Logoff Widget at the bottom */}
      <div className={`mt-auto transition-all duration-300 ${isCollapsed ? 'p-1.5 pt-3' : 'p-3'} bg-slate-800/60 rounded-xl border border-slate-750/70 mt-6 space-y-2.5`}>
        {!isCollapsed ? (
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold mb-1">
              <span>POL-DIR-01 Compliance</span>
              <span className="text-emerald-400 font-bold">100%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full w-full bg-emerald-500 rounded-full"></div>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] mt-2 text-slate-400">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Auditoria ISO 9001:2015 íntegra</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="POL-DIR-01 Compliance 100% • Auditoria ISO 9001:2015">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/40">
              ✓
            </span>
          </div>
        )}

        {/* Logoff / Logout Button */}
        <button
          onClick={logout}
          className={`w-full flex items-center justify-center rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/50 text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'p-2.5' : 'gap-2 py-2 px-3'
          }`}
          title="Encerrar sessão e voltar à tela de login"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!isCollapsed && <span className="truncate">Encerrar Sessão</span>}
        </button>
      </div>
    </nav>
  );
};

