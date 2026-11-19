import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiBell, FiCheck, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { getMyNotifications, markAllAsRead, markAsRead } from '../api/notificationApi';
import { useAuth } from '../context/AuthContext';
import {
  Card, FilterBar, FilterBarActions, SelectField, Button, PageLoading, EmptyState, Badge,
} from '../components/ui';
import useAutoRefresh from '../hooks/useAutoRefresh';

const TYPE_VARIANT = {
  error: 'danger',
  success: 'success',
  warning: 'warning',
  announcement: 'purple',
  info: 'info',
};

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const basePath = useMemo(() => {
    if (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)) return '/school';
    if (user?.role === 'super_admin') return '/admin';
    if (user?.role === 'parent') return '/parent';
    return '/student';
  }, [user?.role]);

  const fetchNotifications = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const res = await getMyNotifications();
      setNotifications(res.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      if (!silent) toast.error('Failed to fetch notifications');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Live updates without manual refresh (poll + refetch when tab regains focus).
  useAutoRefresh(
    () => fetchNotifications({ silent: true }),
    { interval: 20000, events: ['new-enrollment', 'payment-verified', 'exam-result-ready', 'batch-created'] }
  );

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    if (filter === 'read') return notifications.filter((n) => n.isRead);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'You are all caught up'}
          icon={FiBell}
          actions={
            <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate(`${basePath}/dashboard`)}>
              Back
            </Button>
          }
        />

        <FilterBar>
          <SelectField value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </SelectField>
          <FilterBarActions>
            <Button variant="ghost" icon={FiRefreshCw} onClick={fetchNotifications}>Refresh</Button>
            <Button icon={FiCheckCircle} onClick={handleMarkAllAsRead}>Mark all read</Button>
          </FilterBarActions>
        </FilterBar>

        <Card>
          {loading ? (
            <PageLoading message="Loading notifications..." />
          ) : filteredNotifications.length === 0 ? (
            <EmptyState icon={FiBell} title="No notifications" description="New alerts will appear here." />
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition ${
                    notification.isRead ? 'bg-white border-slate-200' : 'bg-primary-50/50 border-primary-200'
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-600 flex-shrink-0">
                    <FiBell />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                          <Badge variant={TYPE_VARIANT[notification.type] || 'info'} className="capitalize">
                            {notification.type || 'info'}
                          </Badge>
                          {!notification.isRead && <Badge variant="primary">New</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button variant="ghost" className="text-xs py-1.5 px-2.5" icon={FiCheck} onClick={() => handleMarkAsRead(notification._id)}>
                          Mark read
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">{notification.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Notifications;
