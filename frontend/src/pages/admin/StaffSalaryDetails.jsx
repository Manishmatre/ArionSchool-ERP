import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import { useParams,
  useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { getSalary } from '../../api/staffSalaryApi';
import { FiUser,
  FiCalendar,
  FiArrowLeft
} from 'react-icons/fi';
import {
  Card, CardHeader, StatCard, Button, PageLoading, EmptyState,
} from '../../components/ui';

const StaffSalaryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalaryDetails();
  }, [id]);

  const fetchSalaryDetails = async () => {
    try {
      setLoading(true);
      const response = await getSalary(id);
      setSalary(response.data);
    } catch (error) {
      toast.error('Failed to fetch salary details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Salary Details" subtitle="View staff salary breakdown" icon={TbCurrencyRupee} />
        <PageLoading message="Loading salary details..." />
      </Layout>
    );
  }

  if (!salary) {
    return (
      <Layout>
        <PageHeader title="Salary Details" subtitle="View staff salary breakdown" icon={TbCurrencyRupee} />
        <Card>
          <EmptyState
            icon={TbCurrencyRupee}
            title="Salary record not found"
            action={<Button icon={FiArrowLeft} onClick={() => navigate('/admin/staff-salary')}>Back to Salaries</Button>}
          />
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader 
          title={`Salary for ${salary.staff?.personalInfo?.firstName || 'Unknown'} ${salary.staff?.personalInfo?.lastName || ''}`}
          subtitle={`For ${months[salary.month - 1]} ${salary.year}`}
          icon={TbCurrencyRupee}
          actions={(
            <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/staff-salary')}>Back</Button>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Gross Salary" tone="info" icon={TbCurrencyRupee} value={`₹${(salary.grossSalary || 0).toLocaleString()}`} />
          <StatCard title="Total Deductions" tone="danger" icon={TbCurrencyRupee} value={`₹${((salary.totalDeductions || 0) + (salary.advanceDeduction || 0)).toLocaleString()}`} />
          <StatCard title="Net Salary" tone="success" icon={TbCurrencyRupee} value={`₹${(salary.netSalary || 0).toLocaleString()}`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="Staff Details" icon={FiUser} />
            <div className="space-y-2 text-slate-700">
              <p><strong>Name:</strong> {salary.staff?.personalInfo ? `${salary.staff.personalInfo.firstName} ${salary.staff.personalInfo.lastName}` : 'N/A'}</p>
              <p><strong>Designation:</strong> {salary.staff?.employmentDetails?.designation || 'N/A'}</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Salary Period" icon={FiCalendar} />
            <div className="space-y-2 text-slate-700">
              <p><strong>Month:</strong> {months[salary.month - 1]}</p>
              <p><strong>Year:</strong> {salary.year}</p>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Salary Breakdown" icon={TbCurrencyRupee} />
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Basic Salary</span>
              <span className="font-bold text-slate-800">₹{(salary.basicSalary || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Allowances</span>
              <span className="font-bold text-success-600">+₹{(salary.totalAllowances || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Salary</span>
              <span className="font-bold text-slate-800">₹{(salary.grossSalary || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-100">
              <span className="text-slate-500">Deductions</span>
              <span className="font-bold text-danger-600">-₹{(salary.totalDeductions || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Advance Deduction</span>
              <span className="font-bold text-danger-600">-₹{(salary.advanceDeduction || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-100">
              <span className="text-lg font-bold text-slate-800">Net Salary</span>
              <span className="text-lg font-bold text-primary-600">₹{(salary.netSalary || 0).toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default StaffSalaryDetails;
