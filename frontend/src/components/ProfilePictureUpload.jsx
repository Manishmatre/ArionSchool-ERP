import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiCamera, FiTrash2, FiUpload } from 'react-icons/fi';
import api from '../api/axios';
import { toAbsoluteUrl } from '../utils/url';

const ProfilePictureUpload = ({ 
  currentPhoto, 
  userId, 
  userType = 'student', // 'student' or 'user'
  onUploadSuccess,
  size = 'large' // 'small', 'medium', 'large'
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhoto);
  const fileInputRef = useRef(null);

  // Sync preview when currentPhoto prop changes (e.g., after fetching user)
  useEffect(() => {
    setPreview(currentPhoto);
  }, [currentPhoto]);

  const sizeClasses = {
    small: 'w-20 h-20',
    medium: 'w-32 h-32',
    large: 'w-40 h-40'
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('photo', file);

      const endpoint = userType === 'student'
        ? `/students/${userId}/photo`
        : '/users/profile/photo';

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Profile picture uploaded successfully!');
        const photoUrl = userType === 'student' 
          ? response.data.data.photo 
          : response.data.data.profilePicture;
        
        setPreview(photoUrl);
        
        // Callback to parent component
        if (onUploadSuccess) {
          onUploadSuccess(photoUrl);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload photo');
      setPreview(currentPhoto); // Revert to original
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your profile picture?')) {
      return;
    }

    try {
      const endpoint = userType === 'student'
        ? `/students/${userId}/photo`
        : '/users/profile/photo';

      const response = await api.delete(endpoint);

      if (response.data.success) {
        toast.success('Profile picture deleted successfully');
        setPreview(null);
        
        if (onUploadSuccess) {
          onUploadSuccess(null);
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete photo');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center">
      {/* Profile Picture Display */}
      <div className="relative group">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg`}>
          {preview ? (
            <img
              src={toAbsoluteUrl(preview)}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
              <span className="text-white text-4xl font-bold">
                {userType === 'student' ? '👤' : '👥'}
              </span>
            </div>
          )}
        </div>

        {/* Upload Overlay */}
        {!uploading && (
          <div
            onClick={handleClick}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <FiCamera className="text-white text-3xl" />
          </div>
        )}

        {/* Loading Overlay */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
          </div>
        )}

        {/* Camera Icon Badge */}
        {!uploading && (
          <button
            onClick={handleClick}
            className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full shadow-lg hover:bg-primary-700 transition"
            title="Upload Photo"
          >
            <FiCamera className="text-lg" />
          </button>
        )}
      </div>


      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      
    </div>
  );
};

export default ProfilePictureUpload;
