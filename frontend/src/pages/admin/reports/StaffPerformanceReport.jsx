import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiUsers, FiDownload } from 'react-icons/fi';
import {
  Button, PageLoading, Card, FilterBar, FilterBarActions, SearchInput, SelectField, TextField, Badge, StatusBadge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const StaffPerformanceReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    franchiseId: '',
    department: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchReport();
  }, [filters]);

  
  const fetchReport = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.franchiseId) queryParams.append('franchiseId', filters.franchiseId);
      if (filters.department) queryParams.append('department', filters.department);
      
      const response = await api.get(`/reports/staff-performance?${queryParams}`);
      
      const responseBody = response?.data ?? response;
      if (responseBody?.success && Array.isArray(responseBody.data)) {
        setReportData(responseBody.data);
      } else {
        console.error('Invalid staff performance response:', responseBody);
        toast.error(responseBody?.message || 'Failed to fetch staff performance report.');
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching staff performance report:', error);
      toast.error('Failed to fetch staff performance report');
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

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      franchiseId: '',
      department: ''
    });
  };

  const exportToCSV = () => {
    const csvData = filteredData.map(staff => ({
      'Staff Name': `${staff.staff?.personalInfo?.firstName || ''} ${staff.staff?.personalInfo?.lastName || ''}`,
      'Email': staff.staff?.user?.email || '',
      'Department': staff.department || 'N/A',
      'Franchise': staff.franchise?.name || 'N/A',
      'Performance Score': staff.performanceScore || 0,
      'Classes Taught': staff.classesTaught || 0,
      'Student Satisfaction': `${staff.studentSatisfaction || 0}%`,
      'Attendance Rate': `${staff.attendanceRate || 0}%`,
      'Productivity Score': staff.productivityScore || 0,
      'Status': staff.status || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-performance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredData = Array.isArray(reportData) ? reportData.filter(staff => 
    `${staff.staff?.personalInfo?.firstName || ''} ${staff.staff?.personalInfo?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const scoreVariant = (score) => (score >= 90 ? 'success' : score >= 75 ? 'warning' : 'danger');
  const attendanceVariant = (rate) => (rate >= 95 ? 'success' : rate >= 85 ? 'warning' : 'danger');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Staff Performance Report"
          subtitle="View and analyze staff performance data"
          icon={FiUsers}
        />
        <PageLoading message="Loading staff performance report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff Performance Report"
        subtitle="View and analyze staff performance data"
        icon={FiUsers}
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
          <TextField
            label="School Campus"
            name="franchiseId"
            value={filters.franchiseId}
            onChange={handleFilterChange}
            placeholder="Campus ID"
          />
          <SelectField
            label="Department"
            name="department"
            value={filters.department}
            onChange={handleFilterChange}
          >
            <option value="">All Departments</option>
            <option value="teaching">Teaching</option>
            <option value="admin">Admin</option>
            <option value="management">Management</option>
            <option value="support">Support</option>
          </SelectField>
        </div>
      </Card>

      {/* Search and Export */}
      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by staff name..."
          className="flex-1 md:max-w-md"
        />
        <FilterBarActions>
          <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export to CSV</Button>
        </FilterBarActions>
      </FilterBar>

      {/* Results Table */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Staff Performance Results ({filteredData.length} staff members)</p>
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Staff Name</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Department</TableHeader>
                <TableHeader>Campus</TableHeader>
                <TableHeader>Performance Score</TableHeader>
                <TableHeader>Classes Taught</TableHeader>
                <TableHeader>Student Satisfaction</TableHeader>
                <TableHeader>Attendance Rate</TableHeader>
                <TableHeader>Productivity Score</TableHeader>
                <TableHeader>Status</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableEmpty colSpan={10} title="No staff performance data found" description="No staff performance data found for the selected criteria." />
              ) : (
                filteredData
                  .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
                  .map((staff, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-slate-900">
                        {staff.staff?.personalInfo?.firstName || ''} {staff.staff?.personalInfo?.lastName || ''}
                      </TableCell>
                      <TableCell>{staff.staff?.user?.email || ''}</TableCell>
                      <TableCell className="capitalize">{staff.department || 'N/A'}</TableCell>
                      <TableCell>{staff.franchise?.name || 'N/A'}</TableCell>
                      <TableCell><Badge variant={scoreVariant(staff.performanceScore || 0)}>{staff.performanceScore || 0}</Badge></TableCell>
                      <TableCell><span className="font-semibold">{staff.classesTaught || 0}</span></TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <span>⭐</span>{staff.studentSatisfaction || 0}%
                        </span>
                      </TableCell>
                      <TableCell><Badge variant={attendanceVariant(staff.attendanceRate || 0)}>{staff.attendanceRate || 0}%</Badge></TableCell>
                      <TableCell><Badge variant={scoreVariant(staff.productivityScore || 0)}>{staff.productivityScore || 0}</Badge></TableCell>
                      <TableCell><StatusBadge status={staff.status} /></TableCell>
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

export default StaffPerformanceReport;
