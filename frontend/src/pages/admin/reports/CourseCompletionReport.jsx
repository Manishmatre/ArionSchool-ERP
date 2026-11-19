import { useState, useEffect } from 'react';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiBook, FiCheckCircle, FiPercent, FiDownload, FiFileText } from 'react-icons/fi';
import { getCourses } from '../../../api/courseApi';
import { getAllFranchises } from '../../../api/campusApi';
import { useAuth } from '../../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  StatCard, Button, PageLoading, Card, FilterBar, FilterBarActions, SearchInput, SelectField, TextField, Badge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const CourseCompletionReport = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [courses, setCourses] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [summary, setSummary] = useState({
    totalCourses: 0,
    averageCompletionRate: 0,
    totalStudents: 0
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    courseId: '',
    franchiseId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchCourses();
    fetchFranchises();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(data.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchFranchises = async () => {
    try {
      const data = await getAllFranchises();
      setFranchises(data.data || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
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
      
      const response = await api.get(`/reports/course-completion?${queryParams}`);
      
      if (response.data.success && response.data.data) {
        const dataArray = Array.isArray(response.data.data) ? response.data.data : [];
        setReportData(dataArray);
        
        // Calculate summary
        const totalCourses = dataArray.length;
        const averageCompletionRate = totalCourses > 0 
          ? dataArray.reduce((sum, course) => sum + course.completionRate, 0) / totalCourses 
          : 0;
        const totalStudents = dataArray.reduce((sum, course) => sum + course.totalEnrolled, 0);
        
        setSummary({
          totalCourses,
          averageCompletionRate: Math.round(averageCompletionRate),
          totalStudents
        });
      } else {
        console.error('Invalid API response structure:', response.data);
        toast.error(response.data.message || 'Failed to fetch course completion report: Invalid response format');
        setReportData([]);
        setSummary({
          totalCourses: 0,
          averageCompletionRate: 0,
          totalStudents: 0
        });
      }
    } catch (error) {
      toast.error('Failed to fetch course completion report');
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
    if (!Array.isArray(reportData) || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    
    const csvData = reportData.map(course => ({
      'Course Name': course.course?.title || 'N/A',
      'Total Enrolled': course.totalEnrolled || 0,
      'Completed': course.completed || 0,
      'Completion Rate': `${course.completionRate || 0}%`,
      'Average Score': course.averageScore || 0,
      'Status': course.completionRate >= 80 ? 'Excellent' : course.completionRate >= 60 ? 'Good' : 'Needs Improvement'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-completion-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const exportToPDF = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Course Completion Report', 14, 22);
    
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
      doc.text(`School: ${franchise?.name || 'All'}`, 14, 50);
    }
    
    // Prepare table data
    const tableData = reportData.map(course => [
      course.course?.title || 'N/A',
      course.totalEnrolled || 0,
      course.completed || 0,
      `${course.completionRate || 0}%`,
      course.averageScore || 0,
      course.completionRate >= 80 ? 'Excellent' : course.completionRate >= 60 ? 'Good' : 'Needs Improvement'
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Course Name', 'Total Enrolled', 'Completed', 'Completion Rate', 'Average Score', 'Status']],
      body: tableData,
      startY: 60,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Save the PDF
    doc.save(`course-completion-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exported successfully');
  };

  const filteredData = Array.isArray(reportData) ? reportData.filter(course => 
    (course.course?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const rateBar = (rate) => (rate >= 80 ? 'bg-success-600' : rate >= 60 ? 'bg-warning-500' : 'bg-danger-600');
  const rateVariant = (rate) => (rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'danger');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Course Completion Report"
          subtitle="Track course completion rates and student progress"
          icon={FiBook}
        />
        <PageLoading message="Loading course completion report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course Completion Report"
        subtitle="Track course completion rates and student progress"
        icon={FiBook}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Courses" tone="info" icon={FiBook} value={summary.totalCourses} />
        <StatCard title="Avg Completion Rate" tone="success" icon={FiPercent} value={`${summary.averageCompletionRate}%`} />
        <StatCard title="Total Students" tone="purple" icon={FiCheckCircle} value={summary.totalStudents} />
      </div>

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
              <option value="">All Campuses</option>
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
          placeholder="Search by course name..."
          className="flex-1 md:max-w-md"
        />
        <FilterBarActions>
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export CSV</Button>
          <Button variant="danger" icon={FiFileText} onClick={exportToPDF}>Export PDF</Button>
        </FilterBarActions>
      </FilterBar>

      {/* Course Completion Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Course Name</TableHeader>
              <TableHeader>Total Enrolled</TableHeader>
              <TableHeader>Completed</TableHeader>
              <TableHeader>Completion Rate</TableHeader>
              <TableHeader>Average Score</TableHeader>
              <TableHeader>Status</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableEmpty colSpan={6} title="No completion data found" description="No course completion data found for the selected criteria." />
            ) : (
              filteredData.map((course, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-slate-900">{course.course?.title || 'N/A'}</TableCell>
                  <TableCell>{course.totalEnrolled || 0}</TableCell>
                  <TableCell>{course.completed || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${rateBar(course.completionRate)}`} style={{ width: `${course.completionRate}%` }} />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{course.completionRate || 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{course.averageScore || 0}</TableCell>
                  <TableCell>
                    <Badge variant={rateVariant(course.completionRate)}>
                      {course.completionRate >= 80 ? 'Excellent' : course.completionRate >= 60 ? 'Good' : 'Needs Improvement'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrapper>
    </div>
  );
};

export default CourseCompletionReport;
