/**
 * Utility function for uploading images to the server
 * @param file - The image file to upload
 * @returns Promise<string> - The imageUrl returned from the server
 * @throws Error if upload fails
 */
export async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only .png, .jpg, .jpeg, .webp images are allowed');
  }

  // Validate file size (5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 5MB');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('http://localhost:4000/api/image', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized. Please login again.');
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.imageUrl) {
    throw new Error('Server did not return imageUrl');
  }

  return data.imageUrl;
}

