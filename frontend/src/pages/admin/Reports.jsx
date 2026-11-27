import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TbCurrencyRupee } from 'react-icons/tb';
import {
  FiActivity,
  FiAward,
  FiBook,
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiCreditCard,
  FiCircle,
  FiDownload,
  FiFileText,
  FiList,
  FiSearch,
  FiSquare,
  FiUpload,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import api from '../../api/axios';
import { getDashboardStats } from '../../api/reportApi';
import { toast } from 'react-toastify';
import { StatCard, PageLoading } from '../../components/ui';
import { formatCurrency } from '../../utils/dashboard';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const reportCategories = [
  {
    id: 'student',
    title: 'Student Reports',
    icon: FiUsers,
    description: 'Academic performance, attendance, enrollment, and certificate records.',
    reports: [
      { id: 'performance', title: 'Student Performance Report', description: 'Detailed academic performance analysis.', path: '/admin/reports/student-performance', icon: FiActivity, endpoint: '/reports/student-performance' },
      { id: 'attendance', title: 'Attendance Report', description: 'Student attendance statistics and trends.', path: '/admin/reports/student-attendance', icon: FiCalendar, endpoint: '/reports/student-attendance' },
      { id: 'enrollment', title: 'Enrollment Report', description: 'Student enrollment trends by course and batch.', path: '/admin/reports/student-enrollment', icon: FiUsers, endpoint: '/reports/student-enrollment' },
      { id: 'certificates', title: 'Certificate Report', description: 'Generated certificates and their status.', path: '/admin/reports/student-certificates', icon: FiAward, endpoint: '/reports/student-certificates' },
    ],
  },
  {
    id: 'course',
    title: 'Course Reports',
    icon: FiBook,
    description: 'Course completion, revenue, and popularity analytics.',
    reports: [
      { id: 'completion', title: 'Course Completion Report', description: 'Completion rates and student progress by course.', path: '/admin/reports/course-completion', icon: FiActivity, endpoint: '/reports/course-completion' },
      { id: 'revenue', title: 'Course Revenue Report', description: 'Revenue generated from course enrollments.', path: '/admin/reports/course-revenue', icon: TbCurrencyRupee, endpoint: '/reports/course-revenue' },
      { id: 'popularity', title: 'Course Popularity Report', description: 'Most enrolled and highly rated courses.', path: '/admin/reports/course-popularity', icon: FiAward, endpoint: '/reports/course-popularity' },
    ],
  },
  {
    id: 'financial',
    title: 'Financial Reports',
    icon: TbCurrencyRupee,
    description: 'Revenue, payments, outstanding fees, and ledger transactions.',
    reports: [
      { id: 'revenue', title: 'Revenue Report', description: 'Revenue breakdown by source and period.', path: '/admin/reports/revenue', icon: TbCurrencyRupee, endpoint: '/reports/revenue' },
      { id: 'payments', title: 'Payment Report', description: 'Payment history and status details.', path: '/admin/reports/payments', icon: FiCreditCard, endpoint: '/transactions', params: { direction: 'inflow' }, paginated: true },
      { id: 'outstanding', title: 'Outstanding Fees', description: 'Open fee obligations and balances due.', path: '/admin/reports/outstanding-payments', icon: FiFileText, endpoint: '/fee-obligations' },
      { id: 'ledger', title: 'Financial Ledger', description: 'Income, expenses, and transaction history.', path: '/admin/financial-ledger', icon: FiActivity, endpoint: '/transactions', paginated: true },
    ],
  },
  {
    id: 'franchise',
    title: 'School Campus Reports',
    icon: FiAward,
    description: 'Campus performance and compliance status.',
    reports: [
      { id: 'performance', title: 'Campus Performance', description: 'Enrollment and fee collection metrics by campus.', path: '/admin/reports/campus-performance', icon: FiActivity, endpoint: '/reports/campus-performance' },
      { id: 'compliance', title: 'Campus Compliance & Affiliation', description: 'Campus profile readiness, affiliation status, and key details.', path: '/admin/reports/campus-compliance', icon: FiFileText, endpoint: '/reports/campus-compliance' },
    ],
  },
  {
    id: 'staff',
    title: 'Staff Reports',
    icon: FiUsers,
    description: 'Staff performance, attendance, and payroll records.',
    reports: [
      { id: 'performance', title: 'Staff Performance', description: 'Staff productivity and performance metrics.', path: '/admin/reports/staff-performance', icon: FiActivity, endpoint: '/reports/staff-performance' },
      { id: 'attendance', title: 'Staff Attendance', description: 'Staff attendance records and patterns.', path: '/admin/reports/staff-attendance', icon: FiCalendar, endpoint: '/reports/staff-attendance' },
      { id: 'payroll', title: 'Payroll Report', description: 'Payroll amounts and payment status.', path: '/admin/reports/payroll', icon: TbCurrencyRupee, endpoint: '/reports/payroll' },
    ],
  },
];

const MAX_EXPORT_PAGES = 100;
const PAGE_SIZE = 20;

const reportKey = (categoryId, reportId) => `${categoryId}:${reportId}`;

function getReportPayload(responseBody) {
  if (responseBody && typeof responseBody === 'object' && Object.prototype.hasOwnProperty.call(responseBody, 'data')) {
    return responseBody.data;
  }
  return responseBody;
}

async function fetchReportSnapshot(report) {
  if (!report.paginated) {
    const response = await api.get(report.endpoint, { params: report.params || {} });
    return getReportPayload(response.data);
  }

  const firstResponse = await api.get(report.endpoint, {
    params: { ...(report.params || {}), page: 1, limit: PAGE_SIZE },
  });
  const firstBody = firstResponse.data || {};
  const rows = Array.isArray(firstBody.data) ? [...firstBody.data] : [];
  const totalPages = Math.max(1, Number(firstBody.pagination?.totalPages) || 1);
  const pagesToFetch = Math.min(totalPages, MAX_EXPORT_PAGES);

  for (let start = 2; start <= pagesToFetch; start += 5) {
    const pageNumbers = Array.from({ length: Math.min(5, pagesToFetch - start + 1) }, (_, index) => start + index);
    const responses = await Promise.all(pageNumbers.map((page) => api.get(report.endpoint, {
      params: { ...(report.params || {}), page, limit: PAGE_SIZE },
    })));
    responses.forEach((response) => {
      if (Array.isArray(response.data?.data)) rows.push(...response.data.data);
    });
  }

  return {
    records: rows,
    totalRecords: Number(firstBody.pagination?.total) || rows.length,
    truncated: totalPages > MAX_EXPORT_PAGES,
  };
}

function extractRecords(data, section = '') {
  if (Array.isArray(data)) return data.map((record) => section ? { Section: section, ...asRecord(record) } : asRecord(record));
  if (data && typeof data === 'object') {
    const arrayEntries = Object.entries(data).filter(([, value]) => Array.isArray(value));
    if (arrayEntries.length === 1) {
      const [name, values] = arrayEntries[0];
      return values.map((record) => ({ ...(section ? { Section: section } : {}), ...asRecord(record) }));
    }
    if (arrayEntries.length > 1) {
      return arrayEntries.flatMap(([name, values]) => values.map((record) => ({ Section: name, ...asRecord(record) })));
    }
    return [data];
  }
  return data == null ? [] : [{ Value: data }];
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : { Value: value };
}

function flattenRecord(record, prefix = '', output = {}) {
  Object.entries(record || {}).forEach(([key, value]) => {
    const column = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      flattenRecord(value, column, output);
    } else if (Array.isArray(value) || value instanceof Date) {
      output[column] = value instanceof Date ? value.toISOString() : JSON.stringify(value);
    } else {
      output[column] = value ?? '';
    }
  });
  return output;
}

