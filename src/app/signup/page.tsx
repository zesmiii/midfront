'use client';

import { useState, FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { REGISTER_MUTATION } from '@/graphql/mutations';
import { useAuth } from '@/context/auth-context';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [register, { loading }] = useMutation(REGISTER_MUTATION);

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    try {
      console.log('Sending registration request:', { username, email, password: '***' });
      
      const { data } = await register({
        variables: {
          input: {
            username,
            email,
            password,
          },
        },
      });

      console.log('Registration response:', data);

      if (data?.register?.token) {
        localStorage.setItem('token', data.register.token);
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      // Извлекаем сообщение об ошибке из GraphQL ответа
      let errorMessage = 'Registration failed. Please try again.';
      
      // Проверяем graphQLErrors (основной источник ошибок от GraphQL сервера)
      if (err.graphQLErrors && Array.isArray(err.graphQLErrors) && err.graphQLErrors.length > 0) {
        errorMessage = err.graphQLErrors[0].message || errorMessage;
      } 
      // Проверяем networkError (ошибки сети)
      else if (err.networkError) {
        errorMessage = err.networkError.message || 'Network error. Please check your connection.';
      } 
      // Проверяем message напрямую (для CombinedGraphQLErrors и других форматов)
      else if (err.message) {
        // Если сообщение содержит текст об ошибке, извлекаем его
        if (err.message.includes('User with this email or username already exists')) {
          errorMessage = 'User with this email or username already exists';
        } else if (err.message.includes('CombinedGraphQLErrors:')) {
          // Извлекаем сообщение после "CombinedGraphQLErrors: "
          const match = err.message.match(/CombinedGraphQLErrors:\s*(.+)/i);
          errorMessage = match ? match[1].trim() : err.message;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('Registration error details:', {
        graphQLErrors: err.graphQLErrors,
        networkError: err.networkError,
        message: err.message,
        fullError: err
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Enter your password (min 6 characters)"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}


