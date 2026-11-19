import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { FiPlus, FiVideo, FiCalendar, FiUsers, FiClock, FiEdit2, FiTrash2, FiPlay, FiSquare, FiEye } from 'react-icons/fi';
import { getAllOnlineClasses, deleteOnlineClass, startOnlineClass, endOnlineClass } from '../../api/onlineClassApi';
import { getCourses } from '../../api/courseApi';
import { getAllStaff } from '../../api/staffApi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton,
} from '../../components/ui';

const ManageOnlineClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, coursesRes, staffRes] = await Promise.all([
        getAllOnlineClasses(),
        getCourses(),
        getAllStaff()
      ]);
      
      setClasses(classesRes.data || []);
      setCourses(coursesRes.data || []);
      setInstructors(staffRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this online class?')) return;

    try {
      await deleteOnlineClass(id);
      toast.success('Online class deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete online class');
      console.error(error);
    }
  };

  const handleStartClass = async (id) => {
    try {
      await startOnlineClass(id);
      toast.success('Class started successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to start class');
      console.error(error);
    }
  };

  const handleEndClass = async (id) => {
    try {
      await endOnlineClass(id);
      toast.success('Class ended successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to end class');
      console.error(error);
    }
  };

  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = 
      classItem.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.course?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || classItem.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClasses = filteredClasses.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Online Classes" subtitle="Manage and schedule online classes" icon={FiVideo} />
        <PageLoading message="Loading online classes..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader 
          title="Online Classes"
          subtitle="Manage and schedule online classes"
          icon={FiVideo}
          actions={
            <Button icon={FiPlus} onClick={() => navigate('/admin/online-classes/add')}>Schedule Class</Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Classes" tone="info" icon={FiVideo} value={classes.length} />
          <StatCard title="Scheduled" tone="primary" icon={FiCalendar} value={classes.filter(c => c.status === 'scheduled').length} />
          <StatCard title="Live Now" tone="success" icon={FiPlay} value={classes.filter(c => c.status === 'live').length} />
          <StatCard title="Completed" tone="slate" icon={FiSquare} value={classes.filter(c => c.status === 'ended').length} />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search classes..."
          />
          <FilterBarActions>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[140px]">
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Class Details</TableHeader>
                <TableHeader>Schedule</TableHeader>
                <TableHeader>Instructor</TableHeader>
                <TableHeader>Participants</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginatedClasses.length === 0 ? (
                <TableEmpty colSpan={6} title="No online classes found" description="Try adjusting your filters or schedule a new class." />
              ) : (
                paginatedClasses.map((classItem) => (
                  <TableRow key={classItem._id}>
                    <TableCell className="!whitespace-normal">
                      <div className="text-sm font-medium text-slate-800">{classItem.title}</div>
                      <div className="text-xs text-slate-500">{classItem.course?.title}</div>
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      <div className="text-slate-800">{formatDateTime(classItem.scheduledDate)}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <FiClock />
                        {classItem.duration} minutes
                      </div>
                    </TableCell>
                    <TableCell>{classItem.instructor?.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <FiUsers className="text-slate-400" />
                        {classItem.participants?.length || 0}/{classItem.maxParticipants}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={classItem.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {classItem.status === 'scheduled' && (
                          <IconButton icon={FiPlay} variant="success" title="Start Class" onClick={() => handleStartClass(classItem._id)} />
                        )}
                        {classItem.status === 'live' && (
                          <IconButton icon={FiSquare} variant="danger" title="End Class" onClick={() => handleEndClass(classItem._id)} />
                        )}
                        <IconButton icon={FiEye} variant="neutral" title="View Details" onClick={() => navigate(`/admin/online-classes/${classItem._id}`)} />
                        <IconButton icon={FiEdit2} variant="primary" title="Edit" />
                        <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(classItem._id)} />
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
            totalItems={filteredClasses.length}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </TableWrapper>
      </div>
    </Layout>
  );
};

export default ManageOnlineClasses;
