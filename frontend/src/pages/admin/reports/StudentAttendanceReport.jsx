import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiCalendar, FiDownload, FiFileText } from 'react-icons/fi';
import { getAllFranchises } from '../../../api/campusApi';
import { getCourses } from '../../../api/courseApi';
import { useAuth } from '../../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Button, PageLoading, Card, FilterBar, FilterBarActions, SearchInput, SelectField, TextField, Badge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const StudentAttendanceReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    courseId: '',
    franchiseId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchFranchises();
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchFranchises = async () => {
    try {
      const data = await getAllFranchises();
      setFranchises(data.data || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(data.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  
  const fetchReport = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.courseId) queryParams.append('courseId', filters.courseId);
      if (filters.franchiseId) queryParams.append('franchiseId', filters.franchiseId);
      
      const response = await api.get(`/reports/student-attendance?${queryParams}`);
      
      if (response.data.success && response.data.data) {
        setReportData(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        console.error('Invalid API response structure:', response.data);
        toast.error(response.data.message || 'Failed to fetch attendance report: Invalid response format');
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching attendance report:', error);
      toast.error('Failed to fetch attendance report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      courseId: '',
      franchiseId: ''
    });
  };

  const exportToCSV = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    
    const csvData = filteredData.map(student => ({
      'Student Name': `${student.student?.personalInfo?.firstName || ''} ${student.student?.personalInfo?.lastName || ''}`,
      'Email': student.student?.user?.email || '',
      'Course': student.course || 'N/A',
      'Attendance Rate': `${student.attendanceRate || 0}%`,
      'Total Classes': student.totalClasses || 0,
      'Present Classes': student.presentClasses || 0,
      'Absent Classes': student.absentClasses || 0
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const exportToPDF = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Student Attendance Report', 14, 22);
    
    // Add filters info
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    if (filters.startDate || filters.endDate) {
      doc.text(`Date Range: ${filters.startDate || 'All'} - ${filters.endDate || 'All'}`, 14, 38);
    }
    if (filters.courseId) {
      const course = courses.find(c => c._id === filters.courseId);
      doc.text(`Course: ${course?.title || 'All'}`, 14, 44);
    }
    if (filters.franchiseId) {
      const franchise = franchises.find(f => f._id === filters.franchiseId);
      doc.text(`School Campus: ${franchise?.name || 'All'}`, 14, 50);
    }
    
    // Prepare table data
    const tableData = filteredData.map(student => [
      `${student.student?.personalInfo?.firstName || ''} ${student.student?.personalInfo?.lastName || ''}`,
      student.student?.user?.email || '',
      student.course || 'N/A',
      `${student.attendanceRate || 0}%`,
      student.totalClasses || 0,
      student.presentClasses || 0,
      student.absentClasses || 0
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Student Name', 'Email', 'Course', 'Attendance Rate', 'Total Classes', 'Present', 'Absent']],
      body: tableData,
      startY: 60,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Save the PDF
    doc.save(`student-attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exported successfully');
  };

  const filteredData = Array.isArray(reportData) ? reportData.filter(student => 
    `${student.student?.personalInfo?.firstName || ''} ${student.student?.personalInfo?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const attendanceVariant = (rate) => (rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Student Attendance Report"
          subtitle="View and analyze student attendance data"
          icon={FiCalendar}
        />
        <PageLoading message="Loading student attendance report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Student Attendance Report"
        subtitle="View and analyze student attendance data"
        icon={FiCalendar}
      />

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <TextField
            label="Start Date"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
          <TextField
            label="End Date"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
          <SelectField
            label="Course"
            value={filters.courseId}
            onChange={(e) => handleFilterChange('courseId', e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>{course.title}</option>
            ))}
          </SelectField>
          {user.role === 'super_admin' && (
            <SelectField
              label="School Campus"
              value={filters.franchiseId}
              onChange={(e) => handleFilterChange('franchiseId', e.target.value)}
            >
              <option value="">All School Campuses</option>
              {franchises.map(franchise => (
                <option key={franchise._id} value={franchise._id}>
                  {franchise.name} ({franchise.code})
                </option>
              ))}
            </SelectField>
          )}
          <div className="flex items-end">
            <Button variant="secondary" onClick={clearFilters} className="w-full justify-center">
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Search and Export */}
      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by student name..."
          className="flex-1 md:max-w-md"
        />
        <FilterBarActions>
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export CSV</Button>
          <Button variant="danger" icon={FiFileText} onClick={exportToPDF}>Export PDF</Button>
        </FilterBarActions>
      </FilterBar>

      {/* Results Table */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Attendance Results ({filteredData.length} students)</p>
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Student Name</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Course</TableHeader>
                <TableHeader>Attendance Rate</TableHeader>
                <TableHeader>Total Classes</TableHeader>
                <TableHeader>Present</TableHeader>
                <TableHeader>Absent</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableEmpty colSpan={7} title="No attendance data found" description="No attendance data found for the selected criteria." />
              ) : (
                filteredData.map((student, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-slate-900">
                      {student.student?.personalInfo?.firstName || ''} {student.student?.personalInfo?.lastName || ''}
                    </TableCell>
                    <TableCell>{student.student?.user?.email || ''}</TableCell>
                    <TableCell>{Array.isArray(student.courses) ? student.courses.join(', ') : (student.courses || 'N/A')}</TableCell>
                    <TableCell><Badge variant={attendanceVariant(student.attendanceRate || 0)}>{student.attendanceRate || 0}%</Badge></TableCell>
                    <TableCell>{student.totalClasses || 0}</TableCell>
                    <TableCell>{student.presentClasses || 0}</TableCell>
                    <TableCell>{student.absentClasses || 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>
      </div>
    </div>
  );
};

export default StudentAttendanceReport;
