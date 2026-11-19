import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { TbCurrencyRupee } from 'react-icons/tb';
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPieChart,
  FiList,
  FiDollarSign,
  FiDownload,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiCalendar
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import {
  getTransactions,
  getTransactionStats,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from '../../api/transactionApi';
import {
  StatCard,
  PageLoading,
  FilterBar,
  FilterBarActions,
  SelectField,
  TableWrapper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TableEmpty,
  StatusBadge,
  Button,
  IconButton,
  Modal,
  FormField,
  FormGrid,
  TextField,
  TextArea,
  Badge
} from '../../components/ui';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import api from '../../api/axios';

const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const categoryLabel = (cat) => (cat || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const EXPENSE_CATEGORIES = [
  { id: 'office_rent', label: 'Office & Center Rent', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'utilities_bills', label: 'Utilities (Electricity, Water, Internet)', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { id: 'cloud_server_hosting', label: 'Cloud Hosting, Servers & SaaS', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'marketing_advertising', label: 'Marketing, Ads & Promotions', color: 'bg-pink-50 text-pink-800 border-pink-200' },
  { id: 'office_supplies', label: 'Stationery, Books & Study Material', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'repairs_maintenance', label: 'Repairs & Maintenance', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  { id: 'staff_salary', label: 'Staff & Faculty Salaries', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'staff_advance', label: 'Staff Advances & Reimbursements', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  { id: 'student_refund', label: 'Student Fee Refunds', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'legal_accounting', label: 'Legal, CA Audit & Compliance Taxes', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'operating_expense', label: 'General Operating Expenses', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { id: 'other_expense', label: 'Other Miscellaneous Expenses', color: 'bg-gray-100 text-gray-800 border-gray-300' }
];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank Transfer / NEFT / IMPS' },
  { id: 'upi', label: 'UPI / QR Code' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'card', label: 'Debit / Credit Card' },
  { id: 'online', label: 'Online Gateway' },
  { id: 'other', label: 'Other' }
];

const FinancialTransactions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all'; // 'all' | 'expenses' | 'pnl'
  const [activeTab, setActiveTab] = useState(initialTab);

  const [transactions, setTransactions] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ direction: '', status: '', category: '', search: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Expense Modal States
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'office_rent',
    amount: '',
    payeeName: '',
    paymentMethod: 'bank_transfer',
    paidAt: new Date().toISOString().split('T')[0],
    status: 'completed',
    invoiceRef: '',
    description: '',
    remarks: ''
  });

  // Sync tab with URL
  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(tabId === 'all' ? {} : { tab: tabId });
    setCurrentPage(1);
    if (tabId === 'expenses') {
      setFilters((prev) => ({ ...prev, direction: 'outflow' }));
    } else if (tabId === 'all') {
      setFilters((prev) => ({ ...prev, direction: '' }));
    }
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'all';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
      setCurrentPage(1);
      if (tabFromUrl === 'expenses') {
        setFilters((prev) => ({ ...prev, direction: 'outflow' }));
      } else if (tabFromUrl === 'all') {
        setFilters((prev) => ({ ...prev, direction: '' }));
      }
    }
  }, [searchParams]);

  const loadData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };

      if (activeTab === 'expenses') {
        params.direction = 'outflow';
      } else if (filters.direction) {
        params.direction = filters.direction;
      }

      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;

      const txRes = await getTransactions(params);
      setTransactions(txRes.data || []);
      setTotalItems(txRes.pagination?.total ?? txRes.count ?? txRes.data?.length ?? 0);
      setTotalPages(txRes.pagination?.totalPages ?? 1);
    } catch (error) {
      if (!silent) toast.error('Failed to load financial transactions');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getTransactionStats();
      setStats(response.data || null);
    } catch (error) {
      console.error('Failed to load ledger summary', error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.direction, filters.status, filters.category, currentPage, itemsPerPage, activeTab]);

  useEffect(() => {
    loadStats();
    api.get('/transactions/categories').then((response) => setExpenseCategories(response.data.data || []))
      .catch((error) => console.error('Failed to load expense categories', error));
  }, []);

  const handleAddExpenseCategory = async () => {
    const name = window.prompt('Enter a name for the new expense category');
    if (!name?.trim()) return;
    try {
      const response = await api.post('/transactions/categories', { name: name.trim() });
      setExpenseCategories((current) => [...current, response.data.data]);
      toast.success('Expense category added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add expense category');
    }
  };

  const allExpenseCategories = [
    ...EXPENSE_CATEGORIES,
    ...expenseCategories.map((category) => ({ id: category.key, label: category.name, color: 'bg-violet-50 text-violet-800 border-violet-200' }))
  ];

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [currentPage, totalPages]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  };

  // Live ledger without manual refresh
  useAutoRefresh(
    () => {
      loadData({ silent: true });
      loadStats();
    },
    { interval: 30000, events: ['payment-verified', 'new-enrollment', 'expense-recorded'] }
  );

  // Open Add Expense Modal
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      category: 'office_rent',
      amount: '',
      payeeName: '',
      paymentMethod: 'bank_transfer',
      paidAt: new Date().toISOString().split('T')[0],
      status: 'completed',
      invoiceRef: '',
      description: '',
      remarks: ''
    });
    setExpenseModalOpen(true);
  };

  // Open Edit Expense Modal
  const handleOpenEditExpense = (tx) => {
    setEditingExpense(tx);
    setExpenseForm({
      category: tx.category || 'other_expense',
      amount: tx.amount || '',
      payeeName: tx.party?.name || '',
      paymentMethod: tx.paymentMethod || 'cash',
      paidAt: tx.paidAt ? new Date(tx.paidAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: tx.status || 'completed',
      invoiceRef: tx.bankDetails?.transactionRef || tx.receiptNumber || '',
      description: tx.description || '',
      remarks: tx.remarks || ''
    });
    setExpenseModalOpen(true);
  };

  // Submit Expense Form (Create or Update)
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }

    try {
      setSavingExpense(true);
      const payload = {
        direction: 'outflow',
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        party: {
          type: 'vendor',
          name: expenseForm.payeeName.trim() || 'Vendor / Counterparty'
        },
        paymentMethod: expenseForm.paymentMethod,
        status: expenseForm.status,
        paidAt: expenseForm.paidAt ? new Date(expenseForm.paidAt) : new Date(),
        description: expenseForm.description.trim(),
        remarks: expenseForm.remarks.trim(),
        bankDetails: {
          transactionRef: expenseForm.invoiceRef.trim()
        }
      };

      if (editingExpense) {
        await updateTransaction(editingExpense._id, payload);
        toast.success('Expense record updated successfully');
      } else {
        await createTransaction(payload);
        toast.success('Company expense recorded successfully');
      }

      setExpenseModalOpen(false);
      await Promise.all([loadData(), loadStats()]);
    } catch (err) {
      console.error('Error saving expense:', err);
      toast.error(err.response?.data?.message || 'Failed to save expense record');
    } finally {
      setSavingExpense(false);
    }
  };

  // Cancel / Delete Expense
  const handleCancelExpense = async (tx) => {
    if (!window.confirm(`Are you sure you want to cancel expense #${tx.transactionNumber} for ${formatCurrency(tx.amount)}?`)) {
      return;
    }
    try {
      await deleteTransaction(tx._id);
      toast.success('Expense cancelled successfully');
      await Promise.all([loadData(), loadStats()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel expense');
    }
  };

  // Calculate P&L metrics
  const pnlMetrics = useMemo(() => {
    const totalIncome = stats?.totalIncome || 0;
    const totalExpenses = stats?.totalExpenses || 0;
    const netRevenue = stats?.netRevenue !== undefined ? stats.netRevenue : (totalIncome - totalExpenses);
    const profitMargin = totalIncome > 0 ? ((netRevenue / totalIncome) * 100).toFixed(1) : '0.0';
    const isProfitable = netRevenue >= 0;

    const monthlyIncome = stats?.monthlyIncome || 0;
    const monthlyExpenses = stats?.monthlyExpenses || 0;
    const monthlyNet = monthlyIncome - monthlyExpenses;
    const monthlyMargin = monthlyIncome > 0 ? ((monthlyNet / monthlyIncome) * 100).toFixed(1) : '0.0';

    // Group breakdown from stats.byCategory
    const rawCategories = stats?.byCategory || [];
    const expenseBreakdown = [];
    const incomeBreakdown = [];

    rawCategories.forEach((item) => {
      const dir = item._id?.direction;
      const cat = item._id?.category;
      if (dir === 'outflow') {
        const found = allExpenseCategories.find((c) => c.id === cat);
        expenseBreakdown.push({
          category: cat,
          label: found?.label || categoryLabel(cat),
          amount: item.total || 0,
          count: item.count || 0
        });
      } else if (dir === 'inflow') {
        incomeBreakdown.push({
          category: cat,
          label: categoryLabel(cat),
          amount: item.total || 0,
          count: item.count || 0
        });
      }
    });

    expenseBreakdown.sort((a, b) => b.amount - a.amount);
    incomeBreakdown.sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpenses,
      netRevenue,
      profitMargin,
      isProfitable,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet,
      monthlyMargin,
      expenseBreakdown,
      incomeBreakdown
    };
  }, [stats]);

  // Filter transactions in memory if user searches text
  const displayedTransactions = useMemo(() => {
    if (!filters.search?.trim()) return transactions;
    const q = filters.search.toLowerCase();
    return transactions.filter((tx) =>
      tx.transactionNumber?.toLowerCase().includes(q) ||
      tx.party?.name?.toLowerCase().includes(q) ||
      tx.description?.toLowerCase().includes(q) ||
      tx.category?.toLowerCase().includes(q)
    );
  }, [transactions, filters.search]);

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Actions in Horizontal Tab Strip */}
        <PageHeader
          actions={
            <Button
              variant="primary"
              icon={FiPlus}
              onClick={handleOpenAddExpense}
              className="text-xs"
            >
              Record Expense
            </Button>
          }
        />

        {/* Global Summary Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue (Inflow)"
              tone="success"
              icon={FiTrendingUp}
              value={formatCurrency(stats.totalIncome)}
              subtitle={`This month: ${formatCurrency(stats.monthlyIncome)}`}
            />
            <StatCard
              title="Total Expenses (Outflow)"
              tone="danger"
              icon={FiTrendingDown}
              value={formatCurrency(stats.totalExpenses)}
              subtitle={`This month: ${formatCurrency(stats.monthlyExpenses)}`}
            />
            <StatCard
              title="Net Revenue / Profit"
              tone={pnlMetrics.isProfitable ? 'purple' : 'danger'}
              icon={TbCurrencyRupee}
              value={formatCurrency(stats.netRevenue)}
              subtitle={`Net Margin: ${pnlMetrics.profitMargin}%`}
            />
            <StatCard
              title="Pending Obligations"
              tone="amber"
              icon={FiClock}
              value={formatCurrency(stats.outstandingReceivables)}
              subtitle={`${stats.outstandingReceivableCount || 0} open dues`}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="hidden border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => switchTab('all')}
              className={`py-3 px-1 border-b-2 font-medium text-xs flex items-center gap-2 transition ${
                activeTab === 'all'
                  ? 'border-primary-600 text-primary-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <FiList className="w-4 h-4" /> All Transactions
            </button>

            <button
              type="button"
              onClick={() => switchTab('expenses')}
              className={`py-3 px-1 border-b-2 font-medium text-xs flex items-center gap-2 transition ${
                activeTab === 'expenses'
                  ? 'border-primary-600 text-primary-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <FiArrowUpRight className="w-4 h-4 text-rose-500" /> Company Expenses
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                Outflow
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('pnl')}
              className={`py-3 px-1 border-b-2 font-medium text-xs flex items-center gap-2 transition ${
                activeTab === 'pnl'
                  ? 'border-primary-600 text-primary-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <FiPieChart className="w-4 h-4 text-purple-600" /> Profit & Loss (P&L) Statement
            </button>
          </nav>
        </div>

        {/* TAB 1: ALL TRANSACTIONS */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            <FilterBar>
              <FilterBarActions className="w-full sm:w-auto flex flex-wrap gap-2.5">
                <SelectField
                  value={filters.direction}
                  onChange={(e) => updateFilter('direction', e.target.value)}
                  className="min-w-[140px]"
                >
                  <option value="">All Types (In/Out)</option>
                  <option value="inflow">Income (Inflow)</option>
                  <option value="outflow">Expense (Outflow)</option>
                </SelectField>

                <SelectField
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="min-w-[140px]"
                >
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </SelectField>

                <div className="relative flex-1 sm:w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    placeholder="Search by payee, ref or txn..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </FilterBarActions>
            </FilterBar>

            {loading ? (
              <PageLoading message="Loading financial transactions..." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Txn #</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Category</TableHeader>
                      <TableHeader>Party / Payee</TableHeader>
                      <TableHeader className="text-right">Amount</TableHeader>
                      <TableHeader>Method</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Date</TableHeader>
                      <TableHeader className="text-right">Actions</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {displayedTransactions.length === 0 ? (
                      <TableEmpty
                        colSpan={9}
                        title="No transactions found"
                        description="Try adjusting your filter criteria or record a new transaction."
                      />
                    ) : (
                      displayedTransactions.map((tx) => {
                        const isExpense = tx.direction === 'outflow';
                        const expenseMeta = allExpenseCategories.find((c) => c.id === tx.category);

                        return (
                          <TableRow key={tx._id}>
                            <TableCell>
                              <span className="font-mono text-xs font-semibold text-slate-700">
                                {tx.transactionNumber}
                              </span>
                            </TableCell>

                            <TableCell>
                              {isExpense ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                                  <FiArrowUpRight className="w-3.5 h-3.5" /> Expense
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <FiArrowDownLeft className="w-3.5 h-3.5" /> Income
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                expenseMeta ? expenseMeta.color : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {expenseMeta ? expenseMeta.label : categoryLabel(tx.category)}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="text-xs font-medium text-slate-800">
                                {tx.party?.name || tx.party?.type || '—'}
                              </div>
                              {tx.description && (
                                <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                  {tx.description}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className={`text-right font-bold text-xs ${
                              isExpense ? 'text-rose-700' : 'text-emerald-700'
                            }`}>
                              {isExpense ? '-' : '+'}{formatCurrency(tx.amount)}
                            </TableCell>

                            <TableCell>
                              <span className="text-xs text-slate-600 capitalize">
                                {tx.paymentMethod?.replace('_', ' ') || 'Cash'}
                              </span>
                            </TableCell>

                            <TableCell>
                              <StatusBadge status={tx.status} />
                            </TableCell>

                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                              {tx.paidAt ? new Date(tx.paidAt).toLocaleDateString('en-IN') : '—'}
                            </TableCell>

                            <TableCell className="text-right">
                              {isExpense && tx.status !== 'cancelled' && (
                                <div className="flex items-center justify-end gap-1">
                                  <IconButton
                                    icon={FiEdit2}
                                    size="sm"
                                    variant="secondary"
                                    title="Edit Expense"
                                    onClick={() => handleOpenEditExpense(tx)}
                                  />
                                  <IconButton
                                    icon={FiTrash2}
                                    size="sm"
                                    variant="danger"
                                    title="Cancel Expense"
                                    onClick={() => handleCancelExpense(tx)}
                                  />
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableWrapper>
            )}

            {!loading && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50]}
              />
            )}
          </div>
        )}

        {/* TAB 2: COMPANY EXPENSES (OUTFLOW ONLY) */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Top Filter and Add Action */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <SelectField
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="min-w-[180px]"
                >
                  <option value="">All Expense Categories</option>
                  {allExpenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="min-w-[140px]"
                >
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </SelectField>

                <div className="relative flex-1 md:w-60">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    placeholder="Search payee, invoice or bill..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <Button variant="secondary" size="sm" onClick={handleAddExpenseCategory}>Add Category</Button>
                <Button
                  variant="primary"
                  icon={FiPlus}
                  size="sm"
                  onClick={handleOpenAddExpense}
                >
                  Record New Expense
                </Button>
              </div>
            </div>

            {/* Expenses Table */}
            {loading ? (
              <PageLoading message="Loading company expenses..." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Txn #</TableHeader>
                      <TableHeader>Expense Category</TableHeader>
                      <TableHeader>Payee / Vendor</TableHeader>
                      <TableHeader>Description & Reference</TableHeader>
                      <TableHeader className="text-right">Amount</TableHeader>
                      <TableHeader>Payment Mode</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Paid Date</TableHeader>
                      <TableHeader className="text-right">Actions</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {displayedTransactions.length === 0 ? (
                      <TableEmpty
                        colSpan={9}
                        title="No company expenses recorded"
                        description="Click '+ Record New Expense' to log institutional rent, utilities, cloud servers, or marketing."
                      />
                    ) : (
                      displayedTransactions.map((tx) => {
                        const expenseMeta = allExpenseCategories.find((c) => c.id === tx.category);

                        return (
                          <TableRow key={tx._id}>
                            <TableCell>
                              <span className="font-mono text-xs font-semibold text-slate-700">
                                {tx.transactionNumber}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                expenseMeta ? expenseMeta.color : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}>
                                {expenseMeta ? expenseMeta.label : categoryLabel(tx.category)}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="text-xs font-bold text-slate-800">
                                {tx.party?.name || 'Vendor'}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="text-xs text-slate-700 font-medium truncate max-w-xs">
                                {tx.description || '—'}
                              </div>
                              {tx.bankDetails?.transactionRef && (
                                <div className="text-[11px] text-slate-400 font-mono">
                                  Ref: {tx.bankDetails.transactionRef}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-right font-bold text-xs text-rose-700">
                              -{formatCurrency(tx.amount)}
                            </TableCell>

                            <TableCell>
                              <span className="text-xs text-slate-600 capitalize">
                                {tx.paymentMethod?.replace('_', ' ') || 'Cash'}
                              </span>
                            </TableCell>

                            <TableCell>
                              <StatusBadge status={tx.status} />
                            </TableCell>

                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                              {tx.paidAt ? new Date(tx.paidAt).toLocaleDateString('en-IN') : '—'}
                            </TableCell>

                            <TableCell className="text-right">
                              {tx.status !== 'cancelled' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <IconButton
                                    icon={FiEdit2}
                                    size="sm"
                                    variant="secondary"
                                    title="Edit Expense"
                                    onClick={() => handleOpenEditExpense(tx)}
                                  />
                                  <IconButton
                                    icon={FiTrash2}
                                    size="sm"
                                    variant="danger"
                                    title="Cancel Expense"
                                    onClick={() => handleCancelExpense(tx)}
                                  />
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableWrapper>
            )}

            {!loading && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50]}
              />
            )}
          </div>
        )}

        {/* TAB 3: PROFIT & LOSS (P&L) STATEMENT */}
        {activeTab === 'pnl' && (
          <div className="space-y-6">
            {/* P&L Executive Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-300 border border-white/10">
                      Institute Statement
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      pnlMetrics.isProfitable
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {pnlMetrics.isProfitable ? 'Net Profitable' : 'Operating Deficit'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Institutional Profit & Loss (P&L)</h2>
                  <p className="text-xs text-slate-300 max-w-xl mt-1">
                    Comprehensive net margin evaluation calculating gross admission inflows against operating expenditures.
                  </p>
                </div>

                <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Profit Margin</span>
                    <span className={`text-xl font-black ${
                      pnlMetrics.isProfitable ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {pnlMetrics.profitMargin}%
                    </span>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10" />
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Net Bottom Line</span>
                    <span className={`text-xl font-black ${
                      pnlMetrics.isProfitable ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(pnlMetrics.netRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly vs Total Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Overall Performance */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">All-Time Cumulative Summary</h3>
                  <span className="text-xs text-slate-400">Total ledger history</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Inflow (Revenue)</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(pnlMetrics.totalIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Outflow (Expenses)</span>
                    <span className="font-bold text-rose-700">-{formatCurrency(pnlMetrics.totalExpenses)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-800">Net Profit / (Loss)</span>
                    <span className={pnlMetrics.isProfitable ? 'text-emerald-700' : 'text-rose-700'}>
                      {formatCurrency(pnlMetrics.netRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Month Performance */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Current Month P&L</h3>
                  <span className="text-xs text-slate-400">
                    {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Monthly Inflow (Admissions)</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(pnlMetrics.monthlyIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Monthly Outflow (Bills & Payroll)</span>
                    <span className="font-bold text-rose-700">-{formatCurrency(pnlMetrics.monthlyExpenses)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-800">Monthly Net Result</span>
                    <span className={pnlMetrics.monthlyNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {formatCurrency(pnlMetrics.monthlyNet)}
                      <span className="text-xs font-normal text-slate-400 ml-1.5">
                        ({pnlMetrics.monthlyMargin}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Operating Expense Distribution Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Operating Expense Category Distribution</h3>
                  <p className="text-xs text-slate-500">
                    Proportional allocation of institutional funds across rent, infrastructure, utilities, payroll, and promotions.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  Total: {formatCurrency(pnlMetrics.totalExpenses)}
                </span>
              </div>

              {pnlMetrics.expenseBreakdown.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No expense breakdown available yet. Record expenses in the Company Expenses tab.
                </div>
              ) : (
                <div className="space-y-4">
                  {pnlMetrics.expenseBreakdown.map((item) => {
                    const percent = pnlMetrics.totalExpenses > 0
                      ? ((item.amount / pnlMetrics.totalExpenses) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <div key={item.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{item.label}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                            <span className="text-slate-400 text-[11px] w-12 text-right">({percent}%)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(2, Number(percent)))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Revenue Inflow Category Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Revenue Inflow Channels</h3>
                  <p className="text-xs text-slate-500">
                    Distribution of revenue from courses, admission registrations, installments, and credentials.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Total: {formatCurrency(pnlMetrics.totalIncome)}
                </span>
              </div>

              {pnlMetrics.incomeBreakdown.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No income channel data recorded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pnlMetrics.incomeBreakdown.map((item) => (
                    <div
                      key={item.category}
                      className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-medium text-slate-600 block">{item.label}</span>
                        <span className="text-[11px] text-slate-400">{item.count} transactions</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RECORD / EDIT EXPENSE MODAL */}
        <Modal
          open={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          title={editingExpense ? 'Edit Company Expense' : 'Record New Company Expense'}
          size="lg"
        >
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <FormGrid cols={2}>
              <FormField label="Expense Category" required>
                <SelectField
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  required
                >
                  {allExpenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField label="Amount (₹)" required>
                <TextField
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 25000"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Payee / Vendor Name" required>
                <TextField
                  placeholder="e.g. Landlord, AWS Cloud, Electricity Board"
                  value={expenseForm.payeeName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payeeName: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Payment Method" required>
                <SelectField
                  value={expenseForm.paymentMethod}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                  required
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField label="Payment Date" required>
                <TextField
                  type="date"
                  value={expenseForm.paidAt}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paidAt: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Bill / Invoice / Transaction Ref #">
                <TextField
                  placeholder="e.g. INV-2026-0042, UPI Ref ID"
                  value={expenseForm.invoiceRef}
                  onChange={(e) => setExpenseForm({ ...expenseForm, invoiceRef: e.target.value })}
                />
              </FormField>
            </FormGrid>

            <FormField label="Description / Itemization">
              <TextArea
                rows={2}
                placeholder="e.g. Monthly center rent for Sector 4 branch, High-speed fiber internet bill..."
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </FormField>

            <FormField label="Internal Remarks / Notes">
              <TextField
                placeholder="Approved by Director / Receipt filed in Accounts"
                value={expenseForm.remarks}
                onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
              />
            </FormField>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setExpenseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={savingExpense}
              >
                {editingExpense ? 'Save Changes' : 'Record Expense'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default FinancialTransactions;
