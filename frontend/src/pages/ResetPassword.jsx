import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiLock, FiSave, FiAward } from 'react-icons/fi';
import PasswordInput from '../components/PasswordInput';
import api from '../api/axios';
import { extractApiError } from '../api/axios';
import { Button, FormField } from '../components/ui';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Invalid reset link');
      return;
    }

    const nextErrors = {};
    if (!password || !String(password).trim()) {
      nextErrors.password = 'New password is required';
    }
    if (!confirmPassword || !String(confirmPassword).trim()) {
      nextErrors.confirmPassword = 'Confirm password is required';
    }
    if (password && password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }
    if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password });
      if (response?.data?.token) {
        localStorage.setItem('token', response.data.token);
      }
      toast.success('Password reset successful');
      navigate('/login');
    } catch (error) {
      const { message } = extractApiError(error);
      toast.error(message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full card card-pad shadow-soft-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <FiAward className="text-4xl" />
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h1>
          <p className="text-slate-500">Set a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="New Password" required error={errors.password}>
            <PasswordInput
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              className="input-field"
              placeholder="Enter new password"
              required
            />
          </FormField>

          <FormField label="Confirm Password" required error={errors.confirmPassword}>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              className="input-field"
              placeholder="Confirm new password"
              required
            />
          </FormField>

          <Button type="submit" loading={loading} icon={FiSave} className="w-full justify-center">
            Update Password
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
