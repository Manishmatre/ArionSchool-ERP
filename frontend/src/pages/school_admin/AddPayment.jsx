import { TbCurrencyRupee } from 'react-icons/tb';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiUser, FiArrowLeft, FiSave } from 'react-icons/fi';
import api from '../../api/axios';
import DateInput from '../../components/DateInput';
import {
  FormPageLayout, FormSection, FormGrid, FormField, SelectField, TextField, TextArea, Button,
} from '../../components/ui';

const AddPayment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentsByCourse, setPaymentsByCourse] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentMode, setPaymentMode] = useState('new'); // 'new' or 'existing'

  const [formData, setFormData] = useState({
    student: '',
    course: '',
    amount: '',
    paymentMethod: 'cash',
    paymentType: 'course_fee',
    paymentStatus: 'completed',
    paymentDate: new Date().toISOString().split('T')[0],
    transactionId: '',
    receiptNumber: '',
    remarks: '',
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentEnrolledCourses();
      fetchStudentPendingPayments();
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchStudentEnrolledCourses = async () => {
    try {
      const response = await api.get(`/students/${selectedStudent._id}`);
      const student = response.data.data;
      const enrollments = student.enrolledCourses || [];

      // Extract course details from enrollments
      const courses = enrollments
        .filter(enrollment => enrollment.isActive)
        .map(enrollment => ({
          _id: enrollment.course._id,
          title: enrollment.course.title,
          enrollmentId: enrollment._id
        }));

      setEnrolledCourses(courses);
    } catch (error) {
      console.error('Failed to fetch student courses:', error);
    }
  };

  const fetchStudentPendingPayments = async () => {
    try {
      const response = await api.get(`/payments/student/${selectedStudent._id}`);
      const payments = response.data.data || [];
      const pending = payments.filter(payment => payment.paymentStatus === 'pending');

      // Group pending payments by course with course details
      const paymentsByCourse = {};
      pending.forEach(payment => {
        const courseId = payment.course._id;
        if (!paymentsByCourse[courseId]) {
          paymentsByCourse[courseId] = {
            course: payment.course,
            payments: [],
            totalDue: 0
          };
        }
        paymentsByCourse[courseId].payments.push(payment);
        paymentsByCourse[courseId].totalDue += payment.amount;
      });

      setPendingPayments(pending);
      setPaymentsByCourse(paymentsByCourse);
    } catch (error) {
      console.error('Failed to fetch pending payments:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'student') {
      const student = students.find(s => s._id === value);
      setSelectedStudent(student);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        course: '', // Reset course when student changes
        amount: '', // Reset amount when student changes
        paymentType: 'course_fee' // Reset to default payment type
      }));
    } else if (name === 'paymentMode') {
      setPaymentMode(value);
      setFormData(prev => ({
        ...prev,
        course: '', // Reset course when payment mode changes
        amount: '', // Reset amount when payment mode changes
        paymentType: 'course_fee' // Reset to default payment type
      }));
    } else if (name === 'course' && paymentMode === 'existing') {
      // Auto-fill amount and paymentType when selecting a pending payment
      const selectedPayment = pendingPayments.find(p => p._id === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        amount: selectedPayment ? selectedPayment.amount.toString() : prev.amount,
        paymentType: selectedPayment ? selectedPayment.paymentType : prev.paymentType
      }));
    } else if (name === 'course' && paymentMode === 'new') {
      // Auto-set paymentType based on course selection for new payments
      setFormData(prev => ({
        ...prev,
        [name]: value,
        paymentType: 'course_fee' // Default to course_fee for new payments
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REC-${year}${month}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (paymentMode === 'existing' && formData.course) {
        // Handle partial payment on existing pending payment
        const paymentId = formData.course; // In this mode, course field stores payment ID
        await api.put(`/payments/${paymentId}/partial-payment`, {
          amount: parseFloat(formData.amount),
          paymentMethod: formData.paymentMethod,
          transactionId: formData.transactionId || ''
        });
        toast.success('Partial payment recorded successfully!');
      } else {
        // Handle new payment
        const paymentData = {
          ...formData,
          receiptNumber: formData.receiptNumber || generateReceiptNumber(),
          franchise: selectedStudent.franchise._id || selectedStudent.franchise
        };

        await api.post('/payments', paymentData);
        toast.success('Payment added successfully!');
      }

      navigate('/school/payments');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add payment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Record New Payment"
        subtitle="Manually record a new payment transaction"
        icon={TbCurrencyRupee}
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/school/payments')}>
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => navigate('/school/payments')}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                {loading ? 'Adding...' : 'Add Payment'}
              </Button>
            </>
          }
        >
          <FormSection title="Student & Course Details" subtitle="Select the student and payment mode" icon={FiUser}>
            <FormGrid>
              <FormField label="Student" required>
                <SelectField name="student" value={formData.student} onChange={handleChange} required>
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.personalInfo?.firstName} {student.personalInfo?.lastName} - {student.studentId}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField label="Payment Mode" required>
                <SelectField name="paymentMode" value={paymentMode} onChange={handleChange} required>
                  <option value="new">New Payment</option>
                  <option value="existing">Pay Existing Balance</option>
                </SelectField>
              </FormField>
            </FormGrid>

            {/* Show enrolled courses for new payment */}
            {paymentMode === 'new' && selectedStudent && (
              <div className="mt-4">
                <FormField label="Course" required>
                  <SelectField name="course" value={formData.course} onChange={handleChange} required>
                    <option value="">Select Course</option>
                    {enrolledCourses.map(course => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>
            )}

            {/* Show pending payments for existing balance payment */}
            {paymentMode === 'existing' && selectedStudent && Object.keys(paymentsByCourse).length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Payment to Update <span className="text-danger-500">*</span></label>
                <div className="space-y-4">
                  {Object.entries(paymentsByCourse).map(([courseId, courseData]) => (
                    <div key={courseId} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-800">{courseData.course.title}</h4>
                        <span className="text-sm font-medium text-danger-600">
                          Total Due: ₹{courseData.totalDue}
                        </span>
                      </div>

                      <SelectField name="course" value={formData.course} onChange={handleChange} required>
                        <option value="">Select specific payment</option>
                        {courseData.payments.map(payment => (
                          <option key={payment._id} value={payment._id}>
                            {payment.paymentType === 'registration' ? 'Registration Fee' : 'Course Fee'} -
                            ₹{payment.amount} (Due: {new Date(payment.dueDate).toLocaleDateString()})
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show message when no pending payments */}
            {paymentMode === 'existing' && selectedStudent && Object.keys(paymentsByCourse).length === 0 && (
              <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-xl">
                <p className="text-success-700 text-sm">No pending payments found for this student.</p>
              </div>
            )}
          </FormSection>

          <FormSection title="Payment Information" subtitle="Amount, method and other details" icon={TbCurrencyRupee}>
            <FormGrid>
              <FormField label="Amount (₹)" required>
                <TextField
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="e.g., 5000"
                  required
                  min="0"
                  step="0.01"
                />
              </FormField>

              <FormField
                label="Payment Type"
                required
                hint={paymentMode === 'existing' && formData.course ? 'Payment type is automatically set based on selected payment' : undefined}
              >
                <SelectField
                  name="paymentType"
                  value={formData.paymentType}
                  onChange={handleChange}
                  required
                  disabled={paymentMode === 'existing' && formData.course}
                >
                  <option value="registration">Registration Fee</option>
                  <option value="course_fee">Course Fee</option>
                  <option value="installment">Installment</option>
                  <option value="exam_fee">Exam Fee</option>
                  <option value="certificate_fee">Certificate Fee</option>
                  <option value="other">Other</option>
                </SelectField>
              </FormField>

              <FormField label="Payment Method" required>
                <SelectField name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </SelectField>
              </FormField>

              <FormField label="Payment Status" required>
                <SelectField name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} required>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </SelectField>
              </FormField>

              <FormField label="Payment Date" required>
                <DateInput
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </FormField>

              <FormField label="Transaction ID">
                <TextField
                  type="text"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleChange}
                  placeholder="e.g., TXN123456789"
                />
              </FormField>

              <FormField label="Receipt Number" hint="Leave empty to auto-generate">
                <TextField
                  type="text"
                  name="receiptNumber"
                  value={formData.receiptNumber}
                  onChange={handleChange}
                  placeholder="Auto-generated if left empty"
                />
              </FormField>

              <FormField label="Remarks" className="md:col-span-2">
                <TextArea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any additional notes about this payment..."
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default AddPayment;
