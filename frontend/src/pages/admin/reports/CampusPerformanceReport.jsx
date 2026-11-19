import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import PageHeader from '../../../components/PageHeader';
import Pagination from '../../../components/Pagination';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiAward,
  FiTrendingUp,
  FiUsers,
  FiDownload
} from 'react-icons/fi';
import { getAllCampuses } from '../../../api/campusApi';
import { useAuth } from '../../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  StatCard, Button, PageLoading, Card, SelectField, TextField, Badge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const CampusPerformanceReport = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [franchisesLoading, setFranchisesLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [summary, setSummary] = useState({
    totalFranchises: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalNetRevenue: 0,
    totalStudents: 0,
    averagePerformance: 0
  });
    const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    franchiseId: ''
  });

  useEffect(() => {
    fetchFranchises();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchFranchises = async () => {
    try {
      setFranchisesLoading(true);
      const data = await getAllCampuses();
      console.log('Schools API response:', data);
      
      // Handle different response structures
      let franchiseList = [];
      if (data && data.data && Array.isArray(data.data)) {
        franchiseList = data.data;
      } else if (data && Array.isArray(data)) {
        franchiseList = data;
      }
      
      console.log('Processed school list:', franchiseList);
      setFranchises(franchiseList);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      setFranchises([]);
    } finally {
      setFranchisesLoading(false);
    }
  };

  
  const fetchReport = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.franchiseId) queryParams.append('franchiseId', filters.franchiseId);
      
      const response = await api.get(`/reports/campus-performance?${queryParams}`);

      console.log('API Response:', response.data);

      if (response.data.success && response.data.data) {
        const dataArray = Array.isArray(response.data.data) ? response.data.data : [];
        
        // Calculate performance for each school
        const dataWithPerformance = dataArray.map(franchise => {
          const income = franchise.totalRevenue || 0;
          const net = franchise.netRevenue ?? income;
          let performance = 'Needs Improvement';
          if (net > 50000 && franchise.totalStudents > 50) {
            performance = 'Excellent';
          } else if (net > 20000 || franchise.totalStudents > 20) {
            performance = 'Good';
          }
          return {
            ...franchise,
            performance
          };
        });
        
        setReportData(dataWithPerformance);

        const totalFranchises = dataArray.length;
        const totalRevenue = dataArray.reduce((sum, franchise) => sum + (franchise.totalRevenue || 0), 0);
        const totalExpenses = dataArray.reduce((sum, franchise) => sum + (franchise.totalExpenses || 0), 0);
        const totalNetRevenue = dataArray.reduce(
          (sum, franchise) => sum + (franchise.netRevenue ?? franchise.totalRevenue ?? 0),
          0
        );
        const totalStudents = dataArray.reduce((sum, franchise) => sum + franchise.totalStudents, 0);
        const averagePerformance = totalFranchises > 0 ? Math.round(totalNetRevenue / totalFranchises) : 0;

        setSummary({
          totalFranchises,
          totalRevenue,
          totalExpenses,
          totalNetRevenue,
          totalStudents,
          averagePerformance
        });
      } else {
        console.error('Invalid API response structure:', response.data);
        toast.error(response.data.message || 'Failed to fetch franchise performance report: Invalid response format');
        setReportData([]);
        setSummary({
          totalFranchises: 0,
          totalRevenue: 0,
          totalExpenses: 0,
          totalNetRevenue: 0,
          totalStudents: 0,
          averagePerformance: 0
        });
      }
    } catch (error) {
      toast.error('Failed to fetch school performance report');
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
      franchiseId: ''
    });
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;
    
    const csvData = reportData.map(franchise => ({
      'Campus Name': franchise.name || 'N/A',
      'Email': franchise.email || franchise.ownerEmail || franchise.contactEmail || 'N/A',
      'Total Income': `₹${(franchise.totalRevenue || 0).toLocaleString('en-IN')}`,
      'Total Expenses': `₹${(franchise.totalExpenses || 0).toLocaleString('en-IN')}`,
      'Net Revenue': `₹${(franchise.netRevenue ?? franchise.totalRevenue ?? 0).toLocaleString('en-IN')}`,
      'Total Students': franchise.totalStudents || 0,
      'Total Courses': franchise.totalCourses || 0,
      'Performance': franchise.performance || 'N/A',
      'Status': franchise.performance === 'Excellent' ? 'High Performer' : franchise.performance === 'Good' ? 'Average Performer' : 'Needs Improvement'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-performance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Pagination logic
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = reportData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const performanceVariant = (performance) => (
    performance === 'Excellent' ? 'success' : performance === 'Good' ? 'warning' : 'danger'
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="School Campus Performance Report"
          subtitle="Revenue, expenses, and institutional metrics across school campuses"
          icon={FiAward}
        />
        <PageLoading message="Loading campus performance report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="School Campus Performance Report"
        subtitle="Revenue, expenses, and institutional metrics across school campuses"
        icon={FiAward}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Income" tone="success" icon={TbCurrencyRupee} value={`₹${summary.totalRevenue.toLocaleString('en-IN')}`} />
        <StatCard title="Total Expenses" tone="danger" icon={TbCurrencyRupee} value={`₹${summary.totalExpenses.toLocaleString('en-IN')}`} />
        <StatCard title="Net Revenue" tone="indigo" icon={FiTrendingUp} value={`₹${summary.totalNetRevenue.toLocaleString('en-IN')}`} />
        <StatCard title="Total Students" tone="purple" icon={FiUsers} value={summary.totalStudents} />
        <StatCard title="Total Campuses" tone="primary" icon={FiAward} value={summary.totalFranchises} />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          {(user.role === 'superadmin' || user.role === 'super_admin') && (
            <SelectField
              label="School Campus"
              value={filters.franchiseId}
              onChange={(e) => handleFilterChange('franchiseId', e.target.value)}
            >
              <option value="">All School Campuses</option>
              {franchisesLoading ? (
                <option disabled>Loading school campuses...</option>
              ) : (
                franchises.map((campus) => (
                  <option key={campus._id} value={campus._id}>
                    {campus.name || campus.code || `Campus ${campus._id}`}
                  </option>
                ))
              )}
            </SelectField>
          )}
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={clearFilters} className="w-full justify-center">
              Clear Filters
            </Button>
            <Button variant="success" icon={FiDownload} onClick={exportToCSV} className="whitespace-nowrap">
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Campus Performance Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Campus / School</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Income</TableHeader>
              <TableHeader>Expenses</TableHeader>
              <TableHeader>Net</TableHeader>
              <TableHeader>Students</TableHeader>
              <TableHeader>Courses</TableHeader>
              <TableHeader>Performance</TableHeader>
              <TableHeader>Status</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableEmpty colSpan={9} title="No campus data found" description="No campus performance data available for the selected criteria." />
            ) : (
              paginatedData.map((campus, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
                        <FiAward className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-slate-900">{campus.name || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{campus.email || campus.ownerEmail || campus.contactEmail || 'N/A'}</TableCell>
                  <TableCell>₹{(campus.totalRevenue || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-danger-600">₹{(campus.totalExpenses || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="font-semibold text-primary-700">
                    ₹{(campus.netRevenue ?? campus.totalRevenue ?? 0).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>{campus.totalStudents || 0}</TableCell>
                  <TableCell>{campus.totalCourses || 0}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                      campus.performance === 'Excellent' ? 'text-success-600' :
                      campus.performance === 'Good' ? 'text-warning-600' : 'text-danger-600'
                    }`}>
                      <FiTrendingUp className="h-4 w-4" />
                      {campus.performance || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={performanceVariant(campus.performance)}>
                      {campus.performance === 'Excellent' ? 'High Performer' :
                       campus.performance === 'Good' ? 'Average Performer' : 'Needs Improvement'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={reportData.length}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </TableWrapper>
    </div>
  );
};

export default CampusPerformanceReport;
