import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiVideo, FiArrowLeft, FiSave } from 'react-icons/fi';
import { createOnlineClass } from '../../api/onlineClassApi';
import { getCourses } from '../../api/courseApi';
import { getAllStaff } from '../../api/staffApi';
import {
  FormPageLayout, FormSection, FormGrid, FormField, SelectField, TextField, TextArea, Button,
} from '../../components/ui';

const AddOnlineClass = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
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
    notes: ''
  });

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
  }, []);

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
      navigate('/school/online-classes');
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
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/school/online-classes')}>
            Back to Online Classes
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => navigate('/school/online-classes')}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Class'}
              </Button>
            </>
          }
        >
          <FormSection title="Class Details" subtitle="Basic information about the session" icon={FiVideo}>
            <FormGrid>
              <FormField label="Class Title" required className="md:col-span-2">
                <TextField
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter class title"
                  required
                />
              </FormField>

              <FormField label="Description" className="md:col-span-2">
                <TextArea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe what will be covered in this class"
                />
              </FormField>

              <FormField label="Course" required>
                <SelectField name="course" value={formData.course} onChange={handleChange} required>
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField label="Instructor" required>
                <div className="relative">
                  <input
                    type="text"
                    value={instructorSearch}
                    onChange={(e) => {
                      setInstructorSearch(e.target.value);
                      setFormData(prev => ({ ...prev, instructor: '' }));
                    }}
                    placeholder="Type instructor name, ID or email"
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                  {instructors.length > 0 && instructorSearch && (
                    <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-pop">
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
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition ${
                                formData.instructor === inst._id ? 'bg-primary-50' : ''
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
              </FormField>

              <FormField label="Date & Time" required>
                <TextField
                  type="datetime-local"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </FormField>

              <FormField label="Duration">
                <SelectField name="duration" value={formData.duration} onChange={handleChange}>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                </SelectField>
              </FormField>

              <FormField label="Platform">
                <SelectField name="platform" value={formData.platform} onChange={handleChange}>
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="jitsi">Jitsi</option>
                  <option value="custom">Custom</option>
                </SelectField>
              </FormField>

              <FormField label="Max Participants">
                <TextField
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min="1"
                  max="1000"
                />
              </FormField>

              <FormField label="Additional Notes" className="md:col-span-2">
                <TextArea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any additional information for the class"
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default AddOnlineClass;
