import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUserPlus, FiAward } from 'react-icons/fi';
import PasswordInput from '../components/PasswordInput';
import { extractApiError } from '../api/axios';
import { Button, TextField, FormField, Card } from '../components/ui';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!formData.name?.trim()) nextErrors.name = 'Full name is required';
    if (!formData.email?.trim()) nextErrors.email = 'Email is required';
    if (formData.mobile && !/^[0-9]{10}$/.test(String(formData.mobile))) nextErrors.mobile = 'Mobile must be 10 digits';
    if (!formData.password?.trim()) nextErrors.password = 'Password is required';
    if (!formData.confirmPassword?.trim()) nextErrors.confirmPassword = 'Confirm password is required';
    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    if (formData.password && formData.password.length < 6) nextErrors.password = 'Password must be at least 6 characters';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const { confirmPassword, ...userData } = formData;
      await register(userData);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      const resolvedFieldErrors = error?.fieldErrors;
      if (resolvedFieldErrors && typeof resolvedFieldErrors === 'object') setErrors(resolvedFieldErrors);
      const { message } = extractApiError(error);
      toast.error(message || error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full card card-pad shadow-soft-lg">
        <div className="text-center mb-8">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 mb-4">
            <FiAward className="text-4xl" />
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-500">Join SES Educare Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" error={errors.name} required />
          <TextField label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" error={errors.email} required />
          <TextField label="Mobile (Optional)" type="tel" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="10-digit mobile number" error={errors.mobile} />
          <FormField label="Password" required error={errors.password}>
            <PasswordInput name="password" value={formData.password} onChange={handleChange} className="input-field" placeholder="Enter password" required />
          </FormField>
          <FormField label="Confirm Password" required error={errors.confirmPassword}>
            <PasswordInput name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field" placeholder="Confirm password" required />
          </FormField>

          <Button type="submit" loading={loading} icon={FiUserPlus} className="w-full justify-center">
            Sign Up
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-slate-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
          </p>
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Forgot password?
          </Link>
        </div>

        <Card className="mt-6 bg-warning-50 border border-warning-200 !shadow-none">
          <p className="text-sm text-warning-700 text-center">
            <strong>Note:</strong> New registrations are for students and parents only. Contact school administration for staff or campus access.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Register;
