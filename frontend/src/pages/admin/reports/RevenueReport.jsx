import { TbCurrencyRupee } from 'react-icons/tb';
import { useState, useEffect } from 'react';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiTrendingUp, FiDownload, FiCalendar, FiPieChart } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTransactionStats } from '../../../api/transactionApi';
import {
  StatCard, Button, PageLoading, Card, ChartCard, SelectField, TextField, Badge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const RevenueReport = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    monthlyAverage: 0
  });
  const [franchises, setFranchises] = useState([]);
  const [ledgerStats, setLedgerStats] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    source: '',
    franchiseId: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchReport();
    fetchFranchises();
    fetchLedgerStats();
  }, [filters]);

  const fetchLedgerStats = async () => {
    try {
      const params = {};
      if (filters.franchiseId) params.franchise = filters.franchiseId;
      const response = await getTransactionStats(params);
      setLedgerStats(response.data || null);
    } catch (error) {
      console.error('Error fetching ledger stats:', error);
    }
  };

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
      if (filters.source) queryParams.append('source', filters.source);
      if (filters.franchiseId) queryParams.append('franchiseId', filters.franchiseId);
      
      const response = await api.get(`/reports/revenue?${queryParams}`);
      
      if (response.data.success && response.data.data) {
        const dataArray = Array.isArray(response.data.data) ? response.data.data : [];
        setReportData(dataArray);
        
        const totalRevenue = dataArray.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
        const totalTransactions = dataArray.reduce((sum, item) => sum + (item.transactionCount || 0), 0);
        const uniqueMonths = [...new Set(dataArray.map(item => item.month))].length;
        const monthlyAverage = uniqueMonths > 0 ? totalRevenue / uniqueMonths : 0;

        setSummary({
          totalRevenue,
          totalTransactions,
          monthlyAverage
        });
      } else {
        console.error('Invalid API response structure:', response.data);
        toast.error(response.data.message || 'Failed to fetch revenue report: Invalid response format');
        setReportData([]);
        setSummary({
          totalRevenue: 0,
          totalTransactions: 0,
          monthlyAverage: 0
        });
      }
    } catch (error) {
      toast.error('Failed to fetch revenue report');
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
      source: '',
      franchiseId: ''
    });
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;
    
    const csvData = reportData.map(item => ({
      'Source': item.source || 'All',
      'Month': item.month || 'N/A',
      'Revenue': `₹${item.totalRevenue.toLocaleString()}`,
      'Date': new Date().toLocaleDateString()
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    if (reportData.length === 0) return;

    const doc = new jsPDF();
    const title = 'Revenue Report';
    const headers = [['Source', 'Month', 'Revenue (₹)', 'Transactions']];
    const data = reportData.map(item => [
      item.source || 'All',
      item.month || 'N/A',
      item.totalRevenue?.toLocaleString() || '0',
      item.transactionCount || '0'
    ]);

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Add date
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add table
    doc.autoTable({
      head: headers,
      body: data,
      startY: 40,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 30 }
    });

    // Save the PDF
    doc.save(`revenue-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredData = reportData;

  const chartData = filteredData.reduce((acc, item) => {
    const month = item.month;
    const source = item.source;
    const revenue = item.totalRevenue;

    let monthEntry = acc.find(entry => entry.month === month);

    if (!monthEntry) {
      monthEntry = { month };
      acc.push(monthEntry);
    }

    monthEntry[source] = revenue;

    return acc;
  }, []);

  const sources = [...new Set(reportData.map(item => item.source))];
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Revenue Report"
          subtitle="Financial revenue analysis and breakdown"
          icon={FiPieChart}
        />
        <PageLoading message="Loading revenue report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Revenue Report"
        subtitle="Financial revenue analysis and breakdown"
        icon={FiPieChart}
      />

      {/* Ledger Summary (unified financial data) */}
      {ledgerStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Income (ledger)" tone="success" icon={TbCurrencyRupee} value={`₹${(ledgerStats.totalIncome || 0).toLocaleString('en-IN')}`} />
          <StatCard title="Total Expenses" tone="danger" icon={TbCurrencyRupee} value={`₹${(ledgerStats.totalExpenses || 0).toLocaleString('en-IN')}`} />
          <StatCard title="Net Revenue" tone="primary" icon={FiTrendingUp} value={`₹${(ledgerStats.netRevenue || 0).toLocaleString('en-IN')}`} />
          <StatCard title="Outstanding Receivables" tone="amber" icon={FiCalendar} value={`₹${(ledgerStats.outstandingReceivables || 0).toLocaleString('en-IN')}`} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Revenue" tone="success" icon={TbCurrencyRupee} value={`₹${summary.totalRevenue.toLocaleString()}`} />
        <StatCard title="Total Transactions" tone="amber" icon={FiTrendingUp} value={summary.totalTransactions.toLocaleString()} />
        <StatCard title="Monthly Average" tone="info" icon={FiCalendar} value={`₹${Math.round(summary.monthlyAverage).toLocaleString()}`} />
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
            label="Revenue Source"
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="registration">Registration</option>
            <option value="course_fee">Course Fee</option>
            <option value="installment">Installment</option>
            <option value="exam_fee">Exam Fee</option>
            <option value="certificate_fee">Certificate Fee</option>
            <option value="other">Other</option>
          </SelectField>
          {user.role === 'super_admin' && (
            <SelectField
              label="School Campus"
              value={filters.franchiseId}
              onChange={(e) => handleFilterChange('franchiseId', e.target.value)}
            >
              <option value="">All Campuses</option>
              {franchises.map(franchise => (
                <option key={franchise._id} value={franchise._id}>{franchise.franchiseName}</option>
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

      {/* Export Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export to CSV</Button>
        <Button variant="danger" icon={FiDownload} onClick={exportToPDF}>Export to PDF</Button>
      </div>

      {/* Revenue Chart */}
      <ChartCard title="Revenue Trend" icon={FiTrendingUp}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `₹${value.toLocaleString()}`} />
            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
            <Legend />
            {sources.map((source, index) => (
              <Line
                key={source}
                type="monotone"
                dataKey={source}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Revenue Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Source</TableHeader>
              <TableHeader>Month</TableHeader>
              <TableHeader>Revenue</TableHeader>
              <TableHeader>Transactions</TableHeader>
              <TableHeader>Growth</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {reportData.length === 0 ? (
              <TableEmpty colSpan={5} title="No revenue data found" description="No revenue data available for the selected criteria." />
            ) : (
              reportData.map((item, index) => {
                const prev = index > 0 ? reportData[index - 1] : null;
                const isUp = prev && item.totalRevenue > prev.totalRevenue;
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-slate-900">{item.source || 'All Sources'}</TableCell>
                    <TableCell>{item.month || 'N/A'}</TableCell>
                    <TableCell>₹{item.totalRevenue.toLocaleString()}</TableCell>
                    <TableCell>{item.transactionCount || 1}</TableCell>
                    <TableCell>
                      <Badge variant={isUp ? 'success' : 'danger'}>
                        <FiTrendingUp className={`h-3 w-3 ${isUp ? '' : 'rotate-180'}`} />
                        {isUp
                          ? `+${Math.round(((item.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100)}%`
                          : prev ? `-${Math.round(((prev.totalRevenue - item.totalRevenue) / prev.totalRevenue) * 100)}%` : 'N/A'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableWrapper>
    </div>
  );
};

export default RevenueReport;
