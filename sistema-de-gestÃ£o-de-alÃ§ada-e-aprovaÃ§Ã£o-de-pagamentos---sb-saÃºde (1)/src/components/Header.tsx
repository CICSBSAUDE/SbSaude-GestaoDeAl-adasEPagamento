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
} from 'lucide-react';

interface HeaderProps {
  onNewRequestClick?: () => void;
  onOpenNewRequest?: () => void;
  onViewSGQClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewRequestClick,
  onOpenNewRequest,
  onViewSGQClick,
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

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-blue-200">
          SB
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-800">
              SB Saúde
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
              FOR-FIN-01
            </span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-0.5">
            Gestão de Alçada & Pagamentos
          </span>
        </div>
      </div>

      {/* Right Controls: Matrix status badge, SGQ, Notifications, Persona Switcher & CTA */}
      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* Active Matrix Status */}
        <div className="hidden lg:flex flex-col items-end">
          <div className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Matriz POL-DIR-01 • Ativa
          </div>
          <span className="text-[11px] text-slate-500 italic">
            Vigência: 07/07/2026 - 07/07/2028
          </span>
        </div>

        <div className="hidden lg:block h-7 w-px bg-slate-200"></div>

        {/* SGQ Quick Info Button */}
        {onViewSGQClick && (
          <button
            onClick={onViewSGQClick}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition"
            title="Visualizar Políticas e Governança SGQ"
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Manual SGQ</span>
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
            }}
            className="relative p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
            title="Notificações e Avisos de SLA"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden ring-1 ring-black/5">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Notificações & Alertas de SLA
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {unreadCount} ocorrência(s) pendente(s)
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Marcar todas lidas
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`p-3 text-left cursor-pointer transition hover:bg-slate-50 ${
                        !n.lida ? 'bg-blue-50/40' : 'opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {n.tipo === 'ERRO' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        ) : n.tipo === 'SUCESSO' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Bell className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800">{n.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                          <p className="text-[9px] text-slate-400 mt-1 font-mono">
                            {new Date(n.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logged-in User Info Display (No menu/dropdown) */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800 truncate max-w-[160px]">
              {currentUser?.name || 'Usuário'}
            </div>
            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
              {currentUser?.cargo || 'Perfil'}
            </div>
          </div>
                    
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs border border-blue-700 shadow-sm">
              {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'SB'}
            </div>
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
              title="Sessão Ativa"
            ></span>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-md bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 text-[11px] font-semibold transition cursor-pointer ml-1"
            title="Encerrar Sessão (Logoff)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>

        {/* Quick Action Button: New Request */}
        <button
          onClick={handleCreate}
          className="hidden sm:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nova Solicitação</span>
        </button>

      </div>
    </header>
  );
};

