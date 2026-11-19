import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import { useParams,
  useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiAward,
  FiFileText,
  FiClock,
  FiTrendingUp,
  FiUsers,
  FiArrowLeft
} from 'react-icons/fi';
import { getStaff, deleteStaff, updateStaffStatus } from '../../api/staffApi';
import { getAllSalaries } from '../../api/staffSalaryApi';
import { getAllAdvances } from '../../api/advancePaymentApi';
import {
  Card, CardHeader, StatCard, Badge, StatusBadge, Button, PageLoading, EmptyState,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../components/ui';

const StaffDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [advanceHistory, setAdvanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStaffDetails();
    fetchSalaryHistory();
    fetchAdvanceHistory();
  }, [id]);

  const fetchStaffDetails = async () => {
    try {
      setLoading(true);
      const response = await getStaff(id);
      setStaff(response.data);
    } catch (error) {
      toast.error('Failed to fetch staff details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryHistory = async () => {
    try {
      const response = await getAllSalaries({ staff: id });
      setSalaryHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch salary history:', error);
    }
  };

  const fetchAdvanceHistory = async () => {
    try {
      const response = await getAllAdvances({ staff: id });
      setAdvanceHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch advance history:', error);
    }
  };

  const handleStatusToggle = async () => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStaffStatus(id, newStatus);
      toast.success(`Staff ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchStaffDetails();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      await deleteStaff(id);
      toast.success('Staff deleted successfully');
      navigate('/admin/staff');
    } catch (error) {
      toast.error('Failed to delete staff');
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Staff Details" subtitle="View and manage staff information" icon={FiUser} />
        <PageLoading message="Loading staff details..." />
      </Layout>
    );
  }

  if (!staff) {
    return (
      <Layout>
        <PageHeader title="Staff Details" subtitle="View and manage staff information" icon={FiUser} />
        <Card>
          <EmptyState
            icon={FiUser}
            title="Staff not found"
            description="The staff member you are looking for does not exist or has been removed."
            action={<Button icon={FiArrowLeft} onClick={() => navigate('/admin/staff')}>Back to Staff</Button>}
          />
        </Card>
      </Layout>
    );
  }

  const fullName = `${staff.personalInfo?.firstName} ${staff.personalInfo?.lastName}`;

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader 
          title={fullName} 
          subtitle={staff.employmentDetails?.designation} 
          icon={FiUser}
          actions={(
            <>
              <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/staff')}>
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button icon={FiEdit2} onClick={() => navigate(`/admin/staff/${id}/edit`)}>
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant={staff.status === 'active' ? 'secondary' : 'success'}
                icon={staff.status === 'active' ? FiXCircle : FiCheckCircle}
                onClick={handleStatusToggle}
              >
                <span className="hidden sm:inline">{staff.status === 'active' ? 'Deactivate' : 'Activate'}</span>
              </Button>
              <Button variant="danger" icon={FiTrash2} onClick={handleDelete}>
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </>
          )}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Designation" tone="info" icon={FiBriefcase} value={<span className="capitalize">{staff.employmentDetails?.designation}</span>} />
          <StatCard title="Net Salary" tone="success" icon={TbCurrencyRupee} value={`₹${(staff.salary?.netSalary || staff.salary?.basicSalary || 0).toLocaleString()}`} />
          <StatCard title="Experience" tone="purple" icon={FiAward} value={`${staff.experience?.length || 0} Jobs`} />
          <StatCard title="Tenure" tone="amber" icon={FiClock} value={`${Math.floor((new Date() - new Date(staff.employmentDetails?.joiningDate)) / (1000 * 60 * 60 * 24 * 30))} Months`} />
        </div>

        {/* Tabs */}
        <Card padded={false} className="overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {['overview', 'employment', 'salary', 'salary-history', 'advances', 'qualifications', 'documents'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'salary-history' ? 'Salary History' : tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <FiUser className="text-primary-600" />
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-500">Full Name</p>
                        <p className="text-slate-800 font-medium">{fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Date of Birth</p>
                        <p className="text-slate-800 font-medium">
                          {staff.personalInfo?.dateOfBirth 
                            ? new Date(staff.personalInfo.dateOfBirth).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Gender</p>
                        <p className="text-slate-800 font-medium capitalize">
                          {staff.personalInfo?.gender || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Blood Group</p>
                        <p className="text-slate-800 font-medium">
                          {staff.personalInfo?.bloodGroup || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Aadhar Number</p>
                        <p className="text-slate-800 font-medium">
                          {staff.personalInfo?.aadharNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">PAN Number</p>
                        <p className="text-slate-800 font-medium">
                          {staff.personalInfo?.panNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <FiPhone className="text-primary-600" />
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-500">Email</p>
                        <p className="text-slate-800 font-medium">{staff.contactInfo?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Mobile</p>
                        <p className="text-slate-800 font-medium">{staff.contactInfo?.mobile}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Alternate Phone</p>
                        <p className="text-slate-800 font-medium">
                          {staff.contactInfo?.alternatePhone || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FiMapPin className="text-primary-600" />
                    Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Street</p>
                      <p className="text-slate-800">{staff.contactInfo?.address?.street || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">City</p>
                      <p className="text-slate-800">{staff.contactInfo?.address?.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">State</p>
                      <p className="text-slate-800">{staff.contactInfo?.address?.state || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Pincode</p>
                      <p className="text-slate-800">{staff.contactInfo?.address?.pincode || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Employment Tab */}
            {activeTab === 'employment' && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Employment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-slate-500">Designation</p>
                      <p className="text-slate-800 font-medium capitalize">
                        {staff.employmentDetails?.designation}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Department</p>
                      <p className="text-slate-800 font-medium capitalize">
                        {staff.employmentDetails?.department || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Employee Type</p>
                      <p className="text-slate-800 font-medium capitalize">
                        {staff.employmentDetails?.employeeType}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Joining Date</p>
                      <p className="text-slate-800 font-medium">
                        {new Date(staff.employmentDetails?.joiningDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">School</p>
                      <p className="text-slate-800 font-medium">{staff.franchise?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <p className="text-slate-800 font-medium capitalize">{staff.status}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Permissions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(staff.permissions || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <Badge variant={value ? 'success' : 'danger'}>{value ? 'Yes' : 'No'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Salary Tab */}
            {activeTab === 'salary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Salary Structure</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Basic Salary</span>
                        <span className="font-bold text-slate-800">
                          ₹{(staff.salary?.basicSalary || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">HRA</span>
                        <span className="font-bold text-green-600">
                          +₹{(staff.salary?.allowances?.hra || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">TA</span>
                        <span className="font-bold text-green-600">
                          +₹{(staff.salary?.allowances?.ta || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">DA</span>
                        <span className="font-bold text-green-600">
                          +₹{(staff.salary?.allowances?.da || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-3 border-t">
                        <span className="text-slate-600">PF</span>
                        <span className="font-bold text-red-600">
                          -₹{(staff.salary?.deductions?.pf || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tax</span>
                        <span className="font-bold text-red-600">
                          -₹{(staff.salary?.deductions?.tax || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-3 border-t">
                        <span className="text-lg font-bold text-slate-800">Net Salary</span>
                        <span className="text-lg font-bold text-primary-600">
                          ₹{(staff.salary?.netSalary || staff.salary?.basicSalary || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Bank Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-500">Account Number</p>
                        <p className="text-slate-800 font-medium">
                          {staff.salary?.bankDetails?.accountNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">IFSC Code</p>
                        <p className="text-slate-800 font-medium">
                          {staff.salary?.bankDetails?.ifscCode || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Bank Name</p>
                        <p className="text-slate-800 font-medium">
                          {staff.salary?.bankDetails?.bankName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Payment Mode</p>
                        <p className="text-slate-800 font-medium capitalize">
                          {staff.salary?.paymentMode?.replace('_', ' ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advances Tab */}
            {activeTab === 'advances' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Advance Payment History</h3>
                  <span className="text-sm text-slate-500">Total Advances: {advanceHistory.length}</span>
                </div>
                {advanceHistory.length > 0 ? (
                  <div className="space-y-4">
                    {advanceHistory.map((advance) => (
                      <div key={advance._id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-slate-800">₹{advance.amount.toLocaleString()}</h4>
                              <StatusBadge status={advance.status} />
                            </div>
                            <p className="text-sm text-slate-600 mb-3">{advance.reason}</p>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <FiCalendar className="text-slate-400" />
                                Requested: {new Date(advance.requestDate).toLocaleDateString()}
                              </span>
                              {advance.paidDate && (
                                <span className="flex items-center gap-1">
                                  <FiCheckCircle className="text-green-500" />
                                  Paid: {new Date(advance.paidDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Deduction Schedule */}
                        {advance.deductionSchedule && (
                          <div className="bg-slate-50 rounded-lg p-4 mb-4">
                            <h5 className="font-semibold text-slate-800 mb-3">Deduction Schedule</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Installments</p>
                                <p className="font-medium text-slate-800">{advance.deductionSchedule.installments}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Per Installment</p>
                                <p className="font-medium text-slate-800">₹{advance.deductionSchedule.amountPerInstallment?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Deducted</p>
                                <p className="font-medium text-green-600">₹{advance.deductedAmount.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Remaining</p>
                                <p className="font-medium text-orange-600">₹{advance.remainingAmount.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Deduction History */}
                        {advance.deductions && advance.deductions.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h5 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                              <FiTrendingUp className="text-primary-600" />
                              Deduction History
                            </h5>
                            <div className="space-y-2">
                              {advance.deductions.map((deduction, index) => (
                                <div key={index} className="flex items-center justify-between text-sm bg-white rounded p-3">
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-blue-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </span>
                                    <span className="text-slate-700">
                                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][deduction.month - 1]} {deduction.year}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="font-medium text-green-600">-₹{deduction.amount.toLocaleString()}</span>
                                    <span className="text-slate-500">{new Date(deduction.deductedAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Progress Bar */}
                        {advance.amount > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-slate-600">Deduction Progress</span>
                              <span className="font-medium text-slate-800">
                                {Math.round((advance.deductedAmount / advance.amount) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${(advance.deductedAmount / advance.amount) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={TbCurrencyRupee} title="No advance payment records found" />
                )}
              </div>
            )}

            {/* Qualifications Tab */}
            {activeTab === 'qualifications' && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Education</h3>
                  {staff.qualifications?.length > 0 ? (
                    <div className="space-y-4">
                      {staff.qualifications.map((qual, index) => (
                        <div key={index} className="p-4 bg-white rounded-lg">
                          <h4 className="font-bold text-slate-800">{qual.degree}</h4>
                          <p className="text-slate-600">{qual.institution}</p>
                          <div className="flex gap-4 mt-2 text-sm text-slate-500">
                            <span>Year: {qual.year}</span>
                            <span>•</span>
                            <span>Score: {qual.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No qualifications added</p>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Experience</h3>
                  {staff.experience?.length > 0 ? (
                    <div className="space-y-4">
                      {staff.experience.map((exp, index) => (
                        <div key={index} className="p-4 bg-white rounded-lg">
                          <h4 className="font-bold text-slate-800">{exp.designation}</h4>
                          <p className="text-slate-600">{exp.company}</p>
                          <p className="text-sm text-slate-500 mt-2">{exp.duration}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No experience added</p>
                  )}
                </div>
              </div>
            )}

            {/* Salary History Tab */}
            {activeTab === 'salary-history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Salary History</h3>
                  <span className="text-sm text-slate-500">Total Records: {salaryHistory.length}</span>
                </div>
                {salaryHistory.length > 0 ? (
                  <TableWrapper>
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeader>Month/Year</TableHeader>
                          <TableHeader>Basic</TableHeader>
                          <TableHeader>Allowances</TableHeader>
                          <TableHeader>Gross</TableHeader>
                          <TableHeader>Deductions</TableHeader>
                          <TableHeader>Advance</TableHeader>
                          <TableHeader>Net Salary</TableHeader>
                          <TableHeader>Status</TableHeader>
                          <TableHeader>Payment Date</TableHeader>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {salaryHistory.map((salary) => {
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return (
                            <TableRow key={salary._id}>
                              <TableCell className="font-medium text-slate-900">{months[salary.month - 1]} {salary.year}</TableCell>
                              <TableCell>₹{salary.basicSalary.toLocaleString()}</TableCell>
                              <TableCell className="text-success-600">+₹{salary.totalAllowances.toLocaleString()}</TableCell>
                              <TableCell className="font-medium text-slate-900">₹{salary.grossSalary.toLocaleString()}</TableCell>
                              <TableCell className="text-danger-600">-₹{salary.totalDeductions.toLocaleString()}</TableCell>
                              <TableCell>
                                {salary.advanceDeduction > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-warning-600">
                                      -₹{salary.advanceDeduction.toLocaleString()}
                                    </span>
                                    {salary.advancePayments && salary.advancePayments.length > 0 && (
                                      <span className="text-xs text-slate-500">
                                        {salary.advancePayments.length} advance(s)
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="font-bold text-primary-600">₹{salary.netSalary.toLocaleString()}</TableCell>
                              <TableCell><StatusBadge status={salary.status} /></TableCell>
                              <TableCell>{salary.paymentDate ? new Date(salary.paymentDate).toLocaleDateString() : '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableWrapper>
                ) : (
                  <EmptyState icon={TbCurrencyRupee} title="No salary records found" />
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Documents</h3>
                {staff.documents?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {staff.documents.map((doc, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FiFileText className="text-2xl text-primary-600" />
                          <div>
                            <p className="font-medium text-slate-800">{doc.name}</p>
                            <p className="text-sm text-slate-500 capitalize">{doc.type}</p>
                          </div>
                        </div>
                        <button className="text-primary-600 hover:text-blue-800">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No documents uploaded</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default StaffDetails;
