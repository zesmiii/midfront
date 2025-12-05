'use client';

import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

// HTTP Link для queries и mutations
const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

// WebSocket Link для subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    connectionParams: () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      return {
        authorization: token ? `Bearer ${token}` : '',
        // Альтернативный вариант для некоторых серверов
        // token: token || '',
      };
    },
    shouldRetry: () => true,
    retryAttempts: 5,
    retryWait: async function* retryWait() {
      for (let i = 0; i < 5; i++) {
        yield i * 1000; // 0ms, 1s, 2s, 3s, 4s
      }
    },
    on: {
      opened: () => {
        if (typeof window !== 'undefined') {
          console.log('[WebSocket] Connection opened');
        }
      },
      closed: () => {
        if (typeof window !== 'undefined') {
          console.log('[WebSocket] Connection closed');
        }
      },
      error: (error) => {
        if (typeof window !== 'undefined') {
          console.error('[WebSocket] Connection error:', error);
        }
      },
    },
  })
);

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


