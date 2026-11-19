import { TbCurrencyRupee } from 'react-icons/tb';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiDownload, FiFilter } from 'react-icons/fi';
import {
  Button, PageLoading, Card, FilterBar, FilterBarActions, SearchInput, SelectField, TextField, StatusBadge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const PayrollReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    franchiseId: '',
    department: '',
    paymentStatus: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchFranchises();
    fetchReport();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

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
      if (filters.franchiseId) queryParams.append('franchiseId', filters.franchiseId);
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.paymentStatus) queryParams.append('paymentStatus', filters.paymentStatus);
      
      const response = await api.get(`/reports/payroll?${queryParams}`);
      
      if (response.data.success && response.data.data) {
        const dataArray = Array.isArray(response.data.data) ? response.data.data : [];
        setReportData(dataArray);
      } else {
        console.error('Invalid API response structure:', response.data);
        toast.error(response.data.message || 'Failed to fetch payroll report: Invalid response format');
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching payroll report:', error);
      toast.error('Failed to fetch payroll report');
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
      department: '',
      paymentStatus: ''
    });
  };

  const exportToCSV = () => {
    const csvData = filteredData.map(payroll => ({
      'Payroll ID': payroll.payrollId || 'N/A',
      'Staff Name': `${payroll.staff?.personalInfo?.firstName || ''} ${payroll.staff?.personalInfo?.lastName || ''}`,
      'Email': payroll.staff?.user?.email || '',
      'Department': payroll.department || 'N/A',
      'School Campus': payroll.franchise?.name || 'N/A',
      'Base Salary': payroll.baseSalary || 0,
      'Overtime Pay': payroll.overtimePay || 0,
      'Bonuses': payroll.bonuses || 0,
      'Deductions': payroll.deductions || 0,
      'Net Salary': payroll.netSalary || 0,
      'Pay Period': payroll.payPeriod || 'N/A',
      'Payment Date': payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : 'N/A',
      'Status': payroll.status || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredData = Array.isArray(reportData) ? reportData.filter(payroll => 
    `${payroll.staff?.personalInfo?.firstName || ''} ${payroll.staff?.personalInfo?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Payroll Report"
          subtitle="View and analyze payroll data"
          icon={TbCurrencyRupee}
        />
        <PageLoading message="Loading payroll report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll Report"
        subtitle="View and analyze payroll data"
        icon={TbCurrencyRupee}
      />

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <SelectField
            label="Department"
            name="department"
            value={filters.department}
            onChange={handleFilterChange}
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
            label="School Campus"
            name="franchiseId"
            value={filters.franchiseId}
            onChange={handleFilterChange}
          >
            <option value="">All School Campuses</option>
            {franchises.map(franchise => (
              <option key={franchise._id} value={franchise._id}>{franchise.name || franchise.code}</option>
            ))}
          </SelectField>
          <SelectField
            label="Payment Status"
            name="paymentStatus"
            value={filters.paymentStatus}
            onChange={handleFilterChange}
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </SelectField>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button icon={FiFilter} onClick={fetchReport}>Apply Filters</Button>
          <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
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
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export to CSV</Button>
        </FilterBarActions>
      </FilterBar>

      {/* Results Table */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Payroll Results ({filteredData.length} records)</p>
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Payroll ID</TableHeader>
                <TableHeader>Staff Name</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Department</TableHeader>
                <TableHeader>School Campus</TableHeader>
                <TableHeader>Base Salary</TableHeader>
                <TableHeader>Overtime Pay</TableHeader>
                <TableHeader>Bonuses</TableHeader>
                <TableHeader>Deductions</TableHeader>
                <TableHeader>Net Salary</TableHeader>
                <TableHeader>Pay Period</TableHeader>
                <TableHeader>Payment Date</TableHeader>
                <TableHeader>Status</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableEmpty colSpan={13} title="No payroll data found" description="No payroll data found for the selected criteria." />
              ) : (
                filteredData.map((payroll, index) => (
                  <TableRow key={index}>
                    <TableCell>{payroll.payrollId || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {payroll.staff?.personalInfo?.firstName || ''} {payroll.staff?.personalInfo?.lastName || ''}
                    </TableCell>
                    <TableCell>{payroll.staff?.user?.email || ''}</TableCell>
                    <TableCell className="capitalize">{payroll.department || 'N/A'}</TableCell>
                    <TableCell>{payroll.franchise?.name || 'N/A'}</TableCell>
                    <TableCell>₹{payroll.baseSalary ? payroll.baseSalary.toLocaleString('en-IN') : '0'}</TableCell>
                    <TableCell>₹{payroll.overtimePay ? payroll.overtimePay.toLocaleString('en-IN') : '0'}</TableCell>
                    <TableCell className="text-success-600">₹{payroll.bonuses ? payroll.bonuses.toLocaleString('en-IN') : '0'}</TableCell>
                    <TableCell className="text-danger-600">₹{payroll.deductions ? payroll.deductions.toLocaleString('en-IN') : '0'}</TableCell>
                    <TableCell><span className="font-semibold text-success-600">₹{payroll.netSalary ? payroll.netSalary.toLocaleString('en-IN') : '0'}</span></TableCell>
                    <TableCell>{payroll.payPeriod || 'N/A'}</TableCell>
                    <TableCell>{payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell><StatusBadge status={payroll.status === 'paid' ? 'completed' : payroll.status} label={payroll.status || 'N/A'} /></TableCell>
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

export default PayrollReport;
