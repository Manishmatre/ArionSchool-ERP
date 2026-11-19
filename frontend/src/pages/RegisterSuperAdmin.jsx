import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUserPlus, FiShield, FiAward } from 'react-icons/fi';
import api from '../api/axios';
import PasswordInput from '../components/PasswordInput';
import { Button, TextField, FormField, Card, Badge } from '../components/ui';

const RegisterSuperAdmin = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    secretKey: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (formData.secretKey && formData.secretKey !== 'SES_SUPER_ADMIN_2024') {
      toast.error('Invalid secret key. If provided, it must match the system secret key.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...userData } = formData;
      await api.post('/auth/register', { ...userData, role: 'super_admin' });
      toast.success('Super Admin registered successfully! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Super Admin may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full card card-pad shadow-soft-lg">
        <div className="text-center mb-8">
          <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 mb-4">
            <FiAward className="text-4xl" />
            <FiShield className="text-xl text-indigo-600 absolute -top-1 -right-1" />
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Super Admin Registration</h1>
          <p className="text-slate-500">SES Educare Platform — initial setup only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" required />
          <TextField label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="admin@seseducare.com" required />
          <TextField label="Mobile Number" type="tel" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Enter mobile number" required />
          <FormField label="Password" required>
            <PasswordInput name="password" value={formData.password} onChange={handleChange} className="input-field" placeholder="Create password" required />
          </FormField>
          <FormField label="Confirm Password" required>
            <PasswordInput name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field" placeholder="Confirm password" required />
          </FormField>
          <FormField label="Secret Key (Optional)" hint="Leave empty to register without secret key">
            <PasswordInput name="secretKey" value={formData.secretKey} onChange={handleChange} className="input-field" placeholder="Optional secret key" />
          </FormField>

          <Button type="submit" loading={loading} icon={FiUserPlus} className="w-full justify-center">
            Register as Super Admin
          </Button>
        </form>

        <Card className="mt-6 bg-warning-50 border border-warning-200 !shadow-none">
          <p className="text-sm text-warning-800 text-center">
            <Badge variant="warning" className="mb-2">Warning</Badge>
            <br />
            Only one Super Admin can exist. This registration is for initial setup only.
          </p>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterSuperAdmin;
