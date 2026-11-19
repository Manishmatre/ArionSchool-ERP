import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCalendar, FiClock, FiUsers, FiVideo, FiBook, FiArrowLeft, FiBriefcase, FiSave, FiLayers } from 'react-icons/fi';
import { createOnlineClass } from '../../api/onlineClassApi';
import { FormPageLayout, FormSection, FormGrid, Button } from '../../components/ui';
import { getCourses } from '../../api/courseApi';
import { getAllStaff } from '../../api/staffApi';
import { getAllFranchises } from '../../api/campusApi'; // Import school API
import { useAuth } from '../../context/AuthContext'; // Import useAuth to check user role

const AddOnlineClass = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth(); // Get user from auth context
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [franchises, setFranchises] = useState([]); // State for schools
  const [instructorSearch, setInstructorSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    instructor: '',
    scheduledDate: '',
    duration: 60,
    platform: 'zoom',
    maxParticipants: 100,
    notes: '',
    franchise: '', // Add school to form data
    meetingLink: '',
    meetingId: '',
    password: ''
  });

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
    if (user.role === 'super_admin') {
      fetchFranchises();
    }
  }, [user.role]);

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
      const data = await getAllStaff();
      setInstructors(data.data || []);
    } catch (error) {
      console.error('Failed to fetch instructors:', error);
    }
  };

  const fetchFranchises = async () => {
    try {
      const data = await getAllFranchises();
      setFranchises(data.data || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
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
      navigate('/admin/online-classes');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule class');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Schedule Online Class"
        subtitle="Create a new live online session for a course"
        icon={FiVideo}
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/online-classes')}>
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/online-classes')}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Class'}
              </Button>
            </>
          }
        >
          <FormSection title="Class Details" icon={FiVideo}>
            <FormGrid>
              {/* Title */}
              <div className="md:col-span-2">
                <label className="form-label">
                  Class Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter class title"
                  required
                />
              </div>

              {/* Campus Selector (for Super Admin) */}
              {user.role === 'super_admin' && (
                <div className="md:col-span-2">
                  <label className="form-label">
                    <FiLayers className="inline mr-2" />
                    School Campus *
                  </label>
                  <select
                    name="franchise"
                    value={formData.franchise}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Select Campus</option>
                    {franchises.map(franchise => (
                      <option key={franchise._id} value={franchise._id}>
                        {franchise.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label className="form-label">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="input-field"
                  placeholder="Describe what will be covered in this class"
                />
              </div>

              {/* Course */}
              <div>
                <label className="form-label">
                  <FiBook className="inline mr-2" />
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

              {/* Instructor */}
              <div className="relative">
                <label className="form-label">
                  <FiUsers className="inline mr-2" />
                  Instructor *
                </label>
                <input
                  type="text"
                  value={instructorSearch}
                  onChange={(e) => {
                    setInstructorSearch(e.target.value);
                    setFormData(prev => ({ ...prev, instructor: '' }));
                  }}
                  placeholder="Type instructor name, ID or email"
                  className="input-field"
                  required
                />
                {instructors.length > 0 && instructorSearch && (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                    {instructors
                      .filter(inst => {
                        const search = instructorSearch.toLowerCase();
                        const fullName = `${inst.personalInfo?.firstName || ''} ${inst.personalInfo?.lastName || ''}`.toLowerCase();
                        const email = inst.contactInfo?.email?.toLowerCase() || '';
                        const staffId = inst.staffId?.toLowerCase() || '';
                        return (
                          fullName.includes(search) ||
                          email.includes(search) ||
                          staffId.includes(search)
                        );
                      })
                      .slice(0, 20)
                      .map(inst => {
                        const displayName = (inst.personalInfo
                          ? `${inst.personalInfo.firstName || ''} ${inst.personalInfo.lastName || ''}`.trim()
                          : inst.name || inst.contactInfo?.email || 'Unnamed Instructor');
                        return (
                          <button
                            type="button"
                            key={inst._id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, instructor: inst._id }));
                              setInstructorSearch(displayName);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                              formData.instructor === inst._id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{displayName}</span>
                              <span className="text-xs text-slate-500">
                                {inst.staffId && <span>{inst.staffId} · </span>}
                                {inst.contactInfo?.email}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="form-label">
                  <FiCalendar className="inline mr-2" />
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  min={new Date().toISOString().slice(0, 16)}
                  className="input-field"
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="form-label">
                  <FiClock className="inline mr-2" />
                  Duration (minutes)
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="input-field"
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
                <label className="form-label">
                  <FiVideo className="inline mr-2" />
                  Platform
                </label>
                <select
                  name="platform"
                  value={formData.platform}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="jitsi">Jitsi</option>
                  <option value="youtube">YouTube</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Meeting Link */}
              <div className="md:col-span-2">
                <label className="form-label">
                  Meeting Link *
                </label>
                <input
                  type="url"
                  name="meetingLink"
                  value={formData.meetingLink}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="https://example.com/meeting"
                  required
                />
              </div>

              {/* Meeting ID */}
              <div>
                <label className="form-label">
                  Meeting ID (Optional)
                </label>
                <input
                  type="text"
                  name="meetingId"
                  value={formData.meetingId}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              {/* Password */}
              <div>
                <label className="form-label">
                  Password (Optional)
                </label>
                <input
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              {/* Max Participants */}
              <div>
                <label className="form-label">
                  Max Participants
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min="1"
                  max="1000"
                  className="input-field"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="form-label">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  className="input-field"
                  placeholder="Any additional information for the class"
                />
              </div>
            </FormGrid>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default AddOnlineClass;
