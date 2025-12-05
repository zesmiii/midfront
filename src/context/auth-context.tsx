'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { data, loading, error } = useQuery(ME_QUERY, {
    skip: typeof window === 'undefined' || !localStorage.getItem('token'),
    onCompleted: (data) => {
      if (data?.me) {
        setUser(data.me);
      }
    },
    onError: () => {
      localStorage.removeItem('token');
      setUser(null);
    },
  });

  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  useEffect(() => {
    if (data?.me) {
      setUser(data.me);
    } else if (error) {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [data, error]);

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


