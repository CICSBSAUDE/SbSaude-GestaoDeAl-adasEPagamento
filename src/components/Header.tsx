import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Sparkles,
  LogOut,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { LogoSBSaude } from './LogoSBSaude';
import { SystemNotification } from '../types';

interface HeaderProps {
  onNewRequestClick?: () => void;
  onOpenNewRequest?: () => void;
  onViewSGQClick?: () => void;
  onNotificationClick?: (notification: SystemNotification) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewRequestClick,
  onOpenNewRequest,
  onViewSGQClick,
  onNotificationClick,
}) => {
  const {
    currentUser,
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    logout,
  } = useAuth();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const handleCreate = () => {
    if (onNewRequestClick) onNewRequestClick();
    else if (onOpenNewRequest) onOpenNewRequest();
  };

  const handleItemClick = (n: SystemNotification) => {
    markNotificationAsRead(n.id);
    setShowNotifDropdown(false);
    if (onNotificationClick) {
      onNotificationClick(n);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-40 transition-colors duration-200">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3.5">
        <LogoSBSaude size="md" />
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold tracking-tight">
            Gestão de Alçadas & Pagamentos
          </span>
        </div>
      </div>

      {/* Right Controls: Matrix status badge, Notifications, Persona Switcher & CTA */}
      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* Active Matrix Status */}
        <div className="hidden lg:flex flex-col items-end">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Matriz de Alçadas • Ativa
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            Vigência: 07/07/2026 - 07/07/2028
          </span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
            }}
            className="relative p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title="Notificações e Avisos de SLA"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Notificações & Alertas de SLA
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {unreadCount} ocorrência(s) não lida(s) • Clique para ir ao destino
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-[11px] text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold cursor-pointer hover:underline"
                  >
                    Marcar todas lidas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`p-3 text-left cursor-pointer transition group hover:bg-red-50/40 dark:hover:bg-slate-800/60 relative ${
                        !n.lida ? 'bg-red-50/30 dark:bg-red-950/20' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {n.tipo === 'ERRO' ? (
                            <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          ) : n.tipo === 'SUCESSO' ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : n.tipo === 'AVISO' ? (
                            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400 flex items-center justify-center">
                              <Bell className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                              {n.title}
                            </p>
                            {!n.lida && (
                              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                            {n.message}
                          </p>

                          <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100/60 dark:border-slate-800">
                            <div className="flex items-center gap-1.5">
                              {n.solicitacaoNumero && (
                                <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 group-hover:bg-red-100 dark:group-hover:bg-red-950/40 text-slate-700 dark:text-slate-300 group-hover:text-red-700 dark:group-hover:text-red-400 px-1.5 py-0.5 rounded transition">
                                  #{n.solicitacaoNumero}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                                {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition">
                              <span>Abrir</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logged-in User Info Display */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[160px]">
              {currentUser?.name || 'Usuário'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
              {currentUser?.cargo || 'Perfil'}
            </div>
          </div>
                    
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs border border-red-700 shadow-sm">
              {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'SB'}
            </div>
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800"
              title="Sessão Ativa"
            ></span>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-white dark:bg-slate-700/80 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-800/60 text-[11px] font-semibold transition cursor-pointer ml-1"
            title="Encerrar Sessão (Logoff)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>

        {/* Quick Action Button: New Request */}
        <button
          onClick={handleCreate}
          className="hidden sm:flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nova Solicitação</span>
        </button>

      </div>
    </header>
  );
};

