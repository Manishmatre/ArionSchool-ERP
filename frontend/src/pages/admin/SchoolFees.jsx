import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiDollarSign, FiList, FiAlertTriangle, FiAward,
  FiCalendar, FiPlus, FiPrinter, FiSearch, FiCheck, FiFilter
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import schoolFeeApi from '../../api/schoolFeeApi';
import academicApi from '../../api/academicApi';
import RazorpayFeeModal from '../../components/payments/RazorpayFeeModal';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton
} from '../../components/ui';

const SchoolFees = ({ defaultTab = 'structures' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Masters
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Data
  const [structures, setStructures] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [dailyReport, setDailyReport] = useState(null);

  // Modals & Forms
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showConcessionModal, setShowConcessionModal] = useState(false);

  // Collect Fee State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFees, setSelectedStudentFees] = useState(null);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [razorpayTargetStudent, setRazorpayTargetStudent] = useState(null);
  const [razorpayTargetAmount, setRazorpayTargetAmount] = useState(0);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    remarks: '',
    applyLateFine: 0
  });

  // Structure Form
  const [structureForm, setStructureForm] = useState({
    schoolClass: '',
    academicSession: '',
    frequency: 'quarterly',
    components: {
      tuitionFee: 0,
      admissionFee: 0,
      annualCharges: 0,
      labFee: 0,
      libraryFee: 0,
      sportsFee: 0
    },
    lateFine: {
      graceDays: 10,
      amount: 50
    }
  });

  useEffect(() => {
    loadMasters();
    loadTabContent();
  }, [activeTab]);

  const loadMasters = async () => {
    try {
      const [clsRes, sessRes] = await Promise.all([
        academicApi.getClasses(),
        academicApi.getSessions()
      ]);
      setClasses(clsRes?.data?.data || []);
      setSessions(sessRes?.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'structures') {
        const res = await schoolFeeApi.getStructures();
        setStructures(res?.data?.data || []);
      } else if (activeTab === 'defaulters') {
        const res = await schoolFeeApi.getDefaulters();
        setDefaulters(res?.data?.data || []);
      } else if (activeTab === 'daily') {
        const res = await schoolFeeApi.getDailyReport();
        setDailyReport(res?.data || null);
      }
    } catch (err) {
      toast.error('Failed to load fee information');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    try {
      await schoolFeeApi.saveStructure(structureForm);
      toast.success('Class fee structure saved successfully');
      setShowStructureModal(false);
      loadTabContent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error saving structure');
    }
  };

  const handleSearchStudent = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await schoolFeeApi.getStudentFees(searchQuery.trim());
      setSelectedStudentFees(res?.data?.data || null);
      if (res?.data?.data?.summary?.totalPending) {
        setPaymentForm((prev) => ({ ...prev, amount: res.data.data.summary.totalPending }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Student not found or no fees due');
      setSelectedStudentFees(null);
    }
  };

  const handleCollectPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudentFees?.student?._id) return;
    try {
      const res = await schoolFeeApi.collectFee({
        studentId: selectedStudentFees.student._id,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        remarks: paymentForm.remarks,
        applyLateFine: Number(paymentForm.applyLateFine || 0)
      });
      toast.success(res?.data?.message || 'Payment recorded and receipt generated!');
      setShowCollectModal(false);
      // Reload student fee summary
      await handleSearchStudent();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record fee payment');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="School Fee Management"
          subtitle="Configure class fee structures, collect student fees, issue receipts, and track defaulters."
        >
          <div className="flex items-center space-x-3">
            <Button variant="primary" onClick={() => setShowCollectModal(true)}>
              <TbCurrencyRupee className="w-4 h-4 mr-1 text-emerald-300" />
              Collect Fee Payment
            </Button>
          </div>
        </PageHeader>

        {/* Tab Navigation */}
        <SubNavTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'structures', label: 'Class Fee Structures', icon: FiList, badge: structures.length },
            { id: 'defaulters', label: 'Fee Defaulters Register', icon: FiAlertTriangle, badge: defaulters.length },
            { id: 'daily', label: 'Daily Collection Register', icon: FiCalendar }
          ]}
        />

        {/* Tab 1: Class Fee Structures */}
        {activeTab === 'structures' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Class-Wise Fee Schedules</h3>
                <p className="text-sm text-gray-500">Configure Tuition, Lab, Library, Sports, and Annual fee heads by grade.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setStructureForm({
                    schoolClass: classes[0]?._id || '',
                    academicSession: sessions[0]?._id || '',
                    frequency: 'quarterly',
                    components: {
                      tuitionFee: 5000,
                      admissionFee: 2000,
                      annualCharges: 3000,
                      labFee: 1000,
                      libraryFee: 500,
                      sportsFee: 500
                    },
                    lateFine: { graceDays: 10, amount: 50 }
                  });
                  setShowStructureModal(true);
                }}
              >
                <FiPlus className="w-4 h-4 mr-2" /> Add Fee Structure
              </Button>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Class / Grade</TableHeader>
                    <TableHeader>Session</TableHeader>
                    <TableHeader>Frequency</TableHeader>
                    <TableHeader>Tuition Fee</TableHeader>
                    <TableHeader>Annual Charges</TableHeader>
                    <TableHeader>Lab / Library / Sports</TableHeader>
                    <TableHeader>Total Schedule</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {structures.length === 0 ? (
                    <TableEmpty colSpan={8} message="No fee structures configured yet." />
                  ) : (
                    structures.map((s) => {
                      const c = s.components || {};
                      const otherTotal = (c.labFee || 0) + (c.libraryFee || 0) + (c.sportsFee || 0);
                      return (
                        <TableRow key={s._id}>
                          <TableCell className="font-bold text-gray-800">
                            {s.schoolClass?.name || 'All Classes'}
                          </TableCell>
                          <TableCell>{s.academicSession?.sessionName || 'Current'}</TableCell>
                          <TableCell className="capitalize">{s.frequency || 'Quarterly'}</TableCell>
                          <TableCell>₹{(c.tuitionFee || 0).toLocaleString()}</TableCell>
                          <TableCell>₹{(c.annualCharges || 0).toLocaleString()}</TableCell>
                          <TableCell>₹{otherTotal.toLocaleString()}</TableCell>
                          <TableCell className="font-bold text-emerald-600">
                            ₹{(s.totalFee || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded font-medium">Active</span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 2: Defaulters Register */}
        {activeTab === 'defaulters' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center space-x-3">
              <FiAlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-800 text-sm">Automated Fee Defaulter Tracking</h4>
                <p className="text-xs text-amber-700">
                  Students listed here have overdue fee obligations past the grace cutoff. Click Collect to record dues or send instant WhatsApp reminders.
                </p>
              </div>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Student Name</TableHeader>
                    <TableHeader>Admission / Roll No</TableHeader>
                    <TableHeader>Class & Section</TableHeader>
                    <TableHeader>Pending Amount</TableHeader>
                    <TableHeader>Days Overdue</TableHeader>
                    <TableHeader className="text-right">Action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {defaulters.length === 0 ? (
                    <TableEmpty colSpan={6} message="Great news! No overdue fee defaulters found." />
                  ) : (
                    defaulters.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold text-gray-800">
                          {item.student?.personalInfo?.firstName} {item.student?.personalInfo?.lastName}
                          <div className="text-xs text-gray-500 font-normal">
                            Phone: {item.student?.contactInfo?.mobile || item.student?.guardianInfo?.mobile || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.student?.admissionNumber || item.student?.studentId}
                          {item.student?.rollNumber && <span className="text-gray-400"> (Roll: {item.student?.rollNumber})</span>}
                        </TableCell>
                        <TableCell>
                          {item.student?.schoolClass?.name || 'Class'} {item.student?.section?.name ? `- ${item.student?.section?.name}` : ''}
                        </TableCell>
                        <TableCell className="font-bold text-red-600">
                          ₹{(item.totalPending || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                            {item.daysOverdue} days
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              className="text-xs text-primary-600 border-primary-300 hover:bg-primary-50"
                              onClick={() => {
                                setRazorpayTargetStudent(item.student);
                                setRazorpayTargetAmount(item.totalPending);
                                setShowRazorpayModal(true);
                              }}
                            >
                              Pay Online
                            </Button>
                            <Button
                              variant="primary"
                              onClick={() => {
                                setSelectedStudentFees({ student: item.student });
                                setPaymentForm({
                                  amount: item.totalPending,
                                  paymentMethod: 'cash',
                                  remarks: 'Defaulter fee clearance',
                                  applyLateFine: 0
                                });
                                setShowCollectModal(true);
                              }}
                            >
                              Collect
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Tab 3: Daily Collection Register */}
        {activeTab === 'daily' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Total Collected Today</span>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{(dailyReport?.totalCollected || 0).toLocaleString()}
                </h3>
                <span className="text-xs text-gray-500">{dailyReport?.count || 0} receipts issued</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Cash Collections</span>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  ₹{(dailyReport?.byPaymentMethod?.cash || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">UPI / Online / QR</span>
                <h3 className="text-2xl font-bold text-blue-600 mt-1">
                  ₹{((dailyReport?.byPaymentMethod?.upi || 0) + (dailyReport?.byPaymentMethod?.online || 0)).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-400">Cheque / Bank Transfer</span>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">
                  ₹{((dailyReport?.byPaymentMethod?.cheque || 0) + (dailyReport?.byPaymentMethod?.bank_transfer || 0)).toLocaleString()}
                </h3>
              </div>
            </div>

            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Receipt No</TableHeader>
                    <TableHeader>Student</TableHeader>
                    <TableHeader>Class</TableHeader>
                    <TableHeader>Method</TableHeader>
                    <TableHeader>Amount Paid</TableHeader>
                    <TableHeader>Collected By</TableHeader>
                    <TableHeader className="text-right">Action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!dailyReport?.receipts || dailyReport.receipts.length === 0) ? (
                    <TableEmpty colSpan={7} message="No fee collections recorded for today yet." />
                  ) : (
                    dailyReport.receipts.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="font-mono text-xs font-bold text-primary-600">
                          {r.receiptNumber}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-800">
                          {r.student?.personalInfo?.firstName} {r.student?.personalInfo?.lastName}
                        </TableCell>
                        <TableCell>{r.schoolClass?.name || 'Class'}</TableCell>
                        <TableCell className="uppercase text-xs font-semibold">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{r.paymentMethod}</span>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">
                          ₹{(r.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{r.collectedBy?.name || 'Admin'}</TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => window.print()}
                            className="p-1.5 text-gray-500 hover:text-primary-600"
                            title="Print Receipt"
                          >
                            <FiPrinter className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>
        )}

        {/* Modal: Collect Fee Payment */}
        {showCollectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Collect Fee & Issue Receipt</h3>
              <p className="text-xs text-gray-500 mb-4">Search student by ID or Admission Number to record payment.</p>

              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="Enter Student ID / Admission Number / Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
                <Button variant="primary" onClick={handleSearchStudent}>
                  <FiSearch className="w-4 h-4 mr-1" /> Search
                </Button>
              </div>

              {selectedStudentFees && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-gray-800">
                        {selectedStudentFees.student?.fullName || selectedStudentFees.student?.personalInfo?.firstName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Class: {selectedStudentFees.student?.schoolClass?.name || 'N/A'} | Adm No: {selectedStudentFees.student?.admissionNumber || selectedStudentFees.student?.studentId}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 uppercase font-semibold">Total Pending</span>
                      <h4 className="text-lg font-bold text-red-600">
                        ₹{(selectedStudentFees.summary?.totalPending || paymentForm.amount || 0).toLocaleString()}
                      </h4>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleCollectPayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Payment Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Payment Mode</label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="cash">Cash (Counter)</option>
                      <option value="upi">UPI / QR Code</option>
                      <option value="online">Online Payment (Razorpay)</option>
                      <option value="cheque">Cheque</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="card">Debit / Credit Card</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Remarks / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Q1 Tuition fee clearance"
                    value={paymentForm.remarks}
                    onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowCollectModal(false)}>
                    Cancel
                  </Button>
                  {paymentForm.paymentMethod === 'online' ? (
                    <Button
                      variant="primary"
                      type="button"
                      disabled={!selectedStudentFees}
                      onClick={() => {
                        setRazorpayTargetStudent(selectedStudentFees.student);
                        setRazorpayTargetAmount(Number(paymentForm.amount));
                        setShowCollectModal(false);
                        setShowRazorpayModal(true);
                      }}
                    >
                      Open Razorpay Checkout
                    </Button>
                  ) : (
                    <Button variant="primary" type="submit" disabled={!selectedStudentFees}>
                      Record Payment & Issue Receipt
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Class Fee Structure */}
        {showStructureModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Configure Class Fee Structure</h3>
              <p className="text-xs text-gray-500 mb-4">Set fee schedule and components for a school grade.</p>

              <form onSubmit={handleSaveStructure} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Class / Grade</label>
                    <select
                      required
                      value={structureForm.schoolClass}
                      onChange={(e) => setStructureForm({ ...structureForm, schoolClass: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Grade</option>
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Frequency</label>
                    <select
                      value={structureForm.frequency}
                      onChange={(e) => setStructureForm({ ...structureForm, frequency: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="half_yearly">Half Yearly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fee Components (₹)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Tuition Fee</label>
                      <input
                        type="number"
                        value={structureForm.components.tuitionFee}
                        onChange={(e) => setStructureForm({
                          ...structureForm,
                          components: { ...structureForm.components, tuitionFee: Number(e.target.value) }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Annual Charges</label>
                      <input
                        type="number"
                        value={structureForm.components.annualCharges}
                        onChange={(e) => setStructureForm({
                          ...structureForm,
                          components: { ...structureForm.components, annualCharges: Number(e.target.value) }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Lab Fee</label>
                      <input
                        type="number"
                        value={structureForm.components.labFee}
                        onChange={(e) => setStructureForm({
                          ...structureForm,
                          components: { ...structureForm.components, labFee: Number(e.target.value) }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Library Fee</label>
                      <input
                        type="number"
                        value={structureForm.components.libraryFee}
                        onChange={(e) => setStructureForm({
                          ...structureForm,
                          components: { ...structureForm.components, libraryFee: Number(e.target.value) }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowStructureModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Save Fee Structure
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Razorpay Online Payment Checkout Modal */}
        <RazorpayFeeModal
          isOpen={showRazorpayModal}
          onClose={() => setShowRazorpayModal(false)}
          student={razorpayTargetStudent}
          amountToPay={razorpayTargetAmount}
          onPaymentSuccess={() => {
            loadTabContent();
            setShowRazorpayModal(false);
          }}
        />
      </div>
    </Layout>
  );
};

export default SchoolFees;
