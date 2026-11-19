import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { FiTrash2, FiEye, FiUserCheck, FiClock, FiCheckCircle, FiXCircle, FiUserPlus } from 'react-icons/fi';
import { getAllAdmissions, deleteAdmission, updateAdmission, addNote, getAdmissionStats } from '../../api/admissionApi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, Modal, TextArea, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  Badge, IconButton,
} from '../../components/ui';

const STATUS_VARIANT = {
  pending: 'warning',
  contacted: 'primary',
  verified: 'primary',
  approved: 'success',
  rejected: 'danger',
  enrolled: 'success',
};

const PRIORITY_VARIANT = { low: 'neutral', medium: 'warning', high: 'danger' };

const ManageAdmissions = () => {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [admissionsRes, statsRes] = await Promise.all([
        getAllAdmissions({ limit: 100 }).catch(() => ({ data: [] })),
        getAdmissionStats().catch(() => ({ data: {} }))
      ]);
      setAdmissions(admissionsRes.data || []);
      setStats(statsRes.data || null);
    } catch (error) {
      toast.error('Failed to fetch admissions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmissions = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await getAllAdmissions({ limit: 100 });
      setAdmissions(data.data || []);
    } catch (error) {
      if (!silent) toast.error('Failed to fetch admissions');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getAdmissionStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admission application?')) return;
    try {
      await deleteAdmission(id);
      toast.success('Admission deleted successfully');
      setAdmissions(prev => prev.filter(a => a._id !== id));
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete admission');
      console.error(error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateAdmission(id, { status: newStatus });
      toast.success('Status updated successfully');
      setAdmissions(prev => prev.map(a => a._id === id ? { ...a, status: newStatus } : a));
      fetchStats();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const handlePriorityChange = async (id, newPriority) => {
    try {
      await updateAdmission(id, { priority: newPriority });
      toast.success('Priority updated successfully');
      setAdmissions(prev => prev.map(a => a._id === id ? { ...a, priority: newPriority } : a));
      fetchStats();
    } catch (error) {
      toast.error('Failed to update priority');
      console.error(error);
    }
  };

  const handleAddNote = async (id) => {
    if (!noteText.trim()) {
      toast.error('Please enter a note');
      return;
    }
    try {
      await addNote(id, { note: noteText });
      toast.success('Note added successfully');
      setNoteText('');
      fetchAdmissions();
      if (selectedAdmission?._id === id) {
        setSelectedAdmission(admissions.find((a) => a._id === id));
      }
    } catch (error) {
      toast.error('Failed to add note');
      console.error(error);
    }
  };

  const openDetailsModal = (admission) => {
    setSelectedAdmission(admission);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedAdmission(null);
    setNoteText('');
  };

  const filteredAdmissions = useMemo(() => {
    return admissions.filter((admission) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        admission.fullName?.toLowerCase().includes(q) ||
        admission.email?.toLowerCase().includes(q) ||
        admission.phone?.includes(searchTerm) ||
        admission.course?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || admission.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [admissions, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAdmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmissions = filteredAdmissions.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => setCurrentPage(page);
  const handleItemsPerPageChange = (n) => {
    setItemsPerPage(n);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Manage Admissions" subtitle="View and manage all student admissions" icon={FiUserCheck} />
        <PageLoading message="Loading admissions..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Manage Admissions"
          subtitle="View and manage all student admissions"
          icon={FiUserCheck}
          actions={<Button icon={FiUserPlus} onClick={() => navigate('/admin/students/add')}>New Admission</Button>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Applications" tone="info" icon={FiUserCheck} value={stats?.total || 0} />
          <StatCard title="Today" tone="success" icon={FiClock} value={stats?.today || 0} />
          <StatCard title="This Week" tone="purple" icon={FiCheckCircle} value={stats?.thisWeek || 0} />
          <StatCard title="This Month" tone="amber" icon={FiCheckCircle} value={stats?.thisMonth || 0} />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone, or course..."
          />
          <FilterBarActions>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[140px]">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="verified">Verified</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="enrolled">Enrolled</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Applicant</TableHeader>
                <TableHeader>Contact</TableHeader>
                <TableHeader>Course</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Priority</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginatedAdmissions.length === 0 ? (
                <TableEmpty colSpan={8} title="No admission applications found" />
              ) : (
                paginatedAdmissions.map((admission) => (
                  <TableRow key={admission._id}>
                    <TableCell className="font-medium text-slate-900">{admission.fullName}</TableCell>
                    <TableCell className="!whitespace-normal">
                      <div className="text-slate-800">{admission.email}</div>
                      <div className="text-xs text-slate-500">{admission.phone}</div>
                    </TableCell>
                    <TableCell className="!whitespace-normal">{admission.course}</TableCell>
                    <TableCell className="!whitespace-normal">
                      <div className="text-slate-800">{admission.city}{admission.state ? `, ${admission.state}` : ''}</div>
                      <div className="text-xs text-slate-500">{admission.center}</div>
                    </TableCell>
                    <TableCell>
                      <select
                        value={admission.status}
                        onChange={(e) => handleStatusChange(admission._id, e.target.value)}
                        className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500 cursor-pointer capitalize"
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="verified">Verified</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="enrolled">Enrolled</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        value={admission.priority}
                        onChange={(e) => handlePriorityChange(admission._id, e.target.value)}
                        className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500 cursor-pointer capitalize"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-slate-500">{new Date(admission.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <IconButton icon={FiEye} variant="primary" title="View Details" onClick={() => openDetailsModal(admission)} />
                        <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(admission._id)} />
                      </div>
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
            totalItems={filteredAdmissions.length}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </TableWrapper>
      </div>

      <Modal
        open={showDetailsModal && !!selectedAdmission}
        onClose={closeDetailsModal}
        title="Admission Details"
        size="lg"
        footer={<Button variant="secondary" onClick={closeDetailsModal}>Close</Button>}
      >
        {selectedAdmission && (
          <div className="space-y-6">
            <div>
              <h3 className="section-title mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['Full Name', selectedAdmission.fullName],
                  ['Email', selectedAdmission.email],
                  ['Phone', selectedAdmission.phone],
                  ['Course', selectedAdmission.course],
                  ['City', selectedAdmission.city],
                  ['State', selectedAdmission.state],
                ].map(([label, value]) => (
                  <div key={label}>
                    <label className="text-xs text-slate-500">{label}</label>
                    <p className="text-slate-900 font-medium">{value || '—'}</p>
                  </div>
                ))}
                <div className="col-span-full">
                  <label className="text-xs text-slate-500">Preferred Center</label>
                  <p className="text-slate-900">{selectedAdmission.center || '—'}</p>
                </div>
                {selectedAdmission.message && (
                  <div className="col-span-full">
                    <label className="text-xs text-slate-500">Message</label>
                    <p className="text-slate-900">{selectedAdmission.message}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="section-title mb-3">Status Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Current Status</label>
                  <div className="mt-1"><Badge variant={STATUS_VARIANT[selectedAdmission.status] || 'neutral'} className="capitalize">{selectedAdmission.status}</Badge></div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Priority</label>
                  <div className="mt-1"><Badge variant={PRIORITY_VARIANT[selectedAdmission.priority] || 'neutral'} className="capitalize">{selectedAdmission.priority}</Badge></div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Applied On</label>
                  <p className="text-slate-900">{new Date(selectedAdmission.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Last Updated</label>
                  <p className="text-slate-900">{new Date(selectedAdmission.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="section-title mb-3">Notes</h3>
              <TextArea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." />
              <Button className="mt-2" onClick={() => handleAddNote(selectedAdmission._id)}>Add Note</Button>
              <div className="space-y-2 mt-4">
                {selectedAdmission.notes && selectedAdmission.notes.length > 0 ? (
                  selectedAdmission.notes.map((note, index) => (
                    <div key={index} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-slate-900 text-sm">{note.note}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(note.date).toLocaleString()}{note.addedBy && ` • ${note.addedBy.name}`}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No notes yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default ManageAdmissions;
