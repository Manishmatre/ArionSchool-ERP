import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiClock, FiCheckCircle, FiXCircle, FiList, FiPlus, FiTrash2, FiCheck, FiX, FiEdit2, FiGrid } from 'react-icons/fi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField, TextField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton, Modal, FormField,
} from '../../components/ui';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const ManageSeatRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAllocationModalOpen, setAllocationModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editRequestData, setEditRequestData] = useState({ id: null, requestedSeats: 0, status: '' });
  const [allocationData, setAllocationData] = useState({ courseId: '', franchiseId: '', seats: 0 });
  const [franchises, setFranchises] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [currentSeatInfo, setCurrentSeatInfo] = useState({ allocated: 0, filled: 0 });

  useEffect(() => {
    fetchRequests();
    fetchStats();
    fetchFranchises();
    fetchCourses();
  }, []);

  // Live updates without manual refresh (schools submit new requests).
  useAutoRefresh(
    () => {
      fetchRequests({ silent: true });
      fetchStats();
    },
    { interval: 25000, events: ['seat-request-created', 'seat-request-updated'] }
  );

  const fetchStats = async () => {
    try {
      const response = await api.get('/seat-requests/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchRequests = async ({ silent = false } = {}) => {
    try {
      const response = await api.get('/seat-requests');
      setRequests(response.data.data);
    } catch (error) {
      if (!silent) toast.error('Failed to fetch seat requests.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleUpdateRequest = async (id, status) => {
    try {
      await api.put(`/seat-requests/${id}`, { status });
      toast.success(`Request ${status}.`);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update request.');
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this seat request? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/seat-requests/${id}`);
      toast.success('Seat request deleted successfully.');
      fetchRequests();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete seat request.');
    }
  };

  const fetchFranchises = async () => {
    try {
      const response = await api.get('/campuses');
      setFranchises(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch schools.');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch courses.');
    }
  };

  useEffect(() => {
    if (allocationData.franchiseId) {
      const fetchFranchiseCourses = async () => {
        try {
          const response = await api.get(`/campuses/${allocationData.franchiseId}`);
          const franchiseDetails = response.data.data;
          const assignedCourses = [...(franchiseDetails.plan?.courseAccess || []), ...franchiseDetails.additionalCourses];
          setFilteredCourses(assignedCourses);
        } catch (error) {
          toast.error('Failed to fetch courses for the selected school.');
          setFilteredCourses([]);
        }
      };
      fetchFranchiseCourses();
    } else {
      setFilteredCourses([]);
    }
    setAllocationData(prev => ({ ...prev, courseId: '', seats: 0 }));
    setCurrentSeatInfo({ allocated: 0, filled: 0 });
  }, [allocationData.franchiseId]);

  useEffect(() => {
    if (allocationData.courseId && filteredCourses.length > 0) {
      const selectedCourse = filteredCourses.find(c => c._id === allocationData.courseId);
      if (selectedCourse) {
        const seatInfo = selectedCourse.franchiseSeats?.find(fs => fs.franchise.toString() === allocationData.franchiseId);
        const allocatedSeats = seatInfo ? seatInfo.seats : 0;
        const filledSeats = selectedCourse.filledSeats || 0;
        
        setAllocationData(prev => ({ ...prev, seats: allocatedSeats }));
        setCurrentSeatInfo({ allocated: allocatedSeats, filled: filledSeats });
      }
    } else {
      setCurrentSeatInfo({ allocated: 0, filled: 0 });
    }
  }, [allocationData.courseId, filteredCourses, allocationData.franchiseId]);

  const handleEditRequest = async (e) => {
    e.preventDefault();
    const { id, requestedSeats, status } = editRequestData;
    if (!id || requestedSeats <= 0) {
      toast.error('Please enter a valid number of seats.');
      return;
    }

    try {
      await api.put(`/seat-requests/${id}`, { requestedSeats, status });
      toast.success('Seat request updated successfully!');
      setEditModalOpen(false);
      fetchRequests();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update seat request.');
    }
  };

  const handleAllocateSeats = async (e) => {
    e.preventDefault();
    const { courseId, franchiseId, seats } = allocationData;
    if (!courseId || !franchiseId || seats < 0) {
      toast.error('Please select a course, a school, and enter a valid number of seats.');
      return;
    }

    try {
      await api.post(`/courses/${courseId}/allocate-seats`, { franchiseId, seats });
      toast.success('Seats allocated successfully!');
      setAllocationModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to allocate seats.');
    }
  };

  const filteredRequests = requests.filter(req => {
    const franchiseName = req.franchise?.name?.toLowerCase() || '';
    const courseTitle = req.course?.title?.toLowerCase() || '';
    const searchTermLower = searchTerm.toLowerCase();
    const statusMatch = statusFilter ? req.status === statusFilter : true;
    const searchMatch = franchiseName.includes(searchTermLower) || courseTitle.includes(searchTermLower);
    return statusMatch && searchMatch;
  });

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Manage Student Quotas & Capacity" subtitle="Review and approve student enrollment capacity and quota requests across school campuses" icon={FiGrid} />
        <PageLoading message="Loading seat requests..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader 
          title="Manage Student Quotas & Capacity" 
          subtitle="Review and approve student enrollment capacity and quota requests across school campuses"
          icon={FiGrid}
          actions={(
            <Button icon={FiPlus} onClick={() => setAllocationModalOpen(true)}>Allocate Quota</Button>
          )}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Requests" tone="info" icon={FiList} value={stats.total} />
          <StatCard title="Pending" tone="warning" icon={FiClock} value={stats.pending} />
          <StatCard title="Approved" tone="success" icon={FiCheckCircle} value={stats.approved} />
          <StatCard title="Rejected" tone="danger" icon={FiXCircle} value={stats.rejected} />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by school campus or class..."
          />
          <FilterBarActions>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[140px]">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>School Campus</TableHeader>
                <TableHeader>Class / Subject</TableHeader>
                <TableHeader>Requested Capacity</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Requested At</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableEmpty colSpan={6} title="No seat requests found" description="Try adjusting your search or filters." />
              ) : (
                filteredRequests.map(req => (
                  <TableRow key={req._id}>
                    <TableCell className="font-medium text-slate-800">{req.franchise?.name || 'N/A'}</TableCell>
                    <TableCell>{req.course?.title || 'N/A'}</TableCell>
                    <TableCell>{req.requestedSeats}</TableCell>
                    <TableCell><StatusBadge status={req.status} /></TableCell>
                    <TableCell>{new Date(req.requestedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {req.status === 'pending' && (
                          <>
                            <Button variant="success" className="!px-2.5 !py-1 !text-xs" icon={FiCheck} onClick={() => handleUpdateRequest(req._id, 'approved')}>Approve</Button>
                            <Button variant="danger" className="!px-2.5 !py-1 !text-xs" icon={FiX} onClick={() => handleUpdateRequest(req._id, 'rejected')}>Reject</Button>
                          </>
                        )}
                        {(req.status === 'pending' || req.status === 'approved') && (
                          <IconButton
                            icon={FiEdit2}
                            variant="primary"
                            title="Edit request"
                            onClick={() => {
                              setEditRequestData({ id: req._id, requestedSeats: req.requestedSeats, status: req.status });
                              setEditModalOpen(true);
                            }}
                          />
                        )}
                        <IconButton icon={FiTrash2} variant="danger" title="Delete seat request" onClick={() => handleDeleteRequest(req._id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>
      </div>

      <Modal
        open={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Seat Request"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="edit-seat-form">Save Changes</Button>
          </>
        )}
      >
        <form id="edit-seat-form" onSubmit={handleEditRequest} className="space-y-4">
          <FormField label="Number of Seats" required>
            <TextField
              type="number"
              min="1"
              value={editRequestData.requestedSeats}
              onChange={(e) => setEditRequestData({ ...editRequestData, requestedSeats: parseInt(e.target.value, 10) })}
              required
            />
          </FormField>
          <FormField label="Status">
            <SelectField
              value={editRequestData.status}
              onChange={(e) => setEditRequestData({ ...editRequestData, status: e.target.value })}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </SelectField>
          </FormField>
        </form>
      </Modal>

      <Modal
        open={isAllocationModalOpen}
        onClose={() => setAllocationModalOpen(false)}
        title="Allocate Student Quota Manually"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAllocationModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="allocate-seat-form">Allocate Quota</Button>
          </>
        )}
      >
        <form id="allocate-seat-form" onSubmit={handleAllocateSeats} className="space-y-4">
          <FormField label="School Campus" required>
            <SelectField
              value={allocationData.franchiseId}
              onChange={(e) => setAllocationData({ ...allocationData, franchiseId: e.target.value })}
              required
            >
              <option value="">Select a school campus</option>
              {franchises.map(franchise => (
                <option key={franchise._id} value={franchise._id}>{franchise.name}</option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="Class / Course" required>
            <SelectField
              value={allocationData.courseId}
              onChange={(e) => setAllocationData({ ...allocationData, courseId: e.target.value })}
              required
              disabled={!allocationData.franchiseId}
            >
              <option value="">Select a course</option>
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => {
                  const seatInfo = course.franchiseSeats?.find(fs => fs.franchise.toString() === allocationData.franchiseId);
                  const allocated = seatInfo ? seatInfo.seats : 0;
                  const filled = course.filledSeats || 0;
                  const available = allocated - filled;
                  return (
                    <option key={course._id} value={course._id}>
                      {course.title} (Available: {available} / Allocated: {allocated})
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>Select a school first</option>
              )}
            </SelectField>
          </FormField>
          <FormField label="New Total Allocated Seats" required>
            <TextField
              type="number"
              min="0"
              value={allocationData.seats}
              onChange={(e) => setAllocationData({ ...allocationData, seats: parseInt(e.target.value, 10) })}
              required
            />
          </FormField>
        </form>
      </Modal>
    </Layout>
  );
};

export default ManageSeatRequests;
