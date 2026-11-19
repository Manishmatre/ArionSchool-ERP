import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft,
  FiCalendar,
  FiUser
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { getAllStaff } from '../../api/staffApi';
import { generateSalary } from '../../api/staffSalaryApi';
import { getAttendanceSummary } from '../../api/staffAttendanceApi';
import {
  FormPageLayout, FormSection, FormGrid, FormField, SelectField, Button, Card, CardHeader, Badge,
} from '../../components/ui';

const GenerateSalary = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchStaff(); }, []);

  useEffect(() => {
    if (selectedStaff) fetchAttendanceSummary();
    else setAttendanceSummary(null);
  }, [selectedStaff, month, year]);

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff({ status: 'active' });
      setStaff(data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      const data = await getAttendanceSummary({ staffId: selectedStaff, month, year });
      setAttendanceSummary(data.data);
    } catch (error) {
      setAttendanceSummary(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStaff) {
      toast.error('Please select a staff member');
      return;
    }
    try {
      setLoading(true);
      await generateSalary({ staffId: selectedStaff, month, year });
      toast.success('Salary generated successfully!');
      navigate('/admin/staff-salary');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate salary');
    } finally {
      setLoading(false);
    }
  };

  const selectedStaffData = staff.find((s) => s._id === selectedStaff);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <Layout>
      <FormPageLayout
        footer={
          selectedStaffData ? (
            <>
              <Button variant="secondary" onClick={() => navigate('/admin/staff-salary')}>Cancel</Button>
              <Button loading={loading} onClick={handleGenerate}>Generate Salary</Button>
            </>
          ) : null
        }
      >
        <PageHeader
          title="Generate Salary"
          subtitle="Generate monthly salary for staff members"
          icon={TbCurrencyRupee}
          actions={<Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/staff-salary')}>Back</Button>}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormSection title="Select Details" icon={FiCalendar}>
            <FormGrid cols={1}>
              <FormField label="Staff Member" required>
                <SelectField value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                  <option value="">Select Staff</option>
                  {staff.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.personalInfo?.firstName} {member.personalInfo?.lastName} ({member.staffId})
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField label="Month" required>
                <SelectField value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {months.map((m, index) => <option key={index} value={index + 1}>{m}</option>)}
                </SelectField>
              </FormField>
              <FormField label="Year" required>
                <SelectField value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </SelectField>
              </FormField>
            </FormGrid>
          </FormSection>

          {selectedStaffData && (
            <div className="space-y-4">
              <Card>
                <CardHeader title="Staff Information" icon={FiUser} />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{selectedStaffData.personalInfo?.firstName} {selectedStaffData.personalInfo?.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Designation</span><span className="font-medium capitalize">{selectedStaffData.employmentDetails?.designation}</span></div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Salary Breakdown" icon={TbCurrencyRupee} />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Basic Salary</span><span className="font-medium">₹{(selectedStaffData.salary?.basicSalary || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">HRA</span><Badge variant="success">+₹{(selectedStaffData.salary?.allowances?.hra || 0).toLocaleString()}</Badge></div>
                  <div className="flex justify-between"><span className="text-slate-500">TA</span><Badge variant="success">+₹{(selectedStaffData.salary?.allowances?.ta || 0).toLocaleString()}</Badge></div>
                  <div className="flex justify-between"><span className="text-slate-500">DA</span><Badge variant="success">+₹{(selectedStaffData.salary?.allowances?.da || 0).toLocaleString()}</Badge></div>
                  <div className="flex justify-between pt-2 border-t border-slate-100"><span className="text-slate-500">PF</span><Badge variant="danger">-₹{(selectedStaffData.salary?.deductions?.pf || 0).toLocaleString()}</Badge></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tax</span><Badge variant="danger">-₹{(selectedStaffData.salary?.deductions?.tax || 0).toLocaleString()}</Badge></div>
                </div>
              </Card>

              {attendanceSummary && (
                <Card>
                  <CardHeader title="Attendance Summary" icon={FiCalendar} />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Present Days</span><Badge variant="success">{attendanceSummary.presentDays}</Badge></div>
                    <div className="flex justify-between"><span className="text-slate-500">Absent Days</span><Badge variant="danger">{attendanceSummary.absentDays}</Badge></div>
                    <div className="flex justify-between"><span className="text-slate-500">Leaves</span><Badge variant="info">{attendanceSummary.leaves}</Badge></div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </FormPageLayout>
    </Layout>
  );
};

export default GenerateSalary;
