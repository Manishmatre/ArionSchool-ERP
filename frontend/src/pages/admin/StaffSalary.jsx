import { TbCurrencyRupee } from 'react-icons/tb';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCalendar, FiCheck, FiClock, FiEye, FiPlus } from 'react-icons/fi';
import { getAllSalaries, paySalary, getSalaryStats } from '../../api/staffSalaryApi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SelectField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton,
} from '../../components/ui';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const StaffSalary = () => {
  const navigate = useNavigate();
  const [salaries, setSalaries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchSalaries();
    fetchStats();
  }, [monthFilter, yearFilter, statusFilter]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const params = {};
      if (monthFilter) params.month = monthFilter;
      if (yearFilter) params.year = yearFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await getAllSalaries(params);
      setSalaries(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch salaries');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getSalaryStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handlePaySalary = async (id) => {
    if (!window.confirm('Are you sure you want to mark this salary as paid?')) return;
    try {
      await paySalary(id, { paymentMode: 'bank_transfer', transactionId: `TXN${Date.now()}`, remarks: 'Salary paid' });
      toast.success('Salary paid successfully');
      fetchSalaries();
      fetchStats();
    } catch (error) {
      toast.error('Failed to pay salary');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Staff Salary Management" subtitle="Manage and process staff salaries" icon={TbCurrencyRupee} />
        <PageLoading message="Loading salaries..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Staff Salary Management"
          subtitle="Manage and process staff salaries"
          icon={TbCurrencyRupee}
          actions={<Button icon={FiPlus} onClick={() => navigate('/admin/staff-salary/generate')}>Generate Salary</Button>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Pending" tone="info" icon={FiClock} value={stats?.totalPending || 0} />
          <StatCard title="Total Paid" tone="success" icon={FiCheck} value={stats?.totalPaid || 0} />
          <StatCard title="Monthly Total" tone="purple" icon={TbCurrencyRupee} value={`₹${(stats?.monthlyStats?.totalAmount || 0).toLocaleString()}`} />
          <StatCard title="Pending Amount" tone="amber" icon={FiCalendar} value={`₹${(stats?.monthlyStats?.pendingAmount || 0).toLocaleString()}`} />
        </div>

        <FilterBar>
          <FilterBarActions className="w-full sm:w-auto">
            <SelectField value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="min-w-[140px]">
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </SelectField>
            <SelectField value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="min-w-[110px]">
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </SelectField>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[130px]">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Staff</TableHeader>
                <TableHeader>Month/Year</TableHeader>
                <TableHeader>Basic</TableHeader>
                <TableHeader>Gross</TableHeader>
                <TableHeader>Deductions</TableHeader>
                <TableHeader>Net Salary</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {salaries.length === 0 ? (
                <TableEmpty colSpan={8} title="No salary records found" description="Generate salaries for the selected period." />
              ) : (
                salaries.map((salary) => (
                  <TableRow key={salary._id}>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900">
                        {salary.staff?.personalInfo?.firstName} {salary.staff?.personalInfo?.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{salary.staff?.staffId}</div>
                    </TableCell>
                    <TableCell>{months[salary.month - 1]} {salary.year}</TableCell>
                    <TableCell>₹{salary.basicSalary.toLocaleString()}</TableCell>
                    <TableCell>₹{salary.grossSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-danger-600">-₹{(salary.totalDeductions + salary.advanceDeduction).toLocaleString()}</TableCell>
                    <TableCell className="font-bold text-success-600">₹{salary.netSalary.toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={salary.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <IconButton icon={FiEye} variant="primary" title="View Details" onClick={() => navigate(`/admin/staff-salary/${salary._id}`)} />
                        {salary.status === 'pending' && (
                          <Button variant="success" className="!px-3 !py-1 !text-xs" onClick={() => handlePaySalary(salary._id)}>Pay Now</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>
      </div>
    </Layout>
  );
};

export default StaffSalary;
