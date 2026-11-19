import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiCalendar, FiCheck, FiX, FiPlus, FiFilter, FiUser, FiFileText
} from 'react-icons/fi';
import leaveApi from '../../api/leaveApi';
import studentApi from '../../api/studentApi';
import staffApi from '../../api/staffApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';

const LeaveManagement = () => {
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [applyForm, setApplyForm] = useState({
    applicantType: 'staff',
    staffId: '',
    studentId: '',
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    loadLeaves();
    loadPeople();
  }, [statusFilter, typeFilter]);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.applicantType = typeFilter;
      const res = await leaveApi.getLeaves(params);
      setLeaves(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leave records');
    } finally {
      setLoading(false);
    }
  };

  const loadPeople = async () => {
    try {
      const [studRes, stfRes] = await Promise.all([
        studentApi.getAllStudents({ limit: 50 }),
        staffApi.getAllStaff()
      ]);
      setStudents(studRes.data?.data || []);
      setStaffList(stfRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await leaveApi.applyLeave(applyForm);
      toast.success('Leave application submitted');
      setShowApplyModal(false);
      loadLeaves();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to apply for leave');
    }
  };

  const handleReview = async (id, status) => {
    try {
      const remarks = window.prompt(`Optional review remarks for ${status}:`);
      await leaveApi.reviewLeave(id, { status, reviewRemarks: remarks || '' });
      toast.success(`Leave application marked as ${status}`);
      loadLeaves();
    } catch (err) {
      toast.error('Failed to review leave application');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Leave Management & Attendance Sync"
        subtitle="Staff & student leave applications, approval workflows, and automated daily attendance synchronization."
      />

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium"
          >
            <option value="">All Applicants</option>
            <option value="staff">Staff Members</option>
            <option value="student">Students</option>
          </select>
        </div>

        <Button
          onClick={() => {
            if (staffList.length > 0) setApplyForm(prev => ({ ...prev, staffId: staffList[0]._id }));
            setShowApplyModal(true);
          }}
          className="flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <FiPlus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </Button>
      </div>

      {/* Leaves Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Applicant</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Leave Category</TableHeader>
              <TableHeader>Dates Span</TableHeader>
              <TableHeader>Days</TableHeader>
              <TableHeader>Reason</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaves.length === 0 ? (
              <TableEmpty colSpan={8} message="No leave applications found." />
            ) : (
              leaves.map(l => {
                const name = l.applicantType === 'staff'
                  ? `${l.staff?.personalInfo?.firstName || ''} ${l.staff?.personalInfo?.lastName || ''}`
                  : `${l.student?.personalInfo?.firstName || ''} ${l.student?.personalInfo?.lastName || ''}`;

                return (
                  <TableRow key={l._id}>
                    <TableCell className="font-semibold text-gray-900">
                      {name || 'Applicant'}
                      <span className="block text-[11px] text-gray-400 font-mono">
                        {l.applicantType === 'staff' ? l.staff?.staffId : l.student?.studentId}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize text-xs">
                      {l.applicantType}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-800 capitalize font-medium">
                        {l.leaveType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(l.startDate).toLocaleDateString()} &rarr; {new Date(l.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-bold text-xs">
                      {l.totalDays}d
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 max-w-xs truncate">
                      {l.reason}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}
                        text={l.status?.toUpperCase()}
                      />
                    </TableCell>
                    <TableCell>
                      {l.status === 'pending' ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleReview(l._id, 'approved')}
                            className="p-1 text-emerald-600 hover:text-emerald-800"
                            title="Approve & Sync Attendance"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReview(l._id, 'rejected')}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Resolved</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      {/* APPLY MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Submit Leave Application
            </h3>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Applicant Type
                  </label>
                  <select
                    value={applyForm.applicantType}
                    onChange={(e) => setApplyForm({ ...applyForm, applicantType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  >
                    <option value="staff">Staff Member</option>
                    <option value="student">Student</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Leave Category
                  </label>
                  <select
                    value={applyForm.leaveType}
                    onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 capitalize"
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="medical">Medical Leave</option>
                    <option value="duty">Official Duty</option>
                    <option value="bereavement">Bereavement</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>
              </div>

              {applyForm.applicantType === 'staff' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Staff Member
                  </label>
                  <select
                    value={applyForm.staffId}
                    onChange={(e) => setApplyForm({ ...applyForm, staffId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Staff --</option>
                    {staffList.map(st => (
                      <option key={st._id} value={st._id}>
                        {st.personalInfo?.firstName} {st.personalInfo?.lastName} ({st.staffId})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Student
                  </label>
                  <select
                    value={applyForm.studentId}
                    onChange={(e) => setApplyForm({ ...applyForm, studentId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.personalInfo?.firstName} {s.personalInfo?.lastName} ({s.studentId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Leave
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail reason for absence..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowApplyModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LeaveManagement;
