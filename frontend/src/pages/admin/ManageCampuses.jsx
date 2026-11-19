import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiLayers, FiCheckCircle, FiPauseCircle, FiClock } from 'react-icons/fi';
import { getAllCampuses, deleteCampus, updateCampusStatus } from '../../api/campusApi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton, Badge,
} from '../../components/ui';

const ManageCampuses = () => {
  const navigate = useNavigate();
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchCampuses();
  }, []);

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const data = await getAllCampuses();
      setCampuses(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch school campuses');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this school campus?')) return;
    try {
      await deleteCampus(id);
      toast.success('School campus deleted successfully');
      fetchCampuses();
    } catch (error) {
      toast.error('Failed to delete campus');
      console.error(error);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateCampusStatus(id, newStatus);
      toast.success(`School campus ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchCampuses();
    } catch (error) {
      toast.error('Failed to update campus status');
      console.error(error);
    }
  };

  const filteredCampuses = campuses.filter((campus) => {
    const matchesSearch = (campus.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (campus.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campus.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCampuses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampuses = filteredCampuses.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => setCurrentPage(page);
  const handleItemsPerPageChange = (n) => {
    setItemsPerPage(n);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="School Campuses & Branches" subtitle="Manage all institutional campuses and branches" icon={FiLayers} />
        <PageLoading message="Loading school campuses..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="School Campuses & Branches"
          subtitle="Manage all institutional campuses and branches"
          icon={FiLayers}
          actions={<Button icon={FiPlus} onClick={() => navigate('/admin/campuses/add')}>Add School Campus</Button>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Campuses" tone="primary" icon={FiLayers} value={campuses.length} />
          <StatCard title="Active" tone="success" icon={FiCheckCircle} value={campuses.filter((c) => c.status === 'active').length} />
          <StatCard title="Inactive" tone="warning" icon={FiPauseCircle} value={campuses.filter((c) => c.status === 'inactive').length} />
          <StatCard title="Pending" tone="amber" icon={FiClock} value={campuses.filter((c) => c.status === 'pending').length} />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by school name or code..."
          />
          <FilterBarActions>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[140px]">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>School Campus</TableHeader>
                <TableHeader>Code</TableHeader>
                <TableHeader>Principal / Head</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Students</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginatedCampuses.length === 0 ? (
                <TableEmpty colSpan={8} title="No school campuses found" description="Try adjusting your filters or add a new school campus." />
              ) : (
                paginatedCampuses.map((campus) => (
                  <TableRow key={campus._id}>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/admin/campuses/${campus._id}`)}
                        className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
                      >
                        {campus.name}
                      </button>
                    </TableCell>
                    <TableCell><span className="font-mono text-slate-600">{campus.code}</span></TableCell>
                    <TableCell className="!whitespace-normal">
                      <div className="text-slate-800">{campus.owner?.name || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{campus.owner?.email || ''}</div>
                    </TableCell>
                    <TableCell>{campus.address?.city}{campus.address?.state ? `, ${campus.address.state}` : ''}</TableCell>
                    <TableCell>{campus.students?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={campus.isMainBranch ? 'primary' : 'neutral'}>
                        {campus.isMainBranch ? 'Main Campus' : 'Branch Campus'}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={campus.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant={campus.status === 'active' ? 'secondary' : 'success'}
                          className="!px-2.5 !py-1 !text-xs mr-1"
                          onClick={() => handleStatusToggle(campus._id, campus.status)}
                        >
                          {campus.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <IconButton icon={FiEye} variant="primary" title="View Details" onClick={() => navigate(`/admin/campuses/${campus._id}`)} />
                        <IconButton icon={FiEdit2} variant="success" title="Edit" onClick={() => navigate(`/admin/campuses/${campus._id}/edit`)} />
                        <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(campus._id)} />
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
            totalItems={filteredCampuses.length}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </TableWrapper>
      </div>
    </Layout>
  );
};

export default ManageCampuses;
