import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import { toast } from 'react-toastify';
import { FiAlertCircle, FiDownload } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { getFeeObligations } from '../../../api/transactionApi';
import { normalizeObligation } from '../../../utils/transactionHelpers';
import {
  Button, PageLoading, Card, FilterBar, FilterBarActions, SearchInput, TextField, Badge, StatusBadge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const OutstandingPaymentsReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    franchiseId: '',
    overdueDays: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.franchiseId) params.franchise = filters.franchiseId;

      const response = await getFeeObligations(params);
      let data = (response.data || [])
        .map(normalizeObligation)
        .filter((o) => o.amountPending > 0);

      if (filters.startDate) {
        const start = new Date(filters.startDate);
        data = data.filter((o) => !o.dueDate || new Date(o.dueDate) >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        data = data.filter((o) => !o.dueDate || new Date(o.dueDate) <= end);
      }
      if (filters.overdueDays) {
        const minDays = parseInt(filters.overdueDays, 10);
        data = data.filter((o) => o.daysOverdue >= minDays);
      }

      setReportData(data);
    } catch (error) {
      console.error('Error fetching outstanding payments report:', error);
      toast.error('Failed to fetch outstanding payments report');
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
    const csvData = filteredData.map((payment) => ({
      'Obligation ID': payment._id || 'N/A',
      'Student Name': `${payment.student?.personalInfo?.firstName || ''} ${payment.student?.personalInfo?.lastName || ''}`,
      'Email': payment.student?.user?.email || '',
      'Course': payment.course?.title || payment.course?.name || 'N/A',
      'Franchise': payment.franchise?.name || 'N/A',
      'Component': payment.component || 'N/A',
      'Amount Due': payment.amountDue || 0,
      'Amount Paid': payment.amountPaid || 0,
      'Balance': payment.balance || 0,
      'Due Date': payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A',
      'Days Overdue': payment.daysOverdue || 0,
      'Status': payment.status || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outstanding-payments-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredData = Array.isArray(reportData) ? reportData.filter(payment => 
    `${payment.student?.personalInfo?.firstName || ''} ${payment.student?.personalInfo?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const overdueVariant = (days) => (days > 60 ? 'danger' : days > 30 ? 'warning' : 'neutral');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Outstanding Fees Report"
          subtitle="View fee obligations with outstanding balances"
          icon={FiAlertCircle}
        />
        <PageLoading message="Loading outstanding fees report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Outstanding Fees Report"
        subtitle="View fee obligations with outstanding balances"
        icon={FiAlertCircle}
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
          {user?.role === 'super_admin' && (
            <TextField
              label="School Campus"
              name="franchiseId"
              value={filters.franchiseId}
              onChange={handleFilterChange}
              placeholder="Campus ID"
            />
          )}
          <TextField
            label="Overdue Days"
            type="number"
            name="overdueDays"
            value={filters.overdueDays}
            onChange={handleFilterChange}
            placeholder="Minimum overdue days"
          />
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
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export to CSV</Button>
        </FilterBarActions>
      </FilterBar>

      {/* Results Table */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Outstanding Fee Obligations ({filteredData.length})</p>
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Payment ID</TableHeader>
                <TableHeader>Student Name</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Course</TableHeader>
                <TableHeader>Campus</TableHeader>
                <TableHeader>Amount Due</TableHeader>
                <TableHeader>Amount Paid</TableHeader>
                <TableHeader>Balance</TableHeader>
                <TableHeader>Due Date</TableHeader>
                <TableHeader>Days Overdue</TableHeader>
                <TableHeader>Status</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableEmpty colSpan={11} title="No outstanding payments found" description="No outstanding payment data found for the selected criteria." />
              ) : (
                filteredData.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell>{payment._id?.slice(-8) || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {payment.student?.personalInfo?.firstName || ''} {payment.student?.personalInfo?.lastName || ''}
                    </TableCell>
                    <TableCell>{payment.student?.user?.email || ''}</TableCell>
                    <TableCell>{payment.course?.title || payment.course?.name || 'N/A'}</TableCell>
                    <TableCell>{payment.franchise?.name || 'N/A'}</TableCell>
                    <TableCell><span className="font-semibold">₹{(payment.amountDue || 0).toLocaleString('en-IN')}</span></TableCell>
                    <TableCell>₹{(payment.amountPaid || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell><span className="font-semibold text-danger-600">₹{(payment.balance || 0).toLocaleString('en-IN')}</span></TableCell>
                    <TableCell>{payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={overdueVariant(payment.daysOverdue || 0)}>{payment.daysOverdue || 0} days</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={payment.status} /></TableCell>
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

export default OutstandingPaymentsReport;
