import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { toast } from 'react-toastify';
import {
  FiFileText, FiPlus, FiClock, FiCalendar, FiCheckCircle, FiTrash2, FiCopy,
  FiEye, FiBarChart2, FiRefreshCw, FiAlertTriangle, FiSliders, FiList, FiCheck, FiX, FiLayers,
  FiSearch, FiCheckSquare, FiSquare, FiEdit2, FiSend, FiPauseCircle, FiAward
} from 'react-icons/fi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, IconButton, Badge, StatusBadge, Card, Modal, FormField, FormGrid, TextField, TextArea,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty
} from '../../components/ui';
import { getCourses } from '../../api/courseApi';
import { getModules } from '../../api/curriculumApi';
import { getMCQs } from '../../api/mcqApi';
import {
  getExams, createExam, updateExam, deleteExam, copyExam, validateGeneration, generateExamDraft, replaceQuestion
} from '../../api/examApi';

export default function ManageExams() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ course: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Wizard Modal state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 = Details & Mode, 2 = Generation / Manual Selection
  const [wizardSubmitting, setWizardSubmitting] = useState(false);

  // Quick Publish / Status Control Modal state
  const [publishModalExam, setPublishModalExam] = useState(null);
  const [publishForm, setPublishForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    duration: 60
  });
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Wizard Course Modules
  const [wizardModules, setWizardModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  // Exam Details Form
  const [examForm, setExamForm] = useState({
    course: '',
    title: '',
    description: '',
    duration: 60,
    durationType: 'minutes',
    passPercentage: 60,
    startTime: '',
    endTime: '',
    maxAttempts: 1,
    negativeMarking: false,
    negativeMarksPerQuestion: 0,
    instructions: '',
    isFinalExam: false,
    mode: 'automatic' // 'automatic' | 'manual'
  });

  // Auto-Generation Settings
  const [genConfig, setGenConfig] = useState({
    selectedModuleIds: [],
    totalQuestions: 10,
    easy: 3,
    medium: 5,
    hard: 2
  });
  const [genValidating, setGenValidating] = useState(false);
  const [genValidationResult, setGenValidationResult] = useState(null);

  // Draft Generated Questions for Review
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [draftSummary, setDraftSummary] = useState(null);
  const [replacingQuestionId, setReplacingQuestionId] = useState(null);

  // Manual Selection Bank state
  const [manualBank, setManualBank] = useState([]);
  const [manualSelectedIds, setManualSelectedIds] = useState(new Set());
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualModuleFilter, setManualModuleFilter] = useState('all');
  const [manualDifficultyFilter, setManualDifficultyFilter] = useState('all');

  // Available modules computed from course wizardModules and manualBank
  const availableWizardModules = useMemo(() => {
    const map = new Map();
    (wizardModules || []).forEach((m) => {
      if (m && (m._id || m.id)) {
        const id = String(m._id || m.id);
        map.set(id, {
          _id: id,
          title: m.title || `Module ${m.order || ''}`,
          order: m.order ?? 99
        });
      }
    });

    (manualBank || []).forEach((q) => {
      const mod = q.module;
      if (mod && (mod._id || mod.id)) {
        const id = String(mod._id || mod.id);
        if (!map.has(id)) {
          map.set(id, {
            _id: id,
            title: mod.title || 'Module',
            order: mod.order ?? 99
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [wizardModules, manualBank]);

  // Question counts per module in manual bank
  const wizardModuleQuestionCounts = useMemo(() => {
    const counts = { all: manualBank.length, unassigned: 0 };
    (manualBank || []).forEach((q) => {
      const modId = q.module?._id || q.module?.id || (typeof q.module === 'string' ? q.module : null);
      if (modId) {
        const idStr = String(modId);
        counts[idStr] = (counts[idStr] || 0) + 1;
      } else {
        counts.unassigned = (counts.unassigned || 0) + 1;
      }
    });
    return counts;
  }, [manualBank]);

  // Filtered Manual Bank
  const filteredWizardManualBank = useMemo(() => {
    return (manualBank || []).filter((q) => {
      // 1. Module filter
      if (manualModuleFilter !== 'all') {
        const modId = q.module?._id || q.module?.id || (typeof q.module === 'string' ? q.module : null);
        if (manualModuleFilter === 'unassigned') {
          if (modId) return false;
        } else {
          if (String(modId) !== String(manualModuleFilter)) return false;
        }
      }

      // 2. Difficulty filter
      if (manualDifficultyFilter !== 'all') {
        if (q.difficulty !== manualDifficultyFilter) return false;
      }

      // 3. Search query
      if (manualSearch.trim()) {
        const query = manualSearch.toLowerCase();
        const matchesQuestion = (q.question || '').toLowerCase().includes(query);
        const matchesModule = (q.module?.title || '').toLowerCase().includes(query);
        const matchesOptions = (q.options || []).some((opt) => (opt.text || '').toLowerCase().includes(query));
        if (!matchesQuestion && !matchesModule && !matchesOptions) return false;
      }

      return true;
    });
  }, [manualBank, manualModuleFilter, manualDifficultyFilter, manualSearch]);

  // Selected stats
  const selectedWizardStats = useMemo(() => {
    let totalMarks = 0;
    (manualBank || []).forEach((q) => {
      if (manualSelectedIds.has(q._id)) {
        totalMarks += Number(q.marks || 1);
      }
    });
    return {
      count: manualSelectedIds.size,
      totalMarks
    };
  }, [manualBank, manualSelectedIds]);

  const handleSelectAllWizardFiltered = () => {
    const next = new Set(manualSelectedIds);
    filteredWizardManualBank.forEach((q) => next.add(q._id));
    setManualSelectedIds(next);
  };

  const handleDeselectAllWizardFiltered = () => {
    const next = new Set(manualSelectedIds);
    filteredWizardManualBank.forEach((q) => next.delete(q._id));
    setManualSelectedIds(next);
  };

  const isAllWizardFilteredSelected =
    filteredWizardManualBank.length > 0 &&
    filteredWizardManualBank.every((q) => manualSelectedIds.has(q._id));

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchExams();
  }, [filters.course, filters.status]);

  const fetchCourses = async () => {
    try {
      const res = await getCourses();
      setCourses(res.data || []);
    } catch (error) {
      console.error('Failed to load courses', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.course) params.course = filters.course;
      if (filters.status) params.status = filters.status;
      const res = await getExams(params);
      setExams(res.data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load exams', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const toLocalDateTimeInput = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const offsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const applyLiveSchedulePreset = () => {
    const now = Date.now();
    setPublishForm((prev) => ({
      ...prev,
      startTime: toLocalDateTimeInput(now),
      endTime: toLocalDateTimeInput(now + 24 * 60 * 60 * 1000)
    }));
  };

  const handleOpenPublishModal = (exam) => {
    const now = Date.now();
    const startMs = exam.startTime ? new Date(exam.startTime).getTime() : NaN;
    const durationMin = Number(exam.duration) || 60;
    const endMs = exam.endTime
      ? new Date(exam.endTime).getTime()
      : (!isNaN(startMs) ? startMs + durationMin * 60000 : NaN);

    const needsFreshSchedule = !exam.startTime || isNaN(endMs) || endMs <= now;

    setPublishForm({
      title: exam.title || '',
      duration: durationMin,
      startTime: needsFreshSchedule
        ? toLocalDateTimeInput(now)
        : toLocalDateTimeInput(exam.startTime),
      endTime: needsFreshSchedule
        ? toLocalDateTimeInput(now + 24 * 60 * 60 * 1000)
        : (exam.endTime ? toLocalDateTimeInput(exam.endTime) : toLocalDateTimeInput(startMs + 24 * 60 * 60 * 1000))
    });
    setPublishModalExam(exam);
  };

  const handleConfirmPublish = async (e) => {
    e.preventDefault();
    if (!publishModalExam) return;

    if (!publishForm.title.trim()) {
      toast.error('Exam title is required');
      return;
    }
    if (!publishForm.startTime) {
      toast.error('Start date & time is required');
      return;
    }

    const startDate = new Date(publishForm.startTime);
    const endDate = publishForm.endTime ? new Date(publishForm.endTime) : null;
    if (isNaN(startDate.getTime())) {
      toast.error('Invalid start date & time');
      return;
    }
    if (endDate && !isNaN(endDate.getTime()) && endDate.getTime() <= startDate.getTime()) {
      toast.error('End date & time must be after Start date & time');
      return;
    }
    if (endDate && !isNaN(endDate.getTime()) && endDate.getTime() <= Date.now()) {
      toast.error('End date & time must be in the future to publish live');
      return;
    }

    try {
      setStatusUpdatingId(publishModalExam._id);
      const isFutureStart = startDate.getTime() > Date.now();
      await updateExam(publishModalExam._id, {
        title: publishForm.title.trim(),
        duration: Number(publishForm.duration) || 60,
        startTime: startDate.toISOString(),
        endTime: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : undefined,
        status: isFutureStart ? 'scheduled' : 'active'
      });
      toast.success(isFutureStart ? 'Exam scheduled successfully!' : 'Exam published and is now Live!');
      setPublishModalExam(null);
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish exam');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleMoveToDraft = async (exam) => {
    if (!window.confirm(`Move "${exam.title}" back to Draft? Students will no longer see this exam until republished.`)) return;
    try {
      setStatusUpdatingId(exam._id);
      await updateExam(exam._id, { status: 'draft' });
      toast.success('Exam moved to Draft');
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update exam status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleCopyExam = async (examId) => {
    if (!window.confirm('Create a copy of this exam as a Draft?')) return;
    try {
      await copyExam(examId);
      toast.success('Exam copied as Draft! Click "Go Live" or "Edit" to schedule & publish.');
      if (filters.status && filters.status !== 'draft') {
        setFilters((prev) => ({ ...prev, status: '' }));
      } else {
        fetchExams();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to copy exam');
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam? This will also permanently delete all student submissions for this exam.')) return;
    try {
      await deleteExam(examId);
      toast.success('Exam deleted successfully');
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete exam');
    }
  };

  // Open Exam Creator (dedicated full-width page)
  const handleOpenCreateExam = () => {
    const courseParam = filters.course ? `?courseId=${filters.course}` : '';
    navigate(`/admin/exams/create${courseParam}`);
  };

  const loadWizardModules = async (cId) => {
    try {
      setModulesLoading(true);
      const res = await getModules({ course: cId });
      const mods = res.data || [];
      setWizardModules(mods);
      setGenConfig((prev) => ({
        ...prev,
        selectedModuleIds: mods.map((m) => m._id)
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setModulesLoading(false);
    }
  };

  const handleWizardCourseChange = (cId) => {
    const selectedC = courses.find((c) => c._id === cId);
    setExamForm((prev) => ({
      ...prev,
      course: cId,
      title: `${selectedC?.title || 'Course'} Assessment`
    }));
    loadWizardModules(cId);
    setGenValidationResult(null);
    setDraftQuestions([]);
  };

  // Toggle Module Selection for Auto-Gen
  const toggleModuleForGen = (modId) => {
    setGenConfig((prev) => {
      const exists = prev.selectedModuleIds.includes(modId);
      const next = exists
        ? prev.selectedModuleIds.filter((id) => id !== modId)
        : [...prev.selectedModuleIds, modId];
      return { ...prev, selectedModuleIds: next };
    });
    setGenValidationResult(null);
  };

  const selectAllModulesForGen = () => {
    setGenConfig((prev) => ({
      ...prev,
      selectedModuleIds: wizardModules.map((m) => m._id)
    }));
    setGenValidationResult(null);
  };

  const deselectAllModulesForGen = () => {
    setGenConfig((prev) => ({
      ...prev,
      selectedModuleIds: []
    }));
    setGenValidationResult(null);
  };

  // Validate Question Bank availability
  const handleValidateBank = async () => {
    if (!examForm.course) {
      toast.error('Please select a course first');
      return;
    }
    if (genConfig.selectedModuleIds.length === 0) {
      toast.warning('Please select at least one module for question generation.');
      return;
    }

    const requestedTotal = Number(genConfig.easy) + Number(genConfig.medium) + Number(genConfig.hard);
    if (requestedTotal <= 0) {
      toast.warning('Please specify question counts greater than 0.');
      return;
    }

    try {
      setGenValidating(true);
      const res = await validateGeneration({
        courseId: examForm.course,
        moduleIds: genConfig.selectedModuleIds,
        difficultyCounts: {
          easy: Number(genConfig.easy),
          medium: Number(genConfig.medium),
          hard: Number(genConfig.hard)
        }
      });
      setGenValidationResult(res.data);
      if (res.data?.canGenerate) {
        toast.success(`Bank has sufficient questions (${res.data.availableTotal} available)`);
      } else {
        toast.warning('Not enough questions in bank for the specified distribution.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to validate question bank');
    } finally {
      setGenValidating(false);
    }
  };

  // Generate Draft Questions
  const handleGenerateDraft = async () => {
    if (!examForm.course) {
      toast.error('Please select a course');
      return;
    }
    if (genConfig.selectedModuleIds.length === 0) {
      toast.warning('Please select at least one module.');
      return;
    }

    try {
      setWizardSubmitting(true);
      const res = await generateExamDraft({
        courseId: examForm.course,
        moduleIds: genConfig.selectedModuleIds,
        difficultyCounts: {
          easy: Number(genConfig.easy),
          medium: Number(genConfig.medium),
          hard: Number(genConfig.hard)
        }
      });

      const generatedQuestions = res.data?.draftQuestions || res.data?.questions || res.draftQuestions || res.questions || [];
      setDraftQuestions(generatedQuestions);
      setDraftSummary(res.data?.summary || res.data || res.summary || null);
      setWizardStep(2);
      toast.success(`Draft generated with ${generatedQuestions.length} questions!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Question generation failed');
    } finally {
      setWizardSubmitting(false);
    }
  };

  // Replace a Single Question
  const handleReplaceSingleQuestion = async (questionId) => {
    try {
      setReplacingQuestionId(questionId);
      const excludedIds = draftQuestions.map((q) => q._id);

      const res = await replaceQuestion({
        currentQuestionId: questionId,
        courseId: examForm.course,
        moduleIds: genConfig.selectedModuleIds,
        excludeQuestionIds: excludedIds
      });

      const replacement = res.data?.replacement;
      if (!replacement) {
        toast.info('No alternative question found in bank with same difficulty.');
        return;
      }

      setDraftQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? replacement : q))
      );
      toast.success('Question replaced successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to replace question');
    } finally {
      setReplacingQuestionId(null);
    }
  };

  // Fetch bank for Manual Selection
  const loadManualBank = async () => {
    if (!examForm.course) return;
    try {
      setManualLoading(true);
      const res = await getMCQs({ course: examForm.course });
      setManualBank(res.data || res.mcqs || []);
    } catch (err) {
      toast.error('Failed to load questions for manual selection');
    } finally {
      setManualLoading(false);
    }
  };

  const handleStep1Next = () => {
    if (!examForm.course) {
      toast.error('Please select a course for this assessment');
      return;
    }
    if (!examForm.title.trim()) {
      toast.error('Exam title is required');
      return;
    }
    if (!examForm.duration || Number(examForm.duration) < 1) {
      toast.error('Duration must be at least 1 minute');
      return;
    }

    if (examForm.mode === 'automatic') {
      handleGenerateDraft();
    } else {
      loadManualBank();
      setWizardStep(2);
    }
  };

  // Final Publish Exam
  const handleFinalPublishExam = async (status = 'scheduled') => {
    let questionIds = [];
    if (examForm.mode === 'automatic') {
      questionIds = draftQuestions.map((q) => q._id);
    } else {
      questionIds = Array.from(manualSelectedIds);
    }

    if (questionIds.length === 0) {
      toast.error('Cannot create an exam with 0 questions. Please add questions.');
      return;
    }

    try {
      setWizardSubmitting(true);
      const toIsoStringSafe = (dateStr) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) ? d.toISOString() : dateStr;
      };

      const payload = {
        title: examForm.title.trim(),
        description: examForm.description.trim(),
        course: examForm.course,
        duration: Number(examForm.duration),
        durationType: examForm.durationType,
        passPercentage: Number(examForm.passPercentage),
        startTime: toIsoStringSafe(examForm.startTime),
        endTime: toIsoStringSafe(examForm.endTime),
        maxAttempts: Number(examForm.maxAttempts) || 1,
        negativeMarking: Boolean(examForm.negativeMarking),
        negativeMarksPerQuestion: Number(examForm.negativeMarksPerQuestion) || 0,
        instructions: examForm.instructions,
        isFinalExam: Boolean(examForm.isFinalExam),
        questions: questionIds,
        status
      };

      await createExam(payload);
      toast.success(status === 'draft' ? 'Exam saved as draft' : 'Exam scheduled successfully!');
      setWizardOpen(false);
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setWizardSubmitting(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: exams.length,
      active: exams.filter((e) => e.status === 'active').length,
      scheduled: exams.filter((e) => e.status === 'scheduled').length,
      completed: exams.filter((e) => e.status === 'completed').length
    };
  }, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return exams.filter((exam) => {
      const matchesSearch =
        exam.title?.toLowerCase().includes(searchLower) ||
        exam.description?.toLowerCase().includes(searchLower) ||
        exam.course?.title?.toLowerCase().includes(searchLower);
      return matchesSearch;
    });
  }, [exams, searchTerm]);

  // Client pagination
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExams = filteredExams.slice(startIndex, startIndex + itemsPerPage);

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Assessments & Exams"
          subtitle="Manage examinations, auto-generate question papers from Question Bank, and track results"
          icon={FiFileText}
          actions={
            ['super_admin', 'franchise_admin'].includes(user.role) && (
              <Button icon={FiPlus} onClick={handleOpenCreateExam}>
                Create Exam
              </Button>
            )
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Exams" tone="info" icon={FiFileText} value={stats.total} />
          <StatCard title="Active Exams" tone="success" icon={FiCheckCircle} value={stats.active} />
          <StatCard title="Scheduled" tone="primary" icon={FiCalendar} value={stats.scheduled} />
          <StatCard title="Completed" tone="slate" icon={FiClock} value={stats.completed} />
        </div>

        {/* Filters */}
        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, description, or course..."
          />
          <FilterBarActions>
            <SelectField
              value={filters.course}
              onChange={(e) => setFilters((prev) => ({ ...prev, course: e.target.value }))}
              className="min-w-[170px]"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="min-w-[140px]"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        {/* Exams List (Responsive Desktop Table + Mobile/Tablet Cards) */}
        {loading ? (
          <PageLoading message="Loading assessments..." />
        ) : (
          <>
            {/* Desktop Table View (compact 5-column responsive layout - no right-edge clipping) */}
            <div className="hidden lg:block">
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Assessment &amp; Course</TableHeader>
                      <TableHeader>Configuration</TableHeader>
                      <TableHeader>Schedule</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader className="text-right">Actions</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {paginatedExams.length === 0 ? (
                      <TableEmpty
                        colSpan={5}
                        title="No assessments found"
                        description="Create a new exam or adjust your search filters."
                      />
                    ) : (
                      paginatedExams.map((exam) => {
                        const isDraft = exam.status === 'draft';
                        const isCompleted = exam.status === 'completed';
                        const isLiveOrScheduled = exam.status === 'active' || exam.status === 'scheduled';
                        const isUpdating = statusUpdatingId === exam._id;
                        const canManage = ['super_admin', 'franchise_admin'].includes(user.role);

                        return (
                          <TableRow key={exam._id}>
                            <TableCell className="!whitespace-normal min-w-[230px] max-w-[340px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/admin/exams/${exam._id}`)}
                                  className="text-sm font-semibold text-slate-900 hover:text-primary-600 transition text-left"
                                >
                                  {exam.title}
                                </button>
                                {exam.isFinalExam && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                    <FiAward className="w-2.5 h-2.5" /> Final
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {exam.course?.title || 'N/A'}
                                </span>
                                {exam.franchise?.name && (
                                  <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                    {exam.franchise.name}
                                  </span>
                                )}
                              </div>
                              {exam.description && (
                                <p className="text-xs text-slate-500 truncate mt-1">
                                  {exam.description}
                                </p>
                              )}
                            </TableCell>

                            <TableCell className="!whitespace-normal min-w-[180px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                                  <FiFileText className="w-3 h-3" />
                                  {exam.questions?.length || 0} MCQs
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                  <FiClock className="w-3 h-3 text-slate-400" />
                                  {exam.duration}m
                                </span>
                                <Badge variant="primary" className="!text-[11px]">
                                  Pass {exam.passPercentage || 60}%
                                </Badge>
                              </div>
                            </TableCell>

                            <TableCell className="!whitespace-normal min-w-[155px]">
                              <div className="text-xs text-slate-800 font-medium leading-snug">
                                <span className="text-slate-400 font-normal">Start: </span>
                                {formatDateTime(exam.startTime)}
                              </div>
                              {exam.endTime && (
                                <div className="text-[11px] text-danger-600 mt-0.5 leading-snug">
                                  <span className="text-slate-400">End: </span>
                                  {formatDateTime(exam.endTime)}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="!whitespace-normal min-w-[135px]">
                              <div className="flex flex-col items-start gap-1.5">
                                <StatusBadge status={exam.status} />
                                {canManage && isDraft && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleOpenPublishModal(exam)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition cursor-pointer disabled:opacity-60"
                                  >
                                    <FiSend className="w-3 h-3" />
                                    {isUpdating ? 'Updating...' : 'Go Live'}
                                  </button>
                                )}
                                {canManage && isCompleted && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleOpenPublishModal(exam)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition cursor-pointer disabled:opacity-60"
                                  >
                                    <FiRefreshCw className="w-2.5 h-2.5" />
                                    Republish
                                  </button>
                                )}
                                {canManage && isLiveOrScheduled && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleMoveToDraft(exam)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 transition cursor-pointer disabled:opacity-60"
                                  >
                                    <FiPauseCircle className="w-2.5 h-2.5" />
                                    Set Draft
                                  </button>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="inline-flex items-center justify-end gap-0.5">
                                {canManage && (
                                  <IconButton
                                    icon={FiEdit2}
                                    variant="primary"
                                    size="sm"
                                    title="Edit Exam"
                                    onClick={() => navigate(`/admin/exams/${exam._id}/edit`)}
                                  />
                                )}
                                <IconButton
                                  icon={FiEye}
                                  variant="success"
                                  size="sm"
                                  title="View Details"
                                  onClick={() => navigate(`/admin/exams/${exam._id}`)}
                                />
                                <IconButton
                                  icon={FiFileText}
                                  variant="ghost"
                                  size="sm"
                                  title="Preview Paper"
                                  onClick={() => navigate(`/admin/exams/preview/${exam._id}`)}
                                />
                                <IconButton
                                  icon={FiCopy}
                                  variant="ghost"
                                  size="sm"
                                  title="Copy Exam"
                                  onClick={() => handleCopyExam(exam._id)}
                                />
                                <IconButton
                                  icon={FiBarChart2}
                                  variant="ghost"
                                  size="sm"
                                  title="View Analytics"
                                  onClick={() => navigate(`/admin/exams/${exam._id}/analytics`)}
                                />
                                {user.role === 'super_admin' && (
                                  <IconButton
                                    icon={FiTrash2}
                                    variant="danger"
                                    size="sm"
                                    title="Delete Exam"
                                    onClick={() => handleDeleteExam(exam._id)}
                                  />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredExams.length}
                    onItemsPerPageChange={(val) => {
                      setItemsPerPage(val);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </TableWrapper>
            </div>

            {/* Mobile & Tablet Responsive Card View */}
            <div className="lg:hidden space-y-3">
              {paginatedExams.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">No assessments found</p>
                  <p className="text-xs text-slate-500 mt-1">Create a new exam or adjust your search filters.</p>
                </Card>
              ) : (
                paginatedExams.map((exam) => {
                  const isDraft = exam.status === 'draft';
                  const isCompleted = exam.status === 'completed';
                  const isLiveOrScheduled = exam.status === 'active' || exam.status === 'scheduled';
                  const isUpdating = statusUpdatingId === exam._id;
                  const canManage = ['super_admin', 'franchise_admin'].includes(user.role);

                  return (
                    <Card key={exam._id} className="p-4 border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900 break-words">{exam.title}</h3>
                            {exam.isFinalExam && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                <FiAward className="w-2.5 h-2.5" /> Final
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {exam.course?.title || 'N/A'}
                            </span>
                            {exam.franchise?.name && (
                              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                {exam.franchise.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={exam.status} />
                      </div>

                      {exam.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{exam.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                          <FiFileText className="w-3 h-3" /> {exam.questions?.length || 0} MCQs
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                          <FiClock className="w-3 h-3 text-slate-400" /> {exam.duration} min
                        </span>
                        <Badge variant="primary">Pass {exam.passPercentage || 60}%</Badge>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs space-y-0.5">
                        <div className="text-slate-700 font-medium">
                          <span className="text-slate-400">Starts: </span>{formatDateTime(exam.startTime)}
                        </div>
                        {exam.endTime && (
                          <div className="text-danger-600">
                            <span className="text-slate-400">Ends: </span>{formatDateTime(exam.endTime)}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {canManage && (isDraft || isCompleted) && (
                            <Button
                              size="sm"
                              icon={isDraft ? FiSend : FiRefreshCw}
                              onClick={() => handleOpenPublishModal(exam)}
                              loading={isUpdating}
                              className="!bg-emerald-600 hover:!bg-emerald-700"
                            >
                              {isDraft ? 'Go Live' : 'Republish'}
                            </Button>
                          )}
                          {canManage && isLiveOrScheduled && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={FiPauseCircle}
                              onClick={() => handleMoveToDraft(exam)}
                              loading={isUpdating}
                            >
                              Set Draft
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={FiEdit2}
                              onClick={() => navigate(`/admin/exams/${exam._id}/edit`)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={FiEye}
                            variant="success"
                            size="sm"
                            title="View Details"
                            onClick={() => navigate(`/admin/exams/${exam._id}`)}
                          />
                          <IconButton
                            icon={FiFileText}
                            variant="ghost"
                            size="sm"
                            title="Preview Paper"
                            onClick={() => navigate(`/admin/exams/preview/${exam._id}`)}
                          />
                          <IconButton
                            icon={FiCopy}
                            variant="ghost"
                            size="sm"
                            title="Copy Exam"
                            onClick={() => handleCopyExam(exam._id)}
                          />
                          <IconButton
                            icon={FiBarChart2}
                            variant="ghost"
                            size="sm"
                            title="Analytics"
                            onClick={() => navigate(`/admin/exams/${exam._id}/analytics`)}
                          />
                          {user.role === 'super_admin' && (
                            <IconButton
                              icon={FiTrash2}
                              variant="danger"
                              size="sm"
                              title="Delete Exam"
                              onClick={() => handleDeleteExam(exam._id)}
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}

              {totalPages > 1 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredExams.length}
                    onItemsPerPageChange={(val) => {
                      setItemsPerPage(val);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Smart Exam Creation Wizard Modal */}
        <Modal
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          title={
            wizardStep === 1
              ? 'Create Assessment: Step 1 of 2 (Exam Details & Mode)'
              : 'Create Assessment: Step 2 of 2 (Review & Finalize Questions)'
          }
          size="xl"
        >
          {wizardStep === 1 && (
            <div className="space-y-4">
              {/* Course Selection */}
              <FormField label="Target Course *">
                <select
                  value={examForm.course}
                  onChange={(e) => handleWizardCourseChange(e.target.value)}
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

              {/* Title & Description */}
              <FormGrid cols={2}>
                <FormField label="Exam Title *">
                  <TextField
                    placeholder="e.g. Mid-Term Examination"
                    value={examForm.title}
                    onChange={(e) => setExamForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </FormField>

                <FormField label="Pass Percentage (%) *">
                  <TextField
                    type="number"
                    min="1"
                    max="100"
                    value={examForm.passPercentage}
                    onChange={(e) => setExamForm((p) => ({ ...p, passPercentage: Number(e.target.value) || 60 }))}
                    required
                  />
                </FormField>
              </FormGrid>

              <FormField label="Description">
                <TextArea
                  rows={2}
                  placeholder="Exam objectives, topics covered, or notes..."
                  value={examForm.description}
                  onChange={(e) => setExamForm((p) => ({ ...p, description: e.target.value }))}
                />
              </FormField>

              {/* Timing */}
              <FormGrid cols={3}>
                <FormField label="Duration (Minutes) *">
                  <TextField
                    type="number"
                    min="5"
                    value={examForm.duration}
                    onChange={(e) => setExamForm((p) => ({ ...p, duration: Number(e.target.value) || 60 }))}
                    required
                  />
                </FormField>

                <FormField label="Start Date & Time *">
                  <TextField
                    type="datetime-local"
                    value={examForm.startTime}
                    onChange={(e) => setExamForm((p) => ({ ...p, startTime: e.target.value }))}
                    required
                  />
                </FormField>

                <FormField label="End Date & Time">
                  <TextField
                    type="datetime-local"
                    value={examForm.endTime}
                    onChange={(e) => setExamForm((p) => ({ ...p, endTime: e.target.value }))}
                  />
                </FormField>
              </FormGrid>

              {/* Final Examination Toggle */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl border border-amber-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">★</span>
                    <label htmlFor="wizard-isFinalExam" className="text-xs font-bold text-amber-950 uppercase tracking-wider cursor-pointer">
                      Course Completion Final Examination (Marksheet & Certificate)
                    </label>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed pl-7">
                    Enable this if this is the final exam for the course. Upon passing, the system automatically generates the student's official Marksheet and Certificate with all module assessment scores and aggregate grade.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    id="wizard-isFinalExam"
                    checked={examForm.isFinalExam || false}
                    onChange={(e) => setExamForm((p) => ({ ...p, isFinalExam: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Question Selection Mode Toggle */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Question Source & Selection Mode *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setExamForm((p) => ({ ...p, mode: 'automatic' }))}
                    className={`p-3.5 rounded-xl border cursor-pointer transition select-none flex items-start gap-3 ${
                      examForm.mode === 'automatic'
                        ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-primary-100 text-primary-700 shrink-0">
                      <FiSliders className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Automatic Smart Generation
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        System selects questions from the Question Bank based on difficulty and module breakdown.
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setExamForm((p) => ({ ...p, mode: 'manual' }))}
                    className={`p-3.5 rounded-xl border cursor-pointer transition select-none flex items-start gap-3 ${
                      examForm.mode === 'manual'
                        ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                      <FiList className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Manual Question Bank Selection
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Select specific questions individually from the course Question Bank.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-Generation Settings (when mode === 'automatic') */}
              {examForm.mode === 'automatic' && (
                <div className="space-y-4 p-4 bg-primary-50/40 rounded-xl border border-primary-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary-900 uppercase tracking-wider">
                      Target Modules for Generation
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllModulesForGen}
                        className="text-xs text-primary-700 font-semibold hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={deselectAllModulesForGen}
                        className="text-xs text-slate-500 font-semibold hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {modulesLoading ? (
                    <div className="text-xs text-slate-500">Loading modules...</div>
                  ) : wizardModules.length === 0 ? (
                    <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      No modules found for this course. Questions will be drawn from general course question bank.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {wizardModules.map((mod) => {
                        const checked = genConfig.selectedModuleIds.includes(mod._id);
                        return (
                          <label
                            key={mod._id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                              checked
                                ? 'bg-white border-primary-400 font-semibold text-primary-900 shadow-2xs'
                                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleModuleForGen(mod._id)}
                              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                            />
                            <span className="truncate">
                              Module {mod.order}: {mod.title}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Difficulty Breakdown */}
                  <div>
                    <label className="block text-xs font-bold text-primary-900 uppercase tracking-wider mb-2">
                      Question Count by Difficulty
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="block text-xs font-bold text-emerald-700 mb-1">
                          Easy Questions
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={genConfig.easy}
                          onChange={(e) =>
                            setGenConfig((p) => ({ ...p, easy: Math.max(0, parseInt(e.target.value) || 0) }))
                          }
                          className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-sm font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-amber-700 mb-1">
                          Medium Questions
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={genConfig.medium}
                          onChange={(e) =>
                            setGenConfig((p) => ({ ...p, medium: Math.max(0, parseInt(e.target.value) || 0) }))
                          }
                          className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-red-700 mb-1">
                          Hard Questions
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={genConfig.hard}
                          onChange={(e) =>
                            setGenConfig((p) => ({ ...p, hard: Math.max(0, parseInt(e.target.value) || 0) }))
                          }
                          className="w-full px-3 py-1.5 bg-white border border-red-200 rounded-xl text-sm font-bold text-red-900 focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
                      <span>
                        Total exam questions:{' '}
                        <strong className="text-primary-700 font-bold">
                          {Number(genConfig.easy) + Number(genConfig.medium) + Number(genConfig.hard)}
                        </strong>
                      </span>

                      <Button
                        variant="secondary"
                        size="xs"
                        loading={genValidating}
                        onClick={handleValidateBank}
                      >
                        Check Bank Availability
                      </Button>
                    </div>

                    {genValidationResult && (
                      <div
                        className={`mt-2 p-2.5 rounded-lg text-xs border ${
                          genValidationResult.canGenerate
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          {genValidationResult.canGenerate ? (
                            <FiCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <FiAlertTriangle className="w-4 h-4 text-amber-600" />
                          )}
                          {genValidationResult.canGenerate
                            ? 'Sufficient questions available in Question Bank!'
                            : 'Insufficient questions in Question Bank!'}
                        </div>
                        <div className="mt-1 flex gap-3 text-[11px]">
                          <span>Easy: {genValidationResult.availableEasy} avail</span>
                          <span>Med: {genValidationResult.availableMedium} avail</span>
                          <span>Hard: {genValidationResult.availableHard} avail</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setWizardOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStep1Next} loading={wizardSubmitting}>
                  {examForm.mode === 'automatic'
                    ? 'Generate & Review Questions →'
                    : 'Select Questions from Bank →'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Review Generated Draft or Manual Selection */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              {examForm.mode === 'automatic' ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-primary-50 rounded-xl border border-primary-100">
                    <div>
                      <div className="text-sm font-bold text-primary-950">
                        Generated {draftQuestions.length} Questions for Assessment
                      </div>
                      <div className="text-xs text-primary-700">
                        Review the questions below. Click &quot;Replace Question&quot; if you want to swap any question with another from the same difficulty pool.
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FiRefreshCw}
                      onClick={handleGenerateDraft}
                      loading={wizardSubmitting}
                    >
                      Regenerate All
                    </Button>
                  </div>

                  {/* Question Cards List */}
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {draftQuestions.map((q, qIdx) => (
                      <div
                        key={q._id}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Q{qIdx + 1}
                            </span>
                            <Badge
                              variant={
                                q.difficulty === 'easy'
                                  ? 'success'
                                  : q.difficulty === 'hard'
                                  ? 'danger'
                                  : 'warning'
                              }
                              className="capitalize text-[11px]"
                            >
                              {q.difficulty}
                            </Badge>
                            <span className="text-xs text-slate-500 font-medium">
                              {q.marks || 1} mark
                            </span>
                            {q.module?.title && (
                              <span className="text-[11px] text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                                {q.module.title}
                              </span>
                            )}
                          </div>

                          <Button
                            variant="secondary"
                            size="xs"
                            icon={FiRefreshCw}
                            loading={replacingQuestionId === q._id}
                            onClick={() => handleReplaceSingleQuestion(q._id)}
                            title="Replace this question with another matching question from the bank"
                          >
                            Replace Question
                          </Button>
                        </div>

                        <div className="text-sm font-semibold text-slate-800">
                          {q.question}
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {(q.options || []).map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg border ${
                                opt.isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="font-bold mr-1.5">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              {opt.text}
                              {opt.isCorrect && (
                                <span className="ml-1 text-emerald-700 font-bold">✓</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Manual Selection Mode with Comprehensive Module Filtering */
                <div className="space-y-3.5">
                  {/* Header & Stats Bar */}
                  <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-lg bg-primary-600 text-white text-xs font-bold shadow-xs">
                        Selected: {selectedWizardStats.count} Questions
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        Total: <strong className="text-slate-800">{selectedWizardStats.totalMarks} Marks</strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-500">
                        Showing {filteredWizardManualBank.length} of {manualBank.length} questions
                      </span>
                    </div>

                    {/* Batch Select / Deselect for currently filtered questions */}
                    <div className="flex items-center gap-2">
                      {filteredWizardManualBank.length > 0 && (
                        <button
                          type="button"
                          onClick={isAllWizardFilteredSelected ? handleDeselectAllWizardFiltered : handleSelectAllWizardFiltered}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border inline-flex items-center gap-1.5 ${
                            isAllWizardFilteredSelected
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-primary-50 hover:bg-primary-100 text-primary-800 border-primary-300'
                          }`}
                        >
                          {isAllWizardFilteredSelected ? (
                            <>
                              <FiSquare className="w-3.5 h-3.5" />
                              <span>Deselect All in This View ({filteredWizardManualBank.length})</span>
                            </>
                          ) : (
                            <>
                              <FiCheckSquare className="w-3.5 h-3.5" />
                              <span>Select All in This View ({filteredWizardManualBank.length})</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Controls: Module Dropdown, Search Input, Difficulty Filter */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      {/* Search Input */}
                      <div className="relative flex-1 w-full">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          value={manualSearch}
                          onChange={(e) => setManualSearch(e.target.value)}
                          placeholder="Search question keyword in English or Hindi..."
                          className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        {manualSearch && (
                          <button
                            type="button"
                            onClick={() => setManualSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Module Filter Dropdown */}
                      <div className="w-full sm:w-64">
                        <select
                          value={manualModuleFilter}
                          onChange={(e) => setManualModuleFilter(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="all">
                            📂 All Modules ({wizardModuleQuestionCounts.all || manualBank.length})
                          </option>
                          {availableWizardModules.map((m) => (
                            <option key={m._id} value={m._id}>
                              📖 {m.title} ({wizardModuleQuestionCounts[m._id] || 0})
                            </option>
                          ))}
                          {wizardModuleQuestionCounts.unassigned > 0 && (
                            <option value="unassigned">
                              📁 Unassigned Module ({wizardModuleQuestionCounts.unassigned})
                            </option>
                          )}
                        </select>
                      </div>

                      {/* Difficulty Filter Dropdown */}
                      <div className="w-full sm:w-36">
                        <select
                          value={manualDifficultyFilter}
                          onChange={(e) => setManualDifficultyFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="all">All Difficulties</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Question Cards List */}
                  {manualLoading ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Loading Question Bank...
                    </div>
                  ) : manualBank.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No questions found in this course Question Bank.
                    </div>
                  ) : filteredWizardManualBank.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-semibold text-slate-600">
                        No questions match the selected module or filter criteria.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setManualModuleFilter('all');
                          setManualDifficultyFilter('all');
                          setManualSearch('');
                        }}
                        className="mt-2 text-xs font-bold text-primary-600 hover:underline"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {filteredWizardManualBank.map((q, idx) => {
                        const isSelected = manualSelectedIds.has(q._id);
                        return (
                          <div
                            key={q._id}
                            onClick={() => {
                              setManualSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(q._id)) {
                                  next.delete(q._id);
                                } else {
                                  next.add(q._id);
                                }
                                return next;
                              });
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition select-none flex items-start gap-3 ${
                              isSelected
                                ? 'bg-primary-50/70 border-primary-400 ring-1 ring-primary-400/20 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-800 leading-snug">
                                {q.question}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                                  <FiLayers className="w-3 h-3" />
                                  <span>Module: {q.module?.title || 'Unassigned'}</span>
                                </span>
                                <span>•</span>
                                <Badge
                                  variant={
                                    q.difficulty === 'easy'
                                      ? 'success'
                                      : q.difficulty === 'hard'
                                      ? 'danger'
                                      : 'warning'
                                  }
                                  className="capitalize text-[10px]"
                                >
                                  {q.difficulty}
                                </Badge>
                                <span>•</span>
                                <span className="font-medium text-slate-600">
                                  {q.marks || 1} mark
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Wizard Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button
                  variant="secondary"
                  onClick={() => setWizardStep(1)}
                  disabled={wizardSubmitting}
                >
                  ← Back to Settings
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => handleFinalPublishExam('draft')}
                    loading={wizardSubmitting}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleFinalPublishExam('scheduled')}
                    loading={wizardSubmitting}
                  >
                    Publish Assessment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Quick Publish & Go Live Modal */}
        <Modal
          isOpen={Boolean(publishModalExam)}
          onClose={() => setPublishModalExam(null)}
          title={
            publishModalExam?.status === 'draft'
              ? 'Publish Draft Exam (Go Live)'
              : 'Republish & Reschedule Exam'
          }
          size="md"
        >
          {publishModalExam && (
            <form onSubmit={handleConfirmPublish} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                Publishing makes <strong>{publishModalExam.questions?.length || 0} questions</strong> available to eligible students in{' '}
                <strong>{publishModalExam.course?.title || 'this course'}</strong> during the selected schedule window.
              </div>

              <FormField label="Exam Title *">
                <TextField
                  value={publishForm.title}
                  onChange={(e) => setPublishForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Enter exam title"
                  required
                />
              </FormField>

              <FormGrid cols={2}>
                <FormField label="Start Date & Time *">
                  <TextField
                    type="datetime-local"
                    value={publishForm.startTime}
                    onChange={(e) => setPublishForm((p) => ({ ...p, startTime: e.target.value }))}
                    required
                  />
                </FormField>

                <FormField label="End Date & Time">
                  <TextField
                    type="datetime-local"
                    value={publishForm.endTime}
                    onChange={(e) => setPublishForm((p) => ({ ...p, endTime: e.target.value }))}
                  />
                </FormField>
              </FormGrid>

              <div className="flex items-center justify-between gap-3">
                <FormField label="Duration (Minutes)" className="w-40">
                  <TextField
                    type="number"
                    min="5"
                    value={publishForm.duration}
                    onChange={(e) => setPublishForm((p) => ({ ...p, duration: Number(e.target.value) || 60 }))}
                    required
                  />
                </FormField>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={applyLiveSchedulePreset}
                  className="mt-5"
                >
                  Reset: Start Now → +24h
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPublishModalExam(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const id = publishModalExam._id;
                    setPublishModalExam(null);
                    navigate(`/admin/exams/${id}/edit`);
                  }}
                >
                  Open Full Editor
                </Button>
                <Button
                  type="submit"
                  icon={FiSend}
                  loading={statusUpdatingId === publishModalExam._id}
                  className="!bg-emerald-600 hover:!bg-emerald-700"
                >
                  Publish Exam Now
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
