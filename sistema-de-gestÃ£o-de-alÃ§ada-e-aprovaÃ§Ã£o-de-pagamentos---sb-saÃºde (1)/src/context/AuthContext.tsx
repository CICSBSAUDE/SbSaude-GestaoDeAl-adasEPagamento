import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, NotificationItem } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  switchUser: (userId: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

        // If no saved user, default to the Administrator (Vanessa Duarte)
        if (!initialUser && usersRes.users.length > 0) {
          initialUser = usersRes.users.find((u) => u.roles.includes('ADMINISTRADOR')) || usersRes.users[0];
          if (initialUser) {
            localStorage.setItem('sbsaude_active_user_id', initialUser.id);
          }
        }

        if (initialUser) {
          api.setToken(initialUser.id);
          setCurrentUser(initialUser);
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

  const switchUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    api.setToken(targetUser.id);
    localStorage.setItem('sbsaude_active_user_id', targetUser.id);
    setCurrentUser(targetUser);

    // Refresh notifications for this user
    await loadNotifications();
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const userEmail = firebaseUser.email;

      if (!userEmail) throw new Error('E-mail não fornecido pelo Google.');

      // Step 1: Get the Firebase ID token for server-side verification
      let idToken: string | null = null;
      try {
        idToken = await firebaseUser.getIdToken();
      } catch {
        // If token retrieval fails, fall back to email-based approach
        console.warn('[Auth] Não foi possível obter o ID token do Firebase. Usando fallback por e-mail.');
      }

      // Step 2: Try to verify the ID token with the backend (most secure path)
      if (idToken) {
        try {
          const res = await fetch('/api/auth/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }).then(r => r.json());

          if (res.user && res.token) {
            api.setToken(res.token);
            localStorage.setItem('sbsaude_active_user_id', res.user.id);
            setCurrentUser(res.user);
            await refreshUserData();
            await loadNotifications();
            return;
          }
          // If user not found in system, fall through to create them
        } catch {
          console.warn('[Auth] Falha ao verificar token com backend. Usando fallback por e-mail.');
        }
      }

      // Step 3: Fallback — check if user exists by email
      const usersRes = await api.getUsers();
      const existingUser = usersRes.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());

      if (existingUser) {
        // Step 4: Sync the Firebase UID to the existing system user
        try {
          await fetch('/api/auth/sync-firebase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebaseUid: firebaseUser.uid, email: userEmail }),
          });
        } catch {
          // Non-critical — user can still log in
          console.warn('[Auth] Não foi possível vincular o Firebase UID. Continuando login por e-mail.');
        }
        await login(userEmail);
      } else {
        // Step 5: Create a new user in the system with SOLICITANTE role
        const newUser = {
          name: firebaseUser.displayName || 'Usuário Google',
          email: userEmail,
          cargo: 'Usuário Externo',
          area: 'Geral',
          centroCusto: 'N/A',
          phone: firebaseUser.phoneNumber || '',
          roles: ['SOLICITANTE'],
          status: 'ATIVO',
          authType: 'GOOGLE',
          isEmailVerified: firebaseUser.emailVerified,
          avatarUrl: firebaseUser.photoURL || '',
          firebaseUid: firebaseUser.uid,
        };

        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser),
        }).then(r => r.json());

        await refreshUserData();
        await login(userEmail);
      }
    } catch (e: any) {
      console.error(e);
      throw new Error(e.message || 'Erro ao autenticar com Google');
    }
  };

  const login = async (email: string) => {
    const res = await api.login(email);
    api.setToken(res.token);
    localStorage.setItem('sbsaude_active_user_id', res.user.id);
    setCurrentUser(res.user);
    await loadNotifications();
  };

  const logout = () => {
    localStorage.removeItem('sbsaude_active_user_id');
    api.setToken(null);
    setCurrentUser(null);
    setNotifications([]);
    // Sign out from Firebase Auth as well
    signOut(auth).catch(() => {});
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
        switchUser,
        login,
        logout,
        refreshUserData,
        loginWithGoogle,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
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