function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function recordsToCsv(records) {
  const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
  return [columns.map(csvCell).join(','), ...records.map((record) => columns.map((column) => csvCell(record[column])).join(','))].join('\r\n');
}

function displayCell(value) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function downloadFile(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value !== '')) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header, index) => header.trim() || `Column ${index + 1}`);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function countSnapshotRecords(data) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object') {
    const array = Object.values(data).find(Array.isArray);
    return array?.length ?? 1;
  }
  return data == null ? 0 : 1;
}

const Reports = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReports, setSelectedReports] = useState([]);
  const [reportPickerOpen, setReportPickerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importedSnapshot, setImportedSnapshot] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef(null);
  const requestedCategory = searchParams.get('category') || 'all';
  const activeCategoryId = reportCategories.some((category) => category.id === requestedCategory) ? requestedCategory : 'all';

  const fetchDashboardStats = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await getDashboardStats();
      if (response.success && response.data?.quickStats) setStats(response.data.quickStats);
      else if (!silent) toast.error('Unable to load report overview.');
    } catch (error) {
      console.error('Dashboard stats error:', error);
      if (!silent) toast.error('Unable to load report overview.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useAutoRefresh(
    () => fetchDashboardStats({ silent: true }),
    { interval: 30000, events: ['payment-verified', 'new-enrollment', 'exam-submitted'] }
  );

  const displayedCategories = useMemo(() => reportCategories
    .filter((category) => activeCategoryId === 'all' || category.id === activeCategoryId)
    .map((category) => ({
      ...category,
      visibleReports: category.reports.filter((report) => {
        const query = searchTerm.trim().toLowerCase();
        return !query || `${report.title} ${report.description} ${category.title}`.toLowerCase().includes(query);
      }),
    }))
    .filter((category) => category.visibleReports.length > 0), [activeCategoryId, searchTerm]);

  const visibleReportKeys = displayedCategories.flatMap((category) => category.visibleReports.map((report) => reportKey(category.id, report.id)));
  const selectedReportSet = useMemo(() => new Set(selectedReports), [selectedReports]);
  const allVisibleSelected = visibleReportKeys.length > 0 && visibleReportKeys.every((key) => selectedReportSet.has(key));
  const selectedReportDefinitions = reportCategories.flatMap((category) => category.reports
    .filter((report) => selectedReportSet.has(reportKey(category.id, report.id)))
    .map((report) => ({ ...report, categoryId: category.id, categoryTitle: category.title })));
  const importedRows = importedSnapshot?.reports.flatMap((report) => extractRecords(report.data).map((record) => ({
    Report: report.title || 'Imported report',
    ...flattenRecord(record),
  }))) || [];
  const importedColumns = [...new Set(importedRows.flatMap((record) => Object.keys(record)))];

  const changeCategory = (categoryId) => {
    const next = new URLSearchParams(searchParams);
    if (categoryId === 'all') next.delete('category');
    else next.set('category', categoryId);
    setSearchParams(next, { replace: true });
  };

  const toggleReport = (key) => {
    setSelectedReports((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const toggleVisibleReports = () => {
    setSelectedReports((current) => {
      if (allVisibleSelected) return current.filter((key) => !visibleReportKeys.includes(key));
      return [...new Set([...current, ...visibleReportKeys])];
    });
  };

  const exportSelectedReports = async (format) => {
    if (!selectedReportDefinitions.length || isExporting) return;
    setIsExporting(true);
    try {
      const results = await Promise.allSettled(selectedReportDefinitions.map(async (report) => ({
        report,
        data: await fetchReportSnapshot(report),
      })));
      const successful = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
      const failures = results.length - successful.length;
      if (successful.length === 0) {
        toast.error('None of the selected reports could be exported.');
        return;
      }

      const exportedAt = new Date().toISOString();
      const bundle = {
        schemaVersion: 1,
        source: 'Arion School Reports',
        exportedAt,
        reports: successful.map(({ report, data }) => ({
          id: reportKey(report.categoryId, report.id),
          title: report.title,
          category: report.categoryTitle,
          data,
        })),
      };
      const dateStamp = exportedAt.slice(0, 10);
      if (format === 'json') {
        downloadFile(JSON.stringify(bundle, null, 2), 'application/json;charset=utf-8', `ses-reports-${dateStamp}.json`);
      } else {
        const records = successful.flatMap(({ report, data }) => extractRecords(data).map((record) => ({
          Report: report.title,
          Category: report.categoryTitle,
          ...flattenRecord(record),
        })));
        if (!records.length) {
          toast.info('The selected reports returned no rows to export.');
          return;
        }
        downloadFile(`\uFEFF${recordsToCsv(records)}`, 'text/csv;charset=utf-8', `ses-reports-${dateStamp}.csv`);
      }

      const truncatedCount = successful.filter(({ data }) => data?.truncated).length;
      if (failures) toast.warning(`${successful.length} report(s) exported; ${failures} failed.`);
      else if (truncatedCount) toast.info('Export completed with the first 2,000 ledger/payment rows per report.');
      else toast.success(`${successful.length} report(s) exported successfully.`);
    } catch (error) {
      console.error('Bulk report export error:', error);
      toast.error('Could not export the selected reports.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      let importedReports;
      if (file.name.toLowerCase().endsWith('.csv')) {
        const rows = parseCsv(text);
        if (!rows.length) throw new Error('The CSV file does not contain a header and data rows.');
        importedReports = [{ id: 'imported-csv', title: file.name, category: 'Imported CSV', data: rows }];
      } else {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed?.reports)) importedReports = parsed.reports;
        else if (Array.isArray(parsed)) importedReports = [{ id: 'imported-json', title: file.name, category: 'Imported JSON', data: parsed }];
        else if (parsed && typeof parsed === 'object') importedReports = [{ id: 'imported-json', title: file.name, category: 'Imported JSON', data: parsed.data ?? parsed }];
        else throw new Error('This JSON file does not contain report data.');
      }
      if (!importedReports.length) throw new Error('This file does not contain any report snapshots.');
      setImportedSnapshot({ fileName: file.name, importedAt: new Date().toISOString(), reports: importedReports });
      toast.success(`Imported ${importedReports.length} report snapshot(s) for review.`);
    } catch (error) {
      toast.error(error.message || 'Could not read this report file. Use a CSV or a SES report JSON export.');
    } finally {
      setIsImporting(false);
    }
  };

  const exportImportedSnapshot = (format) => {
    if (!importedSnapshot) return;
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      downloadFile(JSON.stringify({ schemaVersion: 1, source: 'Arion School imported snapshot', ...importedSnapshot }, null, 2), 'application/json;charset=utf-8', `ses-imported-report-${stamp}.json`);
      return;
    }
    if (!importedRows.length) {
      toast.info('This imported snapshot does not contain rows to export.');
      return;
    }
    downloadFile(`\uFEFF${recordsToCsv(importedRows)}`, 'text/csv;charset=utf-8', `ses-imported-report-${stamp}.csv`);
  };

  return (
    <div className="space-y-5">
      {loading && !stats ? (
        <PageLoading message="Loading report overview..." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Students" tone="info" icon={FiUsers} value={stats?.totalStudents || 0} />
          <StatCard title="Total Courses" tone="success" icon={FiBook} value={stats?.totalCourses || 0} />
          <StatCard title="Total Campuses" tone="primary" icon={FiAward} value={stats?.totalFranchises || 0} />
          <StatCard title="Net Revenue" tone="amber" icon={TbCurrencyRupee} value={formatCurrency(stats?.netRevenue ?? stats?.totalRevenue ?? 0, { compact: true })} />
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Report library</h2>
            <p className="mt-1 text-sm text-slate-500">Search, select multiple reports, and export their latest data together.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1 lg:flex-none">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search reports..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setReportPickerOpen((open) => !open)}
                aria-expanded={reportPickerOpen}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FiList className="h-4 w-4" />
                Choose reports{selectedReports.length ? ` (${selectedReports.length})` : ''}
              </button>
              {reportPickerOpen && (
                <div className="absolute right-0 z-30 mt-2 max-h-[min(70vh,520px)] w-[min(340px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="sticky top-[-8px] mb-1 flex items-center justify-between border-b border-slate-100 bg-white px-2 py-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Add reports to export</span>
                    <button type="button" onClick={() => setReportPickerOpen(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close report selector"><FiX className="h-4 w-4" /></button>
                  </div>
                  {reportCategories.map((category) => (
                    <div key={category.id} className="px-1 py-2">
                      <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{category.title}</p>
                      {category.reports.map((report) => {
                        const key = reportKey(category.id, report.id);
                        const selected = selectedReportSet.has(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleReport(key)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${selected ? 'bg-primary-50 font-semibold text-primary-800' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            {selected ? <FiCheckCircle className="h-4 w-4 shrink-0 text-primary-700" /> : <FiCircle className="h-4 w-4 shrink-0 text-slate-400" />}
                            <span className="truncate">{report.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={toggleVisibleReports}
              disabled={!visibleReportKeys.length}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allVisibleSelected ? <FiCheckSquare className="h-4 w-4" /> : <FiSquare className="h-4 w-4" />}
              {allVisibleSelected ? 'Clear visible' : 'Select visible'}
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FiUpload className="h-4 w-4" />
              {isImporting ? 'Importing…' : 'Import snapshot'}
            </button>
            <input ref={importInputRef} type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={handleImportFile} />
          </div>
        </div>

        {selectedReports.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-primary-100 bg-primary-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-900">
              <FiCheckSquare className="h-4 w-4" />
              {selectedReports.length} report{selectedReports.length === 1 ? '' : 's'} selected
              <button type="button" onClick={() => setSelectedReports([])} className="ml-1 rounded-md p-1 text-primary-700 hover:bg-primary-100" title="Clear selection" aria-label="Clear selection">
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => exportSelectedReports('csv')} disabled={isExporting} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-700 px-3 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:opacity-60">
                <FiDownload className="h-4 w-4" />{isExporting ? 'Preparing…' : 'Export CSV'}
              </button>
              <button type="button" onClick={() => exportSelectedReports('json')} disabled={isExporting} className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 text-sm font-semibold text-primary-800 transition hover:bg-primary-50 disabled:opacity-60">
                <FiDownload className="h-4 w-4" />Export JSON bundle
              </button>
            </div>
          </div>
        )}

        <div className="space-y-7 p-4 sm:p-5">
          {displayedCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center">
              <FiSearch className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800">No reports match your search</p>
              <p className="mt-1 text-sm text-slate-500">Try a different title or category.</p>
            </div>
          ) : displayedCategories.map((category) => (
            <section key={category.id} aria-labelledby={`report-category-${category.id}`}>
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><category.icon className="h-4 w-4" /></span>
                <div>
                  <h3 id={`report-category-${category.id}`} className="text-sm font-bold text-slate-900">{category.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{category.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {category.visibleReports.map((report) => {
                  const key = reportKey(category.id, report.id);
                  const selected = selectedReportSet.has(key);
                  return (
                    <article key={key} className={`rounded-xl border p-4 transition ${selected ? 'border-primary-300 bg-primary-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><report.icon className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">{report.title}</h4>
                            {selected && <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-800">Selected</span>}
                          </div>
                          <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{report.description}</p>
                          <button type="button" onClick={() => navigate(report.path)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-900">
                            <FiFileText className="h-3.5 w-3.5" />Open report
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      {importedSnapshot && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FiUpload className="h-4 w-4 text-primary-700" />
                <h2 className="text-sm font-bold text-slate-900">Imported snapshot</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">{importedSnapshot.fileName} · imported for review only; live records were not changed.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => exportImportedSnapshot('csv')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <FiDownload className="h-4 w-4" />Export CSV
              </button>
              <button type="button" onClick={() => exportImportedSnapshot('json')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <FiDownload className="h-4 w-4" />Export JSON
              </button>
              <button type="button" onClick={() => setImportedSnapshot(null)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <FiX className="h-4 w-4" />Clear snapshot
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {importedSnapshot.reports.map((report, index) => (
              <div key={`${report.id || report.title || 'snapshot'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="truncate text-sm font-semibold text-slate-800">{report.title || `Report ${index + 1}`}</p>
                <p className="mt-1 text-xs text-slate-500">{report.category || 'Imported data'} · {countSnapshotRecords(report.data)} record(s)</p>
              </div>
            ))}
          </div>
          {importedRows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>{importedColumns.slice(0, 8).map((column) => <th key={column} className="whitespace-nowrap px-3 py-2">{column}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {importedRows.slice(0, 10).map((record, rowIndex) => (
                    <tr key={rowIndex}>
                      {importedColumns.slice(0, 8).map((column) => <td key={column} className="max-w-[260px] truncate whitespace-nowrap px-3 py-2" title={displayCell(record[column])}>{displayCell(record[column])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(importedRows.length > 10 || importedColumns.length > 8) && <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">Previewing 10 rows and up to 8 columns. Export to view the full snapshot.</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Reports;

