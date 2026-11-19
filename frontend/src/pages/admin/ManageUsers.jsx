import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiUsers, FiUserCheck, FiUserX, FiShield } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  Badge,
} from '../../components/ui';

const ROLE_META = {
  super_admin: { label: 'Super Admin', variant: 'danger' },
  franchise_admin: { label: 'School Admin', variant: 'primary' },
  student: { label: 'Student', variant: 'neutral' },
};

const ManageUsers = () => {
  useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stats, setStats] = useState({
    totalUsers: 0, activeUsers: 0, inactiveUsers: 0, students: 0, franchiseAdmins: 0, superAdmins: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter, statusFilter]);

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage);

  const fetchUsers = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/users', { params });
      const allUsers = response.data.users;
      setUsers(allUsers);
      setStats({
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter((u) => u.isActive).length,
        inactiveUsers: allUsers.filter((u) => !u.isActive).length,
        students: allUsers.filter((u) => u.role === 'student').length,
        franchiseAdmins: allUsers.filter((u) => u.role === 'franchise_admin').length,
        superAdmins: allUsers.filter((u) => u.role === 'super_admin').length,
      });
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="Manage Users" subtitle="View and manage all users" icon={FiUsers} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" tone="info" icon={FiUsers} value={stats.totalUsers} subtitle="All registered users" />
          <StatCard title="Active Users" tone="success" icon={FiUserCheck} value={stats.activeUsers} subtitle="Currently active" />
          <StatCard title="Inactive Users" tone="danger" icon={FiUserX} value={stats.inactiveUsers} subtitle="Currently inactive" />
          <StatCard title="Admin Users" tone="purple" icon={FiShield} value={stats.franchiseAdmins + stats.superAdmins} subtitle="School & Super Admins" />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or mobile..."
          />
          <FilterBarActions>
            <SelectField value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="min-w-[150px]">
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="franchise_admin">School Admin</option>
              <option value="super_admin">Super Admin</option>
            </SelectField>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[130px]">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        {loading ? (
          <PageLoading message="Loading users..." />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Mobile</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>School</TableHeader>
                  <TableHeader>Status</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableEmpty colSpan={6} title="No users found" description="Try adjusting your filters." />
                ) : (
                  paginatedUsers.map((user) => {
                    const role = ROLE_META[user.role] || { label: user.role, variant: 'neutral' };
                    return (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium text-slate-900">{user.name}</TableCell>
                        <TableCell className="text-slate-600">{user.email}</TableCell>
                        <TableCell className="text-slate-600">{user.mobile || 'N/A'}</TableCell>
                        <TableCell><Badge variant={role.variant}>{role.label}</Badge></TableCell>
                        <TableCell className="text-slate-600">{user.franchise?.name || 'N/A'}</TableCell>
                        <TableCell><Badge variant={user.isActive ? 'success' : 'danger'}>{user.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={users.length}
              onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
            />
          </TableWrapper>
        )}
      </div>
    </Layout>
  );
};

export default ManageUsers;
