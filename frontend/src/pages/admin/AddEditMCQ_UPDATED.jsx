import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiArrowLeft } from 'react-icons/fi';

const AddEditMCQ = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // edit id
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [editing, setEditing] = useState(false);
  const [pageLoading, setPageLoading] = useState(id ? true : false);

  const [formData, setFormData] = useState({
    question: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    topic: '',
    module: '',
    course: '',
    explanation: '',
    difficulty: 'medium',
    marks: 1,
  });

  useEffect(() => {
    fetchCourses();
    if (id) fetchMCQ();
  }, []);

  useEffect(() => {
    if (formData.course && courses.length > 0) {
      console.log('Extracting modules for course:', formData.course);
      extractModulesFromCourse(formData.course);
    } else if (!formData.course) {
      setModules([]);
      setTopics([]);
    }
  }, [formData.course]);

  useEffect(() => {
    if (formData.module) {
      console.log('Extracting topics for module:', formData.module);
      extractTopicsFromModule(formData.module);
    } else {
      setTopics([]);
    }
  }, [formData.module]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get('/courses');
      console.log('Courses response:', res.data);
      const coursesList = res.data.courses || res.data.data || [];
      setCourses(Array.isArray(coursesList) ? coursesList : []);
    } catch (err) {
      console.error('Error loading courses:', err);
      toast.error('Failed to load courses');
      setCourses([]);
    }
  }, []);

  const extractModulesFromCourse = useCallback((courseId) => {
    try {
      const course = courses.find(c => c._id === courseId);
      console.log('Found course:', course);
      
      if (course && course.curriculum && Array.isArray(course.curriculum)) {
        const extractedModules = course.curriculum.map((module, index) => ({
          _id: `module-${index}`, // Use index as unique identifier
          title: module.title,
          description: module.description,
          duration: module.duration,
          index: index, // Store original index
          topics: module.topics || []
        }));
        console.log('Extracted modules:', extractedModules);
        setModules(extractedModules);
      } else {
        console.warn('No curriculum found for course');
        setModules([]);
      }
    } catch (err) {
      console.error('Error extracting modules:', err);
      toast.error('Failed to load modules for this course');
      setModules([]);
    }
  }, [courses]);

  const extractTopicsFromModule = useCallback((moduleId) => {
    try {
      // moduleId is in format "module-0", "module-1", etc.
      const moduleIndex = parseInt(moduleId.split('-')[1]);
      const course = courses.find(c => c._id === formData.course);
      
      if (course && course.curriculum && course.curriculum[moduleIndex]) {
        const module = course.curriculum[moduleIndex];
        const extractedTopics = (module.topics || []).map((topic, index) => ({
          _id: `topic-${moduleIndex}-${index}`, // Unique identifier
          title: topic.topicTitle,
          description: topic.topicDescription,
          contentType: topic.contentType,
          index: index,
          moduleIndex: moduleIndex
        }));
        console.log('Extracted topics:', extractedTopics);
        setTopics(extractedTopics);
      } else {
        console.warn('Module not found');
        setTopics([]);
      }
    } catch (err) {
      console.error('Error extracting topics:', err);
      toast.error('Failed to load topics for this module');
      setTopics([]);
    }
  }, [courses, formData.course]);

  const fetchMCQ = async () => {
    try {
      setPageLoading(true);
      const res = await api.get(`/mcqs/${id}`);
      const mcq = res.data.mcq;
      setFormData({
        question: mcq.question,
        options: mcq.options,
        topic: mcq.topic || '',
        module: mcq.chapter || '', // Store chapter/module reference
        course: mcq.course?._id || '',
        explanation: mcq.explanation || '',
        difficulty: mcq.difficulty || 'medium',
        marks: mcq.marks || 1,
      });
      setEditing(true);
      // Extract modules for this course
      if (mcq.course?._id) {
        extractModulesFromCourse(mcq.course._id);
        // Extract topics for this module
        if (mcq.chapter) {
          extractTopicsFromModule(mcq.chapter);
        }
      }
    } catch (err) {
      console.error('Error loading MCQ:', err);
      toast.error(err.response?.data?.message || 'Failed to load MCQ');
      navigate('/admin/mcqs');
    } finally {
      setPageLoading(false);
    }
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    if (field === 'isCorrect' && value) {
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index;
      });
    } else {
      newOptions[index][field] = value;
    }
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.course) {
      toast.error('Please select a course');
      return;
    }
    if (!formData.module) {
      toast.error('Please select a module');
      return;
    }
    if (!formData.topic) {
      toast.error('Please select a topic');
      return;
    }
    if (!formData.question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    // Validate all options have text
    if (formData.options.some(opt => !opt.text.trim())) {
      toast.error('All options must have text');
      return;
    }

    // Validate exactly one correct answer
    const correctCount = formData.options.filter(opt => opt.isCorrect).length;
    if (correctCount !== 1) {
      toast.error('Please select exactly one correct answer');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare submit data
      let submitData = { ...formData };
      
      // If formData.topic is a synthetic ID like "topic-0-0", extract the real data
      if (formData.topic && formData.topic.startsWith('topic-')) {
        console.log('Extracting embedded topic data for submission');
        
        const moduleId = formData.module;
        const topicId = formData.topic;
        
        // Find the actual module and topic objects
        const module = modules.find(m => m._id === moduleId);
        const topic = topics.find(t => t._id === topicId);
        
        if (module && topic) {
          console.log('Found module and topic:', { module: module.title, topic: topic.title });
          
          // Send the embedded data so backend can create Topic/Chapter if needed
          submitData = {
            ...formData,
            topic: '', // Clear the synthetic ID
            chapter: '', // Clear any chapter reference
            topicData: {
              title: topic.title,
              description: topic.description || '',
              order: topic.index || 0
            },
            moduleData: {
              title: module.title,
              description: module.description || '',
              order: module.index || 0
            }
          };
          
          console.log('Submit data prepared with topicData and moduleData:', submitData);
        }
      }
      
      if (editing) {
        await api.put(`/mcqs/${id}`, submitData);
        toast.success('MCQ updated successfully');
      } else {
        await api.post('/mcqs', submitData);
        toast.success('MCQ created successfully');
      }
      navigate('/admin/mcqs');
    } catch (err) {
      console.error('Error saving MCQ:', err);
      toast.error(err.response?.data?.message || 'Failed to save MCQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {pageLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <PageHeader
            title={editing ? 'Edit MCQ' : 'Add MCQ'}
            subtitle={editing ? 'Update the question and options' : 'Create a new multiple choice question'}
            actions={(
              <button
                onClick={() => navigate('/admin/mcqs')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <FiArrowLeft />
                Back to MCQs
              </button>
            )}
          />

          <div className="bg-white rounded-lg shadow p-8 w-full">
            {/* Debug Info & Help */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Status:</strong> {courses.length} courses, {modules.length} modules, {topics.length} topics
              </p>
              {courses.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ No courses found. Please create courses first.
                </p>
              )}
              {formData.course && modules.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  ⏳ Loading modules for selected course... If this persists, the course may not have any modules yet.
                </p>
              )}
              {formData.module && topics.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  ⏳ Loading topics for selected module... If this persists, the module may not have any topics yet.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                  <select
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value, module: '', topic: '' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">
                      {courses.length === 0 ? 'Loading courses...' : 'Select Course'}
                    </option>
                    {courses && courses.length > 0 ? (
                      courses.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.title}
                        </option>
                      ))
                    ) : (
                      <option disabled>No courses available</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module *</label>
                  <select
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value, topic: '' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                    disabled={!formData.course}
                  >
                    <option value="">
                      {!formData.course 
                        ? 'Select Course First' 
                        : modules.length === 0 
                        ? 'Loading modules...' 
                        : 'Select Module'
                      }
                    </option>
                    {formData.course && modules && modules.length > 0 ? (
                      modules.map(m => (
                        <option key={m._id} value={m._id}>
                          {m.title}
                        </option>
                      ))
                    ) : formData.course ? (
                      <option disabled>No modules available</option>
                    ) : null}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topic *</label>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                    disabled={!formData.module}
                  >
                    <option value="">
                      {!formData.module 
                        ? 'Select Module First' 
                        : topics.length === 0 
                        ? 'Loading topics...' 
                        : 'Select Topic'
                      }
                    </option>
                    {formData.module && topics && topics.length > 0 ? (
                      topics.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.title}
                        </option>
                      ))
                    ) : formData.module ? (
                      <option disabled>No topics available</option>
                    ) : null}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Enter the question here"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Options * (Select one correct answer)</label>
                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={option.isCorrect}
                        onChange={() => handleOptionChange(index, 'isCorrect', true)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-gray-700 min-w-6">{String.fromCharCode(65 + index)}.</span>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Provide an explanation for the correct answer"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
                  <input
                    type="number"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/admin/mcqs')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  disabled={loading}
                >
                  {loading ? (editing ? 'Updating...' : 'Creating...') : (editing ? 'Update MCQ' : 'Create MCQ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AddEditMCQ;
