'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { ME_QUERY } from '@/graphql/queries';
import { LOGOUT_MUTATION } from '@/graphql/mutations';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(ME_QUERY, {
    skip: typeof window === 'undefined' || !localStorage.getItem('token'),
  });

  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  useEffect(() => {
    const me = (data as any)?.me;
    if (me) {
      setUser(me);
    } else if (error) {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [data, error]);

  const refetchUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && refetch) {
      try {
        const result = await refetch();
        const me = (result.data as any)?.me;
        if (me) {
          setUser(me);
        }
      } catch (err) {
        console.error('Error refetching user:', err);
        localStorage.removeItem('token');
        setUser(null);
      }
    }
  }, [refetch]);

  const logout = async () => {
    try {
      await logoutMutation();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        isAuthenticated: !!user,
        refetchUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


