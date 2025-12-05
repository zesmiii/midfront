'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { SEND_MESSAGE_MUTATION } from '@/graphql/mutations';
import { GET_CHATS_QUERY } from '@/graphql/queries';
import { uploadImage } from '@/lib/image-upload';

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
    refetchQueries: [{ query: GET_CHATS_QUERY }],
  });

  const handleSend = async () => {
    if (!content.trim() && !imageFile) return;

    try {
      setUploading(true);
      let imageUrl = null;

      // Upload image if present
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Send message
      await sendMessage({
        variables: {
          input: {
            chatId,
            content: content.trim() || null,
            imageUrl,
          },
        },
      });

      setContent('');
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onMessageSent();
    } catch (error: any) {
      alert(error.message || 'Failed to send message');
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

