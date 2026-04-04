import { create } from 'zustand';
import client from '../api/client';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  role: 'student' | 'teacher' | null;
  token: string | null;
  login: (email: string, password: string) => Promise<'student' | 'teacher'>;
  register: (name: string, email: string, password: string, role: 'student' | 'teacher') => Promise<'student' | 'teacher'>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  user: null,
  role: (localStorage.getItem('user_role') as AuthState['role']) || null,
  token: localStorage.getItem('access_token'),

  login: async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password });
    const { access_token, user } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user_role', user.role);
    set({ isAuthenticated: true, user, role: user.role, token: access_token });
    return user.role;
  },

  register: async (name, email, password, role) => {
    const res = await client.post('/api/auth/register', { name, email, password, role });
    const { access_token, user } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user_role', user.role);
    set({ isAuthenticated: true, user, role: user.role, token: access_token });
    return user.role;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    set({ isAuthenticated: false, user: null, role: null, token: null });
  },

  fetchMe: async () => {
    try {
      const res = await client.get('/api/auth/me');
      set({ user: res.data, isAuthenticated: true, role: res.data.role });
    } catch {
      get().logout();
    }
  },
}));

export default useAuthStore;
