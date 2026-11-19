import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiSave, FiFileText } from 'react-icons/fi';
import { FormPageLayout, FormSection, Button, PageLoading } from '../../components/ui';

const AddEditMCQ = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // edit id
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [editing, setEditing] = useState(false);
  const [pageLoading, setPageLoading] = useState(id ? true : false);

  const [mcqs, setMcqs] = useState([
    {
      question: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      explanation: '',
      difficulty: 'medium',
      marks: 1,
    },
  ]);

  const [commonData, setCommonData] = useState({
    topic: '',
    module: '',
    course: '',
  });

  useEffect(() => {
    fetchCourses();
    if (id) fetchMCQ();
  }, []);

  useEffect(() => {
    if (commonData.course && courses.length > 0) {
      console.log('Extracting modules for course:', commonData.course);
      extractModulesFromCourse(commonData.course);
    } else if (!commonData.course) {
      setModules([]);
      setTopics([]);
    }
  }, [commonData.course, courses]);

  useEffect(() => {
    if (commonData.module) {
      console.log('Extracting topics for module:', commonData.module);
      extractTopicsFromModule(commonData.module);
    } else {
      setTopics([]);
    }
  }, [commonData.module]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get('/courses');
      console.log('Courses response:', res.data);
      const coursesList = res.data.courses || res.data.data || [];
      const formattedList = Array.isArray(coursesList) ? coursesList : [];
      setCourses(formattedList);
      return formattedList; // Return the list for immediate use
    } catch (err) {
      console.error('Error loading courses:', err);
      toast.error('Failed to load courses');
      setCourses([]);
    }
  }, []);

  const extractModulesFromCourse = useCallback((courseId, currentCourses) => {
    try {
      const activeCourses = currentCourses || courses;
      const course = activeCourses.find(c => c._id === courseId);
      console.log('Found course for modules:', course);
      
      if (course && course.curriculum && Array.isArray(course.curriculum)) {
        const extractedModules = course.curriculum.map((module, index) => {
          // Use the index-based ID that extractTopicsFromModule expects
          const moduleId = `module-${index}`;
          return {
            _id: moduleId,
            title: module.title,
            description: module.description,
            duration: module.duration,
            index: index,
            topics: module.topics || []
          };
        });
        console.log('Extracted modules:', extractedModules);
        setModules(extractedModules);
        return extractedModules; // Return for immediate use in fetchMCQ
      } else {
        console.warn('No curriculum found for course');
        setModules([]);
        return [];
      }
    } catch (err) {
      console.error('Error extracting modules:', err);
      toast.error('Failed to load modules for this course');
      setModules([]);
      return [];
    }
  }, [courses]);

  const extractTopicsFromModule = useCallback((moduleId, currentCourses, currentCourseId) => {
    try {
      if (!moduleId) {
        setTopics([]);
        return;
      }

      let moduleIndex = -1;
      
      // Handle different moduleId formats (string "module-X" or object with index/id)
      if (typeof moduleId === 'string' && moduleId.includes('-')) {
        moduleIndex = parseInt(moduleId.split('-')[1]);
      } else if (typeof moduleId === 'object' && moduleId !== null) {
        // If it's a populated object from the backend
        moduleIndex = moduleId.index !== undefined ? moduleId.index : -1;
        // If index isn't directly on the object, we might need to find it by title in the curriculum
        if (moduleIndex === -1 && moduleId.title) {
          const activeCourses = currentCourses || courses;
          const activeCourseId = currentCourseId || commonData.course;
          const course = activeCourses.find(c => c._id === activeCourseId);
          if (course && course.curriculum) {
            moduleIndex = course.curriculum.findIndex(m => m.title === moduleId.title);
          }
        }
      } else if (typeof moduleId === 'number') {
        moduleIndex = moduleId;
      }

      const activeCourses = currentCourses || courses;
      const activeCourseId = currentCourseId || commonData.course;
      const course = activeCourses.find(c => c._id === activeCourseId);
      
      if (course && course.curriculum && moduleIndex !== -1 && course.curriculum[moduleIndex]) {
        const module = course.curriculum[moduleIndex];
        const extractedTopics = (module.topics || []).map((topic, index) => ({
          _id: `topic-${moduleIndex}-${index}`,
          title: topic.topicTitle,
          description: topic.topicDescription,
          contentType: topic.contentType,
          index: index,
          moduleIndex: moduleIndex
        }));
        console.log('Extracted topics:', extractedTopics);
        setTopics(extractedTopics);
        return extractedTopics; // Return for immediate use in mapping
      } else {
        console.warn('Module not found for moduleId:', moduleId, 'at index:', moduleIndex);
        setTopics([]);
      }
    } catch (err) {
      console.error('Error extracting topics:', err);
      toast.error('Failed to load topics for this module');
      setTopics([]);
    }
  }, [courses, commonData.course]);

  const fetchMCQ = async () => {
    try {
      setPageLoading(true);
      const res = await api.get(`/mcqs/${id}`);
      const mcq = res.data.mcq;
      setMcqs([{
        question: mcq.question,
        options: mcq.options,
        explanation: mcq.explanation || '',
        difficulty: mcq.difficulty || 'medium',
        marks: mcq.marks || 1,
      }]);
      setCommonData({
        topic: mcq.topic || '',
        module: mcq.chapter?._id || mcq.chapter || '',
        course: mcq.course?._id || mcq.course || '',
      });
      setEditing(true);
      
      // Get course ID whether course is populated object or string
      const courseId = mcq.course?._id || mcq.course;
      
      if (courseId) {
        const latestCourses = await fetchCourses(); 
        const extractedModules = extractModulesFromCourse(courseId, latestCourses);
        
        // If editing, we need to map the stored chapter (module) title or ID back to our "module-X" format
        if (mcq.chapter) {
          let targetModuleId = '';
          const chapterData = mcq.chapter;
          const chapterTitle = typeof chapterData === 'object' ? chapterData.title : chapterData;
          const chapterIdString = typeof chapterData === 'object' ? chapterData._id : chapterData;
          
          if (extractedModules && extractedModules.length > 0) {
            const foundModule = extractedModules.find(m => 
              m.title === chapterTitle || m._id === chapterIdString
            );
            if (foundModule) {
              targetModuleId = foundModule._id;
            }
          }

          setCommonData(prev => ({
            ...prev,
            module: targetModuleId || (typeof chapterData === 'string' ? chapterData : ''),
            topic: '' // Temporary reset
          }));

          if (targetModuleId) {
            const extractedTopics = extractTopicsFromModule(targetModuleId, latestCourses, courseId);
            
            // Map the stored topic back to our "topic-X-Y" format
            if (mcq.topic && extractedTopics) {
              const topicTitle = typeof mcq.topic === 'object' ? (mcq.topic.topicTitle || mcq.topic.title) : mcq.topic;
              const topicIdString = typeof mcq.topic === 'object' ? mcq.topic._id : mcq.topic;
              const foundTopic = extractedTopics.find(t => 
                t.title === topicTitle || t._id === topicIdString
              );
              
              if (foundTopic) {
                setCommonData(prev => ({
                  ...prev,
                  topic: foundTopic._id
                }));
              }
            }
          }
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

  const handleMcqChange = (mcqIndex, field, value) => {
    const newMcqs = [...mcqs];
    newMcqs[mcqIndex][field] = value;
    setMcqs(newMcqs);
  };

  const handleOptionChange = (mcqIndex, optionIndex, field, value) => {
    const newMcqs = [...mcqs];
    const newOptions = [...newMcqs[mcqIndex].options];
    if (field === 'isCorrect' && value) {
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === optionIndex;
      });
    } else {
      newOptions[optionIndex][field] = value;
    }
    newMcqs[mcqIndex].options = newOptions;
    setMcqs(newMcqs);
  };

  const addMcq = () => {
    setMcqs([
      ...mcqs,
      {
        question: '',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
        explanation: '',
        difficulty: 'medium',
        marks: 1,
      },
    ]);
  };

  const removeMcq = (index) => {
    if (mcqs.length <= 1) {
      toast.warn('You must have at least one question.');
      return;
    }
    const newMcqs = mcqs.filter((_, i) => i !== index);
    setMcqs(newMcqs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Common data validation
    if (!commonData.course || !commonData.module || !commonData.topic) {
      toast.error('Please select a course, module, and topic.');
      return;
    }

    // Individual MCQ validation
    for (let i = 0; i < mcqs.length; i++) {
      const mcq = mcqs[i];
      if (!mcq.question.trim()) {
        toast.error(`Please enter a question for Question ${i + 1}.`);
        return;
      }
      if (mcq.options.some(opt => !opt.text.trim())) {
        toast.error(`All options must have text for Question ${i + 1}.`);
        return;
      }
      const correctCount = mcq.options.filter(opt => opt.isCorrect).length;
      if (correctCount !== 1) {
        toast.error(`Please select exactly one correct answer for Question ${i + 1}.`);
        return;
      }
    }

    setLoading(true);
    try {
      // Send the internal index-based IDs directly - backend handles topic-X-Y format
      const finalCommonData = {
        ...commonData,
        chapter: commonData.module,  // Send module ID (module-X format)
        topic: commonData.topic      // Send topic ID (topic-X-Y format)
      };

      if (editing) {
        // Handle single MCQ update
        const payload = { ...finalCommonData, ...mcqs[0] };
        await api.put(`/mcqs/${id}`, payload);
        toast.success('MCQ updated successfully');
      } else {
        // Handle bulk MCQ creation
        const payload = {
          ...finalCommonData,
          mcqs: mcqs,
        };
        await api.post('/mcqs/bulk', payload);
        toast.success(`${mcqs.length} MCQ(s) created successfully`);
      }
      navigate('/admin/mcqs');
    } catch (err) {
      console.error('Error saving MCQ(s):', err);
      toast.error(err.response?.data?.message || 'Failed to save MCQ(s)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {pageLoading ? (
        <PageLoading />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title={editing ? 'Edit MCQ' : 'Add MCQ'}
            subtitle={editing ? 'Update the question and options' : 'Create a new multiple choice question'}
            icon={FiFileText}
            actions={
              <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/mcqs')}>
                Back to MCQs
              </Button>
            }
          />

          <form onSubmit={handleSubmit}>
            <FormPageLayout
              footer={
                <>
                  <Button type="button" variant="secondary" onClick={() => navigate('/admin/mcqs')}>
                    Cancel
                  </Button>
                  <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
                    {loading ? (editing ? 'Updating...' : 'Creating...') : (editing ? 'Update MCQ' : `Create ${mcqs.length} MCQ(s)`)}
                  </Button>
                </>
              }
            >
              <FormSection title="Question Details" icon={FiFileText}>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Status:</strong> {courses.length} courses, {modules.length} modules, {topics.length} topics
              </p>
              {courses.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ No courses found. Please create courses first.
                </p>
              )}
              {commonData.course && modules.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  ⏳ Loading modules for selected course... If this persists, the course may not have any modules yet.
                </p>
              )}
              {commonData.module && topics.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  ⏳ Loading topics for selected module... If this persists, the module may not have any topics yet.
                </p>
              )}
            </div>

            <div className="space-y-6">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="form-label">Course *</label>
                  <select
                    value={commonData.course}
                    onChange={(e) => setCommonData({ ...commonData, course: e.target.value, module: '', topic: '' })}
                    className="input-field"
                    required
                  >
                    <option value="">{courses.length === 0 ? 'Loading courses...' : 'Select Course'}</option>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Module *</label>
                  <select
                    value={commonData.module}
                    onChange={(e) => setCommonData({ ...commonData, module: e.target.value, topic: '' })}
                    className="input-field disabled:bg-slate-100"
                    required
                    disabled={!commonData.course}
                  >
                    <option value="">{!commonData.course ? 'Select Course First' : 'Select Module'}</option>
                    {modules.map(m => <option key={m._id} value={m._id}>{m.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Topic *</label>
                  <select
                    value={commonData.topic}
                    onChange={(e) => setCommonData({ ...commonData, topic: e.target.value })}
                    className="input-field disabled:bg-slate-100"
                    required
                    disabled={!commonData.module}
                  >
                    <option value="">{!commonData.module ? 'Select Module First' : 'Select Topic'}</option>
                    {topics.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                  </select>
                </div>
              </div>

              {/* MCQ Forms */}
              {mcqs.map((mcq, index) => (
                <div key={index} className="border-t-2 pt-8 mt-8 space-y-6 relative">
                  <h3 className="text-lg font-bold text-slate-700">Question {index + 1}</h3>
                  {!editing && mcqs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMcq(index)}
                      className="absolute top-6 right-0 text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  )}
                  <div>
                    <label className="form-label">Question *</label>
                    <textarea
                      value={mcq.question}
                      onChange={(e) => handleMcqChange(index, 'question', e.target.value)}
                      className="input-field"
                      rows="4"
                      placeholder="Enter the question here"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Options *</label>
                    <div className="space-y-3">
                      {mcq.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <input
                            type="radio"
                            name={`correctAnswer-${index}`}
                            checked={option.isCorrect}
                            onChange={() => handleOptionChange(index, optionIndex, 'isCorrect', true)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-700">{String.fromCharCode(65 + optionIndex)}.</span>
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => handleOptionChange(index, optionIndex, 'text', e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Explanation (Optional)</label>
                    <textarea
                      value={mcq.explanation}
                      onChange={(e) => handleMcqChange(index, 'explanation', e.target.value)}
                      className="input-field"
                      rows="3"
                      placeholder="Provide an explanation for the correct answer"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Difficulty Level</label>
                      <select
                        value={mcq.difficulty}
                        onChange={(e) => handleMcqChange(index, 'difficulty', e.target.value)}
                        className="input-field"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Marks</label>
                      <input
                        type="number"
                        value={mcq.marks}
                        onChange={(e) => handleMcqChange(index, 'marks', Math.max(1, parseInt(e.target.value) || 1))}
                        className="input-field"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              {!editing && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={addMcq}
                    className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-gray-400 transition font-medium"
                  >
                    + Add Another Question
                  </button>
                </div>
              )}

            </div>
              </FormSection>
            </FormPageLayout>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default AddEditMCQ;
