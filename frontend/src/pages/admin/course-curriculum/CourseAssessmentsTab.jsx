import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus, FiEye, FiTrash2, FiCopy, FiCalendar, FiClock, FiAward,
  FiCheckCircle, FiRefreshCw, FiAlertTriangle, FiSliders, FiList,
  FiFileText, FiCheck, FiX, FiLayers, FiSearch, FiCheckSquare, FiSquare
} from 'react-icons/fi';
import {
  Card, Button, Badge, Modal, FormField, FormGrid, TextField, TextArea, SelectField,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell
} from '../../../components/ui';
import {
  getExams, createExam, deleteExam, copyExam, validateGeneration, generateExamDraft, replaceQuestion
} from '../../../api/examApi';
import { getMCQs } from '../../../api/mcqApi';

export default function CourseAssessmentsTab({ courseId, courseTitle, modules = [] }) {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wizard Modal state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 = Details & Mode, 2 = Review Generated Draft / Manual Picker
  const [wizardSubmitting, setWizardSubmitting] = useState(false);

  // Exam Details Form
  const [examForm, setExamForm] = useState({
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

  // Manual Selection Bank state & Module Filter
  const [manualBank, setManualBank] = useState([]);
  const [manualSelectedIds, setManualSelectedIds] = useState(new Set());
  const [manualLoading, setManualLoading] = useState(false);
  const [manualModuleFilter, setManualModuleFilter] = useState('all');
  const [manualDifficultyFilter, setManualDifficultyFilter] = useState('all');
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Available modules computed from course modules and manualBank
  const availableModules = useMemo(() => {
    const map = new Map();
    (modules || []).forEach((m) => {
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
  }, [modules, manualBank]);

  // Question counts per module
  const moduleQuestionCounts = useMemo(() => {
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
  const filteredManualBank = useMemo(() => {
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

      // 3. Search Query
      if (manualSearchQuery.trim()) {
        const qText = manualSearchQuery.toLowerCase();
        const questionMatch = (q.question || '').toLowerCase().includes(qText);
        const moduleMatch = (q.module?.title || '').toLowerCase().includes(qText);
        const optionsMatch = (q.options || []).some((opt) => (opt.text || '').toLowerCase().includes(qText));
        if (!questionMatch && !moduleMatch && !optionsMatch) return false;
      }

      return true;
    });
  }, [manualBank, manualModuleFilter, manualDifficultyFilter, manualSearchQuery]);

  // Stats for selected questions
  const selectedManualStats = useMemo(() => {
    let marks = 0;
    (manualBank || []).forEach((q) => {
      if (manualSelectedIds.has(q._id)) {
        marks += Number(q.marks || 1);
      }
    });
    return {
      count: manualSelectedIds.size,
      totalMarks: marks
    };
  }, [manualBank, manualSelectedIds]);

  // Bulk actions for filtered view
  const handleSelectAllFiltered = () => {
    const next = new Set(manualSelectedIds);
    filteredManualBank.forEach((q) => next.add(q._id));
    setManualSelectedIds(next);
  };

  const handleDeselectAllFiltered = () => {
    const next = new Set(manualSelectedIds);
    filteredManualBank.forEach((q) => next.delete(q._id));
    setManualSelectedIds(next);
  };

  const isAllFilteredSelected = filteredManualBank.length > 0 && filteredManualBank.every((q) => manualSelectedIds.has(q._id));

  // Load course exams
  const fetchExams = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const res = await getExams({ course: courseId });
      setExams(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [courseId]);

  // Open Exam Creator (dedicated full-width page)
  const handleOpenCreateExam = () => {
    navigate(`/admin/exams/create?courseId=${courseId}`);
  };

  // Validate Question Bank availability
  const handleValidateAvailability = async () => {
    setGenValidating(true);
    try {
      const res = await validateGeneration({
        course: courseId,
        moduleIds: genConfig.selectedModuleIds,
        totalQuestions: genConfig.totalQuestions,
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
        toast.success(`Validated! ${res.availableCounts?.total || 0} eligible questions found.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to validate questions availability');
    } finally {
      setGenValidating(false);
    }
  };

  // Step 1 -> Step 2 (Generate Questions or load manual picker)
  const handleProceedToStep2 = async () => {
    if (!examForm.title.trim()) {
      toast.error('Exam title is required');
      return;
    }
    if (!examForm.startTime) {
      toast.error('Start time is required');
      return;
    }

    if (examForm.mode === 'automatic') {
      setWizardSubmitting(true);
      try {
        const res = await generateExamDraft({
          course: courseId,
          moduleIds: genConfig.selectedModuleIds,
          totalQuestions: genConfig.totalQuestions,
          difficultyDistribution: {
            easy: Number(genConfig.easy) || 0,
            medium: Number(genConfig.medium) || 0,
            hard: Number(genConfig.hard) || 0
          }
        });

        setDraftQuestions(res.data?.draftQuestions || []);
        setDraftSummary(res.data);
        setWizardStep(2);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to generate questions');
      } finally {
        setWizardSubmitting(false);
      }
    } else {
      // Manual mode: load Question Bank
      setManualLoading(true);
      try {
        const res = await getMCQs({ course: courseId, isActive: true });
        setManualBank(res.data || res.mcqs || []);
        setWizardStep(2);
      } catch (err) {
        toast.error('Failed to load Question Bank for manual selection');
      } finally {
        setManualLoading(false);
      }
    }
  };

  // Replace a question in draft review
  const handleReplaceDraftQuestion = async (qId, qModId, qDifficulty) => {
    setReplacingQuestionId(qId);
    try {
      const res = await replaceQuestion({
        course: courseId,
        currentQuestionId: qId,
        moduleId: qModId,
        difficulty: qDifficulty,
        excludeQuestionIds: draftQuestions.map((q) => q._id)
      });

      const replacement = res.replacementQuestion;
      setDraftQuestions((prev) =>
        prev.map((item) => (item._id === qId ? replacement : item))
      );
      toast.success('Question replaced successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No alternative questions found');
    } finally {
      setReplacingQuestionId(null);
    }
  };

  // Remove question from review
  const handleRemoveDraftQuestion = (qId) => {
    if (draftQuestions.length <= 1) {
      toast.error('An exam must contain at least 1 question');
      return;
    }
    setDraftQuestions((prev) => prev.filter((q) => q._id !== qId));
    toast.info('Question removed from exam draft');
  };

  // Regenerate all draft questions
  const handleRegenerateAll = async () => {
    setWizardSubmitting(true);
    try {
      const res = await generateExamDraft({
        course: courseId,
        moduleIds: genConfig.selectedModuleIds,
        totalQuestions: genConfig.totalQuestions,
        difficultyDistribution: {
          easy: Number(genConfig.easy) || 0,
          medium: Number(genConfig.medium) || 0,
          hard: Number(genConfig.hard) || 0
        }
      });
      setDraftQuestions(res.data?.draftQuestions || []);
      setDraftSummary(res.data);
      toast.success('Exam questions regenerated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Regeneration failed');
    } finally {
      setWizardSubmitting(false);
    }
  };

  // Final Approval & Scheduling
  const handleApproveAndSchedule = async (isDraft = false) => {
    const finalQuestionIds = examForm.mode === 'automatic'
      ? draftQuestions.map((q) => q._id)
      : Array.from(manualSelectedIds);

    if (finalQuestionIds.length === 0) {
      toast.error('Please include at least one question in the exam');
      return;
    }

    setWizardSubmitting(true);
    try {
      const toIsoStringSafe = (dateStr) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) ? d.toISOString() : dateStr;
      };

      const payload = {
        title: examForm.title.trim(),
        description: examForm.description,
        course: courseId,
        questions: finalQuestionIds,
        masterQuestions: finalQuestionIds,
        startTime: toIsoStringSafe(examForm.startTime),
        endTime: toIsoStringSafe(examForm.endTime),
        duration: examForm.duration,
        durationType: examForm.durationType,
        passPercentage: examForm.passPercentage,
        maxAttempts: examForm.maxAttempts,
        negativeMarking: examForm.negativeMarking,
        negativeMarksPerQuestion: examForm.negativeMarksPerQuestion,
        instructions: examForm.instructions,
        isFinalExam: Boolean(examForm.isFinalExam),
        status: isDraft ? 'draft' : 'scheduled',
        generationConfig: {
          mode: examForm.mode,
          modules: genConfig.selectedModuleIds,
          totalQuestions: finalQuestionIds.length,
          difficultyDistribution: {
            easy: Number(genConfig.easy) || 0,
            medium: Number(genConfig.medium) || 0,
            hard: Number(genConfig.hard) || 0
          }
        }
      };

      await createExam(payload);
      toast.success(isDraft ? 'Exam saved as draft' : 'Exam scheduled and published successfully!');
      setWizardOpen(false);
      await fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule exam');
    } finally {
      setWizardSubmitting(false);
    }
  };

  const handleDeleteExam = async (exam) => {
    const confirmDelete = window.confirm(`Delete exam "${exam.title}"? Associated attempts will be cleared.`);
    if (!confirmDelete) return;

    try {
      await deleteExam(exam._id);
      toast.success('Exam deleted');
      await fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  const handleCopyExam = async (exam) => {
    try {
      await copyExam(exam._id);
      toast.success('Exam duplicated as draft');
      await fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to copy exam');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-bold text-slate-800">Course Assessments</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 border border-primary-200">
              {exams.length} {exams.length === 1 ? 'Exam' : 'Exams'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Schedule examinations with automatic question generation from the Question Bank or manual curation.
          </p>
        </div>

        <Button variant="primary" icon={FiPlus} onClick={handleOpenCreateExam}>
          Create New Exam
        </Button>
      </div>

      {/* 2. Scheduled Exams Table */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading assessments...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <FiAward className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">No examinations scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Create an exam using automatic Question Bank generation to test student learning outcomes.
          </p>
          <Button variant="primary" icon={FiPlus} onClick={handleOpenCreateExam}>
            Create First Exam
          </Button>
        </div>
      ) : (
        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Exam Title</TableHeader>
                <TableHeader>Schedule Window</TableHeader>
                <TableHeader>Duration</TableHeader>
                <TableHeader>Questions</TableHeader>
                <TableHeader>Pass %</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader align="right">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {exams.map((exam) => {
                const statusTone =
                  exam.status === 'active' ? 'success' : exam.status === 'scheduled' ? 'info' : exam.status === 'draft' ? 'warning' : 'neutral';

                return (
                  <TableRow key={exam._id}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{exam.title}</p>
                        {exam.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{exam.description}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-600">
                        <p>{new Date(exam.startTime).toLocaleDateString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-semibold text-slate-700">
                        {exam.duration} mins
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                        {exam.questions?.length || 0} MCQs
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-semibold text-slate-700">
                        {exam.passPercentage}%
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge tone={statusTone} size="sm">
                        {exam.status}
                      </Badge>
                    </TableCell>

                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/exams/${exam._id}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          <span>Results</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyExam(exam)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition"
                          title="Copy Exam"
                        >
                          <FiCopy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteExam(exam)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                          title="Delete Exam"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      )}

      {/* 3. SMART EXAM CREATION WIZARD MODAL */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title={wizardStep === 1 ? 'Create Examination' : 'Review & Approve Generated Exam'}
        size="lg"
      >
        {wizardStep === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProceedToStep2();
            }}
            className="space-y-4"
          >
            {/* Section A: Exam Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Section A: Exam Details & Schedule
              </h4>

              <FormField label="Exam Title" required>
                <TextField
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  placeholder="e.g. Mid-Term Assessment - Web Development"
                  required
                />
              </FormField>

              <FormField label="Instructions for Students">
                <TextArea
                  value={examForm.instructions}
                  onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
                  placeholder="e.g. Read each question carefully. Do not refresh during the exam."
                  rows={2}
                />
              </FormField>

              <FormGrid cols={3}>
                <FormField label="Duration (Minutes)" required>
                  <TextField
                    type="number"
                    min="5"
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="Pass Percentage (%)" required>
                  <TextField
                    type="number"
                    min="1"
                    max="100"
                    value={examForm.passPercentage}
                    onChange={(e) => setExamForm({ ...examForm, passPercentage: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="Max Attempts">
                  <TextField
                    type="number"
                    min="1"
                    value={examForm.maxAttempts}
                    onChange={(e) => setExamForm({ ...examForm, maxAttempts: e.target.value })}
                  />
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Start Date & Time" required>
                  <TextField
                    type="datetime-local"
                    value={examForm.startTime}
                    onChange={(e) => setExamForm({ ...examForm, startTime: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="End Date & Time (Optional window close)">
                  <TextField
                    type="datetime-local"
                    value={examForm.endTime}
                    onChange={(e) => setExamForm({ ...examForm, endTime: e.target.value })}
                  />
                </FormField>
              </FormGrid>

              {/* Final Examination Toggle */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl border border-amber-200/80 flex items-start justify-between gap-4 mt-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">★</span>
                    <label htmlFor="course-isFinalExam" className="text-xs font-bold text-amber-950 uppercase tracking-wider cursor-pointer">
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
                    id="course-isFinalExam"
                    checked={examForm.isFinalExam || false}
                    onChange={(e) => setExamForm({ ...examForm, isFinalExam: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            {/* Section B: Selection Mode */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Section B: Question Selection Mode
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExamForm({ ...examForm, mode: 'automatic' })}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    examForm.mode === 'automatic'
                      ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">Automatic Generation</span>
                    <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-1.5 py-0.2 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Auto-selects and balances questions from the Question Bank by difficulty and modules.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExamForm({ ...examForm, mode: 'manual' })}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    examForm.mode === 'manual'
                      ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-800 block mb-1">Manual Selection</span>
                  <p className="text-[11px] text-slate-500">
                    Hand-pick specific questions from the course Question Bank list.
                  </p>
                </button>
              </div>

              {/* Automatic Configuration Fields */}
              {examForm.mode === 'automatic' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Target Modules (Select all or specific):
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {modules.map((m) => {
                        const isChecked = genConfig.selectedModuleIds.includes(m._id);
                        return (
                          <label
                            key={m._id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer border transition ${
                              isChecked
                                ? 'bg-white border-primary-400 font-semibold text-primary-800 shadow-xs'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
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

                  <FormGrid cols={4}>
                    <FormField label="Total Questions" required>
                      <TextField
                        type="number"
                        min="1"
                        value={genConfig.totalQuestions}
                        onChange={(e) => setGenConfig({ ...genConfig, totalQuestions: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Easy Count">
                      <TextField
                        type="number"
                        min="0"
                        value={genConfig.easy}
                        onChange={(e) => setGenConfig({ ...genConfig, easy: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Medium Count">
                      <TextField
                        type="number"
                        min="0"
                        value={genConfig.medium}
                        onChange={(e) => setGenConfig({ ...genConfig, medium: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Hard Count">
                      <TextField
                        type="number"
                        min="0"
                        value={genConfig.hard}
                        onChange={(e) => setGenConfig({ ...genConfig, hard: e.target.value })}
                      />
                    </FormField>
                  </FormGrid>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleValidateAvailability}
                      disabled={genValidating}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-800 inline-flex items-center gap-1.5"
                    >
                      <FiSliders className="w-3.5 h-3.5" />
                      <span>{genValidating ? 'Checking pool...' : 'Check Bank Availability'}</span>
                    </button>

                    {genValidationResult && (
                      <span className="text-xs font-medium text-slate-500">
                        {genValidationResult.availableCounts?.total || 0} questions in bank
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setWizardOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={wizardSubmitting}>
                {examForm.mode === 'automatic' ? 'Generate Questions →' : 'Pick Questions →'}
              </Button>
            </div>
          </form>
        ) : (
          /* Step 2: Generated Review Interface OR Manual Selection */
          <div className="space-y-4">
            {examForm.mode === 'automatic' ? (
              <div className="space-y-4">
                {/* Review Header & Summary Pills */}
                <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Generated Question Master Set ({draftQuestions.length} Questions)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Review, replace individual questions, or regenerate before scheduling.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FiRefreshCw}
                      onClick={handleRegenerateAll}
                      loading={wizardSubmitting}
                    >
                      Regenerate All
                    </Button>
                  </div>
                </div>

                {/* Question List */}
                <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                  {draftQuestions.map((q, idx) => (
                    <div
                      key={q._id}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-xs font-bold text-slate-400 mt-0.5">Q{idx + 1}.</span>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{q.question}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                              <span>Module: {q.module?.title || 'Unassigned'}</span>
                              <span>•</span>
                              <Badge
                                tone={q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'danger' : 'warning'}
                                size="sm"
                              >
                                {q.difficulty}
                              </Badge>
                              <span>•</span>
                              <span>{q.marks || 1} mark</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleReplaceDraftQuestion(q._id, q.module?._id, q.difficulty)}
                            disabled={replacingQuestionId === q._id}
                            className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition inline-flex items-center gap-1"
                            title="Replace with an alternative question"
                          >
                            <FiRefreshCw className={`w-3 h-3 ${replacingQuestionId === q._id ? 'animate-spin' : ''}`} />
                            <span>Replace</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveDraftQuestion(q._id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                            title="Remove question"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display options with correct highlighted */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {(q.options || []).map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`px-2.5 py-1 rounded-lg text-xs flex items-center justify-between border ${
                              opt.isCorrect
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                                : 'bg-slate-50 text-slate-600 border-slate-100'
                            }`}
                          >
                            <span>{String.fromCharCode(65 + oIdx)}. {opt.text}</span>
                            {opt.isCorrect && <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Manual Selection Mode with Comprehensive Module Filtering */
              <div className="space-y-3.5">
                {/* 1. Header & Stats Bar */}
                <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-lg bg-primary-600 text-white text-xs font-bold shadow-xs">
                      Selected: {selectedManualStats.count} Questions
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Total: <strong className="text-slate-800">{selectedManualStats.totalMarks} Marks</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-slate-500">
                      Showing {filteredManualBank.length} of {manualBank.length} questions
                    </span>
                  </div>

                  {/* Batch Select / Deselect for currently filtered questions */}
                  <div className="flex items-center gap-2">
                    {filteredManualBank.length > 0 && (
                      <button
                        type="button"
                        onClick={isAllFilteredSelected ? handleDeselectAllFiltered : handleSelectAllFiltered}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border inline-flex items-center gap-1.5 ${
                          isAllFilteredSelected
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-primary-50 hover:bg-primary-100 text-primary-800 border-primary-300'
                        }`}
                      >
                        {isAllFilteredSelected ? (
                          <>
                            <FiSquare className="w-3.5 h-3.5" />
                            <span>Deselect All in This View ({filteredManualBank.length})</span>
                          </>
                        ) : (
                          <>
                            <FiCheckSquare className="w-3.5 h-3.5" />
                            <span>Select All in This View ({filteredManualBank.length})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Filter Controls: Module Dropdown, Search Input, Difficulty Filter */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        value={manualSearchQuery}
                        onChange={(e) => setManualSearchQuery(e.target.value)}
                        placeholder="Search question keyword in English or Hindi..."
                        className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      {manualSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setManualSearchQuery('')}
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
                          📂 All Modules ({moduleQuestionCounts.all || manualBank.length})
                        </option>
                        {availableModules.map((m) => (
                          <option key={m._id} value={m._id}>
                            📖 {m.title} ({moduleQuestionCounts[m._id] || 0})
                          </option>
                        ))}
                        {moduleQuestionCounts.unassigned > 0 && (
                          <option value="unassigned">
                            📁 Unassigned Module ({moduleQuestionCounts.unassigned})
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
                <div className="max-h-[50vh] overflow-y-auto space-y-2.5 pr-1">
                  {filteredManualBank.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-semibold text-slate-600">
                        No questions match the selected module or filter criteria.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setManualModuleFilter('all');
                          setManualDifficultyFilter('all');
                          setManualSearchQuery('');
                        }}
                        className="mt-2 text-xs font-bold text-primary-600 hover:underline"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    filteredManualBank.map((q) => {
                      const isChecked = manualSelectedIds.has(q._id);
                      return (
                        <label
                          key={q._id}
                          className={`p-3.5 rounded-xl border block cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-primary-50/60 border-primary-400 ring-1 ring-primary-400/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const nextSet = new Set(manualSelectedIds);
                                if (e.target.checked) nextSet.add(q._id);
                                else nextSet.delete(q._id);
                                setManualSelectedIds(nextSet);
                              }}
                              className="rounded text-primary-600 mt-1 w-4 h-4 focus:ring-primary-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 leading-snug">
                                {q.question}
                              </p>

                              {/* Question Metadata Line */}
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                                  <FiLayers className="w-3 h-3" />
                                  <span>Module: {q.module?.title || 'Unassigned'}</span>
                                </span>
                                <span>•</span>
                                <Badge
                                  tone={q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'danger' : 'warning'}
                                  size="sm"
                                  className="capitalize"
                                >
                                  {q.difficulty || 'medium'}
                                </Badge>
                                <span>•</span>
                                <span className="font-medium text-slate-600">{q.marks || 1} mark</span>
                              </div>

                              {/* Options preview (if available) */}
                              {Array.isArray(q.options) && q.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                                  {q.options.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className={`px-2 py-1 rounded-md border flex items-center justify-between ${
                                        opt.isCorrect
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                                          : 'bg-slate-50/70 text-slate-600 border-slate-100'
                                      }`}
                                    >
                                      <span>{String.fromCharCode(65 + oIdx)}. {opt.text}</span>
                                      {opt.isCorrect && <FiCheck className="w-3 h-3 text-emerald-600 shrink-0 ml-1" />}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setWizardStep(1)}>
                ← Back to Settings
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleApproveAndSchedule(true)}
                  loading={wizardSubmitting}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  icon={FiCheckCircle}
                  onClick={() => handleApproveAndSchedule(false)}
                  loading={wizardSubmitting}
                >
                  Approve & Schedule Exam
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

