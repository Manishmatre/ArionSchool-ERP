import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiX, FiBook } from 'react-icons/fi';
import { getCourses } from '../api/courseApi';
import { enrollStudentInCourse } from '../api/studentApi';

const EnrollCourseModal = ({ isOpen, onClose, studentId, enrolledCourseIds = [], onSuccess }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    courseId: '',
    paymentMethod: 'cash',
    paidAmount: '',
    paymentStatus: 'completed',
    createBalanceRecord: true,
    includeRegistrationFee: false
  });
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      setForm({
        courseId: '',
        paymentMethod: 'cash',
        paidAmount: '',
        paymentStatus: 'completed',
        createBalanceRecord: true,
        includeRegistrationFee: false
      });
      setSelectedCourse(null);
    }
  }, [isOpen]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await getCourses();
      setCourses(res.data || []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const availableCourses = courses.filter(
    (c) => !enrolledCourseIds.includes(c._id)
  );

  const handleCourseChange = (courseId) => {
    const course = courses.find((c) => c._id === courseId) || null;
    setSelectedCourse(course);
    const fee = course
      ? (course.discountedFee > 0 ? course.discountedFee : course.regularFee || 0)
      : '';
    setForm((f) => ({
      ...f,
      courseId,
      paidAmount: fee ? String(fee) : '',
      includeRegistrationFee: Boolean(course?.registrationFee > 0)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.courseId) {
      toast.error('Please select a course');
      return;
    }

    try {
      setSubmitting(true);
      const res = await enrollStudentInCourse(studentId, form.courseId, {
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
        paidAmount: Number(form.paidAmount) || 0,
        createBalanceRecord: form.createBalanceRecord,
        includeRegistrationFee: form.includeRegistrationFee
      });
      toast.success(res.message || 'Student enrolled successfully');
      onSuccess?.(res.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enroll student');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const courseFee = selectedCourse
    ? (selectedCourse.discountedFee > 0 ? selectedCourse.discountedFee : selectedCourse.regularFee || 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FiBook className="text-primary-600" />
            Enroll in Another Course
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {loading ? (
            <p className="text-center text-slate-500 py-8">Loading courses...</p>
          ) : availableCourses.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No additional courses available. Student is already enrolled in all courses.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Course *</label>
                <select
                  required
                  value={form.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select course</option>
                  {availableCourses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title} — ₹{(c.discountedFee || c.regularFee || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCourse && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-900">
                  <p>Course fee: ₹{courseFee.toLocaleString('en-IN')}</p>
                  {selectedCourse.registrationFee > 0 && (
                    <p>Registration fee: ₹{selectedCourse.registrationFee.toLocaleString('en-IN')}</p>
                  )}
                </div>
              )}

              {selectedCourse?.registrationFee > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.includeRegistrationFee}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, includeRegistrationFee: e.target.checked }))
                    }
                  />
                  Collect registration fee (₹{selectedCourse.registrationFee.toLocaleString('en-IN')})
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount paid now</label>
                  <input
                    type="number"
                    min="0"
                    value={form.paidAmount}
                    onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment status</label>
                <select
                  value={form.paymentStatus}
                  onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.createBalanceRecord}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, createBalanceRecord: e.target.checked }))
                  }
                />
                Create pending record for remaining course fee balance
              </label>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableCourses.length === 0}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Enrolling...' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollCourseModal;
