'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { SEND_MESSAGE_MUTATION } from '@/graphql/mutations';
import { GET_CHATS_QUERY, GET_MESSAGES_QUERY } from '@/graphql/queries';
import { uploadImage } from '@/lib/image-upload';
import { handleError } from '@/lib/error-handler';
import { apolloClient } from '@/lib/apollo-client';

interface MessageInputProps {
  chatId: string;
  onMessageSent: () => void;
}

export function MessageInput({ chatId, onMessageSent }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sendMessage] = useMutation(SEND_MESSAGE_MUTATION, {
    // Update cache after sending message
    update: (cache, { data }) => {
      const sentMessage = (data as any)?.sendMessage;
      if (sentMessage) {
        // Update messages cache
        cache.updateQuery(
          { query: GET_MESSAGES_QUERY, variables: { chatId, limit: 50, offset: 0 } },
          (existing: any) => {
            if (!existing || !existing.messages) return existing;

            // Check for duplicates
            const exists = existing.messages.some((msg: any) => msg.id === sentMessage.id);
            if (exists) return existing;

            // Новое сообщение добавляем в конец (оно самое новое)
            return {
              messages: [...existing.messages, sentMessage],
            };
          }
        );

        // Update chats cache to update lastMessage
        cache.updateQuery(
          { query: GET_CHATS_QUERY },
          (existing: any) => {
            if (!existing || !existing.chats) return existing;

            return {
              chats: existing.chats.map((chat: any) => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    lastMessage: {
                      id: sentMessage.id,
                      content: sentMessage.content,
                      imageUrl: sentMessage.imageUrl,
                      sender: sentMessage.sender,
                      createdAt: sentMessage.createdAt,
                    },
                    updatedAt: sentMessage.updatedAt || sentMessage.createdAt || new Date().toISOString(),
                  };
                }
                return chat;
              }),
            };
          }
        );
      }
    },
  });

  const handleSend = async () => {
    // Валидация: должен быть хотя бы content или imageFile
    if (!content.trim() && !imageFile) {
      alert('Message must have content or image');
      return;
    }

    try {
      setUploading(true);
      let imageUrl = null;

      // Upload image if present
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Prepare input - не передаем null, если поле пустое
      const input: any = {
        chatId,
      };
      
      // Добавляем content только если он есть
      if (content.trim()) {
        input.content = content.trim();
      }
      
      // Добавляем imageUrl только если он есть
      if (imageUrl) {
        input.imageUrl = imageUrl;
      }

      // Send message
      await sendMessage({
        variables: {
          input,
        },
      });

      setContent('');
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onMessageSent();
    } catch (error: any) {
      const errorInfo = handleError(error);
      
      // Специфичная обработка ошибок согласно документации
      if (errorInfo.code === 'UNAUTHENTICATED') {
        alert('Authentication required. Please login again.');
        // Можно добавить автоматический logout
      } else if (errorInfo.code === 'BAD_USER_INPUT') {
        // Может быть "Message must have content or image" или "Chat not found"
        alert(errorInfo.message);
      } else if (errorInfo.code === 'FORBIDDEN') {
        alert('You are not a participant of this chat');
      } else {
        alert(errorInfo.message || 'Failed to send message');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only .png, .jpg, .jpeg, .webp images are allowed');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {imageFile && (
        <div className="mb-2 flex items-center gap-2">
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Preview"
            className="h-20 w-20 rounded object-cover"
          />
          <button
            onClick={() => {
              setImageFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleImageSelect}
          className="hidden"
          id="image-input"
        />
        <label
          htmlFor="image-input"
          className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
          title="Attach image"
        >
          📎
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 resize-none"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={uploading || (!content.trim() && !imageFile)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

