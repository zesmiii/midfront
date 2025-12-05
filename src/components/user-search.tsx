'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { SEARCH_USERS_QUERY, GET_CHATS_QUERY } from '@/graphql/queries';
import { CREATE_DM_MUTATION } from '@/graphql/mutations';
import { useAuth } from '@/context/auth-context';
import { handleError } from '@/lib/error-handler';

interface UserSearchProps {
  onClose: () => void;
  onChatCreated: () => void;
}

export function UserSearch({ onClose, onChatCreated }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading } = useQuery(SEARCH_USERS_QUERY, {
    variables: { search: debouncedSearch || undefined },
    skip: !debouncedSearch || debouncedSearch.length < 1,
  });
  const [createDM, { loading: creating }] = useMutation(CREATE_DM_MUTATION, {
    refetchQueries: [{ query: GET_CHATS_QUERY }],
  });

  const users = data?.users?.filter((u: any) => u.id !== user?.id) || [];

  const handleCreateDM = async (participantId: string) => {
    try {
      const { data: chatData } = await createDM({
        variables: { participantId },
      });
      if (chatData?.createDM?.id) {
        onChatCreated();
        router.push(`/chat/${chatData.createDM.id}`);
      }
    } catch (error: any) {
      const errorInfo = handleError(error);
      alert(errorInfo.message);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Start a conversation</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search users by username or email..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      />
      {loading && <div className="text-sm text-gray-500">Searching...</div>}
      {debouncedSearch && !loading && users.length === 0 && (
        <div className="text-sm text-gray-500">No users found</div>
      )}
      {users.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {users.map((u: any) => (
            <button
              key={u.id}
              onClick={() => handleCreateDM(u.id)}
              disabled={creating}
              className="w-full rounded-md bg-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              <div className="font-medium">{u.username}</div>
              <div className="text-xs text-gray-500">{u.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

