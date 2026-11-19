import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  FiClock,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiRotateCcw,
  FiAlertCircle,
  FiArrowLeft,
  FiBookOpen,
  FiLayers,
  FiAward,
  FiHelpCircle
} from 'react-icons/fi';
import { PageLoading, Card, Button, Badge, Modal, EmptyState } from '../../components/ui';

const TakeTest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const testType = searchParams.get('type') || 'full';
  const courseId = searchParams.get('courseId');
  const chapterId = searchParams.get('chapterId');
  const topicId = searchParams.get('topicId');

  const [mcqs, setMcqs] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    if (!testType) {
      toast.error('Invalid test type.');
      navigate('/student/test');
      return;
    }
    loadTestQuestions();
  }, [testType, courseId, chapterId, topicId]);

  useEffect(() => {
    let interval;
    if (startTime) {
      interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime]);

  const loadTestQuestions = async () => {
    setLoading(true);
    try {
      const params = { testType };
      if (courseId) params.course = courseId;
      if (chapterId) params.chapter = chapterId;
      if (topicId) params.topic = topicId;

      const response = await api.get('/mcqs/test', { params });
      const fetchedMcqs = response.data.mcqs || [];

      if (fetchedMcqs.length === 0) {
        setMcqs([]);
        return;
      }

      setMcqs(fetchedMcqs);
      setStartTime(Date.now());

      // Read course info from first MCQ if available
      if (fetchedMcqs[0]?.course) {
        setCourseInfo(fetchedMcqs[0].course);
      }
    } catch (error) {
      toast.error('Failed to load test questions. Please try again.');
      setMcqs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers((prev) => {
      // If clicking the same option, toggle or retain
      return {
        ...prev,
        [questionId]: optionIndex
      };
    });
  };

  const handleClearAnswer = (questionId) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < mcqs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleOpenSubmit = () => {
    setShowSubmitModal(true);
  };

  const submitTest = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = mcqs.map((mcq) => ({
        question: mcq._id,
        selectedOption: answers[mcq._id] !== undefined ? answers[mcq._id] : -1,
        timeTaken: 0
      }));

      const payload = {
        testType,
        course: courseId || mcqs[0]?.course?._id || mcqs[0]?.course,
        chapter: chapterId || (testType === 'topic' ? mcqs[0]?.chapter?._id || mcqs[0]?.chapter : null),
        topic: topicId,
        answers: formattedAnswers,
        totalTimeTaken: timeElapsed
      };

      const response = await api.post('/tests/submit', payload);
      toast.success('Test submitted successfully!');
      setShowSubmitModal(false);
      navigate(`/student/result/${response.data.result.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit test');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Preparing your test questions..." />
      </Layout>
    );
  }

  if (mcqs.length === 0) {
    return (
      <Layout>
        <div className="space-y-6">
          <Card className="card-pad text-center py-12">
            <EmptyState
              title="No Test Questions Available"
              description="There are currently no active questions found for the selected criteria. Please choose a different topic or select a Full Course Test."
              action={
                <Button as={Link} to="/student/test" icon={FiArrowLeft} className="mt-4">
                  Back to Test Selection
                </Button>
              }
            />
          </Card>
        </div>
      </Layout>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = mcqs.length - answeredCount;
  const progressPercent = Math.round((answeredCount / mcqs.length) * 100);
  const currentMcq = mcqs[currentQuestionIndex];
  const isCurrentAnswered = answers[currentMcq?._id] !== undefined;

  const testTypeLabel =
    testType === 'topic'
      ? 'Topic Test'
      : testType === 'chapter'
      ? 'Chapter Test'
      : 'Full Course Test';

  const testTypeIcon =
    testType === 'topic' ? FiBookOpen : testType === 'chapter' ? FiLayers : FiAward;
  const TypeIcon = testTypeIcon;

  return (
    <Layout>
      <div className="space-y-6 w-full">
        {/* Top Control Bar Card */}
        <Card className="card-pad border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center text-xl flex-shrink-0">
                <TypeIcon />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wide bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full">
                    {testTypeLabel}
                  </span>
                  {courseInfo?.title && (
                    <span className="text-xs font-medium text-slate-500 truncate max-w-[250px]">
                      {courseInfo.title}
                    </span>
                  )}
                </div>
                <h1 className="text-lg md:text-xl font-bold text-slate-900 mt-1">
                  Question {currentQuestionIndex + 1} of {mcqs.length}
                </h1>
              </div>
            </div>

            {/* Timer & Submit Controls */}
            <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
              <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <FiClock className="text-primary-600 text-lg animate-pulse" />
                <div>
                  <div className="text-lg font-mono font-bold text-slate-900 leading-none">
                    {formatTime(timeElapsed)}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                    Time Elapsed
                  </div>
                </div>
              </div>

              <Button
                variant="success"
                icon={FiCheckCircle}
                onClick={handleOpenSubmit}
                className="px-5 py-2.5 font-semibold shadow-sm hover:shadow"
              >
                Submit Test
              </Button>
            </div>
          </div>

          {/* Progress Strip */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5 font-medium">
              <span>Overall Progress</span>
              <span className="text-primary-600 font-semibold">
                {answeredCount} / {mcqs.length} Answered ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Main Grid: Question (8 cols) & Navigator (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Question Left Pane */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="card-pad border border-slate-200 shadow-sm relative">
              {/* Question Header Meta */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary-600 text-white font-bold text-sm flex items-center justify-center">
                    {currentQuestionIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Question
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {currentMcq.difficulty && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full capitalize font-semibold bg-slate-100 text-slate-600">
                      {currentMcq.difficulty}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700">
                    {currentMcq.marks || 1} {currentMcq.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-6">
                <h2 className="text-lg md:text-xl font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {currentMcq.question}
                </h2>
              </div>

              {/* Options List */}
              <div className="space-y-3.5">
                {currentMcq.options.map((option, optIdx) => {
                  const isSelected = answers[currentMcq._id] === optIdx;
                  const optionLetter = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleAnswerSelect(currentMcq._id, optIdx)}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/70 shadow-sm ring-1 ring-primary-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {optionLetter}
                      </div>

                      <div className="flex-1 pt-1">
                        <span
                          className={`text-base md:text-lg select-none leading-normal font-medium ${
                            isSelected ? 'text-primary-950' : 'text-slate-800'
                          }`}
                        >
                          {option.text}
                        </span>
                      </div>

                      <div className="pt-1 flex-shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-primary-600 bg-primary-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Action Footer */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  icon={FiChevronLeft}
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="font-medium"
                >
                  Previous
                </Button>

                {isCurrentAnswered && (
                  <button
                    type="button"
                    onClick={() => handleClearAnswer(currentMcq._id)}
                    className="text-xs font-semibold text-slate-500 hover:text-danger-600 transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-danger-50"
                  >
                    <FiRotateCcw className="text-xs" />
                    <span>Clear Answer</span>
                  </button>
                )}

                {currentQuestionIndex < mcqs.length - 1 ? (
                  <Button
                    variant="primary"
                    iconRight={FiChevronRight}
                    onClick={handleNextQuestion}
                    className="font-medium"
                  >
                    Next Question
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    icon={FiCheckCircle}
                    onClick={handleOpenSubmit}
                    className="font-semibold shadow-sm"
                  >
                    Finish Test
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Right Navigator Pane (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Overview & Grid Card */}
            <Card className="card-pad border border-slate-200 shadow-sm">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900">Question Palette</h3>
                <p className="text-xs text-slate-500 mt-0.5">Click any number to jump directly</p>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="p-2 rounded-xl bg-success-50 border border-success-200">
                  <div className="text-base font-bold text-success-700">{answeredCount}</div>
                  <div className="text-[10px] uppercase font-semibold text-success-600">Answered</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-base font-bold text-slate-700">{unansweredCount}</div>
                  <div className="text-[10px] uppercase font-semibold text-slate-600">Remaining</div>
                </div>
                <div className="p-2 rounded-xl bg-primary-50 border border-primary-200">
                  <div className="text-base font-bold text-primary-700">{mcqs.length}</div>
                  <div className="text-[10px] uppercase font-semibold text-primary-600">Total</div>
                </div>
              </div>

              {/* Number Matrix */}
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[320px] overflow-y-auto p-1">
                {mcqs.map((mcq, idx) => {
                  const isAnswered = answers[mcq._id] !== undefined;
                  const isCurrent = idx === currentQuestionIndex;

                  let btnStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
                  if (isAnswered) {
                    btnStyle = 'bg-success-600 text-white hover:bg-success-700 border-success-600 font-semibold shadow-xs';
                  }
                  if (isCurrent) {
                    btnStyle += ' ring-2 ring-primary-500 ring-offset-2 !border-primary-600';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      className={`h-10 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center relative ${btnStyle}`}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                      {isAnswered && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <Button
                  variant="success"
                  icon={FiCheckCircle}
                  onClick={handleOpenSubmit}
                  className="w-full justify-center !py-2.5 font-semibold"
                >
                  Submit Assessment
                </Button>
              </div>
            </Card>

            {/* Assessment Tips Card */}
            <Card className="card-pad border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <FiHelpCircle className="text-primary-600" /> Helpful Hints
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>You can change your selected answers anytime before submitting.</li>
                <li>Green indicates questions that have been answered.</li>
                <li>Make sure to double check all responses before submitting.</li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        <Modal
          open={showSubmitModal}
          onClose={() => !submitting && setShowSubmitModal(false)}
          title="Submit Test"
          subtitle="Confirm test completion"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Answered Questions:</span>
                <span className="font-bold text-success-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Unanswered Questions:</span>
                <span className={`font-bold ${unansweredCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {unansweredCount}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-500">Time Spent:</span>
                <span className="font-bold text-slate-800">{formatTime(timeElapsed)}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <FiAlertCircle className="text-base flex-shrink-0 mt-0.5 text-amber-600" />
                <span>
                  You still have <strong>{unansweredCount} unanswered questions</strong>. They will be marked as skipped.
                </span>
              </div>
            )}

            <p className="text-sm text-slate-600">
              Are you sure you want to finalize and submit your test now?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                variant="secondary"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
              >
                Continue Test
              </Button>
              <Button
                variant="success"
                icon={FiCheckCircle}
                onClick={submitTest}
                loading={submitting}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Test'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default TakeTest;
