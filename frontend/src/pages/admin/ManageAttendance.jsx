import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { FiCalendar, FiList, FiCheck, FiX, FiUsers, FiPrinter, FiDownload } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { getAllAttendance, deleteAttendance, getAttendanceStats, markAttendance, updateAttendance, generateAttendanceQR } from '../../api/attendanceApi';
import { getAllStudents } from '../../api/studentApi';
import { getCourses } from '../../api/courseApi';
import { getAllFranchises } from '../../api/campusApi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField, Button,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge,
} from '../../components/ui';

const ManageAttendance = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [attendance, setAttendance] = useState({}); 
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markLoading, setMarkLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); 
  const [dateFilter, setDateFilter] = useState(() => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
});
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [franchiseFilter, setFranchiseFilter] = useState(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? user.franchise : 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const handleOpenQRModal = async () => {
    try {
      setQrLoading(true);
      setShowQRModal(true);
      const targetFranchise = franchiseFilter !== 'all' ? franchiseFilter : (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? user.franchise : undefined);
      const res = await generateAttendanceQR({
        franchiseId: targetFranchise,
        date: dateFilter
      });
      if (res?.success) {
        setQrData(res);
      } else {
        toast.error(res?.message || 'Failed to generate QR code');
      }
    } catch (err) {
      console.error('QR generation error:', err);
      toast.error('Failed to generate attendance QR poster');
    } finally {
      setQrLoading(false);
    }
  };

  const downloadPosterCard = (isAllTime = false) => {
    if (!qrData) return;
    const qrUrl = isAllTime ? (qrData.allTimeQrDataUrl || qrData.qrDataUrl) : qrData.qrDataUrl;
    if (!qrUrl) return;

    const franchise = qrData.franchise || {};
    const franchiseName = (franchise.name || 'SES EDUCARE INSTITUTE').toUpperCase();
    const centerCode = franchise.code || 'SES-CTR';
    const city = franchise.city || 'Campus';
    const validDate = qrData.qrPayload?.date || dateFilter;
    const sessionName = (qrData.qrPayload?.session || 'Full Day').toUpperCase();

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    const drawCardRoundRect = (x, y, w, h, r, fill, stroke) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    };

    // 1. Clean background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1000, 1350);

    // 2. Outer decorative double border
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1e3a8a';
    drawCardRoundRect(35, 35, 930, 1280, 28, false, true);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#93c5fd';
    drawCardRoundRect(47, 47, 906, 1256, 20, false, true);

    // 3. Top Tag Badge
    ctx.fillStyle = isAllTime ? '#d1fae5' : '#dbeafe';
    drawCardRoundRect(270, 85, 460, 46, 23, true, false);

    ctx.fillStyle = isAllTime ? '#065f46' : '#1e40af';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isAllTime ? '🛡️ PERMANENT OFFICIAL WALL GATE' : 'OFFICIAL ATTENDANCE GATE', 500, 114);

    // 4. Institute Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(franchiseName, 500, 185, 820);

    // 5. Center Code & City
    ctx.fillStyle = '#64748b';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Center Code: ${centerCode} · ${city}`, 500, 225);

    // 6. QR Container Box
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    drawCardRoundRect(260, 260, 480, 480, 24, true, true);

    // 7. Draw QR Image asynchronously
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 285, 285, 430, 430);

      // 8. Validity / Session Pill
      ctx.fillStyle = isAllTime ? '#ecfdf5' : '#f8fafc';
      ctx.strokeStyle = isAllTime ? '#a7f3d0' : '#e2e8f0';
      ctx.lineWidth = 1.5;
      drawCardRoundRect(140, 775, 720, 52, 14, true, true);

      ctx.fillStyle = isAllTime ? '#047857' : '#334155';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const pillText = isAllTime
        ? '♾️ Permanent Wall QR (Valid Every Day)   •   ⚡ Daily Auto Check-In'
        : `📅 Valid Date: ${validDate}   •   ⚡ Session: ${sessionName}`;
      ctx.fillText(pillText, 500, 808);

      // 9. Student Instructions Box
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      drawCardRoundRect(90, 860, 820, 240, 20, true, true);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('📱 Student Instructions:', 130, 910);

      ctx.fillStyle = '#1e293b';
      ctx.font = '19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('1. Open the SES Educare LMS Mobile App on your phone.', 130, 960);
      ctx.fillText('2. Tap the QR Punch tab in the bottom menu bar.', 130, 1010);
      ctx.fillText('3. Point your camera at this QR code to mark your daily attendance.', 130, 1060);

      // 10. Footer Note
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SES Educare LMS · Student Attendance System', 500, 1260);

      // Trigger download
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `SES-${isAllTime ? 'AllTime-Wall-Poster' : `Attendance-Poster-${validDate}`}-${centerCode}.png`;
      a.click();
    };
    img.src = qrUrl;
  };



  useEffect(() => {
    fetchStudentsAndFranchises();
  }, [user]); // Add user dependency to refetch when user loads

  useEffect(() => {
    fetchAttendance();
    fetchStats();
  }, [dateFilter, viewMode]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('attendance-updated', (data) => {
        console.log('Real-time attendance update:', data);
        
        // Update local state instead of refetching
        if (data.studentId && data.status && data.date) {
          const recordDate = new Date(data.date).toLocaleDateString('en-CA');
          
          // Only update if it affects the current date filter
          if (!dateFilter || recordDate === dateFilter) {
            // Find the old status for stats update
            let oldStatus = 'not_marked';
            const currentAttendance = attendance[data.studentId];
            
            if (currentAttendance) {
              if (Array.isArray(currentAttendance)) {
                const oldRecord = currentAttendance.find(record => {
                  const recDate = new Date(record.date).toLocaleDateString('en-CA');
                  return recDate === recordDate;
                });
                oldStatus = oldRecord ? oldRecord.status : 'not_marked';
              } else {
                oldStatus = currentAttendance.status || 'not_marked';
              }
            }
            
            // Update attendance state
            setAttendance(prev => {
              const updated = { ...prev };
              
              if (viewMode === 'calendar') {
                // For calendar view, update the specific record in the array
                if (updated[data.studentId]) {
                  updated[data.studentId] = updated[data.studentId].map(record => {
                    const recDate = new Date(record.date).toLocaleDateString('en-CA');
                    return recDate === recordDate ? { ...record, status: data.status } : record;
                  });
                } else {
                  // Add new record if it doesn't exist
                  updated[data.studentId] = [{ 
                    _id: data.attendanceId, 
                    student: { _id: data.studentId }, 
                    date: data.date, 
                    status: data.status 
                  }];
                }
              } else {
                // For list view, update single record
                updated[data.studentId] = { 
                  _id: data.attendanceId, 
                  student: { _id: data.studentId }, 
                  date: data.date, 
                  status: data.status 
                };
              }
              
              return updated;
            });
            
            // Update stats locally
            setStats(prev => {
              const newStats = { ...prev };
              
              // Decrease old status count
              if (oldStatus !== 'not_marked') {
                newStats[oldStatus] = Math.max(0, (newStats[oldStatus] || 0) - 1);
              }
              
              // Increase new status count
              if (data.status !== 'not_marked') {
                newStats[data.status] = (newStats[data.status] || 0) + 1;
              }
              
              return newStats;
            });
          }
        }
      });

      return () => {
        socket.off('attendance-updated');
      };
    }
  }, [socket, dateFilter, viewMode, attendance]);

  const fetchStudentsAndFranchises = async () => {
    try {
      // For school admins, only fetch their students
      const params = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? { franchise: user.franchise } : { status: 'active' };
      console.log('Fetching students with params:', params);
      const [studentsRes, coursesRes, franchisesRes] = await Promise.all([
        getAllStudents(params),
        getCourses(),
        getAllFranchises(),
      ]);
      console.log('Students response:', studentsRes);
      setStudents(studentsRes?.data || []);
      setCourses(coursesRes?.data || []);
      setFranchises(franchisesRes?.data || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load initial data');
    }
  };

  const fetchAttendance = async () => {
    try {
      setAttendance({}); // Clear previous attendance data
      setLoading(true);
      
      // For calendar view, fetch entire month data
      const params = {};
      if (viewMode === 'calendar' && dateFilter) {
        const date = new Date(dateFilter);
        const year = date.getFullYear();
        const month = date.getMonth();
        const startDate = new Date(year, month, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (dateFilter) {
        params.date = dateFilter;
      }
      
      const res = await getAllAttendance(params);
      console.log('Fetched attendance data:', res.data);
      
      const attendanceMap = {};
      (res.data || []).forEach(record => {
        if(record.student?._id) {
          // For calendar view, store all records by student ID
          if (!attendanceMap[record.student._id]) {
            attendanceMap[record.student._id] = [];
          }
          attendanceMap[record.student._id].push(record);
        }
      });
      
      // For list view, convert to single record per student for the selected date
      if (viewMode === 'list' && dateFilter) {
        Object.keys(attendanceMap).forEach(studentId => {
          const records = attendanceMap[studentId];
          const recordForDate = records.find(r => {
            const recordDate = new Date(r.date).toLocaleDateString('en-CA');
            return recordDate === dateFilter;
          });
          attendanceMap[studentId] = recordForDate || null;
        });
      }
      
      console.log('Processed attendance map:', attendanceMap);
      setAttendance(attendanceMap);
    } catch (error) {
      toast.error('Failed to fetch attendance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Filter stats by selected date
      const params = dateFilter ? { date: dateFilter } : {};
      console.log('Fetching stats with params:', params);
      const data = await getAttendanceStats(params);
      console.log('Stats response:', data);
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${student.personalInfo?.firstName} ${student.personalInfo?.lastName}`
        .toLowerCase().includes(searchTerm.toLowerCase());
    
    // For school admins, skip franchise filtering since franchiseFilter is already set to their franchise
    const matchesFranchise = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? true : (franchiseFilter === 'all' || student.franchise?._id === franchiseFilter);

    if (statusFilter === 'all') {
      return matchesSearch && matchesFranchise;
    }

    const attendanceRecord = attendance[student._id];
    const recordStatus = attendanceRecord ? attendanceRecord.status : 'not_marked';
    const matchesStatus = recordStatus === statusFilter;

    return matchesSearch && matchesFranchise && matchesStatus;
  });

  console.log('Students loaded:', students.length);
  console.log('Students data:', students);
  console.log('Filtered students count:', filteredStudents.length);

  const handleMarkAttendance = async (studentId, status) => {
    try {
      setMarkLoading(true);
      // Find the student to get courseId if available
      const student = students.find(s => s._id === studentId);
      const courseId = student && student.enrolledCourses && student.enrolledCourses[0]?.course;
      
      // Check if attendance already exists for this student and date
      let existingRecord = attendance[studentId];
      
      // Handle both array (calendar view) and single record (list view) structures
      if (Array.isArray(existingRecord)) {
        // Find the record for the selected date
        existingRecord = existingRecord.find(record => {
          const recordDate = new Date(record.date).toLocaleDateString('en-CA');
          return recordDate === dateFilter;
        });
      }
      
      if (existingRecord) {
        // Update existing attendance
        const result = await updateAttendance(existingRecord._id, { status });
        toast.success('Attendance updated successfully');
        
        // Update local state immediately
        if (viewMode === 'calendar') {
          // For calendar view, update the specific record in the array
          setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId].map(record => {
              const recordDate = new Date(record.date).toLocaleDateString('en-CA');
              return recordDate === dateFilter ? { ...record, status } : record;
            })
          }));
        } else {
          // For list view, update the single record
          setAttendance(prev => ({
            ...prev,
            [studentId]: { ...existingRecord, status }
          }));
        }
      } else {
        // Create new attendance record
        const payload = {
          studentId,
          date: dateFilter || new Date().toLocaleDateString('en-CA'),
          status,
          session: 'full_day',
        };
        if (courseId) payload.courseId = courseId;
        const result = await markAttendance(payload);
        console.log('Mark attendance result:', result);
        
        // Update local state immediately
        const newRecord = result.data || result;
        if (viewMode === 'calendar') {
          // For calendar view, add to array
          setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] ? [...prev[studentId], newRecord] : [newRecord]
          }));
        } else {
          // For list view, set single record
          setAttendance(prev => ({
            ...prev,
            [studentId]: newRecord
          }));
        }
        
        toast.success('Attendance marked successfully');
      }
      
      // Update stats locally instead of refetching
      setStats(prev => {
        const newStats = { ...prev };
        if (existingRecord) {
          // Update existing stats
          const oldStatus = existingRecord.status;
          if (oldStatus !== 'not_marked') {
            newStats[oldStatus] = Math.max(0, (newStats[oldStatus] || 0) - 1);
          }
        }
        if (status !== 'not_marked') {
          newStats[status] = (newStats[status] || 0) + 1;
        }
        return newStats;
      });
      
    } catch (error) {
      console.error('Mark attendance error:', error);
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarkLoading(false);
    }
  };



  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading attendance..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Manage Attendance"
          subtitle="Track and manage student attendance"
          icon={FiCalendar}
          compact
          actions={
            <Button
              className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-sm"
              onClick={handleOpenQRModal}
            >
              <FiPrinter className="text-base" />
              <span>Institute QR Poster</span>
            </Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Records" tone="info" icon={FiCalendar} value={stats?.totalRecords || 0} />
          <StatCard title="Present" tone="success" icon={FiCheck} value={stats?.presentCount || 0} />
          <StatCard title="Absent" tone="danger" icon={FiX} value={stats?.absentCount || 0} />
          <StatCard title="Avg. Attendance" tone="purple" icon={FiUsers} value={`${stats?.averagePercentage?.toFixed(1) || 0}%`} />
        </div>

        <FilterBar>
          <SearchInput className="flex-1 max-w-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by student name or ID..." />
          <FilterBarActions>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600'}`}><FiList /></button>
              <button onClick={() => setViewMode('calendar')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600'}`}><FiCalendar /></button>
            </div>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} max={new Date().toISOString().split('T')[0]} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
            {viewMode === 'list' && (
              <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="leave">Leave</option>
                <option value="not_marked">Not Marked</option>
              </SelectField>
            )}
            {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
              <SelectField value={franchiseFilter} onChange={(e) => setFranchiseFilter(e.target.value)}>
                <option value="all">All Campuses</option>
                {franchises.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </SelectField>
            )}
          </FilterBarActions>
        </FilterBar>

      {/* Student List - Only show in list view */}
      {viewMode === 'list' && (
        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Student ID</TableHeader>
                <TableHeader>Name</TableHeader>
                {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && <TableHeader>Campus / School</TableHeader>}
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableEmpty colSpan={!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? 5 : 4} title="No students found" description="Try adjusting your search or filters." />
              ) : filteredStudents.map((student) => {
                let attendanceRecord = null;
                const studentAttendance = attendance[student._id];
                if (studentAttendance) {
                  if (Array.isArray(studentAttendance)) {
                    attendanceRecord = studentAttendance.find((record) => new Date(record.date).toLocaleDateString('en-CA') === dateFilter);
                  } else if (studentAttendance.date) {
                    const recordDate = new Date(studentAttendance.date).toLocaleDateString('en-CA');
                    if (recordDate === dateFilter) attendanceRecord = studentAttendance;
                  }
                }
                return (
                  <TableRow key={student._id}>
                    <TableCell><span className="font-medium">{student.studentId}</span></TableCell>
                    <TableCell><span className="font-medium">{student.personalInfo?.firstName} {student.personalInfo?.lastName}</span></TableCell>
                    {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) && (
                      <TableCell><span className="capitalize">{student.franchise?.name || 'N/A'}</span></TableCell>
                    )}
                    <TableCell>
                      {attendanceRecord ? <StatusBadge status={attendanceRecord.status} /> : <span className="text-sm text-slate-400">Not marked</span>}
                    </TableCell>
                    <TableCell>
                      {attendanceRecord ? (
                        <SelectField value={attendanceRecord.status} onChange={(e) => handleMarkAttendance(student._id, e.target.value)} disabled={markLoading} className="w-36">
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="half_day">Half Day</option>
                          <option value="leave">Leave</option>
                        </SelectField>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          <Button className="text-xs py-1.5 px-2.5" variant="success" onClick={() => handleMarkAttendance(student._id, 'present')} disabled={markLoading}>Present</Button>
                          <Button className="text-xs py-1.5 px-2.5" variant="danger" onClick={() => handleMarkAttendance(student._id, 'absent')} disabled={markLoading}>Absent</Button>
                          <Button className="text-xs py-1.5 px-2.5" variant="secondary" onClick={() => handleMarkAttendance(student._id, 'half_day')} disabled={markLoading}>Half Day</Button>
                          <Button className="text-xs py-1.5 px-2.5" variant="ghost" onClick={() => handleMarkAttendance(student._id, 'leave')} disabled={markLoading}>Leave</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <AttendanceCalendar
          attendanceData={attendance}
          students={students}
          onDateSelect={(date) => setDateFilter(date)}
          selectedDate={dateFilter}
          user={user}
          loading={loading}
        />
      )}

      {/* Institute QR Attendance Poster Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Institute Attendance QR Poster</h3>
                <p className="text-xs text-primary-100">Print or display in your classroom for student scan & punch</p>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Poster Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">
              {qrLoading ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-medium text-slate-600">Generating Institute QR Code...</p>
                </div>
              ) : qrData ? (
                <div className="w-full bg-slate-50 border-2 border-dashed border-primary-300 rounded-2xl p-6 text-center flex flex-col items-center">
                  {/* Poster Header */}
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-primary-100 text-primary-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                      Official Attendance Gate
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {qrData.franchise?.name || 'SES EDUCARE INSTITUTE'}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500">
                      Center Code: {qrData.franchise?.code || 'SES-CTR'} · {qrData.franchise?.city || 'Campus'}
                    </p>
                  </div>

                  {/* QR Image Box */}
                  <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 mb-4 inline-block">
                    <img
                      src={qrData.qrDataUrl}
                      alt="Attendance QR Code"
                      className="w-56 h-56 object-contain"
                    />
                  </div>

                  {/* Date & Session */}
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-200 mb-4 text-xs font-medium text-slate-700">
                    <span>📅 Valid Date: <strong className="text-primary-700">{qrData.qrPayload?.date || dateFilter}</strong></span>
                    <span>•</span>
                    <span>⚡ Session: <strong className="capitalize text-emerald-700">{qrData.qrPayload?.session || 'Full Day'}</strong></span>
                  </div>

                  {/* Instructions */}
                  <div className="bg-primary-50/80 rounded-xl p-3.5 text-left w-full text-xs text-primary-950 space-y-1">
                    <p className="font-bold text-primary-800 flex items-center gap-1.5">
                      <span>📱</span> Student Instructions:
                    </p>
                    <p>1. Open the <strong>SES LMS Mobile App</strong> on your phone.</p>
                    <p>2. Tap the <strong>QR Punch</strong> tab in the bottom bar.</p>
                    <p>3. Point your camera at this QR code to mark your daily attendance.</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs shadow-xs"
                  onClick={() => downloadPosterCard(true)}
                  disabled={!qrData}
                  title="Download complete All-Time Wall Poster Card PNG with institute details"
                >
                  <FiDownload className="text-emerald-700 text-sm" />
                  <span>Download All-Time Wall Card</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowQRModal(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs"
                  onClick={() => downloadPosterCard(false)}
                  disabled={!qrData}
                  title="Download complete Today Session Poster Card PNG with institute details"
                >
                  <FiDownload className="text-sm" />
                  <span>Download Session Card</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </Layout>
  );
};

export default ManageAttendance;
