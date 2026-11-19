import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import { useParams,
  useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { 
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiClock,
  FiUsers,
  FiUser,
  FiBook,
  FiMapPin
} from 'react-icons/fi';
import { getBatchById, deleteBatch } from '../../api/batchApi';
import {
  Card, CardHeader, StatCard, Badge, StatusBadge, Button, PageLoading, EmptyState,
} from '../../components/ui';

const BatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const fetchBatch = async () => {
    try {
      setLoading(true);
      const data = await getBatchById(id);
      setBatch(data.data);
    } catch (error) {
      toast.error('Failed to fetch batch details');
      console.error(error);
      navigate('/admin/batches');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    
    try {
      await deleteBatch(id);
      toast.success('Batch deleted successfully');
      navigate('/admin/batches');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete batch');
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Batch Details" subtitle="View and manage batch information" icon={FiUsers} />
        <PageLoading message="Loading batch details..." />
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <PageHeader title="Batch Details" subtitle="View and manage batch information" icon={FiUsers} />
        <Card>
          <EmptyState
            icon={FiUsers}
            title="Batch not found"
            action={<Button icon={FiArrowLeft} onClick={() => navigate('/admin/batches')}>Back to Batches</Button>}
          />
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title={batch.batchName} 
          subtitle={batch.batchCode} 
          icon={FiUsers}
          actions={(
            <>
              <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/batches')}>
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button icon={FiEdit2} onClick={() => navigate(`/admin/batches/${id}/edit`)}>
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button variant="danger" icon={FiTrash2} onClick={handleDelete}>
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </>
          )}
        />

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={batch.status} />
          <Badge variant="primary">{batch.timing}</Badge>
          <Badge variant="neutral" className="capitalize">{batch.mode}</Badge>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course & Schedule */}
            <Card>
              <CardHeader title="Course & Schedule" icon={FiBook} />
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FiBook className="text-primary-600 text-xl mt-1" />
                  <div>
                    <p className="text-sm text-slate-500">Course</p>
                    <p className="font-medium text-slate-800">{batch.course?.title || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiUser className="text-primary-600 text-xl mt-1" />
                  <div>
                    <p className="text-sm text-slate-500">Trainer</p>
                    <p className="font-medium text-slate-800">
                      {batch.trainer?.personalInfo?.firstName} {batch.trainer?.personalInfo?.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiCalendar className="text-primary-600 text-xl mt-1" />
                  <div>
                    <p className="text-sm text-slate-500">Duration</p>
                    <p className="font-medium text-slate-800">
                      {new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiClock className="text-primary-600 text-xl mt-1" />
                  <div>
                    <p className="text-sm text-slate-500">Class Time</p>
                    <p className="font-medium text-slate-800">{batch.classTime || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiMapPin className="text-primary-600 text-xl mt-1" />
                  <div>
                    <p className="text-sm text-slate-500">Location</p>
                    <p className="font-medium text-slate-800">{batch.location || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <TbCurrencyRupee className="text-primary-600 text-xl mt-1" />
                  <div>
                    <p className="text-sm text-slate-500">Batch Fee</p>
                    <p className="font-medium text-slate-800">₹{batch.batchFee?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Description */}
            {batch.description && (
              <Card>
                <CardHeader title="Description" icon={FiBook} />
                <p className="text-slate-600 whitespace-pre-wrap">{batch.description}</p>
              </Card>
            )}

            {/* Students List */}
            <Card>
              <CardHeader
                title="Enrolled Students"
                icon={FiUsers}
                action={<span className="text-sm text-slate-500">{batch.students?.length || 0} / {batch.maxCapacity} students</span>}
              />
              {batch.students && batch.students.length > 0 ? (
                <div className="space-y-2">
                  {batch.students.map((student, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <FiUser className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {student.personalInfo?.firstName} {student.personalInfo?.lastName}
                          </p>
                          <p className="text-sm text-slate-500">{student.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {student.enrollmentNumber || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FiUsers} title="No students enrolled yet" />
              )}
            </Card>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Capacity Card */}
            <Card>
              <CardHeader title="Capacity" icon={FiUsers} />
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-primary-600">
                  {batch.currentStrength}
                </div>
                <div className="text-sm text-slate-500">
                  out of {batch.maxCapacity} students
                </div>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
                  style={{ width: `${(batch.currentStrength / batch.maxCapacity) * 100}%` }}
                ></div>
              </div>

              <div className="text-center text-sm text-slate-500">
                {Math.round((batch.currentStrength / batch.maxCapacity) * 100)}% filled
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader title="Quick Stats" icon={FiClock} />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <StatusBadge status={batch.status} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Mode</span>
                  <span className="font-medium text-slate-800 capitalize">{batch.mode}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Timing</span>
                  <Badge variant="primary">{batch.timing}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Available Seats</span>
                  <span className="font-medium text-slate-800">
                    {batch.maxCapacity - batch.currentStrength}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Created</span>
                  <span className="font-medium text-slate-800">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BatchDetails;
