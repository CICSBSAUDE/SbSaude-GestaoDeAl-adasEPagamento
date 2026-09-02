import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, NotificationItem } from '../types';
import { api } from '../services/api';
import { SessionTimeoutModal } from '../components/SessionTimeoutModal';

// Session timeout settings: 15 minutes total, 2 minutes warning
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_DURATION_MS = 2 * 60 * 1000;

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  sessionExpiredReason: string | null;
  requiresPasswordChange: boolean;
  setRequiresPasswordChange: (val: boolean) => void;
  tempUserId: string | null;
  setTempUserId: (val: string | null) => void;
  switchUser: (userId: string) => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: (reason?: string) => void;
  completePasswordChange: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpiredReason, setSessionExpiredReason] = useState<string | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  // Inactivity tracking state
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120);
  const lastActivityRef = useRef<number>(Date.now());
  const throttleActivityRef = useRef<number>(0);

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
  }, []);

  // Initialize and load users
  useEffect(() => {
    const init = async () => {
      try {
        const usersRes = await api.getUsers();
        setUsers(usersRes.users || []);

        const savedUserId = localStorage.getItem('sbsaude_active_user_id');
        let initialUser: User | undefined;

        if (savedUserId) {
          initialUser = usersRes.users.find((u) => u.id === savedUserId);
        }

        if (initialUser) {
          api.setToken(initialUser.id);
          setCurrentUser(initialUser);
          lastActivityRef.current = Date.now();
          loadNotifications();
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  const logout = useCallback((reason?: string) => {
    localStorage.removeItem('sbsaude_active_user_id');
    api.setToken(null);
    setCurrentUser(null);
    setNotifications([]);
    setShowInactivityWarning(false);
    if (reason) {
      setSessionExpiredReason(reason);
    }
  }, []);

  // User activity listeners to track idle timeout
  useEffect(() => {
    if (!currentUser) return;

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle activity updates to once per 2 seconds
      if (now - throttleActivityRef.current > 2000) {
        throttleActivityRef.current = now;
        lastActivityRef.current = now;
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((ev) => {
      window.addEventListener(ev, handleUserActivity, { passive: true });
    });

    // Interval to check inactivity every 1 second
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const warningThreshold = INACTIVITY_TIMEOUT_MS - WARNING_DURATION_MS;

      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        // Inactivity limit reached -> force logout
        console.warn('[Segurança] Sessão expirada por ociosidade do usuário.');
        logout('inactivity');
      } else if (idleTime >= warningThreshold) {
        // Warning threshold reached -> show modal with countdown
        const leftSecs = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - idleTime) / 1000));
        setRemainingSeconds(leftSecs);
        setShowInactivityWarning(true);
      } else {
        setShowInactivityWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => {
        window.removeEventListener(ev, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [currentUser, showInactivityWarning, logout]);

  const switchUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    api.setToken(targetUser.id);
    localStorage.setItem('sbsaude_active_user_id', targetUser.id);
    setCurrentUser(targetUser);
    setSessionExpiredReason(null);
    lastActivityRef.current = Date.now();

    // Refresh notifications for this user
    await loadNotifications();
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email;
      if (!userEmail) throw new Error('E-mail não fornecido pela conta Google.');

      // Strict enforcement: Google login is ONLY permitted for pre-registered users in the system!
      const res = await api.loginGoogle(userEmail);
      
      api.setToken(res.token);
      localStorage.setItem('sbsaude_active_user_id', res.user.id);
      setCurrentUser(res.user);
      setSessionExpiredReason(null);
      lastActivityRef.current = Date.now();
      await loadNotifications();
    } catch (e: any) {
      // Ensure firebase sign out if rejected
      try {
        await signOut(auth);
      } catch (_) {}
      console.error('[Google Auth Error]:', e);
      throw new Error(e.message || 'Erro ao autenticar com conta Google.');
    }
  };

  const login = async (email: string, password?: string) => {
    const res = await api.login(email, password);
    
    if (res.requiresPasswordChange) {
      setTempUserId(res.user.id);
      api.setToken(res.token); // Temproary token for change password
      setRequiresPasswordChange(true);
      return;
    }

    api.setToken(res.token);
    localStorage.setItem('sbsaude_active_user_id', res.user.id);
    setCurrentUser(res.user);
    setSessionExpiredReason(null);
    lastActivityRef.current = Date.now();
    await loadNotifications();
  };

  const completePasswordChange = async () => {
    if (!tempUserId) return;
    const res = await api.getMe();
    api.setToken(res.token);
    localStorage.setItem('sbsaude_active_user_id', res.user.id);
    setCurrentUser(res.user);
    setSessionExpiredReason(null);
    setRequiresPasswordChange(false);
    setTempUserId(null);
    lastActivityRef.current = Date.now();
    await loadNotifications();
  };

  const refreshUserData = async () => {
    const usersRes = await api.getUsers();
    setUsers(usersRes.users || []);
    if (currentUser) {
      const updated = usersRes.users.find((u) => u.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
    await loadNotifications();
  };

  const markNotificationAsRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  };

  const markAllNotificationsAsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const unreadCount = notifications.filter((n) => !n.lida).length;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        notifications,
        unreadCount,
        isLoading,
        sessionExpiredReason,
        requiresPasswordChange,
        setRequiresPasswordChange,
        tempUserId,
        setTempUserId,
        switchUser,
        login,
        logout,
        completePasswordChange,
        refreshUserData,
        loginWithGoogle,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        resetInactivityTimer,
      }}
    >
      {children}

      {/* Global Inactivity Warning Modal */}
      {currentUser && (
        <SessionTimeoutModal
          isOpen={showInactivityWarning}
          remainingSeconds={remainingSeconds}
          onStayLoggedIn={resetInactivityTimer}
          onLogout={() => logout('manual')}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

