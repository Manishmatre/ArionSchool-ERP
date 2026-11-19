import { TbCurrencyRupee } from 'react-icons/tb';
import React, { useState, useEffect } from 'react';
import {
  useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import { toast } from 'react-toastify';
import { FiCreditCard,
  FiDownload,
  FiTrendingUp,
  FiAlertCircle
} from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getTransactions } from '../../../api/transactionApi';
import { normalizeInflowRecord } from '../../../utils/transactionHelpers';
import api from '../../../api/axios';
import {
  StatCard, Button, PageLoading, Card, FilterBar, FilterBarActions, SearchInput, SelectField, TextField, StatusBadge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const PaymentReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ totalPayments: 0, totalTransactions: 0, pendingPayments: 0 });
  const [franchises, setFranchises] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    franchiseId: '',
    paymentStatus: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

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
      const params = { direction: 'inflow' };
      if (filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      }
      if (filters.franchiseId) params.franchise = filters.franchiseId;
      if (filters.paymentStatus) params.status = filters.paymentStatus;

      const response = await getTransactions(params);
      const data = (response.data || []).map(normalizeInflowRecord).filter(Boolean);
      setReportData(data);

      const totalPayments = data
        .filter((item) => item.paymentStatus === 'completed')
        .reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalTransactions = data.length;
      const pendingPayments = data.filter((item) => item.paymentStatus === 'pending').length;

      setSummary({ totalPayments, totalTransactions, pendingPayments });
    } catch (error) {
      console.error('Error fetching payment report:', error);
      toast.error('Failed to fetch payment report');
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
      paymentStatus: ''
    });
    setSearchTerm('');
  };

  const exportToCSV = () => {
    const csvData = filteredData.map(payment => ({
      'Payment ID': payment.receiptNumber || 'N/A',
      'Student Name': `${payment.student?.personalInfo?.firstName || ''} ${payment.student?.personalInfo?.lastName || ''}`,
      'Email': payment.student?.user?.email || '',
      'Course': payment.course?.title || 'N/A',
      'School Campus': payment.franchise?.name || 'N/A',
      'Amount': payment.amount || 0,
      'Payment Date': payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A',
      'Payment Method': payment.paymentMethod || 'N/A',
      'Status': payment.paymentStatus || 'N/A',
      'Transaction ID': payment.transactionDetails?.transactionId || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    if (!Array.isArray(filteredData) || filteredData.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const doc = new jsPDF();
    doc.text('Payment Report', 14, 15);

    const tableData = filteredData.map(payment => [
      payment.receiptNumber || 'N/A',
      `${payment.student?.personalInfo?.firstName || ''} ${payment.student?.personalInfo?.lastName || ''}`,
      payment.course?.title || 'N/A',
      payment.franchise?.name || 'N/A',
      `₹${payment.amount ? payment.amount.toLocaleString() : '0'}`,
      payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A',
      payment.paymentMethod || 'N/A',
      payment.paymentStatus || 'N/A'
    ]);

    doc.autoTable({
      head: [['Payment ID', 'Student Name', 'Course', 'Franchise', 'Amount', 'Payment Date', 'Payment Method', 'Status']],
      body: tableData,
      startY: 25
    });

    doc.save(`payment-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredData = Array.isArray(reportData) ? reportData.filter(payment => 
    `${payment.student?.personalInfo?.firstName || ''} ${payment.student?.personalInfo?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Payment Report"
          subtitle="View and analyze payment data"
          icon={FiCreditCard}
        />
        <PageLoading message="Loading payment report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payment Report"
        subtitle="View and analyze payment data"
        icon={FiCreditCard}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Payments" tone="success" icon={TbCurrencyRupee} value={`₹${summary.totalPayments.toLocaleString()}`} />
        <StatCard title="Total Transactions" tone="info" icon={FiTrendingUp} value={summary.totalTransactions} />
        <StatCard title="Pending Payments" tone="warning" icon={FiAlertCircle} value={summary.pendingPayments} />
      </div>

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
          {user.role === 'super_admin' && (
            <SelectField
              label="School Campus"
              name="franchiseId"
              value={filters.franchiseId}
              onChange={handleFilterChange}
            >
              <option value="">All School Campuses</option>
              {franchises.map(franchise => (
                <option key={franchise._id} value={franchise._id}>{franchise.name}</option>
              ))}
            </SelectField>
          )}
          <SelectField
            label="Payment Status"
            name="paymentStatus"
            value={filters.paymentStatus}
            onChange={handleFilterChange}
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </SelectField>
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
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export to CSV</Button>
          <Button variant="danger" icon={FiDownload} onClick={exportToPDF}>Export to PDF</Button>
        </FilterBarActions>
      </FilterBar>

      {/* Results Table */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Payment Results ({filteredData.length} payments)</p>
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Payment ID</TableHeader>
                <TableHeader>Student Name</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Course</TableHeader>
                <TableHeader>School Campus</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Payment Date</TableHeader>
                <TableHeader>Payment Method</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Transaction ID</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableEmpty colSpan={10} title="No payment data found" description="No payment data found for the selected criteria." />
              ) : (
                filteredData.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell>{payment.receiptNumber || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {payment.student?.personalInfo?.firstName || ''} {payment.student?.personalInfo?.lastName || ''}
                    </TableCell>
                    <TableCell>{payment.student?.user?.email || ''}</TableCell>
                    <TableCell>{payment.course?.title || 'N/A'}</TableCell>
                    <TableCell>{payment.franchise?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-success-600">₹{payment.amount ? payment.amount.toLocaleString() : '0'}</span>
                    </TableCell>
                    <TableCell>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{payment.paymentMethod || 'N/A'}</TableCell>
                    <TableCell><StatusBadge status={payment.paymentStatus} /></TableCell>
                    <TableCell>{payment.transactionDetails?.transactionId || 'N/A'}</TableCell>
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

export default PaymentReport;
