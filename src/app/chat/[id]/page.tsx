'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/context/auth-context';
import { GET_CHAT_QUERY, GET_MESSAGES_QUERY } from '@/graphql/queries';
import { SEND_MESSAGE_MUTATION } from '@/graphql/mutations';
import { MESSAGE_ADDED_SUBSCRIPTION } from '@/graphql/subscriptions';
import { MessageInput } from '@/components/message-input';
import { MessageList } from '@/components/message-list';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);

  const { data: chatData, loading: chatLoading } = useQuery(GET_CHAT_QUERY, {
    variables: { id: chatId },
  });

  const { data: messagesData, loading: messagesLoading } = useQuery(GET_MESSAGES_QUERY, {
    variables: { chatId, limit: 100, offset: 0 },
    onCompleted: (data) => {
      if (data?.messages) {
        setMessages([...data.messages].reverse()); // Reverse to show oldest first
      }
    },
  });

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

  if (!chat) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-gray-600 mb-4">Chat not found</div>
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
          <MessageList messages={messages} currentUserId={user?.id} />

          {/* Message Input */}
          <MessageInput chatId={chatId} onMessageSent={() => {}} />
        </div>
      </div>
    </ProtectedRoute>
  );
}


