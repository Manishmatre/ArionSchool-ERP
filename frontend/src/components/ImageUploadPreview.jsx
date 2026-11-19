import { useState, useRef } from 'react';
import { FiCamera, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { toAbsoluteUrl } from '../utils/url';

const ImageUploadPreview = ({ 
  onImageSelect, 
  currentImage = null,
  size = 'large',
  label = 'Profile Picture'
}) => {
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef(null);

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

    // Pass file to parent component
    if (onImageSelect) {
      onImageSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageSelect) {
      onImageSelect(null);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center">
      <label className="block text-sm font-medium text-slate-700 mb-3">
        {label}
      </label>

      {/* Image Display */}
      <div className="relative group">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg`}>
          {preview ? (
            <img
              src={toAbsoluteUrl(preview)}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
              <span className="text-white text-4xl font-bold">📸</span>
            </div>
          )}
        </div>

        {/* Upload Overlay */}
        <div
          onClick={handleClick}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <FiCamera className="text-white text-3xl" />
        </div>

        {/* Camera Icon Badge */}
        <button
          type="button"
          onClick={handleClick}
          className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full shadow-lg hover:bg-primary-700 transition"
          title="Upload Photo"
        >
          <FiCamera className="text-lg" />
        </button>

        {/* Remove Button */}
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-0 right-0 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-700 transition"
            title="Remove Photo"
          >
            <FiX className="text-sm" />
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
      />

      
    </div>
  );
};

export default ImageUploadPreview;
