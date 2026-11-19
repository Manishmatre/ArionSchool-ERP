import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { getAllFranchises } from '../../api/campusApi';
import { FiArrowLeft, FiSave, FiFileText } from 'react-icons/fi';
import { FormPageLayout, FormSection, Button } from '../../components/ui';

const AddExam = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [mcqs, setMcqs] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    franchise: '', // empty = all schools
    startTime: '',
    endTime: '',
    duration: 60, // Default to 60 minutes
    durationType: 'minutes',
    passPercentage: 60,
  });

  useEffect(() => {
    fetchCourses();
    fetchFranchises();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data.data || []);
    } catch (error) {
      console.error('Failed to load courses', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchFranchises = async () => {
    try {
      const res = await getAllFranchises();
      setFranchises(res.data || []);
    } catch (error) {
      console.error('Failed to load schools', error);
      toast.error('Failed to load schools');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCourseChange = async (courseId) => {
    setFormData((prev) => ({ ...prev, course: courseId }));
    setSelectedQuestionIds([]);
    if (!courseId) {
      setMcqs([]);
      return;
    }
    try {
      const res = await api.get('/mcqs', { params: { course: courseId } });
      setMcqs(res.data.mcqs || []);
    } catch (error) {
      console.error('Failed to load questions', error);
      toast.error('Failed to load questions for this course');
    }
  };

  const toggleQuestionSelection = (id) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();

    if (!formData.course || !formData.title || !formData.startTime || !formData.duration) {
      toast.error('Please fill all required fields');
      return;
    }

    if (selectedQuestionIds.length === 0) {
      toast.error('Please select at least one question');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        questions: selectedQuestionIds,
        passPercentage: Number(formData.passPercentage) || 60,
      };

      // If school is empty, do not rely on the field – backend will treat as global exam
      if (!payload.franchise) {
        delete payload.franchise;
      }

      await api.post('/exams', payload);
      toast.success('Exam created successfully');
      navigate('/admin/exams');
    } catch (error) {
      console.error('Failed to create exam', error);
      toast.error(error.response?.data?.message || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Create Exam"
        subtitle="Set up a new online exam for a course"
        icon={FiFileText}
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/exams')}>
            Back to Exams
          </Button>
        }
      />

      <form onSubmit={handleCreateExam}>
        <FormPageLayout
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/exams')}>
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={saving} disabled={saving}>
                {saving ? 'Creating...' : 'Create Exam'}
              </Button>
            </>
          }
        >
          <FormSection title="Exam Details" icon={FiFileText}>
            <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <label className="form-label">Course *</label>
                <select
                  name="course"
                  value={formData.course}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Pass Percentage *</label>
                <input
                  type="number"
                  name="passPercentage"
                  value={formData.passPercentage}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className="input-field"
                />
              </div>
              <div>
                <label className="form-label">Campus Visibility</label>
                <select
                  name="franchise"
                  value={formData.franchise}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">All Campuses</option>
                  {franchises.map((franchise) => (
                    <option key={franchise._id} value={franchise._id}>
                      {franchise.name} ({franchise.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Leave as "All Campuses" to make this exam visible to students across all school campuses offering this course.
                </p>
              </div>
            </div>

            <div>
              <label className="form-label">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="input-field"
                placeholder="Optional description for this exam"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="form-label">Start Time *</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="form-label">End Time</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="input-field"
                />
                <p className="text-xs text-slate-500 mt-1">Optional: Set an expiry time for this exam.</p>
              </div>
              <div>
                <label className="form-label">Duration *</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="form-label">Duration Unit</label>
                <select
                  name="durationType"
                  value={formData.durationType}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Select Questions * ({selectedQuestionIds.length} selected)</label>
              {formData.course ? (
                mcqs.length === 0 ? (
                  <p className="text-sm text-slate-500">No MCQs found for this course. Please create MCQs first.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg max-h-80 overflow-y-auto divide-y">
                    {mcqs.map((mcq) => (
                      <label
                        key={mcq._id}
                        className="flex items-start space-x-3 p-4 cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(mcq._id)}
                          onChange={() => toggleQuestionSelection(mcq._id)}
                          className="mt-1 h-4 w-4 text-primary-600 border-slate-300 rounded"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {mcq.question}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Difficulty: {mcq.difficulty} | Marks: {mcq.marks}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-slate-500">Select a course to load available questions.</p>
              )}
            </div>

            </div>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default AddExam;
