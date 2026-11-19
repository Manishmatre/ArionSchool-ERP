import { TbCurrencyRupee } from 'react-icons/tb';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiUser, FiCalendar, FiFileText, FiArrowLeft, FiSave } from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import DateInput from '../../components/DateInput';
import { getPayment, updatePayment } from '../../api/paymentApi';
import { FormPageLayout, FormSection, FormGrid, Button } from '../../components/ui';

const EditPayment = ({ isFranchise: propIsFranchise }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFranchise = propIsFranchise || ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role);
  const paymentsPath = isFranchise ? '/school/payments' : '/admin/payments';

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentsByCourse, setPaymentsByCourse] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentMode, setPaymentMode] = useState('new'); // 'new' or 'existing'
  const [originalPayment, setOriginalPayment] = useState(null);
  
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
    loadInitialData();
  }, [id]);

  useEffect(() => {
    if (selectedStudent) {
      const studentId = selectedStudent._id || selectedStudent;
      fetchStudentEnrolledCourses(studentId);
      fetchStudentPendingPayments(studentId);
    }
  }, [selectedStudent]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [studentsRes, paymentRes] = await Promise.all([
        api.get('/students'),
        getPayment(id)
      ]);

      const studentsList = studentsRes.data.data || [];
      setStudents(studentsList);

      const paymentData = paymentRes.data;
      setOriginalPayment(paymentData);

      const studentId = paymentData.student?._id || paymentData.student;
      const studentObj = studentsList.find(s => s._id === studentId) || paymentData.student;
      setSelectedStudent(studentObj);

      setFormData({
        student: studentId || '',
        course: paymentData.course?._id || paymentData.course || '',
        amount: paymentData.amount !== undefined ? paymentData.amount.toString() : '',
        paymentMethod: paymentData.paymentMethod || 'cash',
        paymentType: paymentData.paymentType || 'course_fee',
        paymentStatus: paymentData.paymentStatus || 'completed',
        paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        transactionId: paymentData.transactionDetails?.transactionId || paymentData.transactionId || '',
        receiptNumber: paymentData.receiptNumber || '',
        remarks: paymentData.remarks || paymentData.description || '',
      });

      if (studentId) {
        fetchStudentEnrolledCourses(studentId);
        fetchStudentPendingPayments(studentId);
      }
    } catch (error) {
      toast.error('Failed to fetch payment details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentEnrolledCourses = async (studentIdToFetch) => {
    try {
      const studentId = studentIdToFetch || selectedStudent?._id || selectedStudent;
      if (!studentId) return;
      const response = await api.get(`/students/${studentId}`);
      const student = response.data.data;
      const enrollments = student?.enrolledCourses || [];
      
      const courses = enrollments
        .filter(enrollment => enrollment && enrollment.isActive !== false)
        .map(enrollment => ({
          _id: enrollment.course?._id || enrollment.course,
          title: enrollment.course?.title || 'Course',
          enrollmentId: enrollment._id
        }));
      
      setEnrolledCourses(courses);
    } catch (error) {
      console.error('Failed to fetch student courses:', error);
    }
  };

  const fetchStudentPendingPayments = async (studentIdToFetch) => {
    try {
      const studentId = studentIdToFetch || selectedStudent?._id || selectedStudent;
      if (!studentId) return;
      const response = await api.get(`/payments/student/${studentId}`);
      const payments = response.data.data || [];
      const pending = payments.filter(payment => payment.paymentStatus === 'pending' && payment._id !== id);
      
      const paymentsByCourseMap = {};
      pending.forEach(payment => {
        const courseId = payment.course?._id || payment.course;
        if (!courseId) return;
        if (!paymentsByCourseMap[courseId]) {
          paymentsByCourseMap[courseId] = {
            course: payment.course,
            payments: [],
            totalDue: 0
          };
        }
        paymentsByCourseMap[courseId].payments.push(payment);
        paymentsByCourseMap[courseId].totalDue += (payment.amount || 0);
      });
      
      setPendingPayments(pending);
      setPaymentsByCourse(paymentsByCourseMap);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        student: formData.student?._id || formData.student,
        course: formData.course?._id || formData.course,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        paymentType: formData.paymentType,
        paymentStatus: formData.paymentStatus,
        paymentDate: formData.paymentDate,
        transactionId: formData.transactionId,
        receiptNumber: formData.receiptNumber,
        remarks: formData.remarks
      };
      await updatePayment(id, payload);
      toast.success('Payment updated successfully!');
      navigate(paymentsPath);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update payment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Edit Payment"
        subtitle="Update the details of an existing payment transaction"
        icon={TbCurrencyRupee}
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate(paymentsPath)}>
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => navigate(paymentsPath)}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                {loading ? 'Updating...' : 'Update Payment'}
              </Button>
            </>
          }
        >
          <FormSection title="Student & Course Details" icon={FiUser}>
            <FormGrid>
              <div>
                <label className="form-label">
                  Student *
                </label>
                <select
                  name="student"
                  value={formData.student}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.personalInfo?.firstName} {student.personalInfo?.lastName} - {student.studentId}
                    </option>
                  ))}
                  {originalPayment?.student && !students.some(s => s._id === (originalPayment.student?._id || originalPayment.student)) && (
                    <option value={originalPayment.student?._id || originalPayment.student}>
                      {originalPayment.student?.personalInfo?.firstName || 'Student'} {originalPayment.student?.personalInfo?.lastName || ''} - {originalPayment.student?.studentId || ''}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Payment Mode *
                </label>
                <select
                  name="paymentMode"
                  value={paymentMode}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="new">New Payment</option>
                  <option value="existing">Pay Existing Balance</option>
                </select>
              </div>
            </FormGrid>

            {/* Show enrolled courses for new payment */}
            {paymentMode === 'new' && selectedStudent && (
              <div className="mt-6">
                <label className="form-label">
                  Course *
                </label>
                <select
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Course</option>
                  {enrolledCourses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                  {originalPayment?.course && !enrolledCourses.some(c => c._id === (originalPayment.course?._id || originalPayment.course)) && (
                    <option value={originalPayment.course?._id || originalPayment.course}>
                      {originalPayment.course?.title || 'Selected Course'}
                    </option>
                  )}
                </select>
              </div>
            )}

            {/* Show pending payments for existing balance payment */}
            {paymentMode === 'existing' && selectedStudent && Object.keys(paymentsByCourse).length > 0 && (
              <div className="mt-6">
                <label className="form-label">
                  Select Payment to Update *
                </label>
                
                {/* Show payments organized by course */}
                <div className="space-y-4">
                  {Object.entries(paymentsByCourse).map(([courseId, courseData]) => (
                    <div key={courseId} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-800">{courseData.course.title}</h4>
                        <span className="text-sm font-medium text-red-600">
                          Total Due: ₹{courseData.totalDue}
                        </span>
                      </div>
                      
                      <select
                        name="course"
                        value={formData.course}
                        onChange={handleChange}
                        className="input-field"
                        required
                      >
                        <option value="">Select specific payment</option>
                        {courseData.payments.map(payment => (
                          <option key={payment._id} value={payment._id}>
                            {payment.paymentType === 'registration' ? 'Registration Fee' : 'Course Fee'} - 
                            ₹{payment.amount} (Due: {new Date(payment.dueDate).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show message when no pending payments */}
            {paymentMode === 'existing' && selectedStudent && Object.keys(paymentsByCourse).length === 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">No pending payments found for this student.</p>
              </div>
            )}
          </FormSection>

          <FormSection title="Payment Information" icon={TbCurrencyRupee}>
            <FormGrid>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} className="input-field" placeholder="e.g., 5000" required min="0" step="0.01" />
              </div>
              <div>
                <label className="form-label">
                  Payment Type *
                </label>
                <select
                  name="paymentType"
                  value={formData.paymentType}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={paymentMode === 'existing' && formData.course} // Disable when payment is selected
                >
                  <option value="registration">Registration Fee</option>
                  <option value="course_fee">Course Fee</option>
                  <option value="installment">Installment</option>
                  <option value="exam_fee">Exam Fee</option>
                  <option value="certificate_fee">Certificate Fee</option>
                  <option value="other">Other</option>
                </select>
                {paymentMode === 'existing' && formData.course && (
                  <p className="text-xs text-slate-500 mt-1">Payment type is automatically set based on selected payment</p>
                )}
              </div>
              <div>
                <label className="form-label">Payment Method *</label>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-field" required>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="form-label">Payment Status *</label>
                <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className="input-field" required>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="form-label">Payment Date *</label>
                <DateInput name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="form-label">Transaction ID</label>
                <input type="text" name="transactionId" value={formData.transactionId} onChange={handleChange} className="input-field" placeholder="e.g., TXN123456789" />
              </div>
              <div>
                <label className="form-label">Receipt Number</label>
                <input type="text" name="receiptNumber" value={formData.receiptNumber} onChange={handleChange} className="input-field" placeholder="Auto-generated if left empty" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="3" className="input-field" placeholder="Any additional notes about this payment..."></textarea>
              </div>
            </FormGrid>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default EditPayment;
