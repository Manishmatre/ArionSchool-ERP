import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  FiClock, FiCheckCircle, FiBookmark, FiChevronLeft, FiChevronRight,
  FiRotateCcw, FiAlertCircle, FiCheck, FiLayers, FiHelpCircle
} from 'react-icons/fi';
import { PageLoading, Button, EmptyState, Modal, Badge } from '../../components/ui';

export default function TakeExam() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const [answers, setAnswers] = useState({}); // { [questionId]: { optionId, optionIndex } }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [markedForReview, setMarkedForReview] = useState([]);

  // Finish confirmation modal
  const [showFinishModal, setShowFinishModal] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/exams/student/${examId}/start`);
        const data = res.data.data;
        setExam(data.exam);
        const questionsList = data.mcqs || [];
        setMcqs(questionsList);

        // Restore any saved answers or review marks from existing active attempt
        const initialAnswers = {};
        const initialMarked = [];
        questionsList.forEach((m) => {
          if (m.selectedOptionId) {
            const optIdx = (m.options || []).findIndex((o) => String(o._id) === String(m.selectedOptionId));
            initialAnswers[m._id] = { optionId: m.selectedOptionId, optionIndex: optIdx >= 0 ? optIdx : 0 };
          }
          if (m.isMarkedForReview) {
            initialMarked.push(m._id);
          }
        });
        setAnswers(initialAnswers);
        setMarkedForReview(initialMarked);

        // Precise remaining time from server
        const serverSeconds = typeof data.remainingSeconds === 'number'
          ? data.remainingSeconds
          : (data.exam.duration || 60) * 60;

        setRemainingSeconds(serverSeconds);
        setTimeElapsed(0);
      } catch (error) {
        console.error('Failed to load exam', error);
        const feeAccess = error.response?.data?.feeAccess;
        if (error.response?.data?.notStarted) {
          toast.warning(error.response?.data?.message || 'This exam has not started yet. Please wait until the scheduled start time.');
        } else if (error.response?.status === 403 && feeAccess) {
          toast.error(
            error.response?.data?.message ||
              `Exam blocked. Pending fees: ₹${(feeAccess.totalPending || 0).toLocaleString('en-IN')}`
          );
        } else {
          toast.error(error.response?.data?.message || 'Failed to load exam');
        }
        navigate('/student/exams');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!exam) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [exam]);

  // Auto-submit when time is over
  useEffect(() => {
    if (!exam || loading || submitting) return;
    if (remainingSeconds <= 0) {
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, exam, loading, submitting]);

  const handleAnswerSelect = (questionId, optionId, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { optionId, optionIndex },
    }));

    // Real-time background autosave
    api.post(`/exams/student/${examId}/save-progress`, {
      questionId,
      selectedOptionId: optionId
    }).catch(() => {});
  };

  const handleClearAnswer = (questionId) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });

    api.post(`/exams/student/${examId}/save-progress`, {
      questionId,
      selectedOptionId: null
    }).catch(() => {});
  };

  const toggleMarkForReview = (questionId) => {
    const isMarked = markedForReview.includes(questionId);
    setMarkedForReview((prev) =>
      isMarked ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );

    api.post(`/exams/student/${examId}/save-progress`, {
      questionId,
      isMarkedForReview: !isMarked
    }).catch(() => {});
  };

  const handleNext = () => {
    if (currentQuestionIndex < mcqs.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (auto = false) => {
    if (!exam || mcqs.length === 0) return;

    setSubmitting(true);
    try {
      const formattedAnswers = mcqs.map((mcq) => ({
        question: mcq._id,
        selectedOptionId: answers[mcq._id]?.optionId || null,
        selectedOption: answers[mcq._id]?.optionIndex !== undefined ? answers[mcq._id].optionIndex : -1,
        timeTaken: 0,
      }));

      const payload = {
        answers: formattedAnswers,
        totalTimeTaken: timeElapsed,
      };

      const res = await api.post(`/exams/student/${examId}/submit`, payload);
      const submitResult = res.data.result;

      if (!auto) {
        if (submitResult?.isPassed) {
          toast.success(
            submitResult.certificateId
              ? 'Exam passed! Certificate generated successfully.'
              : 'Exam passed!'
          );
        } else {
          toast.info('Exam submitted. Review your result below.');
        }
      } else {
        toast.info('Time is over. Your exam has been auto-submitted.');
      }

      navigate(`/student/result/${submitResult.id}`);
    } catch (error) {
      console.error('Failed to submit exam', error);
      toast.error(error.response?.data?.message || 'Failed to submit exam');
      if (auto) {
        navigate('/student/exams');
      }
    } finally {
      setSubmitting(false);
      setShowFinishModal(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Setting up your test session..." />
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <EmptyState title="Exam not found" description="This exam is not available or has expired." />
      </Layout>
    );
  }

  const currentMcq = mcqs[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = mcqs.length - answeredCount;
  const isTimeCritical = remainingSeconds < 300; // < 5 mins
  const progressPercent = Math.round((answeredCount / (mcqs.length || 1)) * 100);

  return (
    <Layout>
      <div className="w-full space-y-3 pb-8">
        {/* Sleek, Integrated Top Bar */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                {exam.title}
              </h1>
              <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-md">
                Passing: {exam.passPercentage}%
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              Course: {exam.course?.title || 'General Assessment'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Modern Timer Pill */}
            <div
              className={`flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg border transition ${
                isTimeCritical
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : 'bg-primary-50/80 border-primary-200 text-primary-700'
              }`}
            >
              <FiClock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            {/* Finish Exam Button */}
            <Button
              variant="success"
              size="sm"
              icon={FiCheckCircle}
              onClick={() => setShowFinishModal(true)}
              disabled={submitting}
            >
              Finish Exam
            </Button>
          </div>
        </div>

        {/* Main Workspace (Questions + Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
          {/* Main Question Area (8 of 12 cols on desktop) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            {/* Question Header Strip */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-primary-600 text-white px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider">
                  Q {currentQuestionIndex + 1} of {mcqs.length}
                </span>
                {currentMcq?.marks && (
                  <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    +{currentMcq.marks} {currentMcq.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                )}
              </div>

              {/* Mark for Review Button */}
              <button
                type="button"
                onClick={() => toggleMarkForReview(currentMcq?._id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                  markedForReview.includes(currentMcq?._id)
                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <FiBookmark
                  className={`w-3.5 h-3.5 ${
                    markedForReview.includes(currentMcq?._id)
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-slate-400'
                  }`}
                />
                <span>
                  {markedForReview.includes(currentMcq?._id)
                    ? 'Marked for Review'
                    : 'Mark for Review'}
                </span>
              </button>
            </div>

            {/* Question Statement */}
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                {currentMcq?.question}
              </h2>
            </div>

            {/* Options List */}
            <div className="p-4 sm:p-5 space-y-2 bg-slate-50/40">
              {(currentMcq?.options || []).map((option, optIndex) => {
                const isSelected = answers[currentMcq._id]?.optionId
                  ? String(answers[currentMcq._id]?.optionId) === String(option._id)
                  : answers[currentMcq._id]?.optionIndex === optIndex;

                return (
                  <label
                    key={option._id || optIndex}
                    className={`flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-600 bg-white text-primary-950 font-semibold shadow-xs ring-2 ring-primary-500/15'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {String.fromCharCode(65 + optIndex)}
                    </div>

                    <input
                      type="radio"
                      name={`question-${currentMcq._id}`}
                      checked={isSelected}
                      onChange={() => handleAnswerSelect(currentMcq._id, option._id, optIndex)}
                      className="hidden"
                    />

                    <span className="text-xs sm:text-sm flex-1 leading-snug">
                      {option.text}
                    </span>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition ${
                        isSelected
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Navigation Footer */}
            <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={FiChevronLeft}
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>

              <div className="flex items-center gap-3">
                {answers[currentMcq?._id] && (
                  <button
                    type="button"
                    onClick={() => handleClearAnswer(currentMcq._id)}
                    className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition flex items-center gap-1"
                  >
                    <FiRotateCcw className="w-3 h-3" />
                    <span>Clear Answer</span>
                  </button>
                )}

                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={currentQuestionIndex === mcqs.length - 1}
                >
                  <span>Next Question</span>
                  <FiChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Unified Sidebar Card (4 of 12 cols on desktop) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-4">
            {/* Header: Progress & Mini Stats */}
            <div className="space-y-2.5 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Exam Progress
                </h3>
                <span className="text-xs font-extrabold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                  {progressPercent}% Complete
                </span>
              </div>

              {/* Mini Stats 3-Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="px-2 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <p className="text-[10px] font-bold uppercase text-emerald-600">Answered</p>
                  <p className="text-sm font-extrabold text-emerald-800">{answeredCount}</p>
                </div>
                <div className="px-2 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-[10px] font-bold uppercase text-amber-600">Review</p>
                  <p className="text-sm font-extrabold text-amber-800">{markedForReview.length}</p>
                </div>
                <div className="px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Left</p>
                  <p className="text-sm font-extrabold text-slate-700">{unansweredCount}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Palette Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Question Palette
                </h4>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {mcqs.length} Total
                </span>
              </div>

              {/* Compact Number Buttons Grid */}
              <div className="max-h-60 overflow-y-auto pr-0.5">
                <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5">
                  {mcqs.map((mcq, index) => {
                    const isCurrent = currentQuestionIndex === index;
                    const isAnswered = answers.hasOwnProperty(mcq._id);
                    const isReview = markedForReview.includes(mcq._id);

                    let bgClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
                    if (isAnswered && isReview) {
                      bgClass = 'bg-purple-600 text-white font-bold border-purple-600';
                    } else if (isReview) {
                      bgClass = 'bg-amber-500 text-white font-bold border-amber-500';
                    } else if (isAnswered) {
                      bgClass = 'bg-emerald-600 text-white font-bold border-emerald-600';
                    }

                    return (
                      <button
                        key={mcq._id}
                        type="button"
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`h-8 w-full rounded-lg flex items-center justify-center font-bold text-xs transition ${bgClass} ${
                          isCurrent
                            ? 'ring-2 ring-primary-600 ring-offset-2 scale-105 shadow-xs z-10'
                            : ''
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compact Color Legend */}
              <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 shrink-0" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
                  <span>Marked Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-600 shrink-0" />
                  <span>Answered & Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-300 shrink-0" />
                  <span>Unanswered</span>
                </div>
              </div>
            </div>

            {/* Quick Submit Action Button in Sidebar */}
            <div className="pt-2 border-t border-slate-100">
              <Button
                variant="success"
                size="sm"
                icon={FiCheckCircle}
                className="w-full justify-center"
                onClick={() => setShowFinishModal(true)}
                disabled={submitting}
              >
                Submit & Finish Exam
              </Button>
            </div>
          </div>
        </div>

        {/* Confirmation Modal Before Submission */}
        {showFinishModal && (
          <Modal
            isOpen={showFinishModal}
            onClose={() => setShowFinishModal(false)}
            title="Confirm Exam Submission"
            size="md"
          >
            <div className="p-5 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto">
                  <FiCheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Ready to submit your examination?
                </h3>
                <p className="text-xs text-slate-500">
                  Please review your attempt summary before final submission.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Answered</p>
                  <p className="text-base font-extrabold text-emerald-800">{answeredCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase">For Review</p>
                  <p className="text-base font-extrabold text-amber-800">{markedForReview.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-rose-700 uppercase">Unanswered</p>
                  <p className="text-base font-extrabold text-rose-800">{unansweredCount}</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    You have <strong>{unansweredCount} unanswered questions</strong>. They will be marked as skipped.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFinishModal(false)}
                  disabled={submitting}
                >
                  Continue Test
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  icon={FiCheckCircle}
                  onClick={() => handleSubmit(false)}
                  loading={submitting}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit Exam'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}
