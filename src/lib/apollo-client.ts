'use client';

import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { ApolloLink, Observable } from '@apollo/client';
import { SubscriptionClient } from 'subscriptions-transport-ws';

// HTTP Link для queries и mutations
const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

// WebSocket Link для subscriptions
// ВАЖНО: Сервер использует subscriptions-transport-ws (старый протокол)
// Используем WebSocketLink вместо GraphQLWsLink
const subscriptionClient = new SubscriptionClient(
  'ws://localhost:4000/graphql',
  {
    reconnect: true,
    connectionParams: () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // Не передаем пустую строку - это может вызвать Protocol Error 1002
      // Если токена нет, не передаем authorization вообще
      if (!token) {
        console.warn('[WebSocket] No token found, connecting without authentication');
        return {};
      }

      // Проверяем, что токен не пустая строка
      if (token.trim() === '') {
        console.warn('[WebSocket] Token is empty, connecting without authentication');
        return {};
      }

      console.log('[WebSocket] Connecting with token');

      // Согласно документации, сервер поддерживает три формата:
      // 1. authorization: "Bearer <token>" (РЕКОМЕНДУЕМЫЙ)
      // 2. token: "<token>"
      // 3. Authorization: "Bearer <token>" (с заглавной A)
      // 
      // Используем рекомендуемый формат 1
      // Важно: пробел после "Bearer " обязателен!
      return {
        authorization: `Bearer ${token}`,
      };
      
      // Альтернативные варианты (раскомментируйте если нужны):
      // 
      // Вариант 2: только token без Bearer
      // return {
      //   token: token,
      // };
      //
      // Вариант 3: Authorization с заглавной A
      // return {
      //   Authorization: `Bearer ${token}`,
      // };
    },
    timeout: 30000,
    reconnectionAttempts: 5,
    connectionCallback: (error) => {
      if (error) {
        console.error('[WebSocket] Connection error:', error);
      } else {
        console.log('[WebSocket] ✅ Connection opened successfully');
      }
    },
  },
  typeof window !== 'undefined' ? WebSocket : undefined
);

// Обработка событий закрытия соединения
subscriptionClient.onDisconnected(() => {
  if (typeof window !== 'undefined') {
    console.warn('[WebSocket] ⚠️ Connection disconnected');
  }
});

subscriptionClient.onReconnected(() => {
  if (typeof window !== 'undefined') {
    console.log('[WebSocket] ✅ Connection reconnected');
  }
});

subscriptionClient.onError((error) => {
  if (typeof window !== 'undefined') {
    console.error('[WebSocket] ❌ Connection error:', error);
    
    // Проверяем, является ли это Protocol Error
    if (error instanceof Error && error.message.includes('1002')) {
      console.error('[WebSocket] Protocol Error detected. Check:');
      console.error('  1. connectionParams format');
      console.error('  2. Token validity');
      console.error('  3. Server WebSocket protocol version');
    }
  }
});

// Создаем кастомный WebSocket link для Apollo Client v4
// Используем ApolloLink для совместимости с Apollo Client v4
const wsLink = new ApolloLink((operation) => {
  return new Observable((observer) => {
    const subscription = subscriptionClient.request(operation).subscribe({
      next: (data: any) => observer.next(data),
      error: (err: any) => observer.error(err),
      complete: () => observer.complete(),
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  });
});

// Auth Link для HTTP запросов
const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Split Link: subscriptions через WebSocket, остальное через HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink, // WebSocket для subscriptions
  authLink.concat(httpLink) // HTTP для queries и mutations
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});


