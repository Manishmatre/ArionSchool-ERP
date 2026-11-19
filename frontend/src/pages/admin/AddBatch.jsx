import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCalendar, FiUsers, FiClock, FiArrowLeft, FiSave, FiFileText } from 'react-icons/fi';
import { createBatch } from '../../api/batchApi';
import api from '../../api/axios';
import { FormPageLayout, FormSection, FormGrid, Button } from '../../components/ui';

const AddBatch = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
  }, []);

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
      const response = await api.get('/staff?designation=teacher');
      setTrainers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index][field] = value;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter enabled schedule days
      const enabledSchedule = formData.schedule
        .filter(s => s.enabled)
        .map(({ day, startTime, endTime }) => ({ day, startTime, endTime }));

      if (enabledSchedule.length === 0) {
        toast.error('Please select at least one day for the schedule');
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        schedule: enabledSchedule
      };

      await createBatch(submitData);
      toast.success('Batch created successfully!');
      navigate('/admin/batches');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Add New Batch"
        subtitle="Create a new batch for a course"
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
                {loading ? 'Creating...' : 'Create Batch'}
              </Button>
            </>
          }
        >
          <FormSection title="Basic Information" icon={FiCalendar}>
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
                  placeholder="DCA Morning Batch - January 2025"
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
                  onChange={(e) => setFormData({...formData, batchCode: e.target.value.toUpperCase()})}
                  className="input-field"
                  placeholder="DCA-M-JAN25"
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
                  Timing *
                </label>
                <select
                  name="timing"
                  value={formData.timing}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Weekend">Weekend</option>
                  <option value="Custom">Custom</option>
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
                  Mode *
                </label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {formData.mode !== 'online' && (
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
                    placeholder="Room 101"
                  />
                </div>
              )}

              {formData.mode !== 'offline' && (
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
                <div key={day.day} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => handleScheduleChange(index, 'enabled', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="w-32 font-medium text-slate-700">{day.day}</span>
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                    disabled={!day.enabled}
                    className="px-3 py-2 border rounded-lg disabled:bg-gray-200"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                    disabled={!day.enabled}
                    className="px-3 py-2 border rounded-lg disabled:bg-gray-200"
                  />
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

export default AddBatch;
