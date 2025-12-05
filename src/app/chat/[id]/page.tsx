'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/context/auth-context';
import { GET_CHAT_QUERY, GET_MESSAGES_QUERY } from '@/graphql/queries';
import { SEND_MESSAGE_MUTATION } from '@/graphql/mutations';
import { MESSAGE_ADDED_SUBSCRIPTION } from '@/graphql/subscriptions';
import { MessageInput } from '@/components/message-input';
import { MessageList } from '@/components/message-list';
import { handleError } from '@/lib/error-handler';

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
    onError: (error) => {
      const errorInfo = handleError(error);
      if (errorInfo.shouldLogout) {
        logout();
        router.push('/login');
      } else {
        alert(errorInfo.message);
      }
    },
  });

  const { data: messagesData, loading: messagesLoading, fetchMore } = useQuery(GET_MESSAGES_QUERY, {
    variables: { chatId, limit: MESSAGES_PER_PAGE, offset: 0 },
    onCompleted: (data) => {
      if (data?.messages) {
        setMessages([...data.messages].reverse()); // Reverse to show oldest first
        setHasMore(data.messages.length === MESSAGES_PER_PAGE);
        setOffset(data.messages.length);
      }
    },
    onError: (error) => {
      const errorInfo = handleError(error);
      if (errorInfo.shouldLogout) {
        logout();
        router.push('/login');
      } else {
        alert(errorInfo.message);
      }
    },
  });

  // Load more messages when scrolling to top
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || !fetchMore) return;

    setLoadingMore(true);
    try {
      const { data } = await fetchMore({
        variables: {
          chatId,
          limit: MESSAGES_PER_PAGE,
          offset: offset,
        },
      });

      if (data?.messages && data.messages.length > 0) {
        const newMessages = [...data.messages].reverse();
        setMessages((prev) => [...newMessages, ...prev]);
        setHasMore(data.messages.length === MESSAGES_PER_PAGE);
        setOffset((prev) => prev + data.messages.length);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      const errorInfo = handleError(error);
      alert(errorInfo.message);
    } finally {
      setLoadingMore(false);
    }
  };

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
  }, [hasMore, loadingMore, offset]);

  // Real-time subscription
  const { data: subscriptionData } = useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { chatId },
    skip: !chatId,
    onData: ({ data }) => {
      const newMessage = data.data?.messageAdded;
      if (newMessage) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    },
  });

  const chat = chatData?.chat;

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


