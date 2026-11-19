import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  FiEdit3,
  FiInfo,
  FiBookOpen,
  FiLayers,
  FiAward,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiHelpCircle
} from 'react-icons/fi';
import { Card, Button, SelectField, PageLoading } from '../../components/ui';

const TEST_TYPES = [
  {
    id: 'topic',
    title: 'Topic Test',
    desc: 'Targeted assessment focusing on a single specific topic to test core concepts.',
    icon: FiBookOpen,
    badge: 'Focused Practice'
  },
  {
    id: 'chapter',
    title: 'Chapter Test',
    desc: 'Assessment covering all topics and concepts within a complete chapter module.',
    icon: FiLayers,
    badge: 'Module Assessment'
  },
  {
    id: 'full',
    title: 'Full Course Test',
    desc: 'Comprehensive final evaluation covering the entire course syllabus.',
    icon: FiAward,
    badge: 'Complete Syllabus'
  }
];

const SelectTest = () => {
  const navigate = useNavigate();
  const [testType, setTestType] = useState('full');
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchingChapters, setFetchingChapters] = useState(false);
  const [fetchingTopics, setFetchingTopics] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses/my/enrolled');
      const enrolled = response.data.data || [];
      setCourses(enrolled);

      // Auto-select course if only one enrolled course exists
      if (enrolled.length === 1 && enrolled[0].course?._id) {
        const singleCourseId = enrolled[0].course._id;
        setSelectedCourse(singleCourseId);
        loadChaptersForCourse(singleCourseId, enrolled);
      }
    } catch (error) {
      toast.error('Failed to fetch enrolled courses');
    } finally {
      setLoading(false);
    }
  };

  const loadChaptersForCourse = async (courseId, enrolledCoursesList = courses) => {
    if (!courseId) {
      setChapters([]);
      setTopics([]);
      return;
    }

    setFetchingChapters(true);
    try {
      // First try fetching dedicated chapters from API
      const res = await api.get(`/chapters?course=${courseId}`);
      if (res.data?.chapters && res.data.chapters.length > 0) {
        setChapters(res.data.chapters);
        return;
      }

      // Fallback to course curriculum array from enrolled course
      const currentEnrollment = enrolledCoursesList.find((c) => c.course?._id === courseId);
      const curriculum = currentEnrollment?.course?.curriculum || [];
      setChapters(
        curriculum.map((c) => ({
          _id: c._id,
          title: c.title,
          topics: c.topics || []
        }))
      );
    } catch (e) {
      // Fallback on error
      const currentEnrollment = enrolledCoursesList.find((c) => c.course?._id === courseId);
      const curriculum = currentEnrollment?.course?.curriculum || [];
      setChapters(
        curriculum.map((c) => ({
          _id: c._id,
          title: c.title,
          topics: c.topics || []
        }))
      );
    } finally {
      setFetchingChapters(false);
    }
  };

  const loadTopicsForChapter = async (chapterId) => {
    if (!chapterId) {
      setTopics([]);
      return;
    }

    setFetchingTopics(true);
    try {
      const res = await api.get(`/topics?chapter=${chapterId}`);
      if (res.data?.topics && res.data.topics.length > 0) {
        setTopics(res.data.topics);
        return;
      }

      // Fallback to topics in local chapter object
      const ch = chapters.find((c) => c._id === chapterId);
      setTopics(ch?.topics || []);
    } catch (e) {
      const ch = chapters.find((c) => c._id === chapterId);
      setTopics(ch?.topics || []);
    } finally {
      setFetchingTopics(false);
    }
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    setSelectedChapter('');
    setSelectedTopic('');
    loadChaptersForCourse(courseId);
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapter(chapterId);
    setSelectedTopic('');
    if (chapterId) {
      loadTopicsForChapter(chapterId);
    } else {
      setTopics([]);
    }
  };

  const startTest = () => {
    if (!testType) return toast.error('Please select a test type');
    if (!selectedCourse) return toast.error('Please select a course');

    const params = new URLSearchParams();
    params.append('type', testType);
    params.append('courseId', selectedCourse);

    if (testType === 'chapter') {
      if (!selectedChapter) return toast.error('Please select a chapter');
      params.append('chapterId', selectedChapter);
    } else if (testType === 'topic') {
      if (!selectedChapter) return toast.error('Please select a chapter');
      if (!selectedTopic) return toast.error('Please select a topic');
      params.append('chapterId', selectedChapter);
      params.append('topicId', selectedTopic);
    }

    navigate(`/student/take-test?${params.toString()}`);
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Take a Test" subtitle="Select a test to start your assessment" icon={FiEdit3} />
        <PageLoading message="Loading your courses..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Take a Test"
          subtitle="Test your knowledge, practice questions, and improve your skills"
          icon={FiEdit3}
        />

        {/* Test Type Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEST_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = testType === type.id;
            return (
              <div
                key={type.id}
                onClick={() => setTestType(type.id)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50/50 shadow-md ring-2 ring-primary-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                        isSelected ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon />
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isSelected ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {type.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{type.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{type.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-primary-600' : 'text-slate-400'}`}>
                    {isSelected ? 'Selected' : 'Click to select'}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <FiCheckCircle className="text-xs" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Configuration Card */}
        <Card className="card-pad space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Select Test Parameters</h2>
            <p className="text-sm text-slate-500">
              Configure course and module details to begin your assessment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Course Selection */}
            <div className={testType === 'full' ? 'md:col-span-2' : ''}>
              <SelectField
                label="Enrolled Course *"
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
              >
                <option value="">Select Enrolled Course</option>
                {courses.map((enrollment) => (
                  <option key={enrollment._id} value={enrollment.course?._id}>
                    {enrollment.course?.title}
                  </option>
                ))}
              </SelectField>
              {courses.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  You are not currently enrolled in any active courses.
                </p>
              )}
            </div>

            {/* Chapter Selection */}
            {(testType === 'chapter' || testType === 'topic') && (
              <div>
                <SelectField
                  label="Chapter / Module *"
                  value={selectedChapter}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  disabled={!selectedCourse || fetchingChapters}
                >
                  <option value="">
                    {fetchingChapters ? 'Loading chapters...' : 'Select Chapter'}
                  </option>
                  {chapters.map((chapter) => (
                    <option key={chapter._id} value={chapter._id}>
                      {chapter.title}
                    </option>
                  ))}
                </SelectField>
                {selectedCourse && chapters.length === 0 && !fetchingChapters && (
                  <p className="text-xs text-slate-400 mt-1">No chapters found for this course.</p>
                )}
              </div>
            )}

            {/* Topic Selection */}
            {testType === 'topic' && (
              <div className="md:col-span-2">
                <SelectField
                  label="Topic *"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  disabled={!selectedChapter || fetchingTopics}
                >
                  <option value="">{fetchingTopics ? 'Loading topics...' : 'Select Topic'}</option>
                  {topics.map((topic) => (
                    <option key={topic._id} value={topic._id}>
                      {topic.topicTitle || topic.title}
                    </option>
                  ))}
                </SelectField>
                {selectedChapter && topics.length === 0 && !fetchingTopics && (
                  <p className="text-xs text-slate-400 mt-1">No topics found for this chapter.</p>
                )}
              </div>
            )}
          </div>

          {/* Guidelines / Info Banner */}
          <div className="bg-primary-50/60 border border-primary-200/60 rounded-2xl p-5">
            <h3 className="font-bold text-primary-900 mb-3 flex items-center gap-2 text-base">
              <FiInfo className="text-primary-600 text-lg" /> Assessment Guidelines & Rules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-primary-800">
              <div className="flex items-start gap-2.5">
                <FiClock className="mt-0.5 text-primary-600 flex-shrink-0" />
                <span>Timer starts automatically once the test questions are loaded.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <FiCheckCircle className="mt-0.5 text-primary-600 flex-shrink-0" />
                <span>Each question has 4 options with exactly one correct answer.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <FiHelpCircle className="mt-0.5 text-primary-600 flex-shrink-0" />
                <span>Navigate back and forth to review or change any answer anytime.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <FiAward className="mt-0.5 text-primary-600 flex-shrink-0" />
                <span>Detailed score analysis and explanations provided upon submission.</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Ready to begin? Click Proceed to load your test questions.
            </p>
            <Button
              onClick={startTest}
              iconRight={FiArrowRight}
              className="w-full sm:w-auto px-8 !py-3 font-semibold text-base justify-center shadow-md hover:shadow-lg transition-all"
              disabled={
                !selectedCourse ||
                (testType === 'chapter' && !selectedChapter) ||
                (testType === 'topic' && (!selectedChapter || !selectedTopic))
              }
            >
              Proceed to Test
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default SelectTest;
