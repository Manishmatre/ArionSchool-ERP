import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiDownload } from 'react-icons/fi';
import {
  Button, PageLoading, Card, FilterBar, FilterBarActions, SearchInput, SelectField, TextField, Badge, StatusBadge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '../../../components/ui';

const initialFilters = { startDate: '', endDate: '', franchiseId: '', complianceStatus: '' };

const getRowsFromResponse = (response) => {
  const body = response?.data ?? response;
  const payload = body?.data?.data ?? body?.data ?? body;
  return Array.isArray(payload) ? payload : null;
};

const CampusComplianceReport = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.franchiseId.trim()) params.franchiseId = filters.franchiseId.trim();
      if (filters.complianceStatus) params.complianceStatus = filters.complianceStatus;

      const response = await api.get('/reports/campus-compliance', { params });
      const rows = getRowsFromResponse(response);
      if (rows) {
        setReportData(rows);
      } else {
        const body = response?.data ?? response;
        console.error('Unexpected school compliance response:', body);
        toast.error(body?.message || 'The school compliance report returned an unsupported response.');
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching school compliance report:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch school compliance report.');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const clearFilters = () => setFilters(initialFilters);

  const filteredData = reportData.filter((franchise) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || [franchise.name, franchise.code, franchise.ownerName, franchise.location]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });

  const exportToCSV = () => {
    if (!filteredData.length) {
      toast.info('There are no campus rows to export.');
      return;
    }
    const columns = [
      ['Campus Name', (row) => row.name],
      ['Campus Code', (row) => row.code],
      ['Location', (row) => row.location],
      ['Principal / Head', (row) => row.ownerName],
      ['Principal Email', (row) => row.ownerEmail],
      ['Principal Mobile', (row) => row.ownerMobile],
      ['Campus Status', (row) => row.status],
      ['Plan', (row) => row.planName],
      ['Profile Readiness', (row) => `${row.profileReadiness ?? 0}%`],
      ['Missing Profile Details', (row) => (row.missingProfileFields || []).join('; ') || 'None'],
      ['Established Date', (row) => row.establishedDate ? new Date(row.establishedDate).toLocaleDateString() : ''],
      ['Students', (row) => row.studentCount ?? 0],
      ['Courses', (row) => row.courseCount ?? 0],
    ];
    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [
      columns.map(([label]) => escapeCsv(label)).join(','),
      ...filteredData.map((row) => columns.map(([, getValue]) => escapeCsv(getValue(row))).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `campus-compliance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const scoreVariant = (score) => (score >= 90 ? 'success' : score >= 70 ? 'warning' : 'danger');
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="School Campus Compliance Report" subtitle="Review school campus profile readiness and institutional status" icon={FiCheckCircle} />
        <PageLoading message="Loading campus compliance report..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="School Campus Compliance Report" subtitle="Review school campus profile readiness and institutional status" icon={FiCheckCircle} />

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <TextField label="Established From" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          <TextField label="Established To" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
          <TextField label="School / Campus ID" name="franchiseId" value={filters.franchiseId} onChange={handleFilterChange} placeholder="Enter school or campus ID" />
          <SelectField label="School Status" name="complianceStatus" value={filters.complianceStatus} onChange={handleFilterChange}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </SelectField>
        </div>
      </Card>

      <FilterBar>
        <SearchInput value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search campus, code, principal, or location..." className="flex-1 md:max-w-xl" />
        <FilterBarActions>
          <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
          <Button variant="success" icon={FiDownload} onClick={exportToCSV}>Export CSV</Button>
        </FilterBarActions>
      </FilterBar>

      <section>
        <p className="mb-2 text-sm text-slate-500">School Campus Compliance Results ({filteredData.length} campuses)</p>
        <p className="mb-3 text-xs text-slate-500">Profile readiness measures whether the campus has its core administration, contact, and affiliation details recorded.</p>
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Campus / School</TableHeader>
                <TableHeader>Code</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>School Administrator</TableHeader>
                <TableHeader>School Status</TableHeader>
                <TableHeader>Profile Readiness</TableHeader>
                <TableHeader>Missing Profile Details</TableHeader>
                <TableHeader>Established</TableHeader>
                <TableHeader>Plan</TableHeader>
                <TableHeader>Students</TableHeader>
                <TableHeader>Courses</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableEmpty colSpan={11} title="No campus records found" description="Adjust the filters or search term and try again." />
              ) : filteredData.map((franchise) => {
                const gaps = franchise.missingProfileFields || [];
                const status = String(franchise.status || 'unknown').toLowerCase();
                const statusVariant = status === 'active' ? 'approved' : status === 'suspended' ? 'rejected' : 'pending';
                return (
                  <TableRow key={franchise._id || franchise.code}>
                    <TableCell className="font-semibold text-slate-900">{franchise.name || 'Unnamed school'}</TableCell>
                    <TableCell className="font-mono text-xs">{franchise.code || '—'}</TableCell>
                    <TableCell className="min-w-48">{franchise.location || 'Address not recorded'}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">{franchise.ownerName || 'Administrator not recorded'}</div>
                      {franchise.ownerEmail && <div className="text-xs text-slate-500">{franchise.ownerEmail}</div>}
                      {franchise.ownerMobile && <div className="text-xs text-slate-500">{franchise.ownerMobile}</div>}
                    </TableCell>
                    <TableCell><StatusBadge status={statusVariant} label={status.charAt(0).toUpperCase() + status.slice(1)} /></TableCell>
                    <TableCell><Badge variant={scoreVariant(franchise.profileReadiness ?? 0)}>{franchise.profileReadiness ?? 0}%</Badge></TableCell>
                    <TableCell className="min-w-48">
                      {gaps.length ? <span title={gaps.join(', ')}>{gaps.length}: {gaps.slice(0, 2).join(', ')}{gaps.length > 2 ? ` +${gaps.length - 2} more` : ''}</span> : <span className="text-success-700">Complete</span>}
                    </TableCell>
                    <TableCell>{formatDate(franchise.establishedDate)}</TableCell>
                    <TableCell>{franchise.planName || 'No plan assigned'}</TableCell>
                    <TableCell>{franchise.studentCount ?? 0}</TableCell>
                    <TableCell>{franchise.courseCount ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      </section>
    </div>
  );
};

export default CampusComplianceReport;
