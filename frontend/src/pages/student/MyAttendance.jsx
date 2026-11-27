import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCalendar, FiCheckCircle, FiPercent, FiSmartphone } from 'react-icons/fi';
import { getStudentAttendance } from '../../api/attendanceApi';
import { useAuth } from '../../context/AuthContext';
import {
  StatCard, PageLoading,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge,
} from '../../components/ui';
import DownloadAppModal from '../../components/DownloadAppModal';

const MyAttendance = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  useEffect(() => {
    if (user && (user._id || user.id)) {
      fetchAttendance();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleAttendanceUpdated = () => {
      if (user && (user._id || user.id)) fetchAttendance();
    };
    window.addEventListener('attendance-updated', handleAttendanceUpdated);
    return () => window.removeEventListener('attendance-updated', handleAttendanceUpdated);
  }, [user]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await getStudentAttendance(user._id || user.id);
      setAttendance(response.data?.records || response.data || []);
    } catch (error) {
      toast.error('Failed to fetch attendance');
      console.error('Error fetching attendance:', error);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = Array.isArray(attendance) ? attendance.filter((a) => a.status === 'present').length : 0;
  const totalCount = Array.isArray(attendance) ? attendance.length : 0;
  const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="My Attendance" subtitle="Track your attendance records" icon={FiCalendar} />

        {/* Center Attendance Policy & Mobile App Guidance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white border border-blue-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FiSmartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary-900">
                Center Attendance Punch Policy
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                Attendance cannot be marked from web browsers. To mark your daily attendance, scan the official Study Center QR Code at your school study center using the <strong>Arion School Mobile App</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDownloadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs transition shadow-xs inline-flex items-center gap-1.5 shrink-0"
          >
            <FiSmartphone className="w-4 h-4" />
            <span>Download Mobile App</span>
          </button>
        </div>

        {loading ? (
          <PageLoading message="Loading attendance..." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Total Days" tone="info" icon={FiCalendar} value={totalCount} />
              <StatCard title="Present" tone="success" icon={FiCheckCircle} value={presentCount} />
              <StatCard title="Attendance %" tone={percentage >= 75 ? 'success' : 'danger'} icon={FiPercent} value={`${percentage}%`} />
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Course</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Remarks</TableHeader>
                  </tr>
                </TableHead>
                <TableBody>
                  {!Array.isArray(attendance) || attendance.length === 0 ? (
                    <TableEmpty colSpan={4} title="No attendance records found" />
                  ) : (
                    attendance.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>{new Date(record.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{record.course?.title || 'N/A'}</TableCell>
                        <TableCell><StatusBadge status={record.status} /></TableCell>
                        <TableCell className="text-slate-600">{record.remarks || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </>
        )}

        {/* Mobile Download Modal */}
        <DownloadAppModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default MyAttendance;

