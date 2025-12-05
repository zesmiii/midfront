'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/context/auth-context';
import { GET_CHAT_QUERY, GET_MESSAGES_QUERY, GET_CHATS_QUERY } from '@/graphql/queries';
import { SEND_MESSAGE_MUTATION } from '@/graphql/mutations';
import { MESSAGE_ADDED_SUBSCRIPTION } from '@/graphql/subscriptions';
import { MessageInput } from '@/components/message-input';
import { MessageList } from '@/components/message-list';
import { handleError } from '@/lib/error-handler';
import { apolloClient } from '@/lib/apollo-client';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  const router = useRouter();
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const MESSAGES_PER_PAGE = 50;

  const { data: chatData, loading: chatLoading, error: chatError } = useQuery(GET_CHAT_QUERY, {
    variables: { id: chatId },
  });

  const { data: messagesData, loading: messagesLoading, error: messagesError, fetchMore } = useQuery(GET_MESSAGES_QUERY, {
    variables: { chatId, limit: MESSAGES_PER_PAGE, offset: 0 },
  });

  // Handle chat errors
  useEffect(() => {
    if (!chatError) return;
    
    const errorInfo = handleError(chatError);
    if (errorInfo.shouldLogout) {
      logout();
    } else {
      alert(errorInfo.message);
    }
  }, [chatError, logout]);

  // Handle messages errors согласно документации
  useEffect(() => {
    if (!messagesError) return;
    
    const errorInfo = handleError(messagesError);
    
    // Обработка ошибок согласно документации
    if (errorInfo.code === 'UNAUTHENTICATED') {
      console.error('[Messages] Authentication required - logging out');
      logout();
    } else if (errorInfo.code === 'BAD_USER_INPUT') {
      // "Chat not found"
      console.error('[Messages] Chat not found:', chatId);
      alert('Chat not found');
      router.push('/');
    } else if (errorInfo.code === 'FORBIDDEN') {
      // "You are not a participant of this chat"
      console.error('[Messages] Access forbidden - not a participant');
      alert('You are not a participant of this chat');
      router.push('/');
    } else {
      alert(errorInfo.message);
    }
  }, [messagesError, logout, router, chatId]);

  // Handle messages data from cache
  useEffect(() => {
    const messages = (messagesData as any)?.messages;
    if (Array.isArray(messages)) {
      // Сообщения приходят с сервера в хронологическом порядке (старые первыми)
      // Оставляем их как есть - старые сверху, новые снизу
      if (messages.length > 0) {
        setMessages([...messages]);
        setHasMore(messages.length === MESSAGES_PER_PAGE);
        setOffset(messages.length);
      } else {
        setMessages([]);
        setHasMore(false);
        setOffset(0);
      }
    }
  }, [messagesData]);

  // Load more messages when scrolling to top
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !fetchMore) return;

    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: {
          chatId,
          limit: MESSAGES_PER_PAGE,
          offset: offset,
        },
      });

      const messages = (result.data as any)?.messages;
      if (Array.isArray(messages) && messages.length > 0) {
        // Старые сообщения добавляем в начало (они старше текущих)
        setMessages((prev) => [...messages, ...prev]);
        setHasMore(messages.length === MESSAGES_PER_PAGE);
        setOffset((prev) => prev + messages.length);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      const errorInfo = handleError(error);
      alert(errorInfo.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchMore, chatId, offset]);

  // Handle scroll to top for pagination
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop === 0 && hasMore && !loadingMore) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loadMoreMessages]);

  // Real-time subscription with cache update
  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { chatId },
    skip: !chatId,
    onData: ({ data }) => {
      const newMessage = (data.data as any)?.messageAdded;
      if (newMessage) {
        console.log('[Subscription] New message received:', newMessage.id);

        // Update messages cache
        apolloClient.cache.updateQuery(
          { query: GET_MESSAGES_QUERY, variables: { chatId, limit: MESSAGES_PER_PAGE, offset: 0 } },
          (existing: any) => {
            if (!existing || !existing.messages) {
              // If cache is empty, initialize it
              return { messages: [newMessage] };
            }

            // Check for duplicates
            const exists = existing.messages.some((msg: any) => msg.id === newMessage.id);
            if (exists) {
              console.log('[Subscription] Message already exists, skipping:', newMessage.id);
              return existing;
            }

            console.log('[Subscription] Adding message to cache:', newMessage.id);
            // Новое сообщение добавляем в конец (оно самое новое)
            return {
              messages: [...existing.messages, newMessage],
            };
          }
        );

        // Update chats cache to update lastMessage
        apolloClient.cache.updateQuery(
          { query: GET_CHATS_QUERY },
          (existing: any) => {
            if (!existing || !existing.chats) return existing;

            return {
              chats: existing.chats.map((chat: any) => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    lastMessage: {
                      id: newMessage.id,
                      content: newMessage.content,
                      imageUrl: newMessage.imageUrl,
                      sender: newMessage.sender,
                      createdAt: newMessage.createdAt,
                    },
                    updatedAt: newMessage.updatedAt || newMessage.createdAt || new Date().toISOString(),
                  };
                }
                return chat;
              }),
            };
          }
        );
      }
    },
    onError: (error) => {
      console.error('[Subscription] Error:', error);

      // Проверяем, является ли это WebSocket ошибкой
      const errorMessage = error?.message || '';
      const errorString = error?.toString() || '';

      // Проверяем на Protocol Error 1002
      if (errorMessage.includes('1002') || errorString.includes('1002') || errorMessage.includes('Socket closed with event 1002')) {
        console.error('[Subscription] ❌ WebSocket Protocol Error (1002) detected');
        console.error('[Subscription] This usually means:');
        console.error('  1. Invalid connectionParams format');
        console.error('  2. Server expects different authentication format');
        console.error('  3. Token format is incorrect');
        console.error('[Subscription] Current token:', typeof window !== 'undefined' ? localStorage.getItem('token')?.substring(0, 20) + '...' : 'N/A');

        // Не показываем alert для Protocol Error - это техническая ошибка
        // Пользователь увидит, что сообщения не приходят
        return;
      }

      const errorInfo = handleError(error);

      // Обработка ошибок согласно документации
      if (errorInfo.code === 'UNAUTHENTICATED') {
        console.error('[Subscription] Authentication required - token is invalid or missing');
        console.error('[Subscription] Logging out...');
        logout();
        router.push('/login');
      } else if (errorInfo.code === 'FORBIDDEN') {
        console.error('[Subscription] Access forbidden - not a participant of this chat');
        alert('You are not a participant of this chat');
      } else if (errorInfo.code === 'BAD_USER_INPUT') {
        console.error('[Subscription] Chat not found:', chatId);
        alert('Chat not found');
      } else {
        console.error('[Subscription] Unknown error:', errorInfo.message);
        console.error('[Subscription] Full error object:', error);
      }
    },
  });

  const chat = (chatData as any)?.chat;

  const getChatName = () => {
    if (!chat) return 'Loading...';
    if (chat.type === 'GROUP') {
      return chat.name;
    }
    const otherParticipant = chat.participants.find((p: any) => p.id !== user?.id);
    return otherParticipant?.username || 'Unknown User';
  };

  const getChatParticipants = () => {
    if (!chat) return [];
    if (chat.type === 'GROUP') {
      return chat.participants;
    }
    return chat.participants.filter((p: any) => p.id !== user?.id);
  };

  if (chatLoading || messagesLoading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <div className="text-lg">Loading chat...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (chatError || !chat) {
    const errorInfo = chatError ? handleError(chatError) : null;
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-gray-600 mb-4">
              {errorInfo?.message || 'Chat not found'}
            </div>
            <button
              onClick={() => router.push('/')}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Go to Chats
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        {/* Chat Header */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {getChatName()}
                  </h1>
                  {chat.type === 'GROUP' && (
                    <p className="text-sm text-gray-500">
                      {chat.participants.length} participants
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Participants (for groups) */}
          {chat.type === 'GROUP' && (
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <div className="text-xs font-medium text-gray-700 mb-1">Participants:</div>
              <div className="flex flex-wrap gap-2">
                {getChatParticipants().map((p: any) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center rounded-full bg-white px-2 py-1 text-xs text-gray-700 border border-gray-200"
                  >
                    {p.username}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
            {loadingMore && (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading older messages...
              </div>
            )}
            <MessageList messages={messages} currentUserId={user?.id} />
          </div>

          {/* Message Input */}
          <MessageInput chatId={chatId} onMessageSent={() => {}} />
        </div>
      </div>
    </ProtectedRoute>
  );
}


