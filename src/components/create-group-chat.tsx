'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { SEARCH_USERS_QUERY, GET_CHATS_QUERY } from '@/graphql/queries';
import { CREATE_GROUP_CHAT_MUTATION } from '@/graphql/mutations';
import { useAuth } from '@/context/auth-context';
import { handleError } from '@/lib/error-handler';

interface CreateGroupChatProps {
  onClose: () => void;
  onChatCreated: () => void;
}

export function CreateGroupChat({ onClose, onChatCreated }: CreateGroupChatProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading } = useQuery(SEARCH_USERS_QUERY, {
    variables: { search: debouncedSearch || undefined },
    skip: !debouncedSearch || debouncedSearch.length < 1,
  });
  const [createGroupChat, { loading: creating }] = useMutation(CREATE_GROUP_CHAT_MUTATION, {
    refetchQueries: [{ query: GET_CHATS_QUERY }],
  });

  const users = data?.users?.filter((u: any) => u.id !== user?.id && !selectedUsers.includes(u.id)) || [];

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
    setSearchTerm('');
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedUsers.length < 2) {
      alert('Please select at least 2 participants (minimum 3 total including you)');
      return;
    }

    try {
      const { data: chatData } = await createGroupChat({
        variables: {
          input: {
            name: groupName,
            participantIds: selectedUsers,
          },
        },
      });
      if (chatData?.createGroupChat?.id) {
        onChatCreated();
        router.push(`/chat/${chatData.createGroupChat.id}`);
      }
    } catch (error: any) {
      const errorInfo = handleError(error);
      alert(errorInfo.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Create Group Chat</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Group name..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      />

      {selectedUsers.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700">Selected ({selectedUsers.length}/2+):</div>
          <div className="flex flex-wrap gap-1">
            {selectedUsers.map((userId) => {
              const user = data?.users?.find((u: any) => u.id === userId);
              return (
                <span
                  key={userId}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                >
                  {user?.username || userId}
                  <button
                    onClick={() => toggleUser(userId)}
                    className="hover:text-blue-600"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search users to add..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      />

      {loading && <div className="text-sm text-gray-500">Searching...</div>}
      {debouncedSearch && !loading && users.length === 0 && (
        <div className="text-sm text-gray-500">No users found</div>
      )}
      {users.length > 0 && (
        <div className="max-h-32 overflow-y-auto space-y-1">
          {users.map((u: any) => (
            <button
              key={u.id}
              onClick={() => toggleUser(u.id)}
              className="w-full rounded-md bg-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-100"
            >
              <div className="font-medium">{u.username}</div>
              <div className="text-xs text-gray-500">{u.email}</div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={creating || !groupName.trim() || selectedUsers.length < 2}
        className="w-full rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? 'Creating...' : 'Create Group'}
      </button>
    </div>
  );
}

