import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiUsers, FiLayers, FiCalendar } from 'react-icons/fi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton,
} from '../../components/ui';
import { getAllStudents, deleteStudent } from '../../api/studentApi';
import { getAllCampuses } from '../../api/campusApi';
import academicApi from '../../api/academicApi';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { toAbsoluteUrl } from '../../utils/url';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const ManageStudents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFilterMasters();
  }, []);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusFilter, classFilter, sessionFilter, statusFilter, currentPage, itemsPerPage]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchStudents();
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useAutoRefresh(
    () => fetchStudents({ silent: true }),
    { interval: 30000, events: ['new-enrollment', 'student-promoted'] }
  );

  const fetchFilterMasters = async () => {
    try {
      const [campusRes, classRes, sessRes] = await Promise.allSettled([
        getAllCampuses(),
        academicApi.getClasses(),
        academicApi.getSessions()
      ]);

      if (campusRes.status === 'fulfilled') {
        const cList = campusRes.value?.data || campusRes.value || [];
        setCampuses(Array.isArray(cList) ? cList : []);
      }
      if (classRes.status === 'fulfilled') {
        setClasses(classRes.value?.data?.data || []);
      }
      if (sessRes.status === 'fulfilled') {
        setSessions(sessRes.value?.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch academic filter masters:', error);
    }
  };

  const fetchStudents = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (campusFilter !== 'all') {
        params.franchise = campusFilter;
      }
      if (classFilter !== 'all') {
        params.schoolClass = classFilter;
      }
      if (sessionFilter !== 'all') {
        params.academicSession = sessionFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data = await getAllStudents(params);
      const studentList = data.data || [];
      setStudents(studentList);
      setTotalStudents(data.total !== undefined ? data.total : studentList.length);
      setTotalPages(data.totalPages || Math.ceil((data.total || studentList.length) / itemsPerPage) || 1);
    } catch (error) {
      if (!silent) toast.error('Failed to fetch student roster');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDelete = async (id, studentName) => {
    if (window.confirm(`Are you sure you want to delete student "${studentName}"? This will archive their school academic records.`)) {
      try {
        await deleteStudent(id);
        toast.success('Student deleted successfully');
        fetchStudents();
      } catch (error) {
        toast.error('Failed to delete student');
        console.error(error);
      }
    }
  };

  if (loading && students.length === 0) {
    return (
      <Layout>
        <PageLoading message="Loading student roster..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Student Information System (SIS)"
          subtitle="Comprehensive student roster, academic enrollment, class allocations, and attendance tracking"
          icon={FiUsers}
          actions={
            <Button
              icon={FiPlus}
              onClick={() => navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school/students/add' : '/admin/students/add')}
            >
              Admit New Student
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Enrolled Students" tone="info" icon={FiUsers} value={totalStudents || students.length} />
          <StatCard title="Active In Class" tone="success" icon={FiLayers} value={students.filter((s) => s.status === 'active').length} />
          <StatCard title="Promoted / Alumni" tone="primary" icon={FiCalendar} value={students.filter((s) => s.status === 'promoted' || s.status === 'alumni').length} />
          <StatCard title="Transferred (TC)" tone="warning" icon={FiUsers} value={students.filter((s) => s.status === 'transferred' || s.status === 'withdrawn').length} />
        </div>

        {/* Filters */}
        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student by name, roll no, admission no..."
          />
          <FilterBarActions>
            {/* Class Filter */}
            <SelectField value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="min-w-[140px]">
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>{cls.name}</option>
              ))}
            </SelectField>

            {/* Academic Session Filter */}
            <SelectField value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className="min-w-[140px]">
              <option value="all">All Sessions</option>
              {sessions.map((s) => (
                <option key={s._id} value={s._id}>{s.sessionName}</option>
              ))}
            </SelectField>

            {/* Status Filter */}
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[130px]">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="promoted">Promoted</option>
              <option value="transferred">Transferred</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="alumni">Alumni</option>
            </SelectField>

            {/* Campus Filter for Super Admin */}
            {user.role === 'super_admin' && (
              <SelectField value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="min-w-[150px]">
                <option value="all">All Campuses</option>
                {campuses.map((campus) => (
                  <option key={campus._id} value={campus._id}>
                    {campus.name}
                  </option>
                ))}
              </SelectField>
            )}
          </FilterBarActions>
        </FilterBar>

        {/* Table */}
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Student</TableHeader>
                <TableHeader>Admission / Roll No</TableHeader>
                <TableHeader>Class & Section</TableHeader>
                <TableHeader>Parent & Contact</TableHeader>
                <TableHeader>Campus</TableHeader>
                <TableHeader>Attendance</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {students.length === 0 ? (
                <TableEmpty colSpan={8} title="No students found" description="Try adjusting your filters or admit a new student." />
              ) : (
                students.map((student) => {
                  const sName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim() || 'Student';
                  const sClass = student.schoolClass?.name || 'Class';
                  const sSection = student.section?.name ? `Sec ${student.section.name}` : '';
                  const admNo = student.admissionNumber || student.studentId || 'N/A';
                  const rollNo = student.rollNumber ? `#${student.rollNumber}` : '';
                  const parentName = student.personalInfo?.fatherName || student.guardianInfo?.name || student.parent?.name || 'N/A';
                  const contactPhone = student.contactInfo?.mobile || student.guardianInfo?.mobile || student.user?.mobile || 'N/A';

                  return (
                    <TableRow key={student._id}>
                      {/* 1. Student Name & Photo */}
                      <TableCell className="!whitespace-normal min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center flex-shrink-0">
                            {student.personalInfo?.photo ? (
                              <img src={toAbsoluteUrl(student.personalInfo.photo)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-primary-700 font-semibold text-sm">
                                {student.personalInfo?.firstName?.charAt(0)}{student.personalInfo?.lastName?.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? `/school/students/${student._id}` : `/admin/students/${student._id}`)}
                              className="text-sm font-semibold text-primary-600 hover:text-primary-800 hover:underline truncate block"
                            >
                              {sName}
                            </button>
                            <p className="text-xs text-slate-500">
                              {student.personalInfo?.gender || ''} {student.personalInfo?.bloodGroup ? `• ${student.personalInfo.bloodGroup}` : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Admission No & Roll No */}
                      <TableCell>
                        <div className="font-mono text-xs font-semibold text-slate-800">{admNo}</div>
                        {rollNo && <div className="text-[11px] text-slate-500 font-medium">Roll {rollNo}</div>}
                      </TableCell>

                      {/* 3. Class & Section */}
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {sClass} {sSection}
                        </span>
                        {student.academicSession?.sessionName && (
                          <span className="block text-[11px] text-slate-400 mt-0.5">{student.academicSession.sessionName}</span>
                        )}
                      </TableCell>

                      {/* 4. Parent / Contact */}
                      <TableCell className="!whitespace-normal">
                        <div className="text-xs font-medium text-slate-800">{parentName}</div>
                        <div className="text-xs text-slate-500">{contactPhone}</div>
                      </TableCell>

                      {/* 5. Campus */}
                      <TableCell>
                        <span className="text-xs font-medium text-slate-700">{student.franchise?.name || 'Main Campus'}</span>
                      </TableCell>

                      {/* 6. Attendance */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{student.attendance?.attendancePercentage?.toFixed(1) || 0}%</span>
                          <div className="w-12 bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                (student.attendance?.attendancePercentage || 0) >= 75 ? 'bg-success-500'
                                  : (student.attendance?.attendancePercentage || 0) >= 50 ? 'bg-warning-500' : 'bg-danger-500'
                              }`}
                              style={{ width: `${Math.min(student.attendance?.attendancePercentage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* 7. Status */}
                      <TableCell>
                        <StatusBadge status={student.status} />
                      </TableCell>

                      {/* 8. Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={FiEye}
                            title="View Student Profile"
                            onClick={() => navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? `/school/students/${student._id}` : `/admin/students/${student._id}`)}
                          />
                          <IconButton
                            icon={FiEdit2}
                            title="Edit Student"
                            onClick={() => navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? `/school/students/${student._id}/edit` : `/admin/students/${student._id}/edit`)}
                          />
                          {user.role === 'super_admin' && (
                            <IconButton
                              icon={FiTrash2}
                              title="Delete Student"
                              variant="danger"
                              onClick={() => handleDelete(student._id, sName)}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableWrapper>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">
              Showing page {currentPage} of {totalPages} ({totalStudents} total students)
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ManageStudents;
