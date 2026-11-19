const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-[3px]',
  };
  return (
    <div
      className={`animate-spin rounded-full border-primary-200 border-t-primary-600 ${sizes[size] || sizes.md} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

export const PageLoading = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <LoadingSpinner size="lg" />
    {message && <p className="text-sm text-slate-500">{message}</p>}
  </div>
);

export default LoadingSpinner;
