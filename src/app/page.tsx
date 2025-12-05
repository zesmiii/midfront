'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { GET_CHATS_QUERY } from '@/graphql/queries';
import { CREATE_DM_MUTATION } from '@/graphql/mutations';
import { UserSearch } from '@/components/user-search';
import { CreateGroupChat } from '@/components/create-group-chat';

export default function HomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { data, loading, refetch } = useQuery(GET_CHATS_QUERY, {
    pollInterval: 5000, // Poll every 5 seconds for new chats
  });

  // Чаты без сортировки - остаются в том порядке, как приходят с сервера
  const chats = (data as any)?.chats || [];

  const handleLogout = async () => {
    await logout();
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const getChatName = (chat: any) => {
    if (chat.type === 'GROUP') {
      return chat.name;
    }
    // For DM, show the other participant's name
    const otherParticipant = chat.participants.find((p: any) => p.id !== user?.id);
    return otherParticipant?.username || 'Unknown User';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Chats</h1>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowUserSearch(true);
                  setShowCreateGroup(false);
                }}
                className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                New DM
              </button>
              <button
                onClick={() => {
                  setShowCreateGroup(true);
                  setShowUserSearch(false);
                }}
                className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                New Group
              </button>
            </div>
          </div>

          {/* User Search / Create Group */}
          {(showUserSearch || showCreateGroup) && (
            <div className="p-4 border-b border-gray-200">
              {showUserSearch && (
                <UserSearch
                  onClose={() => setShowUserSearch(false)}
                  onChatCreated={() => {
                    setShowUserSearch(false);
                    refetch();
                  }}
                />
              )}
              {showCreateGroup && (
                <CreateGroupChat
                  onClose={() => setShowCreateGroup(false)}
                  onChatCreated={() => {
                    setShowCreateGroup(false);
                    refetch();
                  }}
                />
              )}
            </div>
          )}

          {/* Chats List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No chats yet. Start a conversation!
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {chats.map((chat: any) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatClick(chat.id)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {getChatName(chat)}
                          </h3>
                          {chat.type === 'GROUP' && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              Group
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {chat.lastMessage.content || 'Image'}
                          </p>
                        )}
                        {chat.lastMessage && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(chat.lastMessage.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2">Select a chat</h2>
            <p>Choose a conversation from the sidebar to start messaging</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
