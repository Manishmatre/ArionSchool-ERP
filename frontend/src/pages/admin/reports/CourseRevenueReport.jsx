import { TbCurrencyRupee } from 'react-icons/tb';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { getAllFranchises } from '../../../api/campusApi';
import { getCourses } from '../../../api/courseApi';
import { useAuth } from '../../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Card, Button, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField, TextField, Badge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const CourseRevenueReport = () => {
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
      
      const response = await api.get(`/reports/course-revenue?${queryParams}`);
      
      if (response.data.success && response.data.data) {
        setReportData(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        console.error('Invalid API response structure:', response.data);
        toast.error(response.data.message || 'Failed to fetch course revenue report: Invalid response format');
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching course revenue report:', error);
      toast.error('Failed to fetch course revenue report');
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
    if (!Array.isArray(reportData) || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    
    const csvData = filteredData.map(course => ({
      'Course Name': course.course?.title || 'N/A',
      'School Campus': course.franchise?.name || 'N/A',
      'Total Revenue': course.totalRevenue || 0,
      'Total Students': course.totalStudents || 0,
      'Average Revenue per Student': course.averageRevenuePerStudent || 0,
      'Completion Rate': `${course.completionRate || 0}%`,
      'Revenue Period': course.revenuePeriod || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
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
    doc.text('Course Revenue Report', 14, 22);
    
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
    const tableData = filteredData.map(course => [
      course.course?.title || 'N/A',
      course.franchise?.name || 'N/A',
      `₹${(course.totalRevenue || 0).toLocaleString('en-IN')}`,
      course.totalStudents || 0,
      `₹${(course.averageRevenuePerStudent || 0).toLocaleString('en-IN')}`,
      `${course.completionRate || 0}%`,
      course.revenuePeriod || 'N/A'
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Course Name', 'Franchise', 'Total Revenue (₹)', 'Total Students', 'Avg Revenue/Student (₹)', 'Completion Rate', 'Revenue Period']],
      body: tableData,
      startY: 60,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Save the PDF
    doc.save(`course-revenue-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exported successfully');
  };

  const filteredData = Array.isArray(reportData) ? reportData.filter(course => 
    (course.course?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const completionVariant = (rate) => (rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Course Revenue Report"
          subtitle="Course income from the financial ledger (completed inflows by course)"
          icon={TbCurrencyRupee}
        />
        <PageLoading message="Loading course revenue report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course Revenue Report"
        subtitle="Course income from the financial ledger (completed inflows by course)"
        icon={TbCurrencyRupee}
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
          placeholder="Search by course name..."
          className="flex-1 md:max-w-md"
        />
        <FilterBarActions>
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export CSV</Button>
          <Button variant="danger" icon={FiFileText} onClick={exportToPDF}>Export PDF</Button>
        </FilterBarActions>
      </FilterBar>

      {/* Results Table */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Course Revenue Results ({filteredData.length} courses)</p>
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Course Name</TableHeader>
                <TableHeader>School Campus</TableHeader>
                <TableHeader>Total Revenue</TableHeader>
                <TableHeader>Total Students</TableHeader>
                <TableHeader>Avg Revenue/Student</TableHeader>
                <TableHeader>Completion Rate</TableHeader>
                <TableHeader>Revenue Period</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableEmpty colSpan={7} title="No course revenue data found" description="No course revenue data found for the selected criteria." />
              ) : (
                filteredData.map((course, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-slate-900">{course.course?.title || 'N/A'}</TableCell>
                    <TableCell>{course.franchise?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-success-600">
                        ₹{course.totalRevenue ? course.totalRevenue.toLocaleString('en-IN') : '0'}
                      </span>
                    </TableCell>
                    <TableCell>{course.totalStudents || 0}</TableCell>
                    <TableCell>
                      ₹{course.averageRevenuePerStudent ? course.averageRevenuePerStudent.toLocaleString('en-IN') : '0'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={completionVariant(course.completionRate || 0)}>{course.completionRate || 0}%</Badge>
                    </TableCell>
                    <TableCell>{course.revenuePeriod || 'N/A'}</TableCell>
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

export default CourseRevenueReport;
