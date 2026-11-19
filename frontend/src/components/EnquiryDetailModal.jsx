import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiX, FiPhone, FiMail, FiBook, FiUser, FiCheckCircle, FiUserPlus, FiCalendar, FiClock, FiMapPin, FiTag } from 'react-icons/fi';
import {
  getEnquiry,
  updateEnquiryStatus,
  updateEnquiry,
  addFollowUp,
  enrollStudentFromEnquiry
} from '../api/enquiryApi';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New / Uncontacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested / Qualified' },
  { value: 'converted', label: 'Converted to Student' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'closed', label: 'Closed' }
];

const statusClass = (status) => {
  switch (status) {
    case 'converted': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case 'interested': return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'contacted': return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'new': return 'bg-purple-100 text-purple-800 border border-purple-200';
    case 'closed': return 'bg-slate-100 text-slate-700 border border-slate-200';
    default: return 'bg-rose-100 text-rose-800 border border-rose-200';
  }
};

const EnquiryDetailModal = ({ enquiryId, isOpen, onClose, onUpdated, onConvertToStudent }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [enrollNote, setEnrollNote] = useState('');

  useEffect(() => {
    if (isOpen && enquiryId) {
      fetchEnquiry();
    }
  }, [isOpen, enquiryId]);

  const fetchEnquiry = async () => {
    try {
      setLoading(true);
      const res = await getEnquiry(enquiryId);
      setEnquiry(res.data);
      setGeneralNotes(res.data?.notes || '');
    } catch {
      toast.error('Failed to load enquiry details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      setSaving(true);
      await updateEnquiryStatus(enquiryId, status);
      toast.success('Status updated');
      await fetchEnquiry();
      onUpdated?.();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      await updateEnquiry(enquiryId, { notes: generalNotes });
      toast.success('Notes saved');
      await fetchEnquiry();
      onUpdated?.();
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpNote.trim()) {
      toast.error('Please enter a follow-up note');
      return;
    }
    try {
      setSaving(true);
      await addFollowUp(enquiryId, {
        notes: followUpNote.trim(),
        nextFollowUpDate: nextFollowUpDate || undefined
      });
      toast.success('Follow-up note added');
      setFollowUpNote('');
      setNextFollowUpDate('');
      await fetchEnquiry();
      onUpdated?.();
    } catch {
      toast.error('Failed to add follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!window.confirm(`Enroll ${enquiry.name} in ${enquiry.course?.title}?`)) return;
    try {
      setSaving(true);
      await enrollStudentFromEnquiry(enquiryId, {
        note: enrollNote || `Enrolled in ${enquiry.course?.title} by admin`
      });
      toast.success('Student enrolled successfully');
      await fetchEnquiry();
      onUpdated?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enroll student');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const targetStudentId = enquiry?.convertedToStudent?._id || enquiry?.student?._id;
  const studentPath = targetStudentId
    ? (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)
        ? `/school/students/${targetStudentId}`
        : `/admin/students/${targetStudentId}`)
    : null;

  const isConverted = enquiry?.status === 'converted' || Boolean(enquiry?.convertedToStudent);
  const canEnrollExisting = Boolean(enquiry?.student && enquiry?.course && !isConverted);
  const canConvertToStudent = !isConverted && !enquiry?.student;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">CRM Lead Details</h3>
              <p className="text-xs text-slate-500">Contact information, communication logs, and conversion tools</p>
            </div>
            {enquiry && (
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${statusClass(enquiry.status)}`}>
                {enquiry.status?.replace('_', ' ')}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition">
            <FiX size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : enquiry ? (
          <div className="p-6 space-y-6">
            {/* Quick Contact & Lead Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <FiUser className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Applicant Name</p>
                  <p className="font-semibold text-slate-900 text-sm">{enquiry.name}</p>
                  {(enquiry.student?.studentId || enquiry.convertedToStudent?.studentId) && (
                    <span className="inline-block mt-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      ID: {enquiry.student?.studentId || enquiry.convertedToStudent?.studentId}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <FiMail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email Address</p>
                  <a href={`mailto:${enquiry.email}`} className="font-semibold text-primary-600 hover:underline text-sm break-all">
                    {enquiry.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FiPhone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Mobile Phone</p>
                  <a href={`tel:${enquiry.mobile}`} className="font-semibold text-slate-900 hover:text-emerald-700 text-sm">
                    {enquiry.mobile}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <FiBook className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Target Course / Subject</p>
                  <p className="font-semibold text-slate-900 text-sm">{enquiry.course?.title || 'General Enquiry'}</p>
                  {enquiry.course?.regularFee > 0 && (
                    <p className="text-[11px] text-slate-500">Fee: ₹{enquiry.course.discountedFee || enquiry.course.regularFee}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Message & Meta info */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 text-xs">
              <p className="text-slate-500 font-medium mb-1">Requirement / Inquired Message</p>
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{enquiry.message || 'No specific message.'}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-slate-500 border-t border-slate-200/60 pt-2.5">
                <span className="flex items-center gap-1">
                  <FiTag className="w-3.5 h-3.5 text-slate-400" /> Source: <strong className="capitalize text-slate-700">{enquiry.source?.replace('_', ' ')}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <FiClock className="w-3.5 h-3.5 text-slate-400" /> Logged: <strong className="text-slate-700">{new Date(enquiry.createdAt).toLocaleString('en-IN')}</strong>
                </span>
                {enquiry.city && (
                  <span className="flex items-center gap-1">
                    <FiMapPin className="w-3.5 h-3.5 text-slate-400" /> Location: <strong className="text-slate-700">{[enquiry.city, enquiry.state].filter(Boolean).join(', ')}</strong>
                  </span>
                )}
                {enquiry.franchise?.name && (
                  <span>Campus: <strong className="text-slate-700">{enquiry.franchise.name}</strong></span>
                )}
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pipeline Stage / Status</label>
              <select
                value={enquiry.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={saving}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-white shadow-xs focus:ring-2 focus:ring-primary-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* General Internal Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Internal Counselor Notes</label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Counselor remarks, qualification background, discount discussed..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-xs font-semibold shadow-xs transition"
                >
                  Save Remarks
                </button>
              </div>
            </div>

            {/* Follow-up Note Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Log Follow-up Call / Interaction</label>
              <textarea
                rows={2}
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Notes from call, parent conversation, agreed callback date..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Next Follow-up Date:</span>
                </div>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddFollowUp}
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-xs font-semibold sm:ml-auto transition"
                >
                  Save Call Log
                </button>
              </div>
            </div>

            {/* Follow-up History */}
            {enquiry.followUps?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Communication History</h4>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {enquiry.followUps.slice().reverse().map((fu, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs">
                      <p className="text-slate-800 font-medium leading-relaxed">{fu.notes}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {fu.date ? new Date(fu.date).toLocaleString('en-IN') : ''}
                        {fu.contactedBy?.name && ` · Counselor: ${fu.contactedBy.name}`}
                        {fu.nextFollowUpDate && ` · Next Follow-up: ${new Date(fu.nextFollowUpDate).toLocaleDateString('en-IN')}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CRM Conversion Bottom Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {isConverted && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                    Enrolled Active Student
                  </span>
                )}
                {studentPath && (
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate(studentPath); }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                  >
                    View Student Profile
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* DIRECT CONVERT TO STUDENT */}
                {canConvertToStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onConvertToStudent?.(enquiry);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold text-xs shadow-xs transition"
                  >
                    <FiUserPlus className="w-4 h-4" />
                    <span>Convert to Enrolled Student</span>
                  </button>
                )}

                {/* ENROLL EXISTING STUDENT */}
                {canEnrollExisting && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={enrollNote}
                      onChange={(e) => setEnrollNote(e.target.value)}
                      placeholder="Enrollment note (optional)"
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs w-48"
                    />
                    <button
                      type="button"
                      onClick={handleEnrollStudent}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-xs font-semibold transition"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      <span>Enroll in Course</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-12 text-xs">Enquiry not found</p>
        )}
      </div>
    </div>
  );
};

export default EnquiryDetailModal;
