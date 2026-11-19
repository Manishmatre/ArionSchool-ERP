import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiSend, FiAward } from 'react-icons/fi';
import api from '../api/axios';
import { extractApiError } from '../api/axios';
import { Button, TextField } from '../components/ui';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!email || !String(email).trim()) {
      nextErrors.email = 'Email is required';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('If an account exists for this email, a reset link has been sent.');
    } catch (error) {
      const { message } = extractApiError(error);
      toast.error(message || 'Failed to send reset link. Please try again.');
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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password</h1>
          <p className="text-slate-500">We will email you a password reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="Enter your email"
            error={errors.email}
            required
          />

          <Button type="submit" loading={loading} icon={FiSend} className="w-full justify-center">
            Send Reset Link
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600 text-sm">
            Remembered your password?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
