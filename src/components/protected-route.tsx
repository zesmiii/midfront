'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Отслеживаем, что компонент смонтирован на клиенте
  useEffect(() => {
    setMounted(true);
  }, []);

  // Проверка аутентификации только на клиенте после монтирования
  useEffect(() => {
    if (mounted && !loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, loading, router]);

  // На сервере и до завершения гидратации показываем children
  // Это предотвращает ошибку гидратации
  if (!mounted) {
    return <>{children}</>;
  }

  // После монтирования на клиенте показываем loading или children
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}


