import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiX, FiCalendar, FiClock, FiUsers, FiVideo, FiBook } from 'react-icons/fi';
import { createOnlineClass } from '../api/onlineClassApi';
import { getCourses } from '../api/courseApi';
import { getAllStaff } from '../api/staffApi';

const CreateOnlineClass = ({ show, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    instructor: '',
    scheduledDate: '',
    duration: 60,
    platform: 'zoom',
    maxParticipants: 100,
    notes: ''
  });

  useEffect(() => {
    if (show) {
      fetchCourses();
      fetchInstructors();
    }
  }, [show]);

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      setCourses(response.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await getAllStaff();
      setInstructors(response.data || []);
    } catch (error) {
      console.error('Failed to fetch instructors:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.course || !formData.instructor || !formData.scheduledDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await createOnlineClass(formData);
      toast.success('Online class scheduled successfully');
      onSuccess();
      onClose();
      setFormData({
        title: '',
        description: '',
        course: '',
        instructor: '',
        scheduledDate: '',
        duration: 60,
        platform: 'zoom',
        maxParticipants: 100,
        notes: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule class');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Schedule Online Class</h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Class Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter class title"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe what will be covered in this class"
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FiBook className="inline mr-2" />
                Course *
              </label>
              <select
                name="course"
                value={formData.course}
                onChange={handleChange}
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

            {/* Instructor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FiUsers className="inline mr-2" />
                Instructor *
              </label>
              <select
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select Instructor</option>
                {instructors.map(instructor => (
                  <option key={instructor._id} value={instructor._id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FiCalendar className="inline mr-2" />
                Date & Time *
              </label>
              <input
                type="datetime-local"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                min={new Date().toISOString().slice(0, 16)}
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FiClock className="inline mr-2" />
                Duration (minutes)
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FiVideo className="inline mr-2" />
                Platform
              </label>
              <select
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="teams">Microsoft Teams</option>
                <option value="jitsi">Jitsi</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Participants
              </label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="1"
                max="1000"
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                className="input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Any additional information for the class"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Scheduling...' : 'Schedule Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOnlineClass;
