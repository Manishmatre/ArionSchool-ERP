import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiVideo, FiCalendar, FiClock, FiUsers, FiPlay, FiExternalLink, FiEye } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { getMyOnlineClasses, joinOnlineClass } from '../../api/onlineClassApi';
import { StatCard, PageLoading, Card, Button, Badge, EmptyState } from '../../components/ui';

const STATUS_VARIANT = {
  scheduled: 'primary',
  'in-progress': 'success',
  live: 'success',
  completed: 'neutral',
  ended: 'neutral',
};

const OnlineClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningClass, setJoiningClass] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await getMyOnlineClasses();
      setClasses(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch online classes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (classId) => {
    try {
      setJoiningClass(classId);
      const response = await joinOnlineClass(classId);
      if (response.data.meetingLink) window.open(response.data.meetingLink, '_blank');
      toast.success('Joined class successfully');
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join class');
      console.error(error);
    } finally {
      setJoiningClass(null);
    }
  };

  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const isClassLive = (classItem) => classItem.status === 'live' || classItem.status === 'in-progress';

  if (loading) {
    return (
      <Layout>
        <PageHeader title="My Online Classes" subtitle="Join and participate in your scheduled online classes" icon={FiVideo} />
        <PageLoading message="Loading online classes..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="My Online Classes" subtitle="Join and participate in your scheduled online classes" icon={FiVideo} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Upcoming" tone="info" icon={FiCalendar} value={classes.filter((c) => c.status === 'scheduled').length} />
          <StatCard title="Live Now" tone="success" icon={FiVideo} value={classes.filter((c) => isClassLive(c)).length} />
          <StatCard title="Completed" tone="slate" icon={FiClock} value={classes.filter((c) => c.status === 'completed' || c.status === 'ended').length} />
        </div>

        {classes.length === 0 ? (
          <Card className="card-pad">
            <EmptyState icon={FiVideo} title="No Online Classes" description="You are not enrolled in any online classes yet." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((classItem) => {
              const isLive = isClassLive(classItem);
              const isJoined = classItem.participants?.some((p) => p.student && !p.leftAt);
              return (
                <div key={classItem._id} className="card flex flex-col">
                  <div className="p-5 flex-grow">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h3 className="text-base font-semibold text-slate-800 flex-1">{classItem.title}</h3>
                      <Badge variant={STATUS_VARIANT[classItem.status] || 'neutral'} className="capitalize">{classItem.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">{classItem.course?.title}</p>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><FiCalendar className="text-slate-400" /> {formatDateTime(classItem.scheduledDate)}</div>
                      <div className="flex items-center gap-2"><FiClock className="text-slate-400" /> {classItem.duration} minutes</div>
                      <div className="flex items-center gap-2"><FiUsers className="text-slate-400" /> {classItem.instructor?.name || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 p-4 flex items-center justify-between gap-2">
                    {isLive ? (
                      isJoined ? (
                        <Button variant="success" icon={FiExternalLink} className="flex-1 justify-center" onClick={() => window.open(classItem.meetingLink, '_blank')}>Rejoin</Button>
                      ) : (
                        <Button variant="success" icon={FiPlay} loading={joiningClass === classItem._id} disabled={joiningClass === classItem._id} className="flex-1 justify-center" onClick={() => handleJoinClass(classItem._id)}>
                          {joiningClass === classItem._id ? 'Joining...' : 'Join Class'}
                        </Button>
                      )
                    ) : (
                      <div className="flex-1 px-3 py-2 text-center text-sm bg-slate-100 text-slate-500 rounded-xl">
                        {classItem.status === 'scheduled' ? 'Not Started' : 'Ended'}
                      </div>
                    )}
                    <Button as={Link} to={`/student/online-classes/${classItem._id}`} variant="secondary" icon={FiEye} className="flex-1 justify-center">Details</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OnlineClasses;
