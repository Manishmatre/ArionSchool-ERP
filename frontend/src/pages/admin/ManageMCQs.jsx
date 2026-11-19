import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { toast } from 'react-toastify';
import {
  FiHelpCircle, FiPlus, FiEdit2, FiTrash2, FiCopy, FiChevronDown, FiChevronRight,
  FiSearch, FiCheck, FiCheckCircle, FiLayers, FiBookOpen, FiEye
} from 'react-icons/fi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, IconButton, Badge, Card, EmptyState, Modal, FormField, FormGrid, TextField, TextArea
} from '../../components/ui';
import { getCourses } from '../../api/courseApi';
import { getModules, getLessons } from '../../api/curriculumApi';
import { getMCQs, createMCQ, updateMCQ, deleteMCQ, duplicateMCQ } from '../../api/mcqApi';

const DIFFICULTY_VARIANT = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger'
};

export default function ManageMCQs() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Filter states
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('course') || '');
  const [selectedModule, setSelectedModule] = useState(searchParams.get('module') || '');
  const [selectedLesson, setSelectedLesson] = useState(searchParams.get('lesson') || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMap, setExpandedMap] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Single Question Modal states
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [modalModules, setModalModules] = useState([]);
  const [modalLessons, setModalLessons] = useState([]);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [questionForm, setQuestionForm] = useState({
    course: '',
    module: '',
    lesson: '',
    question: '',
    image: '',
    difficulty: 'medium',
    marks: 1,
    negativeMarks: 0,
    explanation: '',
    status: 'active',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });

  // Initial load: Courses
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await getCourses();
        setCourses(res.data || []);
      } catch (err) {
        toast.error('Failed to load courses');
      }
    }
    loadCourses();
  }, []);

  // When selectedCourse changes, load modules
  useEffect(() => {
    if (!selectedCourse) {
      setModules([]);
      setSelectedModule('');
      setLessons([]);
      setSelectedLesson('');
      return;
    }

    async function loadModules() {
      try {
        const res = await getModules({ course: selectedCourse });
        setModules(res.data || []);
        setSelectedModule('');
        setLessons([]);
        setSelectedLesson('');
      } catch (err) {
        console.error('Failed to load modules', err);
      }
    }
    loadModules();
  }, [selectedCourse]);

  // When selectedModule changes, load lessons
  useEffect(() => {
    if (!selectedModule) {
      setLessons([]);
      setSelectedLesson('');
      return;
    }

    async function loadLessons() {
      try {
        const res = await getLessons({ module: selectedModule });
        setLessons(res.data || []);
        setSelectedLesson('');
      } catch (err) {
        console.error('Failed to load lessons', err);
      }
    }
    loadLessons();
  }, [selectedModule]);

  // Load MCQs
  const fetchMCQs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCourse) params.course = selectedCourse;
      if (selectedModule) params.module = selectedModule;
      if (selectedLesson) params.lesson = selectedLesson;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedStatus) params.status = selectedStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await getMCQs(params);
      setMcqs(res.data || res.mcqs || []);
      setCurrentPage(1);
    } catch (err) {
      toast.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMCQs();
  }, [selectedCourse, selectedModule, selectedLesson, selectedDifficulty, selectedStatus]);

  // Handle Search submit
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchMCQs();
    }
  };

  // Expand / Collapse toggles
  const toggleExpand = (id) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded = mcqs.length > 0 && mcqs.every((question) => expandedMap[question._id]);
  const toggleAll = () => {
    if (allExpanded) return setExpandedMap({});
    const nextMap = {};
    mcqs.forEach((q) => {
      nextMap[q._id] = true;
    });
    setExpandedMap(nextMap);
  };

  // Actions
  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    try {
      await duplicateMCQ(id);
      toast.success('Question duplicated successfully');
      fetchMCQs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate question');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteMCQ(id);
      toast.success('Question deleted');
      fetchMCQs();
    } catch (err) {
      toast.error('Failed to delete question');
    }
  };

  // Open Add Question Modal
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    const defaultCourse = selectedCourse || (courses[0]?._id || '');
    setQuestionForm({
      course: defaultCourse,
      module: selectedModule || '',
      lesson: selectedLesson || '',
      question: '',
      image: '',
      difficulty: 'medium',
      marks: 1,
      negativeMarks: 0,
      explanation: '',
      status: 'active',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });

    if (defaultCourse) {
      loadModalModules(defaultCourse);
    }
    setQuestionModalOpen(true);
  };

  // Open Edit Question Modal
  const handleOpenEditQuestion = (e, q) => {
    e.stopPropagation();
    setEditingQuestion(q);
    const courseId = q.course?._id || q.course || '';
    const modId = q.module?._id || q.module || q.chapter?._id || q.chapter || '';
    const lsnId = q.lesson?._id || q.lesson || q.topic?._id || q.topic || '';

    const opts = (q.options || []).map((o) => ({
      _id: o._id,
      text: o.text || '',
      isCorrect: Boolean(o.isCorrect)
    }));

    while (opts.length < 4) {
      opts.push({ text: '', isCorrect: false });
    }

    setQuestionForm({
      course: courseId,
      module: modId,
      lesson: lsnId,
      question: q.question || '',
      image: q.image || '',
      difficulty: q.difficulty || 'medium',
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks || 0,
      explanation: q.explanation || '',
      status: q.status || 'active',
      options: opts
    });

    if (courseId) {
      loadModalModules(courseId, modId);
    }
    setQuestionModalOpen(true);
  };

  const loadModalModules = async (cId, preselectModId) => {
    try {
      const res = await getModules({ course: cId });
      const mods = res.data || [];
      setModalModules(mods);
      const modToUse = preselectModId || mods[0]?._id || '';
      if (modToUse) {
        loadModalLessons(modToUse);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadModalLessons = async (mId) => {
    try {
      const res = await getLessons({ module: mId });
      setModalLessons(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleModalCourseChange = (cId) => {
    setQuestionForm((prev) => ({ ...prev, course: cId, module: '', lesson: '' }));
    loadModalModules(cId);
  };

  const handleModalModuleChange = (mId) => {
    setQuestionForm((prev) => ({ ...prev, module: mId, lesson: '' }));
    loadModalLessons(mId);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.course) {
      toast.error('Please select a course');
      return;
    }
    if (!questionForm.question.trim()) {
      toast.error('Question text is required');
      return;
    }

    const validOptions = questionForm.options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      toast.error('Please provide at least 2 valid options');
      return;
    }

    const hasCorrect = questionForm.options.some((o) => o.isCorrect && o.text.trim());
    if (!hasCorrect) {
      toast.error('Please mark at least one non-empty option as correct');
      return;
    }

    try {
      setModalSubmitting(true);
      const payload = {
        ...questionForm,
        options: questionForm.options.map((o) => ({
          text: o.text.trim(),
          isCorrect: Boolean(o.isCorrect)
        }))
      };

      if (editingQuestion) {
        await updateMCQ(editingQuestion._id, payload);
        toast.success('Question updated successfully');
      } else {
        await createMCQ(payload);
        toast.success('Question added to Question Bank');
      }

      setQuestionModalOpen(false);
      fetchMCQs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save question');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    return {
      total: mcqs.length,
      easy: mcqs.filter((q) => q.difficulty === 'easy').length,
      medium: mcqs.filter((q) => q.difficulty === 'medium').length,
      hard: mcqs.filter((q) => q.difficulty === 'hard').length
    };
  }, [mcqs]);

  // Client pagination
  const totalPages = Math.ceil(mcqs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMCQs = mcqs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Question Bank (MCQs)"
          subtitle="Centralized multiple choice questions repository organized by Course, Module and Lesson"
          icon={FiHelpCircle}
          actions={
            ['super_admin', 'admin'].includes(user.role) ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  icon={FiPlus}
                  onClick={handleOpenAddQuestion}
                >
                  Create Question
                </Button>
                <Button
                  variant="primary"
                  icon={FiLayers}
                  onClick={() => {
                    const query = selectedCourse ? `?courseId=${selectedCourse}` : '';
                    navigate(`/admin/mcqs/batch${query}`);
                  }}
                >
                  Batch Create MCQs
                </Button>
              </div>
            ) : ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? (
              <Button
                variant="primary"
                icon={FiPlus}
                onClick={() => navigate('/admin/exams/create')}
              >
                Create Exam
              </Button>
            ) : null
          }
        />

        {/* Question Bank Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Bank" tone="info" icon={FiHelpCircle} value={stats.total} />
          <StatCard title="Easy Questions" tone="success" icon={FiCheckCircle} value={stats.easy} />
          <StatCard title="Medium Questions" tone="warning" icon={FiCheckCircle} value={stats.medium} />
          <StatCard title="Hard Questions" tone="danger" icon={FiCheckCircle} value={stats.hard} />
        </div>

        {/* Filters */}
        <FilterBar>
          <div className="flex-1 flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <SearchInput
                placeholder="Search question keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>

            {/* Course Filter */}
            <SelectField
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="min-w-[170px]"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </SelectField>

            {/* Module Filter */}
            <SelectField
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              disabled={!selectedCourse}
              className="min-w-[150px]"
            >
              <option value="">All Modules</option>
              {modules.map((m) => (
                <option key={m._id} value={m._id}>
                  Module {m.order}: {m.title}
                </option>
              ))}
            </SelectField>

            {/* Lesson Filter */}
            <SelectField
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              disabled={!selectedModule}
              className="min-w-[140px]"
            >
              <option value="">All Lessons</option>
              {lessons.map((l) => (
                <option key={l._id} value={l._id}>
                  Lesson {l.order}: {l.title}
                </option>
              ))}
            </SelectField>

            {/* Difficulty Filter */}
            <SelectField
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-32"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </SelectField>

            {/* Status Filter */}
            <SelectField
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-28"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
          </div>

          <FilterBarActions>
            <Button variant="secondary" size="sm" onClick={toggleAll} disabled={mcqs.length === 0}>
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
          </FilterBarActions>
        </FilterBar>

        {/* Content Area */}
        {loading ? (
          <PageLoading message="Loading questions from Question Bank..." />
        ) : mcqs.length === 0 ? (
          <Card>
            <EmptyState
              icon={FiHelpCircle}
              title="No MCQs found"
              description="No questions match your current filter criteria. Try resetting filters or authoring new questions."
              action={
                user.role === 'super_admin' && (
                  <Button
                    icon={FiPlus}
                    onClick={() => {
                      const query = selectedCourse ? `?courseId=${selectedCourse}` : '';
                      navigate(`/admin/mcqs/batch${query}`);
                    }}
                  >
                    Add Questions Now
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {paginatedMCQs.map((q, idx) => {
              const isExpanded = Boolean(expandedMap[q._id]);
              const courseTitle = q.course?.title || '';
              const modTitle = q.module?.title || q.chapter?.title || '';
              const lsnTitle = q.lesson?.title || q.topic?.title || '';

              return (
                <div
                  key={q._id}
                  className={`bg-white rounded-xl border transition-all duration-150 shadow-xs overflow-hidden ${
                    isExpanded ? 'border-primary-400 ring-1 ring-primary-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Single Line Header - Zero Overlap Accordion */}
                  <div
                    onClick={() => toggleExpand(q._id)}
                    className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/80 transition"
                  >
                    {/* Left: Expand icon + Question Number + Truncated Text */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <FiChevronDown className="w-4 h-4 text-primary-600" />
                        ) : (
                          <FiChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        Q{startIndex + idx + 1}
                      </span>

                      <span className="text-sm font-semibold text-slate-800 truncate min-w-0 flex-1">
                        {q.question}
                      </span>
                    </div>

                    {/* Middle: Course/Module Badge, Difficulty, Marks, Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      {courseTitle && (
                        <span className="hidden xl:inline-flex text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[140px]">
                          {courseTitle}
                        </span>
                      )}

                      {modTitle && (
                        <span className="hidden md:inline-flex text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded truncate max-w-[130px] border border-primary-100">
                          {modTitle}
                        </span>
                      )}

                      <Badge
                        variant={DIFFICULTY_VARIANT[q.difficulty] || 'neutral'}
                        className="capitalize text-[11px] px-2 py-0.5"
                      >
                        {q.difficulty}
                      </Badge>

                      <span className="hidden sm:inline-flex text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {q.marks || 1} mk
                      </span>

                      <Badge
                        variant={q.status === 'active' ? 'success' : 'neutral'}
                        className="capitalize text-[11px] px-2 py-0.5 hidden sm:inline-flex"
                      >
                        {q.status || 'active'}
                      </Badge>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 pl-1">
                        <IconButton
                          icon={FiEye}
                          variant="ghost"
                          size="sm"
                          title="Preview options"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(q._id);
                          }}
                        />

                        {user.role === 'super_admin' && (
                          <>
                            <IconButton
                              icon={FiEdit2}
                              variant="ghost"
                              size="sm"
                              title="Edit Question"
                              onClick={(e) => handleOpenEditQuestion(e, q)}
                            />
                            <IconButton
                              icon={FiCopy}
                              variant="ghost"
                              size="sm"
                              title="Duplicate Question"
                              onClick={(e) => handleDuplicate(e, q._id)}
                            />
                            <IconButton
                              icon={FiTrash2}
                              variant="danger"
                              size="sm"
                              title="Delete Question"
                              onClick={(e) => handleDelete(e, q._id)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content View */}
                  {isExpanded && (
                    <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-100 space-y-4">
                      {/* Full question text */}
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Full Question
                        </div>
                        <p className="text-sm font-medium text-slate-900 leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* Question image if any */}
                      {q.image && (
                        <div>
                          <img
                            src={q.image}
                            alt="Question illustration"
                            className="max-h-48 rounded-lg border border-slate-200 object-contain"
                          />
                        </div>
                      )}

                      {/* Options Grid */}
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Answer Options
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(q.options || []).map((opt, optIdx) => {
                            const isCorrect = Boolean(opt.isCorrect);
                            const letter = String.fromCharCode(65 + optIdx);

                            return (
                              <div
                                key={opt._id || optIdx}
                                className={`p-3 rounded-xl text-sm font-medium flex items-center justify-between gap-2 border transition ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <span className="truncate">{opt.text}</span>
                                </div>

                                {isCorrect && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full shrink-0">
                                    <FiCheck className="w-3.5 h-3.5" /> Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                          <span className="font-bold">Explanation: </span>
                          {q.explanation}
                        </div>
                      )}

                      {/* Metadata Footer */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                        {courseTitle && (
                          <span>
                            <strong>Course:</strong> {courseTitle}
                          </span>
                        )}
                        {modTitle && (
                          <span>
                            <strong>Module:</strong> {modTitle}
                          </span>
                        )}
                        {lsnTitle && (
                          <span>
                            <strong>Lesson:</strong> {lsnTitle}
                          </span>
                        )}
                        <span>
                          <strong>Marks:</strong> {q.marks || 1}
                        </span>
                        {q.negativeMarks > 0 && (
                          <span>
                            <strong>Negative Marks:</strong> -{q.negativeMarks}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Card padded={false} className="overflow-hidden mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                  itemsPerPage={itemsPerPage}
                  totalItems={mcqs.length}
                  onItemsPerPageChange={(val) => {
                    setItemsPerPage(val);
                    setCurrentPage(1);
                  }}
                />
              </Card>
            )}
          </div>
        )}

        {/* Add / Edit Question Modal */}
        <Modal
          isOpen={questionModalOpen}
          onClose={() => setQuestionModalOpen(false)}
          title={editingQuestion ? 'Edit MCQ' : 'Create New MCQ'}
          size="lg"
        >
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <FormGrid cols={3}>
              <FormField label="Course *">
                <select
                  value={questionForm.course}
                  onChange={(e) => handleModalCourseChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Target Module">
                <select
                  value={questionForm.module}
                  onChange={(e) => handleModalModuleChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">General Course Question</option>
                  {modalModules.map((m) => (
                    <option key={m._id} value={m._id}>
                      Module {m.order}: {m.title}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Target Lesson">
                <select
                  value={questionForm.lesson}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, lesson: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">General Module Question</option>
                  {modalLessons.map((l) => (
                    <option key={l._id} value={l._id}>
                      Lesson {l.order}: {l.title}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormGrid>

            <FormField label="Question Statement *">
              <TextArea
                rows={3}
                placeholder="Enter the question statement clearly..."
                value={questionForm.question}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, question: e.target.value }))}
                required
              />
            </FormField>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Options & Correct Answer *
              </label>
              <div className="space-y-2">
                {questionForm.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  return (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                        opt.isCorrect
                          ? 'border-emerald-400 bg-emerald-50/50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.options.map((o, i) => ({
                            ...o,
                            isCorrect: i === optIdx
                          }));
                          setQuestionForm((prev) => ({ ...prev, options: updated }));
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition ${
                          opt.isCorrect
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Click to mark as correct answer"
                      >
                        {opt.isCorrect ? <FiCheck /> : letter}
                      </button>

                      <input
                        type="text"
                        placeholder={`Option ${letter} text...`}
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...questionForm.options];
                          updated[optIdx] = { ...updated[optIdx], text: e.target.value };
                          setQuestionForm((prev) => ({ ...prev, options: updated }));
                        }}
                        className="flex-1 px-3 py-1.5 bg-transparent border-0 text-sm text-slate-800 focus:outline-none"
                      />

                      <span className="text-xs font-semibold text-slate-400">
                        {opt.isCorrect ? (
                          <span className="text-emerald-700 font-bold">✓ Correct Answer</span>
                        ) : (
                          <span
                            onClick={() => {
                              const updated = questionForm.options.map((o, i) => ({
                                ...o,
                                isCorrect: i === optIdx
                              }));
                              setQuestionForm((prev) => ({ ...prev, options: updated }));
                            }}
                            className="cursor-pointer hover:text-slate-600"
                          >
                            Mark Correct
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <FormGrid cols={3}>
              <FormField label="Difficulty">
                <SelectField
                  value={questionForm.difficulty}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </SelectField>
              </FormField>

              <FormField label="Marks">
                <TextField
                  type="number"
                  min="1"
                  value={questionForm.marks}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, marks: Number(e.target.value) || 1 }))}
                />
              </FormField>

              <FormField label="Negative Marks">
                <TextField
                  type="number"
                  min="0"
                  step="0.25"
                  value={questionForm.negativeMarks}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, negativeMarks: Number(e.target.value) || 0 }))}
                />
              </FormField>
            </FormGrid>

            <FormField label="Explanation (Optional)">
              <TextArea
                rows={2}
                placeholder="Explain why the answer is correct (shown to students during review)..."
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setQuestionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={modalSubmitting}>
                {editingQuestion ? 'Update Question' : 'Save Question'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
