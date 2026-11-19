import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiBook, FiCreditCard, FiTrendingUp, FiFileText,
  FiUsers, FiPlus, FiPrinter, FiDownload, FiDollarSign
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import accountingApi from '../../api/accountingApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton
} from '../../components/ui';

const AccountingLedger = () => {
  const [activeTab, setActiveTab] = useState('cashbook');
  const [loading, setLoading] = useState(true);

  // States
  const [cashbookData, setCashbookData] = useState(null);
  const [bankbookData, setBankbookData] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [incomeExpData, setIncomeExpData] = useState(null);
  const [vendors, setVendors] = useState([]);

  // Modals
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  // Forms
  const [voucherForm, setVoucherForm] = useState({
    voucherType: 'payment',
    debitAccount: 'Office Expenses',
    creditAccount: 'Cash in Hand',
    amount: '',
    narration: '',
    referenceNumber: ''
  });

  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: 'stationery',
    gstin: ''
  });

  useEffect(() => {
    loadTabContent();
  }, [activeTab]);

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'cashbook') {
        const res = await accountingApi.getCashbook({});
        setCashbookData(res?.data || null);
      } else if (activeTab === 'bankbook') {
        const res = await accountingApi.getBankbook({});
        setBankbookData(res?.data || null);
      } else if (activeTab === 'vouchers') {
        const res = await accountingApi.getVouchers({});
        setVouchers(res?.data?.data || []);
      } else if (activeTab === 'pl') {
        const res = await accountingApi.getIncomeExpenditure({});
        setIncomeExpData(res?.data || null);
      } else if (activeTab === 'vendors') {
        const res = await accountingApi.getVendors({});
        setVendors(res?.data?.data || []);
      }
    } catch (err) {
      toast.error('Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    try {
      await accountingApi.createVoucher({
        ...voucherForm,
        amount: Number(voucherForm.amount)
      });
      toast.success('Account voucher posted successfully');
      setShowVoucherModal(false);
      setVoucherForm({
        voucherType: 'payment',
        debitAccount: 'Office Expenses',
        creditAccount: 'Cash in Hand',
        amount: '',
        narration: '',
        referenceNumber: ''
      });
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error posting voucher');
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    try {
      await accountingApi.createVendor(vendorForm);
      toast.success('Vendor registered successfully');
      setShowVendorModal(false);
      setVendorForm({ name: '', contactPerson: '', phone: '', email: '', category: 'stationery', gstin: '' });
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error creating vendor');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="School Accounts & Financial Ledger"
          subtitle="Real-time Cashbook, Bankbook, Double-entry Vouchers, and Income-Expenditure statements."
        >
          <div className="flex items-center space-x-3">
            <Button variant="primary" onClick={() => setShowVoucherModal(true)}>
              <FiPlus className="w-4 h-4 mr-1" /> Post Voucher
            </Button>
          </div>
        </PageHeader>

        {/* Tab Navigation */}
        <SubNavTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'cashbook', label: 'Cashbook', icon: TbCurrencyRupee },
            { id: 'bankbook', label: 'Bankbook', icon: FiCreditCard },
            { id: 'vouchers', label: 'Vouchers', icon: FiFileText, badge: vouchers.length },
            { id: 'pl', label: 'Income & Expenditure (P&L)', icon: FiTrendingUp },
            { id: 'vendors', label: 'Vendors', icon: FiUsers, badge: vendors.length }
          ]}
        />

        {/* Tab 1: Cashbook */}
        {activeTab === 'cashbook' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Opening Cash Balance</span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  ₹{(cashbookData?.openingBalance || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Total Cash Receipts (Debit)</span>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{(cashbookData?.totalReceipts || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Total Cash Payments (Credit)</span>
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  ₹{(cashbookData?.totalPayments || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Closing Cash on Hand</span>
                <h3 className="text-2xl font-bold text-primary-600 mt-1">
                  ₹{(cashbookData?.closingBalance || 0).toLocaleString()}
                </h3>
              </div>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Txn / Receipt No</TableHeader>
                    <TableHeader>Particulars / Narration</TableHeader>
                    <TableHeader>Receipt (Debit)</TableHeader>
                    <TableHeader>Payment (Credit)</TableHeader>
                    <TableHeader className="text-right">Balance</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!cashbookData?.data || cashbookData.data.length === 0) ? (
                    <TableEmpty colSpan={6} message="No cash transactions recorded for this period." />
                  ) : (
                    cashbookData.data.map((row) => (
                      <TableRow key={row._id}>
                        <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{row.receiptNumber || row.transactionNumber}</TableCell>
                        <TableCell className="max-w-md">
                          <span className="font-medium text-gray-800">{row.description}</span>
                          {row.party?.name && <span className="block text-xs text-gray-500">Party: {row.party.name}</span>}
                        </TableCell>
                        <TableCell className="text-emerald-600 font-bold">
                          {row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-red-600 font-bold">
                          {row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-800">
                          ₹{row.runningBalance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 2: Bankbook */}
        {activeTab === 'bankbook' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Opening Bank Balance</span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  ₹{(bankbookData?.openingBalance || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Total Deposits (Inflow)</span>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{(bankbookData?.totalDeposits || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Total Withdrawals (Outflow)</span>
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  ₹{(bankbookData?.totalWithdrawals || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Closing Bank Balance</span>
                <h3 className="text-2xl font-bold text-blue-600 mt-1">
                  ₹{(bankbookData?.closingBalance || 0).toLocaleString()}
                </h3>
              </div>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Txn No</TableHeader>
                    <TableHeader>Channel</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Deposit (Inflow)</TableHeader>
                    <TableHeader>Withdrawal (Outflow)</TableHeader>
                    <TableHeader className="text-right">Balance</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!bankbookData?.data || bankbookData.data.length === 0) ? (
                    <TableEmpty colSpan={7} message="No bank transactions recorded for this period." />
                  ) : (
                    bankbookData.data.map((row) => (
                      <TableRow key={row._id}>
                        <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{row.transactionNumber}</TableCell>
                        <TableCell className="uppercase text-xs font-semibold text-primary-600">
                          {row.paymentMethod}
                        </TableCell>
                        <TableCell className="max-w-md">{row.description}</TableCell>
                        <TableCell className="text-emerald-600 font-bold">
                          {row.deposit > 0 ? `₹${row.deposit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-red-600 font-bold">
                          {row.withdrawal > 0 ? `₹${row.withdrawal.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-800">
                          ₹{row.runningBalance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 3: Vouchers */}
        {activeTab === 'vouchers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Payment & Receipt Vouchers</h3>
                <p className="text-sm text-gray-500">Official double-entry vouchers with audit trails and debit/credit matching.</p>
              </div>
              <Button variant="primary" onClick={() => setShowVoucherModal(true)}>
                <FiPlus className="w-4 h-4 mr-2" /> Add Voucher
              </Button>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Voucher No</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Debit Account</TableHeader>
                    <TableHeader>Credit Account</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Narration</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vouchers.length === 0 ? (
                    <TableEmpty colSpan={7} message="No account vouchers posted yet." />
                  ) : (
                    vouchers.map((v) => (
                      <TableRow key={v._id}>
                        <TableCell className="font-mono text-xs font-bold text-primary-600">{v.voucherNumber}</TableCell>
                        <TableCell className="uppercase text-xs font-semibold">
                          <span className={`px-2 py-0.5 rounded ${v.voucherType === 'payment' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {v.voucherType}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(v.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold text-gray-800">{v.debitAccount}</TableCell>
                        <TableCell className="font-semibold text-gray-800">{v.creditAccount}</TableCell>
                        <TableCell className="font-bold text-gray-800">₹{(v.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-sm">{v.narration}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 4: Income & Expenditure (P&L) */}
        {activeTab === 'pl' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Total School Revenues</span>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{(incomeExpData?.summary?.totalIncome || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Total Operating Expenditures</span>
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  ₹{(incomeExpData?.summary?.totalExpenditure || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Net Operating Surplus / (Deficit)</span>
                <h3 className={`text-2xl font-bold mt-1 ${incomeExpData?.summary?.isSurplus ? 'text-primary-600' : 'text-red-700'}`}>
                  ₹{(incomeExpData?.summary?.netSurplus || 0).toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Income */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-3 border-b pb-2 flex justify-between">
                  <span>Revenue Heads (Income)</span>
                  <span className="text-emerald-600">₹{(incomeExpData?.summary?.totalIncome || 0).toLocaleString()}</span>
                </h4>
                <div className="space-y-2">
                  {(incomeExpData?.incomeBreakdown || []).map((i) => (
                    <div key={i.category} className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                      <span className="text-gray-600">{i.label}</span>
                      <span className="font-semibold text-gray-800">₹{i.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expenditure */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-3 border-b pb-2 flex justify-between">
                  <span>Operating Expenditures</span>
                  <span className="text-red-600">₹{(incomeExpData?.summary?.totalExpenditure || 0).toLocaleString()}</span>
                </h4>
                <div className="space-y-2">
                  {(incomeExpData?.expenseBreakdown || []).map((e) => (
                    <div key={e.category} className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                      <span className="text-gray-600">{e.label}</span>
                      <span className="font-semibold text-gray-800">₹{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Vendors */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Vendor & Supplier Directory</h3>
                <p className="text-sm text-gray-500">Manage school suppliers for books, stationery, uniforms, transport, and maintenance.</p>
              </div>
              <Button variant="primary" onClick={() => setShowVendorModal(true)}>
                <FiPlus className="w-4 h-4 mr-2" /> Add Vendor
              </Button>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Vendor Name</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Contact Person</TableHeader>
                    <TableHeader>Phone</TableHeader>
                    <TableHeader>GSTIN</TableHeader>
                    <TableHeader className="text-right">Balance</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendors.length === 0 ? (
                    <TableEmpty colSpan={6} message="No vendors registered yet." />
                  ) : (
                    vendors.map((ven) => (
                      <TableRow key={ven._id}>
                        <TableCell className="font-bold text-gray-800">{ven.name}</TableCell>
                        <TableCell className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {ven.category}
                        </TableCell>
                        <TableCell>{ven.contactPerson || 'N/A'}</TableCell>
                        <TableCell>{ven.phone}</TableCell>
                        <TableCell className="font-mono text-xs">{ven.gstin || 'Unregistered'}</TableCell>
                        <TableCell className="text-right font-bold text-gray-800">
                          ₹{(ven.balance || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Modal: Post Voucher */}
        {showVoucherModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Post Account Voucher</h3>
              <form onSubmit={handleCreateVoucher} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Voucher Type</label>
                    <select
                      value={voucherForm.voucherType}
                      onChange={(e) => setVoucherForm({ ...voucherForm, voucherType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="payment">Payment Voucher</option>
                      <option value="receipt">Receipt Voucher</option>
                      <option value="journal">Journal Voucher</option>
                      <option value="contra">Contra Voucher</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={voucherForm.amount}
                      onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Debit Account</label>
                    <input
                      type="text"
                      required
                      value={voucherForm.debitAccount}
                      onChange={(e) => setVoucherForm({ ...voucherForm, debitAccount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Credit Account</label>
                    <input
                      type="text"
                      required
                      value={voucherForm.creditAccount}
                      onChange={(e) => setVoucherForm({ ...voucherForm, creditAccount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Narration / Particulars</label>
                  <textarea
                    required
                    rows="2"
                    placeholder="Enter reason and description for this entry"
                    value={voucherForm.narration}
                    onChange={(e) => setVoucherForm({ ...voucherForm, narration: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowVoucherModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Post Voucher
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Vendor */}
        {showVendorModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Register Vendor / Supplier</h3>
              <form onSubmit={handleCreateVendor} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Vendor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oxford Book Depot, Apex Sports"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={vendorForm.contactPerson}
                      onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      required
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category</label>
                    <select
                      value={vendorForm.category}
                      onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="stationery">Stationery</option>
                      <option value="books">Books & Library</option>
                      <option value="lab_supplies">Science Lab Supplies</option>
                      <option value="uniform">Uniforms</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="catering_mess">Hostel Mess / Food</option>
                      <option value="transport_fuel">Transport / Fuel</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={vendorForm.gstin}
                      onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowVendorModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Register Vendor
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AccountingLedger;
