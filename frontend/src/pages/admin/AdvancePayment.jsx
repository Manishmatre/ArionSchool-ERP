import { TbCurrencyRupee } from 'react-icons/tb';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCheck, FiX, FiClock, FiPlus } from 'react-icons/fi';
import { getAllAdvances, approveAdvance, payAdvance, requestAdvance } from '../../api/advancePaymentApi';
import { getAllStaff } from '../../api/staffApi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SelectField,
  Button, Modal, TextField, TextArea,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  Badge,
} from '../../components/ui';

const STATUS_VARIANT = {
  paid: 'success',
  approved: 'primary',
  rejected: 'danger',
  deducted: 'primary',
  pending: 'warning',
};

const AdvancePayment = () => {
  const [advances, setAdvances] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({ staffId: '', amount: '', reason: '', installments: 1 });

  useEffect(() => {
    fetchAdvances();
    fetchStaff();
  }, [statusFilter]);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await getAllAdvances(params);
      setAdvances(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch advances');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff({ status: 'active' });
      setStaff(data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestAdvance(formData);
      toast.success('Advance request submitted successfully');
      setShowModal(false);
      setFormData({ staffId: '', amount: '', reason: '', installments: 1 });
      fetchAdvances();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveAdvance(id, { status: 'approved', remarks: 'Approved' });
      toast.success('Advance approved successfully');
      fetchAdvances();
    } catch (error) {
      toast.error('Failed to approve advance');
    }
  };

  const handleReject = async (id) => {
    try {
      await approveAdvance(id, { status: 'rejected', remarks: 'Rejected' });
      toast.success('Advance rejected');
      fetchAdvances();
    } catch (error) {
      toast.error('Failed to reject advance');
    }
  };

  const handlePay = async (id) => {
    try {
      await payAdvance(id, { paymentMode: 'bank_transfer', transactionId: `TXN${Date.now()}` });
      toast.success('Advance paid successfully');
      fetchAdvances();
    } catch (error) {
      toast.error('Failed to pay advance');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Advance Payments"
          subtitle="Manage staff advance payment requests"
          icon={TbCurrencyRupee}
          actions={<Button icon={FiPlus} onClick={() => { setFormData({ staffId: '', amount: '', reason: '', installments: 1 }); setShowModal(true); }}>New Request</Button>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending" tone="amber" icon={FiClock} value={advances.filter((a) => a.status === 'pending').length} />
          <StatCard title="Approved" tone="info" icon={FiCheck} value={advances.filter((a) => a.status === 'approved').length} />
          <StatCard title="Paid" tone="success" icon={TbCurrencyRupee} value={advances.filter((a) => a.status === 'paid').length} />
          <StatCard title="Rejected" tone="danger" icon={FiX} value={advances.filter((a) => a.status === 'rejected').length} />
        </div>

        <FilterBar>
          <FilterBarActions className="w-full sm:w-auto">
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[150px]">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="deducted">Deducted</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        {loading ? (
          <PageLoading message="Loading advances..." />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Staff</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Reason</TableHeader>
                  <TableHeader>Installments</TableHeader>
                  <TableHeader>Remaining</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {advances.length === 0 ? (
                  <TableEmpty colSpan={7} title="No advance requests found" />
                ) : (
                  advances.map((advance) => (
                    <TableRow key={advance._id}>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-900">
                          {advance.staff?.personalInfo?.firstName} {advance.staff?.personalInfo?.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{advance.staff?.staffId}</div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">₹{advance.amount.toLocaleString()}</TableCell>
                      <TableCell className="!whitespace-normal max-w-xs">{advance.reason}</TableCell>
                      <TableCell>{advance.deductionSchedule?.installments || 1}</TableCell>
                      <TableCell className="text-amber-600">₹{advance.remainingAmount.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[advance.status] || 'neutral'} className="capitalize">{advance.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {advance.status === 'pending' && (
                            <>
                              <Button variant="success" className="!px-3 !py-1 !text-xs" onClick={() => handleApprove(advance._id)}>Approve</Button>
                              <Button variant="danger" className="!px-3 !py-1 !text-xs" onClick={() => handleReject(advance._id)}>Reject</Button>
                            </>
                          )}
                          {advance.status === 'approved' && (
                            <Button className="!px-3 !py-1 !text-xs" onClick={() => handlePay(advance._id)}>Pay Now</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Request Advance Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" form="advance-form">Submit</Button>
          </>
        }
      >
        <form id="advance-form" onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="Staff" required value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}>
            <option value="">Select Staff</option>
            {staff.map((member) => (
              <option key={member._id} value={member._id}>
                {member.personalInfo?.firstName} {member.personalInfo?.lastName}
              </option>
            ))}
          </SelectField>
          <TextField label="Amount" type="number" required min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
          <TextArea label="Reason" required rows={3} value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
          <TextField label="Installments" type="number" min="1" max="12" value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: e.target.value })} />
        </form>
      </Modal>
    </Layout>
  );
};

export default AdvancePayment;
