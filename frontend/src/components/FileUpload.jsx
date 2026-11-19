import { FiFile, FiX } from 'react-icons/fi';

const FileUpload = ({ name, label, fileName, onChange, onRemove }) => {
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type="file"
          onChange={handleFileChange}
          className="sr-only"
        />
        <label
          htmlFor={name}
          className="w-full flex items-center input-field cursor-pointer bg-white hover:bg-slate-50"
        >
          <FiFile className="text-slate-500" />
          <span className="ml-3 text-slate-600 truncate">
            {fileName || 'Select a file...'}
          </span>
        </label>
        {fileName && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-red-500"
          >
            <FiX />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
