import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiTrendingUp, FiDownload } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Button, PageLoading, Card, FilterBar, FilterBarActions, SearchInput, SelectField, TextField, Badge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const CoursePopularityReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    franchiseId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchReport();
    fetchFranchises();
  }, [filters]);

  const fetchFranchises = async () => {
    try {
      const response = await api.get('/campuses');
      if (response.data.success) {
        setFranchises(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.franchiseId) queryParams.append('franchiseId', filters.franchiseId);
      
      const response = await api.get(`/reports/course-popularity?${queryParams}`);
      
      if (response.data.success && response.data.data) {
        setReportData(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        console.error('Invalid API response structure:', response.data);
        toast.error(response.data.message || 'Failed to fetch course popularity report: Invalid response format');
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching course popularity report:', error);
      toast.error('Failed to fetch course popularity report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const exportToCSV = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    
    const csvData = filteredData.map(course => ({
      'Course Name': course.course?.title || 'N/A',
      'Total Enrollments': course.totalEnrollments || 0,
      'Active Students': course.activeStudents || 0,
      'Completion Rate': `${course.completionRate || 0}%`,
      'Average Rating': course.averageRating || 0,
      'Popularity Score': course.popularityScore || 0,
      'Category': course.category || course.course?.category || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-popularity-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const doc = new jsPDF();
    doc.text('Course Popularity Report', 14, 15);
    
    const tableData = filteredData.map(course => [
      course.course?.title || 'N/A',
      course.totalEnrollments || 0,
      course.activeStudents || 0,
      `${course.completionRate || 0}%`,
      course.averageRating ? course.averageRating.toFixed(1) : '0.0',
      course.popularityScore || 0,
      course.category || course.course?.category || 'N/A'
    ]);

    doc.autoTable({
      head: [['Course Name', 'Total Enrollments', 'Active Students', 'Completion Rate', 'Avg Rating', 'Popularity Score', 'Category']],
      body: tableData,
      startY: 25
    });

    doc.save(`course-popularity-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      franchiseId: ''
    });
    setSearchTerm('');
  };

  const filteredData = Array.isArray(reportData) ? reportData.filter(course => 
    (course.course?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const completionVariant = (rate) => (rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'danger');
  const popularityVariant = (score) => (score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Course Popularity Report"
          subtitle="View and analyze course popularity metrics"
          icon={FiTrendingUp}
        />
        <PageLoading message="Loading course popularity report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course Popularity Report"
        subtitle="View and analyze course popularity metrics"
        icon={FiTrendingUp}
      />

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <TextField
            label="Start Date"
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
          <TextField
            label="End Date"
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
          {user.role === 'super_admin' && (
            <SelectField
              label="School Campus"
              name="franchiseId"
              value={filters.franchiseId}
              onChange={handleFilterChange}
            >
              <option value="">All Campuses</option>
              {franchises.map(franchise => (
                <option key={franchise._id} value={franchise._id}>{franchise.name}</option>
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
          placeholder="Search by course title..."
          className="flex-1 md:max-w-md"
        />
        <FilterBarActions>
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export to CSV</Button>
          <Button variant="danger" icon={FiDownload} onClick={exportToPDF}>Export to PDF</Button>
        </FilterBarActions>
      </FilterBar>

      {/* Results Table */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Course Popularity Results ({filteredData.length} courses)</p>
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Course Name</TableHeader>
                <TableHeader>Total Enrollments</TableHeader>
                <TableHeader>Active Students</TableHeader>
                <TableHeader>Completion Rate</TableHeader>
                <TableHeader>Average Rating</TableHeader>
                <TableHeader>Popularity Score</TableHeader>
                <TableHeader>Category</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableEmpty colSpan={7} title="No course popularity data found" description="No course popularity data found for the selected criteria." />
              ) : (
                filteredData.map(course => (
                  <TableRow key={course._id}>
                    <TableCell className="font-medium text-slate-900">{course.course?.title || 'N/A'}</TableCell>
                    <TableCell>{course.totalEnrollments || 0}</TableCell>
                    <TableCell>{course.activeStudents || 0}</TableCell>
                    <TableCell><Badge variant={completionVariant(course.completionRate || 0)}>{course.completionRate || 0}%</Badge></TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <span>⭐</span>{course.averageRating ? course.averageRating.toFixed(1) : '0.0'}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant={popularityVariant(course.popularityScore || 0)}>{course.popularityScore || 0}</Badge></TableCell>
                    <TableCell>{course.category || 'N/A'}</TableCell>
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

export default CoursePopularityReport;
