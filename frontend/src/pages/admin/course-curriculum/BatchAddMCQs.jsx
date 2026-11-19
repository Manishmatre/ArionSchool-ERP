import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiCheckCircle, FiHelpCircle,
  FiChevronDown, FiChevronUp, FiCheck
} from 'react-icons/fi';
import Layout from '../../../components/Layout';
import PageHeader from '../../../components/PageHeader';
import {
  Card, Button, FormField, FormGrid, TextField, TextArea, SelectField, Badge
} from '../../../components/ui';
import { getCourses, getCourse } from '../../../api/courseApi';
import { getModules } from '../../../api/curriculumApi';
import { bulkCreateMCQs } from '../../../api/mcqApi';

const DEFAULT_MCQ_TEMPLATE = () => ({
  id: Date.now() + Math.random(),
  question: '',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ],
  difficulty: 'medium',
  marks: 1,
  negativeMarks: 0,
  explanation: '',
  status: 'active'
});

export default function BatchAddMCQs() {
  const { courseId: paramCourseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(paramCourseId || searchParams.get('courseId') || '');
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(searchParams.get('moduleId') || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // List of questions being authored
  const [questions, setQuestions] = useState([DEFAULT_MCQ_TEMPLATE()]);
  // Currently expanded question index (only one expanded at a time!)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    async function initCourses() {
      try {
        setLoading(true);
        const res = await getCourses();
        const list = res.data || [];
        setCourses(list);

        const initialCourse = selectedCourseId || list[0]?._id || '';
        setSelectedCourseId(initialCourse);

        if (initialCourse) {
          const modRes = await getModules({ course: initialCourse });
          const mList = modRes.data || [];
          setModules(mList);
          if (!selectedModuleId && mList.length > 0) {
            setSelectedModuleId(mList[0]._id);
          }
        }
      } catch (err) {
        toast.error('Failed to load courses');
      } finally {
        setLoading(false);
      }
    }
    initCourses();
  }, []);

  // When course changes, reload its modules
  const handleCourseChange = async (newCourseId) => {
    setSelectedCourseId(newCourseId);
    try {
      const modRes = await getModules({ course: newCourseId });
      const mList = modRes.data || [];
      setModules(mList);
      setSelectedModuleId(mList[0]?._id || '');
    } catch (err) {
      toast.error('Failed to load modules for selected course');
    }
  };

  const updateQuestionField = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOptionText = (qIndex, optIndex, text) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const opts = [...updated[qIndex].options];
      opts[optIndex] = { ...opts[optIndex], text };
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return updated;
    });
  };

  const setCorrectOption = (qIndex, optIndex) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const opts = updated[qIndex].options.map((opt, i) => ({
        ...opt,
        isCorrect: i === optIndex
      }));
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return updated;
    });
  };

  // Add another question (auto-collapses previous!)
  const handleAddAnotherQuestion = () => {
    const current = questions[activeQuestionIndex];
    if (current && !current.question.trim()) {
      toast.warning(`Please enter question text for Question ${activeQuestionIndex + 1} before adding another.`);
      return;
    }

    const nextQ = DEFAULT_MCQ_TEMPLATE();
    setQuestions((prev) => [...prev, nextQ]);
    // Auto-collapse previous and expand the new one
    setActiveQuestionIndex(questions.length);
  };

  const handleRemoveQuestion = (indexToRemove) => {
    if (questions.length <= 1) {
      toast.info('You must have at least one question form.');
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeQuestionIndex === indexToRemove) {
      setActiveLessonIndex(Math.max(0, indexToRemove - 1));
    } else if (activeQuestionIndex > indexToRemove) {
      setActiveQuestionIndex((prev) => prev - 1);
    }
  };

  // Save all questions in batch
  const handleSaveAllQuestions = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }
    if (!selectedModuleId) {
      toast.error('Please select a target module');
      return;
    }

    const validQuestions = questions.filter((q) => q.question.trim());
    if (validQuestions.length === 0) {
      toast.error('Please enter question statements');
      return;
    }

    // Ensure all valid questions have at least 2 options and a correct option
    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];
      const filled = q.options.filter((o) => o.text.trim());
      if (filled.length < 2) {
        toast.error(`Question ${i + 1} needs at least 2 filled options.`);
        setActiveQuestionIndex(i);
        return;
      }
      if (!filled.some((o) => o.isCorrect)) {
        toast.error(`Question ${i + 1} does not have a correct answer selected.`);
        setActiveQuestionIndex(i);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        course: selectedCourseId,
        module: selectedModuleId,
        questions: validQuestions.map((q) => ({
          question: q.question.trim(),
          options: q.options.filter((o) => o.text.trim()),
          difficulty: q.difficulty,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          explanation: q.explanation,
          status: q.status
        }))
      };

      await bulkCreateMCQs(payload);
      toast.success(`Successfully saved ${validQuestions.length} questions to the Question Bank!`);

      if (paramCourseId) {
        navigate(`/admin/courses/${paramCourseId}?courseTab=mcqs`);
      } else {
        navigate('/admin/mcqs');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading Question Bank creator...</p>
        </div>
      </Layout>
    );
  }

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);
  const selectedModule = modules.find((m) => m._id === selectedModuleId);

  return (
    <Layout>
      <div className="w-full space-y-6 pb-12">
        <PageHeader
          title="Batch Add Questions"
          subtitle="Quickly author multiple questions with auto-collapsing question cards."
          icon={FiHelpCircle}
          actions={
            <Button
              variant="secondary"
              icon={FiArrowLeft}
              onClick={() => {
                if (paramCourseId) navigate(`/admin/courses/${paramCourseId}?courseTab=mcqs`);
                else navigate('/admin/mcqs');
              }}
            >
              Back
            </Button>
          }
        />

        {/* Course & Target Module Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Course *
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Module *
            </label>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {modules.map((m) => (
                <option key={m._id} value={m._id}>
                  Module {m.order}: {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Questions List with auto-collapse */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const isExpanded = activeQuestionIndex === idx;
            const correctOpt = q.options.find((o) => o.isCorrect);

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isExpanded ? 'border-primary-400 ring-2 ring-primary-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Single-Line Collapsed Summary Bar */}
                <div
                  onClick={() => setActiveQuestionIndex(isExpanded ? -1 : idx)}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0">
                      Q{idx + 1}
                    </span>

                    <span className="text-xs font-bold text-slate-800 truncate">
                      {q.question || `Question ${idx + 1} (Empty)`}
                    </span>

                    <Badge
                      tone={q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {q.difficulty}
                    </Badge>

                    {correctOpt?.text && (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 hidden sm:inline truncate max-w-xs">
                        Correct: {correctOpt.text}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveQuestionIndex(isExpanded ? -1 : idx);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-primary-700 bg-slate-100 hover:bg-primary-50 rounded-lg transition inline-flex items-center gap-1"
                    >
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      <span>{isExpanded ? 'Collapse' : 'Edit'}</span>
                    </button>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveQuestion(idx);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                        title="Remove Question"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Full Form Section */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 md:p-6 bg-slate-50/50 space-y-4">
                    <FormField label={`Question ${idx + 1} Statement`} required>
                      <TextArea
                        value={q.question}
                        onChange={(e) => updateQuestionField(idx, 'question', e.target.value)}
                        placeholder="Type question statement here..."
                        rows={3}
                        required
                      />
                    </FormField>

                    {/* Options with Radio */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Answer Options (Select correct radio)
                        </label>
                        <span className="text-[11px] text-slate-400">At least 2 required</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          return (
                            <div
                              key={oIdx}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition ${
                                opt.isCorrect
                                  ? 'bg-emerald-50/70 border-emerald-300'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correctRadio-${q.id}`}
                                checked={opt.isCorrect}
                                onChange={() => setCorrectOption(idx, oIdx)}
                                className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-slate-600 w-4">
                                {letter}.
                              </span>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => updateOptionText(idx, oIdx, e.target.value)}
                                placeholder={`Option ${letter} text...`}
                                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <FormGrid cols={3}>
                      <FormField label="Difficulty">
                        <SelectField
                          value={q.difficulty}
                          onChange={(e) => updateQuestionField(idx, 'difficulty', e.target.value)}
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
                          value={q.marks}
                          onChange={(e) => updateQuestionField(idx, 'marks', e.target.value)}
                        />
                      </FormField>

                      <FormField label="Negative Marks">
                        <TextField
                          type="number"
                          min="0"
                          step="0.25"
                          value={q.negativeMarks}
                          onChange={(e) => updateQuestionField(idx, 'negativeMarks', e.target.value)}
                        />
                      </FormField>
                    </FormGrid>

                    <FormField label="Explanation (Optional)">
                      <TextArea
                        value={q.explanation}
                        onChange={(e) => updateQuestionField(idx, 'explanation', e.target.value)}
                        placeholder="Explain why this answer is correct..."
                        rows={2}
                      />
                    </FormField>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Another Question Button (Auto-collapses previous!) */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleAddAnotherQuestion}
            className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/40 hover:bg-primary-50 text-xs font-bold text-primary-700 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <FiPlus className="w-4 h-4 text-primary-600" />
            <span>+ Add Another Question (Auto-collapses previous question)</span>
          </button>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              if (paramCourseId) navigate(`/admin/courses/${paramCourseId}?courseTab=mcqs`);
              else navigate('/admin/mcqs');
            }}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Saving to: <strong>{selectedModule?.title || 'Selected Module'}</strong> ({selectedCourse?.title})
            </span>
            <Button
              variant="primary"
              icon={FiCheckCircle}
              onClick={handleSaveAllQuestions}
              loading={saving}
            >
              Save All {questions.filter((q) => q.question.trim()).length} Questions
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

