import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiArrowLeft, FiSave, FiCheck, FiX, FiRefreshCw, FiSliders, FiList,
  FiFileText, FiCalendar, FiClock, FiLayers, FiSearch, FiCheckSquare,
  FiSquare, FiAlertCircle, FiHelpCircle, FiChevronRight, FiCheckCircle, FiSend
} from 'react-icons/fi';
import {
  Card, Button, Badge, StatusBadge, FormField, FormGrid, TextField, TextArea, SelectField,
  StatCard, EmptyState, PageLoading
} from '../../components/ui';
import { getCourses } from '../../api/courseApi';
import { getModules } from '../../api/curriculumApi';
import { getMCQs } from '../../api/mcqApi';
import { getAllFranchises } from '../../api/campusApi';
import {
  createExam, getExam, updateExam, validateGeneration, generateExamDraft, replaceQuestion
} from '../../api/examApi';

const toLocalDateTimeInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
};

export default function CreateExam() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const isEditMode = Boolean(examId);
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  // Core metadata
  const [courses, setCourses] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Stepper: 1 = Exam Settings & Mode, 2 = Questions Finalization
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Course modules & question bank for the selected course
  const [courseModules, setCourseModules] = useState([]);
  const [courseMCQs, setCourseMCQs] = useState([]);
  const [loadingCourseData, setLoadingCourseData] = useState(false);

  // Exam Form State
  const now = new Date();
  const defaultStart = toLocalDateTimeInput(now.getTime() + 60 * 60 * 1000);
  const defaultEnd = toLocalDateTimeInput(now.getTime() + 24 * 60 * 60 * 1000);

  const [examForm, setExamForm] = useState({
    course: initialCourseId,
    franchise: '', // empty = all schools
    title: '',
    description: '',
    duration: 60,
    durationType: 'minutes',
    passPercentage: 60,
    startTime: defaultStart,
    endTime: defaultEnd,
    maxAttempts: 1,
    negativeMarking: false,
    negativeMarksPerQuestion: 0,
    instructions: 'Please answer all questions carefully before submitting.',
    isFinalExam: false,
    status: 'active',
    mode: 'automatic' // 'automatic' | 'manual'
  });

  // Auto-generation config
  const [genConfig, setGenConfig] = useState({
    selectedModuleIds: [],
    totalQuestions: 10,
    easy: 3,
    medium: 5,
    hard: 2
  });
  const [genValidating, setGenValidating] = useState(false);
  const [genValidationResult, setGenValidationResult] = useState(null);

  // Step 2 Draft Questions (for automatic mode)
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [draftSummary, setDraftSummary] = useState(null);
  const [replacingQuestionId, setReplacingQuestionId] = useState(null);

  // Step 2 Manual Selection State (for manual mode)
  const [manualSelectedIds, setManualSelectedIds] = useState(new Set());
  const [manualModuleFilter, setManualModuleFilter] = useState('all');
  const [manualDifficultyFilter, setManualDifficultyFilter] = useState('all');
  const [manualSearch, setManualSearch] = useState('');

  // 1. Initial Load: Courses, Schools, and Existing Exam (if Edit Mode)
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoadingInitial(true);
        const requests = [
          getCourses().catch(() => ({ data: [] })),
          getAllFranchises().catch(() => ({ data: [] }))
        ];
        if (isEditMode) {
          requests.push(getExam(examId));
        }

        const [cRes, fRes, exRes] = await Promise.all(requests);

        const cList = cRes.data || [];
        setCourses(cList);
        setFranchises(fRes.data || []);

        if (isEditMode && exRes?.data) {
          const examDoc = exRes.data;
          const examCourseId =
            typeof examDoc.course === 'object' ? examDoc.course?._id : (examDoc.course || '');
          const examFranchiseId =
            typeof examDoc.franchise === 'object' ? examDoc.franchise?._id : (examDoc.franchise || '');
          const existingQs = Array.isArray(examDoc.questions) ? examDoc.questions : [];
          const existingQIds = existingQs.map((q) => (typeof q === 'object' ? q._id : q)).filter(Boolean);
          const storedGenMode = examDoc.generationConfig?.mode;
          const resolvedMode =
            storedGenMode === 'automatic' || storedGenMode === 'auto'
              ? 'automatic'
              : 'manual';

          setExamForm({
            course: examCourseId,
            franchise: examFranchiseId,
            title: examDoc.title || '',
            description: examDoc.description || '',
            duration: Number(examDoc.duration) || 60,
            durationType: 'minutes',
            passPercentage: Number(examDoc.passPercentage) || 60,
            startTime: toLocalDateTimeInput(examDoc.startTime),
            endTime: toLocalDateTimeInput(examDoc.endTime),
            maxAttempts: Number(examDoc.maxAttempts) || 1,
            negativeMarking: Boolean(examDoc.negativeMarking),
            negativeMarksPerQuestion: Number(examDoc.negativeMarksPerQuestion) || 0,
            instructions: examDoc.instructions || '',
            isFinalExam: Boolean(examDoc.isFinalExam),
            status: examDoc.status || 'draft',
            mode: resolvedMode
          });

          if (examCourseId) {
            setLoadingCourseData(true);
            const [modRes, mcqRes] = await Promise.all([
              getModules({ course: examCourseId }).catch(() => ({ data: [] })),
              getMCQs({ course: examCourseId, limit: 1000 }).catch(() => ({ data: [] }))
            ]);
            const mods = modRes.data || [];
            const mcqs = mcqRes.data || mcqRes.mcqs || [];
            setCourseModules(mods);
            setCourseMCQs(mcqs);

            const savedModuleIds = Array.isArray(examDoc.generationConfig?.modules)
              ? examDoc.generationConfig.modules.map((m) => String(typeof m === 'object' ? m._id : m))
              : [];

            setGenConfig({
              selectedModuleIds:
                savedModuleIds.length > 0 ? savedModuleIds : mods.map((m) => m._id),
              totalQuestions:
                Number(examDoc.generationConfig?.totalQuestions) || existingQIds.length || 10,
              easy: examDoc.generationConfig?.difficultyDistribution?.easy ?? 3,
              medium: examDoc.generationConfig?.difficultyDistribution?.medium ?? 5,
              hard: examDoc.generationConfig?.difficultyDistribution?.hard ?? 2
            });

            // Preserve existing exam questions in both modes so editing never drops questions
            setManualSelectedIds(new Set(existingQIds.map(String)));
            const populatedExistingQs = existingQs.map((q) => {
              if (typeof q === 'object' && q.question) return q;
              const qId = String(typeof q === 'object' ? q._id : q);
              return mcqs.find((m) => String(m._id) === qId) || q;
            });
            setDraftQuestions(populatedExistingQs);
            setLoadingCourseData(false);
          }
        } else {
          const targetCourseId = initialCourseId || (cList[0]?._id || '');
          if (targetCourseId) {
            setExamForm((prev) => ({
              ...prev,
              course: targetCourseId
            }));
            await handleCourseSelection(targetCourseId, cList);
          }
        }
      } catch (err) {
        console.error('Failed to initialize exam form', err);
        toast.error(isEditMode ? 'Failed to load exam details' : 'Failed to initialize exam creator');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadInitial();
  }, [initialCourseId, examId, isEditMode]);

  // Quick helper to set schedule Live Now -> +24h
  const handleSetLiveScheduleNow = () => {
    const nowMs = Date.now();
    setExamForm((prev) => ({
      ...prev,
      startTime: toLocalDateTimeInput(nowMs),
      endTime: toLocalDateTimeInput(nowMs + 24 * 60 * 60 * 1000)
    }));
    toast.info('Schedule set to Start Now and End in 24 hours');
  };

  // When course changes, load modules & questions
  const handleCourseSelection = async (cId, courseList = courses) => {
    if (!cId) {
      setCourseModules([]);
      setCourseMCQs([]);
      setGenConfig((p) => ({ ...p, selectedModuleIds: [] }));
      return;
    }

    try {
      setLoadingCourseData(true);
      const selectedCourseObj = courseList.find((c) => String(c._id) === String(cId));

      // Auto update title if blank or generic (Create mode only)
      if (!isEditMode && (!examForm.title || examForm.title.includes('Assessment'))) {
        const titlePrefix = selectedCourseObj ? `${selectedCourseObj.title} - ` : '';
        setExamForm((p) => ({
          ...p,
          course: cId,
          title: `${titlePrefix}Assessment Examination`
        }));
      } else {
        setExamForm((p) => ({ ...p, course: cId }));
      }

      const [modRes, mcqRes] = await Promise.all([
        getModules({ course: cId }).catch(() => ({ data: [] })),
        getMCQs({ course: cId, limit: 1000 }).catch(() => ({ data: [] }))
      ]);

      const mods = modRes.data || [];
      const mcqs = mcqRes.data || mcqRes.mcqs || [];

      setCourseModules(mods);
      setCourseMCQs(mcqs);

      // Pre-select all modules for auto-generation
      setGenConfig((prev) => ({
        ...prev,
        selectedModuleIds: mods.map((m) => m._id)
      }));

      // Reset step 2 selections when user changes course
      setManualSelectedIds(new Set());
      setDraftQuestions([]);
      setDraftSummary(null);
      setGenValidationResult(null);
    } catch (err) {
      console.error('Failed to load course details', err);
      toast.error('Failed to load course modules or questions');
    } finally {
      setLoadingCourseData(false);
    }
  };

  // Module question counts
  const moduleQuestionCounts = useMemo(() => {
    const counts = { all: courseMCQs.length };
    courseMCQs.forEach((q) => {
      const mId = typeof q.module === 'object' ? q.module?._id : q.module || (typeof q.chapter === 'object' ? q.chapter?._id : q.chapter);
      if (mId) {
        counts[String(mId)] = (counts[String(mId)] || 0) + 1;
      }
    });
    return counts;
  }, [courseMCQs]);

  // Filtered manual bank based on search, module, difficulty
  const filteredManualBank = useMemo(() => {
    return courseMCQs.filter((q) => {
      // 1. Module filter
      if (manualModuleFilter !== 'all') {
        const mId = typeof q.module === 'object' ? q.module?._id : q.module;
        const chapId = typeof q.chapter === 'object' ? q.chapter?._id : q.chapter;
        const target = String(manualModuleFilter);
        if (String(mId) !== target && String(chapId) !== target) return false;
      }
      // 2. Difficulty filter
      if (manualDifficultyFilter !== 'all') {
        if (q.difficulty !== manualDifficultyFilter) return false;
      }
      // 3. Search query
      if (manualSearch.trim()) {
        const query = manualSearch.toLowerCase();
        const matchesQuestion = q.question?.toLowerCase().includes(query);
        const matchesModule = (typeof q.module === 'object' ? q.module?.title : '')?.toLowerCase().includes(query);
        if (!matchesQuestion && !matchesModule) return false;
      }
      return true;
    });
  }, [courseMCQs, manualModuleFilter, manualDifficultyFilter, manualSearch]);

  // Selected stats for manual mode
  const manualSelectedStats = useMemo(() => {
    const selectedList = courseMCQs.filter((q) => manualSelectedIds.has(q._id));
    const totalMarks = selectedList.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    const passMarks = Math.ceil((totalMarks * (Number(examForm.passPercentage) || 60)) / 100);
    return {
      count: selectedList.length,
      totalMarks,
      passMarks
    };
  }, [courseMCQs, manualSelectedIds, examForm.passPercentage]);

  // Auto-generation Validation
  const handleValidateAutoConfig = async () => {
    if (!examForm.course) {
      toast.error('Please select a course first');
      return;
    }
    setGenValidating(true);
    try {
      const res = await validateGeneration({
        course: examForm.course,
        moduleIds: genConfig.selectedModuleIds,
        totalQuestions: Number(genConfig.totalQuestions) || 10,
        difficultyDistribution: {
          easy: Number(genConfig.easy) || 0,
          medium: Number(genConfig.medium) || 0,
          hard: Number(genConfig.hard) || 0
        }
      });
      setGenValidationResult(res);
      if (!res.valid && res.issues?.length > 0) {
        toast.warning(res.issues[0]);
      } else {
        toast.success(`Blueprint validated! ${res.availableCounts?.total || 0} eligible questions found.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to validate question availability');
    } finally {
      setGenValidating(false);
    }
  };

  // Step 1 -> Step 2
  const handleProceedToStep2 = async () => {
    if (!examForm.course) {
      toast.error('Please select a target course');
      return;
    }
    if (!examForm.title.trim()) {
      toast.error('Please provide an exam title');
      return;
    }
    if (!examForm.duration || Number(examForm.duration) < 5) {
      toast.error('Duration must be at least 5 minutes');
      return;
    }
    if (!examForm.startTime) {
      toast.error('Start date & time is required');
      return;
    }

    if (examForm.mode === 'automatic') {
      // When editing an existing auto-generated exam that already has loaded questions,
      // preserve those questions into Step 2 (admin can still click "Regenerate All" if desired).
      if (isEditMode && draftQuestions.length > 0) {
        setCurrentStep(2);
        return;
      }

      const sumDist = (Number(genConfig.easy) || 0) + (Number(genConfig.medium) || 0) + (Number(genConfig.hard) || 0);
      if (sumDist !== Number(genConfig.totalQuestions)) {
        toast.error(`Difficulty breakdown sum (${sumDist}) must equal Total Questions (${genConfig.totalQuestions})`);
        return;
      }
      if (genConfig.selectedModuleIds.length === 0) {
        toast.error('Select at least one module for question generation');
        return;
      }

      try {
        setSubmitting(true);
        const res = await generateExamDraft({
          course: examForm.course,
          moduleIds: genConfig.selectedModuleIds,
          totalQuestions: Number(genConfig.totalQuestions),
          difficultyDistribution: {
            easy: Number(genConfig.easy) || 0,
            medium: Number(genConfig.medium) || 0,
            hard: Number(genConfig.hard) || 0
          }
        });

        const generatedQuestions = res.data?.draftQuestions || res.data?.questions || res.draftQuestions || res.questions || [];
        setDraftQuestions(generatedQuestions);
        setDraftSummary(res.data?.summary || res.data || res.summary || null);
        setCurrentStep(2);
        toast.success(`Generated ${generatedQuestions.length} questions for review!`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to generate questions. Check bank size.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Manual Mode
      if (courseMCQs.length === 0) {
        toast.warning('No MCQs available in this course. You can still create questions later in the Question Bank.');
      }
      setCurrentStep(2);
    }
  };

  // Regenerate all draft questions
  const handleRegenerateAll = async () => {
    try {
      setSubmitting(true);
      const res = await generateExamDraft({
        course: examForm.course,
        moduleIds: genConfig.selectedModuleIds,
        totalQuestions: Number(genConfig.totalQuestions),
        difficultyDistribution: {
          easy: Number(genConfig.easy) || 0,
          medium: Number(genConfig.medium) || 0,
          hard: Number(genConfig.hard) || 0
        }
      });
      const generatedQuestions = res.data?.draftQuestions || res.data?.questions || res.draftQuestions || res.questions || [];
      setDraftQuestions(generatedQuestions);
      setDraftSummary(res.data?.summary || res.data || res.summary || null);
      toast.success('Regenerated questions successfully!');
    } catch (err) {
      toast.error('Failed to regenerate questions');
    } finally {
      setSubmitting(false);
    }
  };

  // Replace single question
  const handleReplaceSingleQuestion = async (qId) => {
    try {
      setReplacingQuestionId(qId);
      const existingIds = draftQuestions.map((q) => q._id);
      const res = await replaceQuestion({
        course: examForm.course,
        targetQuestionId: qId,
        excludeQuestionIds: existingIds,
        moduleIds: genConfig.selectedModuleIds
      });

      if (res.newQuestion) {
        setDraftQuestions((prev) =>
          prev.map((q) => (q._id === qId ? res.newQuestion : q))
        );
        toast.success('Question replaced with an alternative from the bank');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'No alternative questions available in bank');
    } finally {
      setReplacingQuestionId(null);
    }
  };

  // Remove draft question
  const handleRemoveDraftQuestion = (qId) => {
    setDraftQuestions((prev) => prev.filter((q) => q._id !== qId));
    toast.info('Question removed from paper');
  };

  // Manual toggle selection
  const handleToggleManualQuestion = (id) => {
    setManualSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all filtered (adds filtered items to current selection)
  const handleSelectAllFiltered = () => {
    setManualSelectedIds((prev) => {
      const next = new Set(prev);
      filteredManualBank.forEach((q) => next.add(q._id));
      return next;
    });
  };

  // Select ONLY this filtered view (clears any other modules so only current filter is selected)
  const handleSelectOnlyFiltered = () => {
    const next = new Set();
    filteredManualBank.forEach((q) => next.add(q._id));
    setManualSelectedIds(next);
    toast.info(`Selected only ${next.size} questions from the current filter`);
  };

  // Clear all selections
  const handleClearAllSelections = () => {
    setManualSelectedIds(new Set());
    toast.info('Cleared all question selections');
  };

  // Deselect all filtered
  const handleDeselectAllFiltered = () => {
    setManualSelectedIds((prev) => {
      const next = new Set(prev);
      filteredManualBank.forEach((q) => next.delete(q._id));
      return next;
    });
  };

  // Final Exam Creation / Update
  const handleSaveExam = async (requestedStatus) => {
    if (!examForm.course) {
      toast.error('Please select a target course');
      return;
    }
    if (!examForm.title.trim()) {
      toast.error('Please provide an exam title');
      return;
    }
    if (!examForm.duration || Number(examForm.duration) < 5) {
      toast.error('Duration must be at least 5 minutes');
      return;
    }
    if (!examForm.startTime) {
      toast.error('Start date & time is required');
      return;
    }

    const effectiveStatus = requestedStatus || examForm.status || 'active';

    let finalQuestions = [];
    if (examForm.mode === 'automatic') {
      if (draftQuestions.length > 0) {
        finalQuestions = draftQuestions.map((q) => q._id || q);
      } else if (manualSelectedIds.size > 0) {
        finalQuestions = Array.from(manualSelectedIds);
      } else {
        toast.error('No questions in exam paper. Please click Next to generate or select questions.');
        return;
      }
    } else {
      if (manualSelectedIds.size === 0) {
        toast.error('Please select at least one question for the exam.');
        return;
      }
      finalQuestions = Array.from(manualSelectedIds);
    }

    const startTimestamp = new Date(examForm.startTime).getTime();
    const endTimestamp = examForm.endTime ? new Date(examForm.endTime).getTime() : NaN;
    if (!isNaN(endTimestamp) && !isNaN(startTimestamp) && endTimestamp <= startTimestamp) {
      toast.error('End Date & Time must be after Start Date & Time');
      return;
    }
    if (effectiveStatus !== 'draft') {
      const effectiveEndMs = !isNaN(endTimestamp)
        ? endTimestamp
        : (!isNaN(startTimestamp) ? startTimestamp + (Number(examForm.duration) || 60) * 60000 : NaN);
      if (!isNaN(effectiveEndMs) && Date.now() > effectiveEndMs) {
        toast.error('Schedule end time is in the past. Click "Set Start Now -> +24h" or update the dates to publish live.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const isFutureExam = !isNaN(startTimestamp) && Date.now() < startTimestamp;
      const computedStatus =
        effectiveStatus === 'draft' ? 'draft' : isFutureExam ? 'scheduled' : 'active';

      const toIsoStringSafe = (dateStr) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) ? d.toISOString() : dateStr;
      };

      const payload = {
        title: examForm.title.trim(),
        description: examForm.description.trim(),
        course: examForm.course,
        franchise: examForm.franchise || null,
        duration: Number(examForm.duration),
        durationType: examForm.durationType,
        passPercentage: Number(examForm.passPercentage),
        startTime: toIsoStringSafe(examForm.startTime),
        endTime: examForm.endTime ? toIsoStringSafe(examForm.endTime) : null,
        maxAttempts: Number(examForm.maxAttempts) || 1,
        negativeMarking: examForm.negativeMarking,
        negativeMarksPerQuestion: examForm.negativeMarking
          ? Number(examForm.negativeMarksPerQuestion) || 0
          : 0,
        instructions: examForm.instructions,
        isFinalExam: Boolean(examForm.isFinalExam),
        questions: finalQuestions,
        masterQuestions: finalQuestions,
        status: computedStatus,
        mode: examForm.mode,
        blueprint:
          examForm.mode === 'automatic'
            ? {
                totalQuestions: Number(genConfig.totalQuestions) || finalQuestions.length,
                moduleIds: genConfig.selectedModuleIds,
                difficultyDistribution: {
                  easy: Number(genConfig.easy) || 0,
                  medium: Number(genConfig.medium) || 0,
                  hard: Number(genConfig.hard) || 0
                }
              }
            : null
      };

      if (isEditMode) {
        await updateExam(examId, payload);
        toast.success(
          computedStatus === 'draft'
            ? 'Exam updated and saved as draft!'
            : computedStatus === 'scheduled'
            ? 'Exam updated and scheduled!'
            : 'Exam updated and is now Live!'
        );
        navigate('/admin/exams');
      } else {
        const res = await createExam(payload);
        toast.success(
          computedStatus === 'draft'
            ? 'Exam saved as draft!'
            : 'Exam successfully created and published!'
        );
        navigate(`/admin/exams/${res.data?._id || ''}`);
      }
    } catch (err) {
      console.error(isEditMode ? 'Failed to update exam' : 'Failed to create exam', err);
      toast.error(err.response?.data?.message || (isEditMode ? 'Failed to update exam' : 'Failed to create exam'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <Layout>
        <PageLoading message={isEditMode ? 'Loading Exam Editor...' : 'Initializing Exam Creator...'} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <PageHeader
          title={isEditMode ? 'Edit Assessment / Exam' : 'Create Assessment / Exam'}
          subtitle={
            isEditMode
              ? 'Update settings, publish draft to live, adjust schedule dates, or edit selected questions'
              : 'Configure exam details, choose target course, and assemble questions via Blueprint or Manual Selection'
          }
          icon={FiFileText}
          actions={
            <div className="flex items-center gap-2">
              {isEditMode && <StatusBadge status={examForm.status} />}
              <Button
                variant="secondary"
                icon={FiArrowLeft}
                onClick={() => navigate('/admin/exams')}
              >
                Back to Exams
              </Button>
            </div>
          }
        />

        {/* Stepper Progress Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-3 transition ${
                currentStep === 1
                  ? 'text-primary-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition ${
                  currentStep === 1
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {currentStep > 1 ? <FiCheck /> : '1'}
              </div>
              <div className="text-left">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Step 1</p>
                <p className="text-sm">Exam Details & Mode</p>
              </div>
            </button>

            <div className={`flex-1 h-0.5 mx-4 transition ${currentStep === 2 ? 'bg-primary-600' : 'bg-slate-200'}`} />

            {/* Step 2 Pill */}
            <div
              className={`flex items-center gap-3 ${
                currentStep === 2
                  ? 'text-primary-600 font-bold'
                  : 'text-slate-400 font-medium'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition ${
                  currentStep === 2
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                2
              </div>
              <div className="text-left">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Step 2</p>
                <p className="text-sm">Questions Review & Schedule</p>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: EXAM DETAILS & QUESTION MODE */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Section A: Course Selection */}
            <Card className="border border-slate-200 shadow-xs">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Target Course Selection</h3>
                    <p className="text-xs text-slate-500">
                      Select which course this assessment belongs to. Modules and question banks will load dynamically.
                    </p>
                  </div>
                  {courseModules.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" className="text-xs font-semibold">
                        {courseModules.length} Modules
                      </Badge>
                      <Badge variant="success" className="text-xs font-semibold">
                        {courseMCQs.length} Questions in Bank
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Target Course *
                    </label>
                    <select
                      value={examForm.course}
                      onChange={(e) => handleCourseSelection(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Select a Course...</option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      School Campus Visibility
                    </label>
                    <select
                      value={examForm.franchise}
                      onChange={(e) => setExamForm({ ...examForm, franchise: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">All Campuses (Global Exam)</option>
                      {franchises.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.name} ({f.code || 'Campus'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Leave as "All Campuses" to make this exam available across all school branches offering this course.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Section B: Exam Parameters */}
            <Card className="border border-slate-200 shadow-xs">
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Exam Title &amp; Schedule Parameters</h3>
                    <p className="text-xs text-slate-500">Configure duration, passing thresholds, visibility status, and scheduling.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={FiClock}
                    onClick={handleSetLiveScheduleNow}
                  >
                    Set Start Now → +24h
                  </Button>
                </div>

                {isEditMode && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Publishing Mode</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Switch between Draft (hidden from students) and Live / Scheduled based on start &amp; end dates.
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl bg-white border border-slate-200 p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExamForm((p) => ({ ...p, status: 'draft' }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          examForm.status === 'draft'
                            ? 'bg-amber-100 text-amber-900 shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Draft (Unpublished)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamForm((p) => ({ ...p, status: 'active' }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          examForm.status !== 'draft'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Live / Scheduled
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Exam Title *</label>
                    <input
                      type="text"
                      value={examForm.title}
                      onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                      placeholder="e.g. DCA Final Assessment / Mid-Term Test"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pass Percentage (%) *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={examForm.passPercentage}
                      onChange={(e) => setExamForm({ ...examForm, passPercentage: Number(e.target.value) || 60 })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Description / Objectives</label>
                  <textarea
                    rows={2}
                    value={examForm.description}
                    onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                    placeholder="Brief description or guidelines for candidates..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Duration (Minutes) *</label>
                    <input
                      type="number"
                      min="5"
                      value={examForm.duration}
                      onChange={(e) => setExamForm({ ...examForm, duration: Number(e.target.value) || 60 })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={examForm.startTime}
                      onChange={(e) => setExamForm({ ...examForm, startTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={examForm.endTime}
                      onChange={(e) => setExamForm({ ...examForm, endTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Max Attempts</label>
                    <input
                      type="number"
                      min="1"
                      value={examForm.maxAttempts}
                      onChange={(e) => setExamForm({ ...examForm, maxAttempts: Number(e.target.value) || 1 })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="negativeMarking"
                      checked={examForm.negativeMarking}
                      onChange={(e) => setExamForm({ ...examForm, negativeMarking: e.target.checked })}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="negativeMarking" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Enable Negative Marking
                    </label>
                    {examForm.negativeMarking && (
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={examForm.negativeMarksPerQuestion}
                        onChange={(e) => setExamForm({ ...examForm, negativeMarksPerQuestion: Number(e.target.value) || 0 })}
                        placeholder="e.g. 0.25"
                        className="w-24 ml-auto px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Candidate Instructions</label>
                    <input
                      type="text"
                      value={examForm.instructions}
                      onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
                      placeholder="e.g. Do not refresh or exit the browser during the exam."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Final Examination Toggle */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl border border-amber-200/80 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">★</span>
                      <label htmlFor="isFinalExam" className="text-xs font-bold text-amber-950 uppercase tracking-wider cursor-pointer">
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
                      id="isFinalExam"
                      checked={examForm.isFinalExam}
                      onChange={(e) => setExamForm({ ...examForm, isFinalExam: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>
            </Card>

            {/* Section C: Question Selection Mode */}
            <Card className="border border-slate-200 shadow-xs">
              <div className="p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Question Selection Strategy</h3>
                  <p className="text-xs text-slate-500">
                    Choose whether you want the LMS to auto-assemble questions using blueprint rules or hand-pick questions manually.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mode Card 1: Automatic Blueprint */}
                  <div
                    onClick={() => setExamForm({ ...examForm, mode: 'automatic' })}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 ${
                      examForm.mode === 'automatic'
                        ? 'border-primary-600 bg-primary-50/40 shadow-xs ring-2 ring-primary-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        examForm.mode === 'automatic'
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FiSliders className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">Automatic Blueprint Generation</h4>
                        {examForm.mode === 'automatic' && (
                          <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Define difficulty breakdown and target modules. The system will automatically select questions and balance difficulty.
                      </p>
                    </div>
                  </div>

                  {/* Mode Card 2: Manual Selection */}
                  <div
                    onClick={() => setExamForm({ ...examForm, mode: 'manual' })}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 ${
                      examForm.mode === 'manual'
                        ? 'border-primary-600 bg-primary-50/40 shadow-xs ring-2 ring-primary-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        examForm.mode === 'manual'
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FiList className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">Manual Selection from Question Bank</h4>
                        {examForm.mode === 'manual' && (
                          <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Hand-pick exact questions module-by-module with instant filters, option previews, and marks counter.
                      </p>
                    </div>
                  </div>
                </div>

                {/* If Automatic mode is active: Configuration Form */}
                {examForm.mode === 'automatic' && (
                  <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Blueprint Parameters
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={FiCheckCircle}
                        onClick={handleValidateAutoConfig}
                        disabled={genValidating}
                      >
                        {genValidating ? 'Checking...' : 'Validate Availability'}
                      </Button>
                    </div>

                    {/* Modules Checkboxes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        Target Modules ({genConfig.selectedModuleIds.length} of {courseModules.length} selected):
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                        {courseModules.map((m) => {
                          const isChecked = genConfig.selectedModuleIds.includes(m._id);
                          return (
                            <label
                              key={m._id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs cursor-pointer border transition ${
                                isChecked
                                  ? 'bg-white border-primary-500 font-semibold text-primary-800 shadow-xs'
                                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setGenConfig({
                                      ...genConfig,
                                      selectedModuleIds: [...genConfig.selectedModuleIds, m._id]
                                    });
                                  } else {
                                    setGenConfig({
                                      ...genConfig,
                                      selectedModuleIds: genConfig.selectedModuleIds.filter((id) => id !== m._id)
                                    });
                                  }
                                }}
                                className="rounded text-primary-600 w-3.5 h-3.5"
                              />
                              <span>Module {m.order}: {m.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Total Questions & Distribution */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Total Questions
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={genConfig.totalQuestions}
                          onChange={(e) => setGenConfig({ ...genConfig, totalQuestions: Number(e.target.value) || 10 })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">
                          Easy Questions
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={genConfig.easy}
                          onChange={(e) => setGenConfig({ ...genConfig, easy: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-amber-700 mb-1">
                          Medium Questions
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={genConfig.medium}
                          onChange={(e) => setGenConfig({ ...genConfig, medium: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-rose-700 mb-1">
                          Hard Questions
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={genConfig.hard}
                          onChange={(e) => setGenConfig({ ...genConfig, hard: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    {genValidationResult && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                          genValidationResult.valid
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        <span>
                          {genValidationResult.valid
                            ? `✓ Validation passed: ${genValidationResult.availableCounts?.total || 0} eligible questions found.`
                            : `⚠ ${genValidationResult.issues?.[0] || 'Insufficient questions in bank.'}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Step 1 Footer Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button variant="secondary" onClick={() => navigate('/admin/exams')}>
                Cancel
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                {isEditMode && (
                  <Button
                    icon={examForm.status === 'draft' ? FiSave : FiSend}
                    onClick={() => handleSaveExam(examForm.status === 'draft' ? 'draft' : 'active')}
                    disabled={submitting || !examForm.course}
                    className={examForm.status !== 'draft' ? '!bg-emerald-600 hover:!bg-emerald-700' : ''}
                  >
                    {submitting
                      ? 'Saving...'
                      : examForm.status === 'draft'
                      ? 'Save Draft Changes'
                      : 'Save & Publish Live'}
                  </Button>
                )}
                <Button
                  icon={FiChevronRight}
                  variant={isEditMode ? 'secondary' : 'primary'}
                  onClick={handleProceedToStep2}
                  disabled={submitting || !examForm.course}
                >
                  {submitting
                    ? 'Generating Questions...'
                    : isEditMode
                    ? 'Next: Edit Questions →'
                    : 'Next: Review & Finalize Questions →'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: QUESTION REVIEW & FINALIZATION */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Step 2 Top Bar Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{examForm.title}</h3>
                  <Badge variant={examForm.mode === 'automatic' ? 'purple' : 'info'}>
                    {examForm.mode === 'automatic' ? 'Auto-Generated' : 'Manual Selection'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Duration: {examForm.duration} mins • Passing Score: {examForm.passPercentage}%
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-3">
                {examForm.mode === 'automatic' ? (
                  <>
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Questions</p>
                      <p className="text-sm font-bold text-slate-800">{draftQuestions.length}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Marks</p>
                      <p className="text-sm font-bold text-slate-800">
                        {draftQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={FiRefreshCw}
                      onClick={handleRegenerateAll}
                      disabled={submitting}
                    >
                      Regenerate All
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="bg-primary-50 border border-primary-200 px-3.5 py-1.5 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-primary-600 uppercase">Selected</p>
                      <p className="text-sm font-bold text-primary-800">
                        {manualSelectedStats.count} Questions
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Marks</p>
                      <p className="text-sm font-bold text-emerald-800">
                        {manualSelectedStats.totalMarks} Marks
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Automatic Mode Questions List */}
            {examForm.mode === 'automatic' && (
              <div className="space-y-3">
                {draftQuestions.length === 0 ? (
                  <EmptyState
                    icon={FiAlertCircle}
                    title="No questions generated"
                    description="Click Regenerate or go back to adjust your blueprint."
                  />
                ) : (
                  draftQuestions.map((q, idx) => {
                    const moduleTitle = typeof q.module === 'object' ? q.module?.title : 'Course Module';
                    const isReplacing = replacingQuestionId === q._id;
                    return (
                      <Card key={q._id || idx} className="border border-slate-200 hover:border-slate-300 transition shadow-xs">
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                  {q.question}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    <FiLayers className="w-3 h-3 text-slate-400" />
                                    {moduleTitle}
                                  </span>
                                  <Badge
                                    variant={
                                      q.difficulty === 'easy'
                                        ? 'success'
                                        : q.difficulty === 'hard'
                                        ? 'danger'
                                        : 'warning'
                                    }
                                    className="text-[10px] capitalize"
                                  >
                                    {q.difficulty}
                                  </Badge>
                                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {q.marks || 1} {q.marks === 1 ? 'Mark' : 'Marks'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={FiRefreshCw}
                                onClick={() => handleReplaceSingleQuestion(q._id)}
                                disabled={isReplacing}
                                title="Swap with another question"
                              >
                                {isReplacing ? 'Swapping...' : 'Swap'}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                icon={FiX}
                                onClick={() => handleRemoveDraftQuestion(q._id)}
                                title="Remove question"
                              />
                            </div>
                          </div>

                          {/* Options Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {(q.options || []).map((opt, optIdx) => (
                              <div
                                key={opt._id || optIdx}
                                className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
                                  opt.isCorrect
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    opt.isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1 truncate">{opt.text}</span>
                                {opt.isCorrect && <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* Manual Mode Question Selector */}
            {examForm.mode === 'manual' && (
              <div className="space-y-4">
                {/* 1. Single Clean Module Filter Bar (No duplicate quick pills!) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search question keyword..."
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* ONLY ONE Module Filter Dropdown */}
                    <div className="w-full sm:w-64">
                      <select
                        value={manualModuleFilter}
                        onChange={(e) => setManualModuleFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="all">
                          All Modules ({moduleQuestionCounts.all || courseMCQs.length})
                        </option>
                        {courseModules.map((m) => (
                          <option key={m._id} value={m._id}>
                            Module {m.order}: {m.title} ({moduleQuestionCounts[m._id] || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Difficulty Dropdown */}
                    <div className="w-full sm:w-40">
                      <select
                        value={manualDifficultyFilter}
                        onChange={(e) => setManualDifficultyFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="all">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    {(manualModuleFilter !== 'all' || manualDifficultyFilter !== 'all' || manualSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualModuleFilter('all');
                          setManualDifficultyFilter('all');
                          setManualSearch('');
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold whitespace-nowrap px-2 py-1"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Selection Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {manualModuleFilter !== 'all' && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={FiCheckCircle}
                          onClick={handleSelectOnlyFiltered}
                          title="Clears all other modules and selects only the questions in this module"
                        >
                          Select ONLY This Module ({filteredManualBank.length})
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={FiCheckSquare}
                        onClick={handleSelectAllFiltered}
                      >
                        Add All in View ({filteredManualBank.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={FiSquare}
                        onClick={handleDeselectAllFiltered}
                      >
                        Deselect in View
                      </Button>
                      {manualSelectedIds.size > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleClearAllSelections}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          Clear All ({manualSelectedIds.size})
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span>Showing {filteredManualBank.length} of {courseMCQs.length} questions</span>
                      <span>•</span>
                      <span className="text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
                        {manualSelectedStats.count} Total Selected in Exam
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Questions Cards List */}
                <div className="space-y-3">
                  {filteredManualBank.length === 0 ? (
                    <EmptyState
                      icon={FiHelpCircle}
                      title="No questions match your filter criteria"
                      description="Try clearing search or choosing another module."
                    />
                  ) : (
                    filteredManualBank.map((q, idx) => {
                      const isSelected = manualSelectedIds.has(q._id);
                      const moduleTitle = typeof q.module === 'object' ? q.module?.title : 'Course Module';

                      return (
                        <Card
                          key={q._id || idx}
                          onClick={() => handleToggleManualQuestion(q._id)}
                          className={`border-2 cursor-pointer transition p-4 ${
                            isSelected
                              ? 'border-primary-600 bg-primary-50/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleManualQuestion(q._id)}
                              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 mt-1 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                  {q.question}
                                </h4>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    <FiLayers className="w-3 h-3 text-slate-400" />
                                    {moduleTitle}
                                  </span>
                                  <Badge
                                    variant={
                                      q.difficulty === 'easy'
                                        ? 'success'
                                        : q.difficulty === 'hard'
                                        ? 'danger'
                                        : 'warning'
                                    }
                                    className="text-[10px] capitalize"
                                  >
                                    {q.difficulty}
                                  </Badge>
                                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {q.marks || 1} {q.marks === 1 ? 'Mark' : 'Marks'}
                                  </span>
                                </div>
                              </div>

                              {/* Options preview */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {(q.options || []).map((opt, optIdx) => (
                                  <div
                                    key={opt._id || optIdx}
                                    className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border ${
                                      opt.isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                        : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span
                                      className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] shrink-0 ${
                                        opt.isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="flex-1 truncate">{opt.text}</span>
                                    {opt.isCorrect && (
                                      <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Step 2 Bottom Action Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 sticky bottom-4">
              <Button
                variant="secondary"
                icon={FiArrowLeft}
                onClick={() => setCurrentStep(1)}
              >
                ← Back to Exam Settings
              </Button>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  icon={FiSave}
                  onClick={() => handleSaveExam('draft')}
                  disabled={submitting}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  icon={FiCheckCircle}
                  onClick={() => handleSaveExam('active')}
                  disabled={submitting}
                >
                  {submitting
                    ? isEditMode ? 'Updating Exam...' : 'Creating Exam...'
                    : isEditMode ? 'Update & Publish Exam' : 'Approve & Publish Exam'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

