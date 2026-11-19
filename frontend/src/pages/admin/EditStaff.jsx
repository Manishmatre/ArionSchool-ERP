import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import { useParams,
  useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiArrowLeft,
  FiSave
} from 'react-icons/fi';
import { getStaff, updateStaff } from '../../api/staffApi';
import api from '../../api/axios';
import { FormPageLayout, FormSection, FormGrid, Button, PageLoading } from '../../components/ui';

const EditStaff = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [franchises, setFranchises] = useState([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    aadharNumber: '',
    panNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    alternatePhone: '',
    franchise: '',
    designation: '',
    department: '',
    employeeType: '',
    joiningDate: '',
    basicSalary: '',
    hra: '',
    ta: '',
    da: '',
    otherAllowances: '',
    pf: '',
    esi: '',
    tax: '',
    otherDeductions: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    paymentMode: '',
  });

  useEffect(() => {
    fetchFranchises();
    fetchStaffData();
  }, [id]);

  const fetchFranchises = async () => {
    try {
      const response = await api.get('/campuses');
      setFranchises(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    }
  };

  const fetchStaffData = async () => {
    try {
      setFetchLoading(true);
      const response = await getStaff(id);
      const staff = response.data;
      
      setFormData({
        firstName: staff.personalInfo?.firstName || '',
        lastName: staff.personalInfo?.lastName || '',
        email: staff.contactInfo?.email || '',
        phone: staff.contactInfo?.mobile || '',
        dateOfBirth: staff.personalInfo?.dateOfBirth ? new Date(staff.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
        gender: staff.personalInfo?.gender || '',
        bloodGroup: staff.personalInfo?.bloodGroup || '',
        aadharNumber: staff.personalInfo?.aadharNumber || '',
        panNumber: staff.personalInfo?.panNumber || '',
        address: staff.contactInfo?.address?.street || '',
        city: staff.contactInfo?.address?.city || '',
        state: staff.contactInfo?.address?.state || '',
        pincode: staff.contactInfo?.address?.pincode || '',
        alternatePhone: staff.contactInfo?.alternatePhone || '',
        franchise: staff.franchise?._id || '',
        designation: staff.employmentDetails?.designation || '',
        department: staff.employmentDetails?.department || '',
        employeeType: staff.employmentDetails?.employeeType || '',
        joiningDate: staff.employmentDetails?.joiningDate ? new Date(staff.employmentDetails.joiningDate).toISOString().split('T')[0] : '',
        basicSalary: staff.salary?.basicSalary || '',
        hra: staff.salary?.allowances?.hra || '',
        ta: staff.salary?.allowances?.ta || '',
        da: staff.salary?.allowances?.da || '',
        otherAllowances: staff.salary?.allowances?.other || '',
        pf: staff.salary?.deductions?.pf || '',
        esi: staff.salary?.deductions?.esi || '',
        tax: staff.salary?.deductions?.tax || '',
        otherDeductions: staff.salary?.deductions?.other || '',
        accountNumber: staff.salary?.bankDetails?.accountNumber || '',
        ifscCode: staff.salary?.bankDetails?.ifscCode || '',
        bankName: staff.salary?.bankDetails?.bankName || '',
        branchName: staff.salary?.bankDetails?.branchName || '',
        paymentMode: staff.salary?.paymentMode || '',
      });
    } catch (error) {
      toast.error('Failed to fetch staff details');
      console.error(error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup,
          aadharNumber: formData.aadharNumber,
          panNumber: formData.panNumber,
        },
        contactInfo: {
          email: formData.email,
          mobile: formData.phone,
          alternatePhone: formData.alternatePhone,
          address: {
            street: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
          }
        },
        employmentDetails: {
          designation: formData.designation,
          department: formData.department,
          employeeType: formData.employeeType,
          joiningDate: formData.joiningDate,
        },
        salary: {
          basicSalary: formData.basicSalary,
          allowances: {
            hra: formData.hra || 0,
            ta: formData.ta || 0,
            da: formData.da || 0,
            other: formData.otherAllowances || 0,
          },
          deductions: {
            pf: formData.pf || 0,
            esi: formData.esi || 0,
            tax: formData.tax || 0,
            other: formData.otherDeductions || 0,
          },
          paymentMode: formData.paymentMode,
          bankDetails: {
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
            bankName: formData.bankName,
            branchName: formData.branchName,
          }
        },
        franchise: formData.franchise,
      };

      await updateStaff(id, updateData);
      toast.success('Staff updated successfully!');
      navigate(`/admin/staff/${id}`);
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error(error.response?.data?.message || 'Failed to update staff');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Edit Staff Member"
        subtitle="Update staff information"
        icon={FiUser}
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/staff')}>
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => navigate(`/admin/staff/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                {loading ? 'Updating...' : 'Update Staff'}
              </Button>
            </>
          }
        >
          <FormSection title="Personal Information" icon={FiUser}>
            <FormGrid>
              <div>
                <label className="form-label">First Name *</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" required />
              </div>
              <div>
                <label className="form-label">Last Name *</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" required />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-slate-100" required readOnly />
              </div>
              <div>
                <label className="form-label">Phone *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-slate-100" required readOnly />
              </div>
              <div>
                <label className="form-label">Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500">
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Blood Group</label>
                <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="O+" />
              </div>
              <div>
                <label className="form-label">Alternate Phone</label>
                <input type="tel" name="alternatePhone" value={formData.alternatePhone} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">Aadhar Number</label>
                <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">PAN Number</label>
                <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Address Information" icon={FiMapPin}>
            <FormGrid>
              <div className="md:col-span-2">
                <label className="form-label">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows="3"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500"></textarea>
              </div>
              <div>
                <label className="form-label">City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">State</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">Pincode</label>
                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Employment Details" icon={FiBriefcase}>
            <FormGrid>
              <div>
                <label className="form-label">School Campus *</label>
                <select name="franchise" value={formData.franchise} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" required>
                  <option value="">Select Campus</option>
                  {franchises.map(f => (
                    <option key={f._id} value={f._id}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Designation *</label>
                <select name="designation" value={formData.designation} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" required>
                  <option value="">Select Designation</option>
                  <option value="teacher">Teacher</option>
                  <option value="counselor">Counselor</option>
                  <option value="accountant">Accountant</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="manager">Manager</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Department</label>
                <select name="department" value={formData.department} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500">
                  <option value="">Select Department</option>
                  <option value="academics">Academics</option>
                  <option value="administration">Administration</option>
                  <option value="accounts">Accounts</option>
                  <option value="counseling">Counseling</option>
                  <option value="operations">Operations</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Employee Type</label>
                <select name="employeeType" value={formData.employeeType} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500">
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div>
                <label className="form-label">Joining Date</label>
                <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Salary & Bank Details" icon={TbCurrencyRupee}>
            <FormGrid cols={3}>
              <div>
                <label className="form-label">Basic Salary *</label>
                <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" required />
              </div>
              <div>
                <label className="form-label">HRA</label>
                <input type="number" name="hra" value={formData.hra} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">TA</label>
                <input type="number" name="ta" value={formData.ta} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">DA</label>
                <input type="number" name="da" value={formData.da} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">PF</label>
                <input type="number" name="pf" value={formData.pf} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">Tax</label>
                <input type="number" name="tax" value={formData.tax} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">Account Number</label>
                <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">IFSC Code</label>
                <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">Bank Name</label>
                <input type="text" name="bankName" value={formData.bankName} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="form-label">Payment Mode</label>
                <select name="paymentMode" value={formData.paymentMode} onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500">
                  <option value="">Select Mode</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </FormGrid>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default EditStaff;
