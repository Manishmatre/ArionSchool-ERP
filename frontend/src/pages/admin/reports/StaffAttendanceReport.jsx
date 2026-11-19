import { useState, useEffect } from 'react';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiUsers, FiCalendar, FiCheckCircle, FiXCircle, FiDownload, FiFilter, FiTrendingUp } from 'react-icons/fi';
import {
  StatCard, Button, PageLoading, Card, SelectField, TextField, Badge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const StaffAttendanceReport = () => {
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    totalStaff: 0,
    averageAttendanceRate: 0,
    totalPresent: 0,
    totalAbsent: 0
  });
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    staffId: '',
    franchiseId: ''
  });

  useEffect(() => {
    fetchStaff();
    fetchFranchises();
    fetchReport();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    // Filter staff based on selected school
    if (filters.franchiseId) {
      const filteredStaff = allStaff.filter(staffMember => 
        staffMember.franchise && staffMember.franchise._id === filters.franchiseId
      );
      setStaff(filteredStaff);
    } else {
      setStaff(allStaff);
    }
  }, [filters.franchiseId, allStaff]);

  const fetchStaff = async () => {
    try {
      setStaffLoading(true);
      const response = await api.get('/staff');
      const staffData = response.data.data || response.data || [];
      setAllStaff(staffData);
      setStaff(staffData);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchFranchises = async () => {
    try {
      const response = await api.get('/campuses');
      setFranchises(response.data.data || response.data || []);
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
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.staffId) queryParams.append('staffId', filters.staffId);
      if (filters.franchiseId) queryParams.append('franchiseId', filters.franchiseId);
      
      const response = await api.get(`/reports/staff-attendance?${queryParams}`);
      
      // Handle the response structure properly
      const dataArray = response.data && response.data.data ? response.data.data : [];
      setReportData(dataArray);
      
      // Calculate summary - show latest day's data or average
      const latestRecord = dataArray.length > 0 ? dataArray[dataArray.length - 1] : null;
      const totalStaff = latestRecord ? latestRecord.totalStaff : 0;
      const totalPresent = latestRecord ? latestRecord.present : 0;
      const totalAbsent = latestRecord ? latestRecord.absent : 0;
      const averageAttendanceRate = dataArray.length > 0 
        ? Math.round(dataArray.reduce((sum, record) => sum + (record.attendanceRate || 0), 0) / dataArray.length)
        : 0;
      
      setSummary({
        totalStaff,
        averageAttendanceRate: Math.round(averageAttendanceRate),
        totalPresent,
        totalAbsent
      });
    } catch (error) {
      console.error('Error fetching staff attendance report:', error);
      toast.error('Failed to fetch staff attendance report');
      setReportData([]);
      setSummary({
        totalStaff: 0,
        averageAttendanceRate: 0,
        totalPresent: 0,
        totalAbsent: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      
      // Reset staffId when school changes to avoid showing staff from previous franchise
      if (field === 'franchiseId') {
        newFilters.staffId = '';
      }
      
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      department: '',
      staffId: '',
      franchiseId: ''
    });
  };

  const exportToCSV = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) return;
    
    const csvData = reportData.map(record => ({
      'Date': record.date || 'N/A',
      'Total Staff': record.totalStaff || 0,
      'Present': record.present || 0,
      'Absent': record.absent || 0,
      'Half Day': record.halfDay || 0,
      'On Leave': record.leave || 0,
      'Attendance Rate': `${record.attendanceRate || 0}%`
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const rateBar = (rate) => (rate >= 90 ? 'bg-success-600' : rate >= 75 ? 'bg-warning-500' : 'bg-danger-600');
  const rateVariant = (rate) => (rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Staff Attendance Report"
          subtitle="Comprehensive staff attendance tracking and analysis"
          icon={FiCalendar}
        />
        <PageLoading message="Loading staff attendance report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff Attendance Report"
        subtitle="Comprehensive staff attendance tracking and analysis"
        icon={FiCalendar}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Staff" tone="info" icon={FiUsers} value={summary.totalStaff} />
        <StatCard title="Total Present" tone="success" icon={FiCheckCircle} value={summary.totalPresent} />
        <StatCard title="Total Absent" tone="danger" icon={FiXCircle} value={summary.totalAbsent} />
        <StatCard title="Avg Attendance" tone="purple" icon={FiTrendingUp} value={`${summary.averageAttendanceRate}%`} />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            label="Department"
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
          >
            <option value="">All Departments</option>
            <option value="academics">Academics</option>
            <option value="administration">Administration</option>
            <option value="accounts">Accounts</option>
            <option value="counseling">Counseling</option>
            <option value="operations">Operations</option>
            <option value="other">Other</option>
          </SelectField>
          <SelectField
            label="Staff"
            value={filters.staffId}
            onChange={(e) => handleFilterChange('staffId', e.target.value)}
            disabled={staffLoading}
          >
            <option value="">{staffLoading ? 'Loading staff...' : 'All Staff'}</option>
            {!staffLoading && staff.map(staffMember => (
              <option key={staffMember._id} value={staffMember._id}>
                {staffMember.personalInfo?.firstName} {staffMember.personalInfo?.lastName} - {staffMember.employeeId}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="School Campus"
            value={filters.franchiseId}
            onChange={(e) => handleFilterChange('franchiseId', e.target.value)}
          >
            <option value="">All School Campuses</option>
            {franchises.map(franchise => (
              <option key={franchise._id} value={franchise._id}>{franchise.name || franchise.code}</option>
            ))}
          </SelectField>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button icon={FiFilter} onClick={fetchReport}>Apply Filters</Button>
          <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export CSV</Button>
        </div>
      </Card>

      {/* Attendance Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Date</TableHeader>
              <TableHeader>Total Staff</TableHeader>
              <TableHeader>Present</TableHeader>
              <TableHeader>Absent</TableHeader>
              <TableHeader>Half Day</TableHeader>
              <TableHeader>On Leave</TableHeader>
              <TableHeader>Attendance Rate</TableHeader>
              <TableHeader>Status</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {Array.isArray(reportData) && reportData.length > 0 ? (
              reportData.map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-slate-900">
                    <span className="inline-flex items-center gap-2">
                      <FiCalendar className="h-4 w-4 text-slate-400" />
                      {record.date}
                    </span>
                  </TableCell>
                  <TableCell>{record.totalStaff}</TableCell>
                  <TableCell className="text-success-600">{record.present}</TableCell>
                  <TableCell className="text-danger-600">{record.absent}</TableCell>
                  <TableCell className="text-warning-600">{record.halfDay || 0}</TableCell>
                  <TableCell className="text-amber-600">{record.leave}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${rateBar(record.attendanceRate)}`} style={{ width: `${record.attendanceRate}%` }} />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{record.attendanceRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rateVariant(record.attendanceRate)}>
                      {record.attendanceRate >= 90 ? 'Excellent' : record.attendanceRate >= 75 ? 'Good' : 'Needs Attention'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={8} title="No attendance data found" description="No attendance data found for the selected criteria." />
            )}
          </TableBody>
        </Table>
      </TableWrapper>
    </div>
  );
};

export default StaffAttendanceReport;
