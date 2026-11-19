import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { downloadGeneratedStudentCertificate } from '../../api/studentCertificateApi';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiXCircle, FiArrowLeft, FiClock, FiAward, FiFileText, FiHelpCircle } from 'react-icons/fi';
import { PageLoading, Card, StatCard, Badge, Button, EmptyState } from '../../components/ui';

const ViewResult = () => {
  const { resultId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [resultId]);

  const fetchResult = async () => {
    try {
      const response = await api.get(`/tests/results/${resultId}`);
      setResult(response.data.result);
    } catch (error) {
      toast.error('Failed to fetch result details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    const certId = result.studentCertificate?._id || result.certificate?._id;
    if (!certId) {
      toast.info('Certificate is not available for this result yet.');
      return;
    }

    try {
      await downloadGeneratedStudentCertificate(certId, `Certificate_${result.exam?.title || 'exam'}.png`);
      toast.success('Certificate downloaded');
    } catch (error) {
      toast.error('Failed to download certificate');
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-success-600';
    if (percentage >= 60) return 'text-warning-600';
    return 'text-danger-600';
  };

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading result..." />
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout>
        <EmptyState title="Result not found" description="We couldn't find this result." />
      </Layout>
    );
  }

  const isExamResult = result.testType === 'exam';
  const certificateAvailable = Boolean(result.studentCertificate || result.certificate);

  return (
    <Layout>
      <div className="space-y-5">
        <Link
          to="/student/results"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <FiArrowLeft />
          <span>Back to Results</span>
        </Link>

        {/* Result Summary */}
        <Card>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="neutral" className="capitalize">
                  {isExamResult ? 'Exam' : `${result.testType} Test`}
                </Badge>
                {isExamResult && result.exam?.title && (
                  <Badge variant="primary">{result.exam.title}</Badge>
                )}
                {result.course?.title && (
                  <Badge variant="primary">{result.course.title}</Badge>
                )}
                {isExamResult && (
                  <Badge variant={result.isPassed ? 'success' : 'danger'}>
                    {result.isPassed ? 'Passed' : 'Failed'}
                  </Badge>
                )}
                {result.topic && (
                  <Badge variant="primary">{result.topic.title}</Badge>
                )}
                {result.chapter && !result.topic && (
                  <Badge variant="primary">{result.chapter.title}</Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Completed on {new Date(result.completedAt).toLocaleString()}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className={`text-5xl font-bold ${getScoreColor(result.percentage)}`}>
                {result.percentage}%
              </div>
              <p className="text-slate-500 mt-1">Your Score</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Questions" tone="slate" icon={FiHelpCircle} value={result.totalQuestions} />
            <StatCard title="Correct" tone="success" icon={FiCheckCircle} value={result.correctAnswers} />
            <StatCard title="Wrong" tone="danger" icon={FiXCircle} value={result.wrongAnswers} />
            <StatCard
              title="Time Taken"
              tone="info"
              icon={FiClock}
              value={`${Math.floor(result.totalTimeTaken / 60)}m ${result.totalTimeTaken % 60}s`}
            />
          </div>
        </Card>

        {showDetails && (
          <Card>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Detailed Review</h2>
            <div className="space-y-6">
              {result.answers.map((answer, index) => {
                const question = answer.question;
                const correctOptionIndex = question.options.findIndex(opt => opt.isCorrect);

                return (
                  <div
                    key={answer._id}
                    className={`border-2 rounded-xl p-5 ${
                      answer.isCorrect ? 'border-success-200 bg-success-50' : 'border-danger-200 bg-danger-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        answer.isCorrect ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {answer.isCorrect ? (
                            <span className="flex items-center gap-1 text-success-600 font-semibold">
                              <FiCheckCircle />
                              <span>Correct</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-danger-600 font-semibold">
                              <FiXCircle />
                              <span>Incorrect</span>
                            </span>
                          )}
                          <Badge variant="neutral" className="capitalize">{question.difficulty}</Badge>
                          <Badge variant="neutral">{question.marks} mark{question.marks > 1 ? 's' : ''}</Badge>
                        </div>

                        <h3 className="text-lg font-medium text-slate-800 mb-4">{question.question}</h3>

                        <div className="space-y-2 mb-4">
                          {question.options.map((option, optIndex) => {
                            const isSelected = answer.selectedOption === optIndex;
                            const isCorrect = optIndex === correctOptionIndex;

                            return (
                              <div
                                key={optIndex}
                                className={`p-3 rounded-lg border-2 ${
                                  isCorrect
                                    ? 'border-success-500 bg-success-100'
                                    : isSelected
                                    ? 'border-danger-500 bg-danger-100'
                                    : 'border-slate-200 bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{String.fromCharCode(65 + optIndex)}.</span>
                                  <span className="flex-1">{option.text}</span>
                                  {isCorrect && (
                                    <span className="text-success-600 font-semibold flex items-center gap-1">
                                      <FiCheckCircle />
                                      <span className="hidden sm:inline">Correct Answer</span>
                                    </span>
                                  )}
                                  {isSelected && !isCorrect && (
                                    <span className="text-danger-600 font-semibold flex items-center gap-1">
                                      <FiXCircle />
                                      <span className="hidden sm:inline">Your Answer</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {question.explanation && (
                          <div className="bg-info-50 border-l-4 border-info-500 p-4 rounded">
                            <p className="text-sm font-semibold text-info-700 mb-1">Explanation:</p>
                            <p className="text-sm text-info-600">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => setShowDetails(prev => !prev)}
              className="w-full sm:w-auto justify-center"
            >
              {showDetails ? 'Hide Detailed Review' : 'Show Detailed Review'}
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {certificateAvailable && result.isPassed && (
                <Button
                  variant="success"
                  icon={FiAward}
                  onClick={handleDownloadCertificate}
                  className="w-full sm:w-auto justify-center"
                >
                  Download Certificate
                </Button>
              )}
              {result.marksheet && (
                <Button
                  as={Link}
                  to="/student/certificates"
                  icon={FiFileText}
                  className="w-full sm:w-auto justify-center !bg-purple-600 hover:!bg-purple-700"
                >
                  View Documents
                </Button>
              )}
              <Button
                as={Link}
                to={isExamResult ? '/student/exams' : '/student/test'}
                className="w-full sm:w-auto justify-center"
              >
                {isExamResult ? 'Back to Exams' : 'Take Another Test'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default ViewResult;
