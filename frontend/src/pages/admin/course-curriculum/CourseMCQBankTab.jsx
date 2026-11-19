import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  FiPlus, FiEdit2, FiTrash2, FiCopy, FiEye, FiSearch, FiFilter,
  FiHelpCircle, FiCheck, FiX, FiCheckCircle, FiDownload, FiUpload,
  FiLayers, FiAward, FiChevronDown, FiChevronRight, FiMaximize2, FiMinimize2
} from 'react-icons/fi';
import {
  Card, Button, Badge, Modal, FormField, FormGrid, TextField, TextArea, SelectField
} from '../../../components/ui';
import {
  getMCQs, getMCQStats, createMCQ, updateMCQ, deleteMCQ, duplicateMCQ
} from '../../../api/mcqApi';

export default function CourseMCQBankTab({ courseId, courseTitle, modules = [] }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'super_admin' || user?.role === 'admin';
  const [mcqs, setMcqs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Accordion / Collapsible state
  const [expandedMap, setExpandedMap] = useState({});

  // Filters
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal state
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    module: '',
    lesson: '',
    question: '',
    image: '',
    questionType: 'single_choice',
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

  // Fetch Questions and Stats
  const loadQuestions = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const params = { course: courseId };
      if (selectedModuleId) params.module = selectedModuleId;
      if (selectedLessonId) params.lesson = selectedLessonId;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedStatus) params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [res, statsRes] = await Promise.all([
        getMCQs(params),
        getMCQStats(courseId).catch(() => ({ data: null }))
      ]);

      const items = res.data || res.mcqs || [];
      setMcqs(items);
      setStats(statsRes?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [courseId, selectedModuleId, selectedLessonId, selectedDifficulty, selectedStatus]);

  // Lessons filtered by selected module in question form
  const lessonsForSelectedFormModule = useMemo(() => {
    const mod = modules.find((m) => m._id === questionForm.module);
    return mod?.lessons || [];
  }, [modules, questionForm.module]);

  // Lessons filtered by selected filter module
  const lessonsForFilterModule = useMemo(() => {
    const mod = modules.find((m) => m._id === selectedModuleId);
    return mod?.lessons || [];
  }, [modules, selectedModuleId]);

  // Toggle single question expansion
  const toggleQuestion = (qId) => {
    setExpandedMap((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const allQuestionsExpanded = mcqs.length > 0 && mcqs.every((question) => expandedMap[question._id]);
  const toggleAllQuestions = () => {
    if (allQuestionsExpanded) return setExpandedMap({});
    const all = {};
    mcqs.forEach((q) => { all[q._id] = true; });
    setExpandedMap(all);
  };

  // Form Handlers
  const handleOpenAddQuestion = () => {
    navigate(`/admin/courses/${courseId}/mcqs/batch?moduleId=${selectedModuleId || ''}`);
  };

  const handleOpenEditQuestion = (e, q) => {
    e.stopPropagation();
    setEditingQuestion(q);
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
      module: modId,
      lesson: lsnId,
      question: q.question || '',
      image: q.image || '',
      questionType: q.questionType || 'single_choice',
      difficulty: q.difficulty || 'medium',
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks || 0,
      explanation: q.explanation || '',
      status: q.status || (q.isActive === false ? 'inactive' : 'active'),
      options: opts
    });
    setQuestionModalOpen(true);
  };

  const handleOptionTextChange = (idx, text) => {
    const updated = [...questionForm.options];
    updated[idx].text = text;
    setQuestionForm({ ...questionForm, options: updated });
  };

  const handleSetCorrectOption = (idx) => {
    const updated = questionForm.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === idx
    }));
    setQuestionForm({ ...questionForm, options: updated });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.question.trim()) {
      toast.error('Question text is required');
      return;
    }
    if (!questionForm.module) {
      toast.error('Please assign a module');
      return;
    }

    const filledOptions = questionForm.options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) {
      toast.error('Please provide at least 2 answer options');
      return;
    }

    const hasCorrect = filledOptions.some((o) => o.isCorrect);
    if (!hasCorrect) {
      toast.error('Please select the correct answer');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...questionForm,
        course: courseId,
        options: filledOptions
      };

      if (editingQuestion) {
        await updateMCQ(editingQuestion._id, payload);
        toast.success('Question updated successfully');
      } else {
        const created = await createMCQ(payload);
        toast.success('Question added to Question Bank');
        if (created?.data?._id) {
          setExpandedMap((prev) => ({ ...prev, [created.data._id]: true }));
        }
      }
      setQuestionModalOpen(false);
      await loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (e, q) => {
    e.stopPropagation();
    const confirmDelete = window.confirm('Are you sure you want to delete this question?');
    if (!confirmDelete) return;

    try {
      await deleteMCQ(q._id);
      toast.success('Question deleted from Question Bank');
      await loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleDuplicateQuestion = async (e, q) => {
    e.stopPropagation();
    try {
      await duplicateMCQ(q._id);
      toast.success('Question duplicated');
      await loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate question');
    }
  };

  // Export questions to JSON
  const handleExportQuestions = () => {
    const jsonStr = JSON.stringify(mcqs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(courseTitle || 'course').toLowerCase().replace(/\s+/g, '_')}_questions.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Questions exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Stats */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-bold text-slate-800">Course Question Bank</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 border border-primary-200">
              {mcqs.length} Questions
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Centralized reusable questions linked to modules and lessons for exams and smart assessments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={FiDownload} onClick={handleExportQuestions}>
            Export
          </Button>

          {canManage && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={FiLayers}
                onClick={() => {
                  const isFranchise = typeof window !== 'undefined' && window.location.pathname.startsWith('/school');
                  const basePath = isFranchise ? '/school' : '/admin';
                  navigate(`${basePath}/courses/${courseId}/mcqs/batch`);
                }}
              >
                Batch Add MCQs
              </Button>

              <Button variant="primary" icon={FiPlus} onClick={handleOpenAddQuestion}>
                Add Question
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Difficulty Breakdown Badges */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Bank</span>
            <span className="text-base font-bold text-slate-800">{stats.total || 0}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">Easy Questions</span>
            <span className="text-base font-bold text-emerald-700">{stats.easy || 0}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600">Medium Questions</span>
            <span className="text-base font-bold text-amber-700">{stats.medium || 0}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <span className="text-xs font-medium text-red-600">Hard Questions</span>
            <span className="text-base font-bold text-red-700">{stats.hard || 0}</span>
          </div>
        </div>
      )}

      {/* 2. Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadQuestions(); }}
            placeholder="Search questions by keyword..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedModuleId}
            onChange={(e) => {
              setSelectedModuleId(e.target.value);
              setSelectedLessonId('');
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Modules</option>
            {modules.map((m) => (
              <option key={m._id} value={m._id}>
                Module {m.order}: {m.title}
              </option>
            ))}
          </select>

          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            disabled={!selectedModuleId}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="">All Lessons</option>
            {lessonsForFilterModule.map((l) => (
              <option key={l._id} value={l._id}>
                {l.title}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          <button type="button" onClick={toggleAllQuestions} className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
            {allQuestionsExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* 3. Dropdownable Accordion Question List (Single-Line Collapsed View) */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading Question Bank...</p>
        </div>
      ) : mcqs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <FiHelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">No questions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            No questions match your current filters. Add a new question to this course's bank.
          </p>
          <Button variant="primary" icon={FiPlus} onClick={handleOpenAddQuestion}>
            Add First Question
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {mcqs.map((q, idx) => {
            const isExpanded = Boolean(expandedMap[q._id]);
            const modTitle = q.module?.title || q.chapter?.title || 'Unassigned';
            const lsnTitle = q.lesson?.title || q.topic?.title || '';
            const diffTone = q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'danger' : 'warning';

            return (
              <div
                key={q._id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition overflow-hidden"
              >
                {/* Collapsed Single-Line Row */}
                <div
                  onClick={() => toggleQuestion(q._id)}
                  className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 transition"
                >
                  {/* Left: Chevron, Question Number & Statement */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-slate-400 hover:text-primary-600 transition shrink-0">
                      {isExpanded ? (
                        <FiChevronDown className="w-4 h-4 text-primary-600" />
                      ) : (
                        <FiChevronRight className="w-4 h-4" />
                      )}
                    </span>

                    <span className="text-xs font-bold text-slate-400 shrink-0">
                      Q{idx + 1}.
                    </span>

                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {q.question}
                    </p>

                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 hidden sm:inline">
                      {q.options?.length || 0} opts
                    </span>
                  </div>

                  {/* Middle: Badges (Module, Lesson, Difficulty, Marks, Status) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 max-w-[140px] truncate hidden md:inline-block"
                      title={modTitle}
                    >
                      {modTitle}
                    </span>

                    <Badge tone={diffTone} size="sm">
                      {q.difficulty || 'medium'}
                    </Badge>

                    <span className="text-[11px] font-semibold text-slate-600 hidden sm:inline">
                      {q.marks || 1}m
                    </span>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      q.status === 'inactive' || q.isActive === false
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {q.status === 'inactive' || q.isActive === false ? 'Inactive' : 'Active'}
                    </span>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-1 pl-1">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditQuestion(e, q)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-700 hover:bg-primary-50 transition"
                          title="Edit Question"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDuplicateQuestion(e, q)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition"
                          title="Duplicate Question"
                        >
                          <FiCopy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteQuestion(e, q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                          title="Delete Question"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Dropdown Content (Reveals Full Options & Details) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4 space-y-3.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-relaxed mb-1">
                        {q.question}
                      </h4>
                      {lsnTitle && (
                        <p className="text-[11px] text-slate-500">
                          Lesson: <strong className="text-slate-700">{lsnTitle}</strong>
                        </p>
                      )}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.options || []).map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        return (
                          <div
                            key={opt._id || oIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition ${
                              opt.isCorrect
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {letter}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                            {opt.isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. ADD / EDIT QUESTION MODAL */}
      <Modal
        open={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        title={editingQuestion ? 'Edit Question' : 'Add Question to Bank'}
        size="lg"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <FormGrid cols={2}>
            <FormField label="Assign Module" required>
              <SelectField
                value={questionForm.module}
                onChange={(e) => setQuestionForm({ ...questionForm, module: e.target.value, lesson: '' })}
                required
              >
                <option value="">Select Module</option>
                {modules.map((m) => (
                  <option key={m._id} value={m._id}>
                    Module {m.order}: {m.title}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="Assign Lesson (Optional)">
              <SelectField
                value={questionForm.lesson}
                onChange={(e) => setQuestionForm({ ...questionForm, lesson: e.target.value })}
                disabled={!questionForm.module}
              >
                <option value="">Course / Module Level</option>
                {lessonsForSelectedFormModule.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.title}
                  </option>
                ))}
              </SelectField>
            </FormField>
          </FormGrid>

          <FormField label="Question Text" required>
            <TextArea
              value={questionForm.question}
              onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
              placeholder="Type question statement here..."
              rows={3}
              required
            />
          </FormField>

          {/* Answer Options */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Answer Options (Select correct answer radio)
              </label>
              <span className="text-[11px] text-slate-400">At least 2 required</span>
            </div>

            <div className="space-y-2">
              {questionForm.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                      opt.isCorrect
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctOptionRadio"
                      checked={opt.isCorrect}
                      onChange={() => handleSetCorrectOption(idx)}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-600 w-5">
                      {letter}.
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Option ${letter} text...`}
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    {opt.isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <FormGrid cols={3}>
            <FormField label="Difficulty">
              <SelectField
                value={questionForm.difficulty}
                onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
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
                onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
              />
            </FormField>

            <FormField label="Negative Marks">
              <TextField
                type="number"
                min="0"
                step="0.25"
                value={questionForm.negativeMarks}
                onChange={(e) => setQuestionForm({ ...questionForm, negativeMarks: e.target.value })}
              />
            </FormField>
          </FormGrid>

          <FormField label="Explanation (Shown after exam completion)">
            <TextArea
              value={questionForm.explanation}
              onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
              placeholder="Explain why this answer is correct..."
              rows={2}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setQuestionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingQuestion ? 'Update Question' : 'Save Question'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
