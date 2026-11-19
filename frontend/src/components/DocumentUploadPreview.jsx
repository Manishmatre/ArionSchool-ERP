import { useState, useRef } from 'react';
import { FiFile, FiImage, FiX, FiEye } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { toAbsoluteUrl } from '../utils/url';

const DocumentUploadPreview = ({ 
  name, 
  label, 
  currentFile = null,
  fileName = null,
  onChange, 
  onRemove,
  accept = 'image/*,.pdf,.doc,.docx'
}) => {
  const [preview, setPreview] = useState(currentFile);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null); // For non-image files, don't show preview
    }

    // Pass file to parent component
    if (onChange) {
      onChange(e);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <FiImage className="text-blue-500" />;
    }
    return <FiFile className="text-slate-500" />;
  };

  const isImage = (fileType) => {
    return fileType?.startsWith('image/');
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      
      {/* File Input */}
      <div className="relative">
        <input
          id={name}
          name={name}
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={accept}
          className="sr-only"
        />
        
        {/* Upload Area */}
        <div
          onClick={handleClick}
          className="w-full flex items-center input-field cursor-pointer bg-white hover:bg-slate-50 transition-colors"
        >
          {preview ? (
            <div className="flex items-center flex-1">
              <img 
                src={toAbsoluteUrl(preview)} 
                alt="Preview" 
                className="w-12 h-12 object-contain rounded border border-slate-200"
              />
              <span className="ml-3 text-slate-600 truncate">
                {fileName || 'Image selected'}
              </span>
            </div>
          ) : (
            <div className="flex items-center flex-1">
              {getFileIcon(fileName?.split('.').pop())}
              <span className="ml-3 text-slate-600 truncate">
                {fileName || 'Select a file...'}
              </span>
            </div>
          )}
          
          {fileName && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="ml-3 text-slate-400 hover:text-red-500 transition-colors"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal for Images */}
      {preview && isImage(fileName?.split('.').pop()) && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-primary-600 hover:text-blue-800 flex items-center gap-1"
          >
            <FiEye />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          
          {showPreview && (
            <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
              <img 
                src={toAbsoluteUrl(preview)} 
                alt="Document Preview" 
                className="w-full max-w-md h-auto object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* File Info */}
      {fileName && !isImage(fileName?.split('.').pop()) && (
        <div className="mt-2 text-sm text-slate-500">
          Document file: {fileName}
        </div>
      )}
    </div>
  );
};

export default DocumentUploadPreview;
