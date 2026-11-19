import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { FiPlus, FiSend, FiTrash2, FiBell, FiEdit2, FiCalendar, FiFileText } from 'react-icons/fi';
import { getAllNotifications, deleteNotification, sendNotification, getNotificationStats, createNotification, updateNotification } from '../../api/notificationApi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, Modal, TextField, TextArea,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton,
} from '../../components/ui';

const emptyForm = { title: '', message: '', recipients: 'all', type: 'info', scheduledFor: '' };

const ManageNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getAllNotifications();
      setNotifications(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch notifications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getNotificationStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    try {
      await deleteNotification(id);
      toast.success('Notification deleted successfully');
      fetchNotifications();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete notification');
      console.error(error);
    }
  };

  const handleSend = async (id) => {
    if (!window.confirm('Are you sure you want to send this notification?')) return;
    try {
      await sendNotification(id);
      toast.success('Notification sent successfully');
      fetchNotifications();
      fetchStats();
    } catch (error) {
      toast.error('Failed to send notification');
      console.error(error);
    }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editMode) {
        await updateNotification(editingNotification._id, formData);
        toast.success('Notification updated successfully');
      } else {
        await createNotification(formData);
        toast.success('Notification created successfully');
      }
      handleCloseModal();
      fetchNotifications();
      fetchStats();
    } catch (error) {
      toast.error(`Failed to ${editMode ? 'update' : 'create'} notification`);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (notification) => {
    setEditingNotification(notification);
    setEditMode(true);
    setFormData({
      title: notification.title,
      message: notification.message,
      recipients: notification.recipients,
      type: notification.type,
      scheduledFor: notification.scheduledFor ? new Date(notification.scheduledFor).toISOString().slice(0, 16) : '',
    });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditMode(false);
    setEditingNotification(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Manage Notifications" subtitle="Create and send notifications to users" icon={FiBell} />
        <PageLoading message="Loading notifications..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Manage Notifications"
          subtitle="Create and send notifications to users"
          icon={FiBell}
          actions={<Button icon={FiPlus} onClick={() => setShowCreateModal(true)}>Create Notification</Button>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Notifications" tone="info" icon={FiBell} value={stats?.total || 0} />
          <StatCard title="Sent" tone="success" icon={FiSend} value={stats?.sent || 0} />
          <StatCard title="Scheduled" tone="amber" icon={FiCalendar} value={stats?.scheduled || 0} />
          <StatCard title="Draft" tone="slate" icon={FiFileText} value={stats?.draft || 0} />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notifications..."
          />
          <FilterBarActions>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[140px]">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Title</TableHeader>
                <TableHeader>Recipients</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginatedNotifications.length === 0 ? (
                <TableEmpty colSpan={6} title="No notifications found" description="Try adjusting your filters or create a new notification." />
              ) : (
                paginatedNotifications.map((notification) => (
                  <TableRow key={notification._id}>
                    <TableCell className="!whitespace-normal max-w-xs">
                      <div className="text-sm font-medium text-slate-900">{notification.title}</div>
                      <div className="text-xs text-slate-500 truncate">{notification.message}</div>
                    </TableCell>
                    <TableCell className="capitalize">{notification.recipients?.replace('_', ' ')}</TableCell>
                    <TableCell className="capitalize text-slate-600">{notification.type}</TableCell>
                    <TableCell>{new Date(notification.createdAt).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell><StatusBadge status={notification.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {notification.status !== 'sent' && (
                          <IconButton icon={FiEdit2} variant="primary" title="Edit" onClick={() => handleEdit(notification)} />
                        )}
                        {notification.status !== 'sent' && (
                          <IconButton icon={FiSend} variant="success" title="Send" onClick={() => handleSend(notification._id)} />
                        )}
                        <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(notification._id)} />
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
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredNotifications.length}
            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
          />
        </TableWrapper>
      </div>

      <Modal
        open={showCreateModal}
        onClose={handleCloseModal}
        title={editMode ? 'Edit Notification' : 'Create New Notification'}
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" form="notification-form" loading={submitting}>
              {editMode ? 'Update Notification' : 'Create Notification'}
            </Button>
          </>
        }
      >
        <form id="notification-form" onSubmit={handleCreateNotification} className="space-y-4">
          <TextField label="Title" name="title" required value={formData.title} onChange={handleInputChange} placeholder="Enter notification title" />
          <TextArea label="Message" name="message" required rows={4} value={formData.message} onChange={handleInputChange} placeholder="Enter notification message" />
          <SelectField label="Recipients" name="recipients" value={formData.recipients} onChange={handleInputChange}>
            <option value="all">All Users</option>
            <option value="students">Students Only</option>
            <option value="franchise_admins">School Admins Only</option>
            <option value="specific_users">Specific Users</option>
            <option value="specific_franchise">Specific School</option>
          </SelectField>
          <SelectField label="Type" name="type" value={formData.type} onChange={handleInputChange}>
            <option value="info">Information</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="announcement">Announcement</option>
          </SelectField>
          <TextField label="Schedule (Optional)" type="datetime-local" name="scheduledFor" value={formData.scheduledFor} onChange={handleInputChange} />
        </form>
      </Modal>
    </Layout>
  );
};

export default ManageNotifications;
