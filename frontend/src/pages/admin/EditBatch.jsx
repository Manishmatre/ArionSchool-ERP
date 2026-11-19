import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCalendar, FiUsers, FiClock, FiArrowLeft, FiSave, FiFileText } from 'react-icons/fi';
import { getBatchById, updateBatch } from '../../api/batchApi';
import api from '../../api/axios';
import { FormPageLayout, FormSection, FormGrid, Button, PageLoading } from '../../components/ui';

const EditBatch = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchingBatch, setFetchingBatch] = useState(true);
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  
  const [formData, setFormData] = useState({
    batchName: '',
    batchCode: '',
    course: '',
    startDate: '',
    endDate: '',
    timing: 'Morning',
    trainer: '',
    maxCapacity: 30,
    mode: 'offline',
    classroom: '',
    meetingLink: '',
    description: '',
    status: 'upcoming',
    schedule: [
      { day: 'Monday', startTime: '09:00', endTime: '11:00', enabled: false },
      { day: 'Tuesday', startTime: '09:00', endTime: '11:00', enabled: false },
      { day: 'Wednesday', startTime: '09:00', endTime: '11:00', enabled: false },
      { day: 'Thursday', startTime: '09:00', endTime: '11:00', enabled: false },
      { day: 'Friday', startTime: '09:00', endTime: '11:00', enabled: false },
      { day: 'Saturday', startTime: '09:00', endTime: '11:00', enabled: false },
      { day: 'Sunday', startTime: '09:00', endTime: '11:00', enabled: false }
    ]
  });

  useEffect(() => {
    fetchCourses();
    fetchTrainers();
    fetchBatch();
  }, [id]);

  const fetchBatch = async () => {
    try {
      setFetchingBatch(true);
      const data = await getBatchById(id);
      const batch = data.data;
      
      setFormData({
        batchName: batch.batchName || '',
        batchCode: batch.batchCode || '',
        course: batch.course?._id || '',
        startDate: batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '',
        endDate: batch.endDate ? new Date(batch.endDate).toISOString().split('T')[0] : '',
        timing: batch.timing || 'Morning',
        trainer: batch.trainer?._id || '',
        maxCapacity: batch.maxCapacity || 30,
        mode: batch.mode || 'offline',
        classroom: batch.classroom || '',
        meetingLink: batch.meetingLink || '',
        description: batch.description || '',
        status: batch.status || 'upcoming',
        schedule: batch.schedule?.length > 0 ? batch.schedule : [
          { day: 'Monday', startTime: '09:00', endTime: '11:00', enabled: false },
          { day: 'Tuesday', startTime: '09:00', endTime: '11:00', enabled: false },
          { day: 'Wednesday', startTime: '09:00', endTime: '11:00', enabled: false },
          { day: 'Thursday', startTime: '09:00', endTime: '11:00', enabled: false },
          { day: 'Friday', startTime: '09:00', endTime: '11:00', enabled: false },
          { day: 'Saturday', startTime: '09:00', endTime: '11:00', enabled: false },
          { day: 'Sunday', startTime: '09:00', endTime: '11:00', enabled: false }
        ]
      });
    } catch (error) {
      toast.error('Failed to fetch batch details');
      console.error(error);
      navigate('/admin/batches');
    } finally {
      setFetchingBatch(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchTrainers = async () => {
    try {
      const response = await api.get('/staff');
      setTrainers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index][field] = value;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const toggleScheduleDay = (index) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index].enabled = !newSchedule[index].enabled;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.batchName || !formData.batchCode || !formData.course || !formData.trainer) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      await updateBatch(id, formData);
      toast.success('Batch updated successfully!');
      navigate('/admin/batches');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update batch');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingBatch) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Edit Batch"
        subtitle="Update batch details"
        icon={FiCalendar}
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/batches')}>
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/batches')}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                {loading ? 'Updating...' : 'Update Batch'}
              </Button>
            </>
          }
        >
          <FormSection title="Basic Information" icon={FiUsers}>
            <FormGrid>
              <div>
                <label className="form-label">
                  Batch Name *
                </label>
                <input
                  type="text"
                  name="batchName"
                  value={formData.batchName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., DCA Morning Batch"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Batch Code *
                </label>
                <input
                  type="text"
                  name="batchCode"
                  value={formData.batchCode}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., DCA-M-001"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Course *
                </label>
                <select
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Trainer *
                </label>
                <select
                  name="trainer"
                  value={formData.trainer}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Trainer</option>
                  {trainers.map(trainer => (
                    <option key={trainer._id} value={trainer._id}>
                      {trainer.personalInfo?.firstName} {trainer.personalInfo?.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Max Capacity *
                </label>
                <input
                  type="number"
                  name="maxCapacity"
                  value={formData.maxCapacity}
                  onChange={handleChange}
                  className="input-field"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Schedule" icon={FiCalendar}>
            <FormGrid>
              <div>
                <label className="form-label">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Timing
                </label>
                <select
                  name="timing"
                  value={formData.timing}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Weekend">Weekend</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Mode
                </label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {(formData.mode === 'offline' || formData.mode === 'hybrid') && (
                <div>
                  <label className="form-label">
                    Classroom
                  </label>
                  <input
                    type="text"
                    name="classroom"
                    value={formData.classroom}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., Room 101"
                  />
                </div>
              )}

              {(formData.mode === 'online' || formData.mode === 'hybrid') && (
                <div>
                  <label className="form-label">
                    Meeting Link
                  </label>
                  <input
                    type="url"
                    name="meetingLink"
                    value={formData.meetingLink}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              )}
            </FormGrid>
          </FormSection>

          <FormSection title="Weekly Schedule" icon={FiClock}>
            <div className="space-y-3">
              {formData.schedule.map((day, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={() => toggleScheduleDay(index)}
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="font-medium text-slate-800">{day.day}</div>
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                      disabled={!day.enabled}
                      className="px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                    />
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                      disabled={!day.enabled}
                      className="px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Description" icon={FiFileText}>
            <label className="form-label">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="input-field"
              placeholder="Additional information about the batch..."
            ></textarea>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default EditBatch;
