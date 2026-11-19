import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiDownload, FiUserCheck, FiUserX, FiUsers } from 'react-icons/fi';
import { getAllStaff, deleteStaff, updateStaffStatus } from '../../api/staffApi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton,
} from '../../components/ui';

const ManageStaff = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchStaff();
  }, [statusFilter, designationFilter]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (designationFilter !== 'all') params.designation = designationFilter;
      const data = await getAllStaff(params);
      setStaff(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch staff');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await deleteStaff(id);
      toast.success('Staff deleted successfully');
      fetchStaff();
    } catch (error) {
      toast.error('Failed to delete staff');
      console.error(error);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateStaffStatus(id, newStatus);
      toast.success(`Staff ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchStaff();
    } catch (error) {
      toast.error('Failed to update staff status');
      console.error(error);
    }
  };

  const filteredStaff = staff.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.personalInfo?.firstName?.toLowerCase().includes(searchLower) ||
      member.personalInfo?.lastName?.toLowerCase().includes(searchLower) ||
      member.staffId?.toLowerCase().includes(searchLower) ||
      member.contactInfo?.email?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => setCurrentPage(page);
  const handleItemsPerPageChange = (n) => {
    setItemsPerPage(n);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Staff & Faculty Directory" subtitle="View and manage all teachers, faculty, and administrative staff" icon={FiUsers} />
        <PageLoading message="Loading staff..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Staff & Faculty Directory"
          subtitle="View and manage all teachers, faculty, and administrative staff"
          icon={FiUsers}
          actions={
            <>
              <Button variant="secondary" icon={FiDownload}>Export</Button>
              <Button icon={FiPlus} onClick={() => navigate('/admin/staff/add')}>Add Staff</Button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Staff" tone="info" icon={FiUserCheck} value={staff.length} />
          <StatCard title="Active" tone="success" icon={FiUserCheck} value={staff.filter((s) => s.status === 'active').length} />
          <StatCard title="On Leave" tone="warning" icon={FiUserX} value={staff.filter((s) => s.status === 'on-leave').length} />
          <StatCard title="Inactive" tone="danger" icon={FiUserX} value={staff.filter((s) => s.status === 'inactive').length} />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, or email..."
          />
          <FilterBarActions>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[130px]">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on-leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </SelectField>
            <SelectField value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)} className="min-w-[150px]">
              <option value="all">All Designations</option>
              <option value="teacher">Teacher</option>
              <option value="counselor">Counselor</option>
              <option value="accountant">Accountant</option>
              <option value="receptionist">Receptionist</option>
              <option value="manager">Manager</option>
              <option value="coordinator">Coordinator</option>
              <option value="other">Other</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Staff ID</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Designation</TableHeader>
                <TableHeader>Contact</TableHeader>
                <TableHeader>Joining Date</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginatedStaff.length === 0 ? (
                <TableEmpty colSpan={7} title="No staff members found" description="Try adjusting your filters or add a new staff member." />
              ) : (
                paginatedStaff.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell><span className="font-mono text-slate-800">{member.staffId}</span></TableCell>
                    <TableCell className="!whitespace-normal">
                      <button
                        onClick={() => navigate(`/admin/staff/${member._id}`)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                      >
                        {member.personalInfo?.firstName} {member.personalInfo?.lastName}
                      </button>
                      <div className="text-xs text-slate-500">{member.franchise?.name}</div>
                    </TableCell>
                    <TableCell className="capitalize">{member.employmentDetails?.designation}</TableCell>
                    <TableCell className="!whitespace-normal">
                      <div className="text-slate-800">{member.contactInfo?.email}</div>
                      <div className="text-xs text-slate-500">{member.contactInfo?.mobile}</div>
                    </TableCell>
                    <TableCell>{member.employmentDetails?.joiningDate ? new Date(member.employmentDetails.joiningDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell><StatusBadge status={member.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant={member.status === 'active' ? 'secondary' : 'success'}
                          className="!px-2.5 !py-1 !text-xs mr-1"
                          onClick={() => handleStatusToggle(member._id, member.status)}
                        >
                          {member.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <IconButton icon={FiEye} variant="primary" title="View Details" onClick={() => navigate(`/admin/staff/${member._id}`)} />
                        <IconButton icon={FiEdit2} variant="success" title="Edit" onClick={() => navigate(`/admin/staff/${member._id}/edit`)} />
                        <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(member._id)} />
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
            totalItems={filteredStaff.length}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </TableWrapper>
      </div>
    </Layout>
  );
};

export default ManageStaff;
