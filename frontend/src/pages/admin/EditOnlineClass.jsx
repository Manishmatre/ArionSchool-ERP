import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCalendar, FiClock, FiUsers, FiVideo, FiBook, FiArrowLeft, FiBriefcase, FiSave } from 'react-icons/fi';
import { getOnlineClass, updateOnlineClass } from '../../api/onlineClassApi';
import { FormPageLayout, FormSection, FormGrid, Button, PageLoading } from '../../components/ui';
import { getCourses } from '../../api/courseApi';
import { getAllStaff } from '../../api/staffApi';
import { getAllFranchises } from '../../api/campusApi';
import { useAuth } from '../../context/AuthContext';

const EditOnlineClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [instructorSearch, setInstructorSearch] = useState('');
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    fetchDependencies();
    fetchOnlineClass();
  }, [classId]);

  const fetchDependencies = async () => {
    try {
      const [coursesRes, staffRes, franchisesRes] = await Promise.all([
        getCourses(),
        getAllStaff(),
        user.role === 'super_admin' ? getAllFranchises() : Promise.resolve({ data: [] }),
      ]);
      setCourses(coursesRes.data || []);
      setInstructors(staffRes.data || []);
      setFranchises(franchisesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
      toast.error('Failed to load required data.');
    }
  };

  const fetchOnlineClass = async () => {
    try {
      const response = await getOnlineClass(classId);
      const classData = response.data;
      setFormData({
        ...classData,
        course: classData.course?._id || '',
        instructor: classData.instructor?._id || '',
        franchise: classData.franchise?._id || '',
        scheduledDate: new Date(classData.scheduledDate).toISOString().slice(0, 16),
      });
      if (classData.instructor) {
        const instructorName = `${classData.instructor.personalInfo?.firstName || ''} ${classData.instructor.personalInfo?.lastName || ''}`.trim();
        setInstructorSearch(instructorName || classData.instructor.name);
      }
    } catch (error) {
      toast.error('Failed to fetch online class details');
      navigate('/admin/online-classes');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateOnlineClass(classId, formData);
      toast.success('Online class updated successfully');
      navigate(`/admin/online-classes/${classId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  if (!formData) {
    return <Layout><PageLoading /></Layout>;
  }

  return (
    <Layout>
      <PageHeader
        title="Edit Online Class"
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
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <FormSection title="Class Details" icon={FiVideo}>
            <FormGrid>
              <div className="md:col-span-2">
                <label className="form-label">Class Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className="input-field" required />
              </div>
              {user.role === 'super_admin' && (
                <div className="md:col-span-2">
                  <label className="form-label">School Campus *</label>
                  <select name="franchise" value={formData.franchise} onChange={handleChange} className="input-field" required>
                    <option value="">Select Campus</option>
                    {franchises.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Course *</label>
                <select name="course" value={formData.course} onChange={handleChange} className="input-field" required>
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className="form-label">Instructor *</label>
                <input type="text" value={instructorSearch} onChange={(e) => { setInstructorSearch(e.target.value); setFormData(prev => ({ ...prev, instructor: '' })); }} placeholder="Type to search instructor" className="input-field" required={!formData.instructor} />
                {instructorSearch && (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border rounded-lg shadow-lg">
                    {instructors.filter(i => `${i.personalInfo?.firstName} ${i.personalInfo?.lastName}`.toLowerCase().includes(instructorSearch.toLowerCase())).map(i => (
                      <button type="button" key={i._id} onClick={() => { setFormData(prev => ({ ...prev, instructor: i._id })); setInstructorSearch(`${i.personalInfo.firstName} ${i.personalInfo.lastName}`); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${formData.instructor === i._id ? 'bg-blue-50' : ''}`}>
                        {`${i.personalInfo.firstName} ${i.personalInfo.lastName}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Date & Time *</label>
                <input type="datetime-local" name="scheduledDate" value={formData.scheduledDate} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="form-label">Duration (minutes)</label>
                <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="form-label">Platform</label>
                <select name="platform" value={formData.platform} onChange={handleChange} className="input-field">
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="jitsi">Jitsi</option>
                  <option value="youtube">YouTube</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Meeting Link *</label>
                <input type="url" name="meetingLink" value={formData.meetingLink} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="form-label">Meeting ID (Optional)</label>
                <input type="text" name="meetingId" value={formData.meetingId} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="form-label">Password (Optional)</label>
                <input type="text" name="password" value={formData.password} onChange={handleChange} className="input-field" />
              </div>
            </FormGrid>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default EditOnlineClass;
