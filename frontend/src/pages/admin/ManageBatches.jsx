import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { FiPlus, FiEye, FiEdit2, FiTrash2, FiUsers, FiCalendar, FiClock } from 'react-icons/fi';
import { getAllBatches, deleteBatch } from '../../api/batchApi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SelectField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton,
} from '../../components/ui';

const TIMING_COLOR = {
  Morning: 'bg-amber-100 text-amber-700',
  Afternoon: 'bg-orange-100 text-orange-700',
  Evening: 'bg-purple-100 text-purple-700',
  Weekend: 'bg-pink-100 text-pink-700',
};

const ManageBatches = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await getAllBatches(params);
      setBatches(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch batches');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await deleteBatch(id);
      toast.success('Batch deleted successfully');
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete batch');
    }
  };

  const totalPages = Math.ceil(batches.length / itemsPerPage);
  const paginated = batches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const addBatchAction = (
    <Button icon={FiPlus} onClick={() => navigate('/admin/batches/add')}>
      Add Batch
    </Button>
  );

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Batches" subtitle="Manage student batches and schedules" icon={FiCalendar} actions={addBatchAction} />
        <PageLoading message="Loading batches..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Batches"
          subtitle="Manage student batches and schedules"
          icon={FiCalendar}
          actions={addBatchAction}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Batches" tone="info" icon={FiCalendar} value={batches.length} />
          <StatCard title="Ongoing" tone="success" icon={FiClock} value={batches.filter((b) => b.status === 'ongoing').length} />
          <StatCard title="Upcoming" tone="amber" icon={FiCalendar} value={batches.filter((b) => b.status === 'upcoming').length} />
          <StatCard title="Total Students" tone="purple" icon={FiUsers} value={batches.reduce((sum, b) => sum + (b.currentStrength || 0), 0)} />
        </div>

        <FilterBar>
          <FilterBarActions className="w-full sm:w-auto sm:ml-auto">
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[150px]">
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Batch Details</TableHeader>
                <TableHeader>Course</TableHeader>
                <TableHeader>Trainer</TableHeader>
                <TableHeader>Duration</TableHeader>
                <TableHeader>Students</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableEmpty colSpan={7} title="No batches found" description="Create your first batch to get started." />
              ) : (
                paginated.map((batch) => (
                  <TableRow key={batch._id}>
                    <TableCell className="!whitespace-normal">
                      <button
                        onClick={() => navigate(`/admin/batches/${batch._id}`)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                      >
                        {batch.batchName}
                      </button>
                      <div className="text-xs text-slate-500">{batch.batchCode}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${TIMING_COLOR[batch.timing] || 'bg-slate-100 text-slate-700'}`}>
                          {batch.timing}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 capitalize">
                          {batch.mode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{batch.course?.title || 'N/A'}</TableCell>
                    <TableCell>{batch.trainer?.personalInfo?.firstName} {batch.trainer?.personalInfo?.lastName}</TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-700">
                        <div>{new Date(batch.startDate).toLocaleDateString()}</div>
                        <div className="text-slate-400">to</div>
                        <div>{new Date(batch.endDate).toLocaleDateString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900">{batch.currentStrength} / {batch.maxCapacity}</div>
                      <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, (batch.currentStrength / batch.maxCapacity) * 100)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={batch.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <IconButton icon={FiEye} variant="primary" title="View" onClick={() => navigate(`/admin/batches/${batch._id}`)} />
                        <IconButton icon={FiEdit2} variant="success" title="Edit" onClick={() => navigate(`/admin/batches/${batch._id}/edit`)} />
                        <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(batch._id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {batches.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={batches.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </TableWrapper>
      </div>
    </Layout>
  );
};

export default ManageBatches;
