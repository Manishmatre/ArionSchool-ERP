import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiClock, FiCheckCircle, FiXCircle, FiArrowLeft, FiBook, FiHelpCircle, FiTarget } from 'react-icons/fi';
import {
  Card, StatCard, Badge, Button, PageLoading, EmptyState,
} from '../../components/ui';

const PreviewExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/exams/${examId}`);
        setExam(res.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load exam preview');
        navigate('/admin/exams');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, navigate]);

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading exam preview..." />
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <Card>
          <EmptyState
            icon={FiXCircle}
            title="Exam not found"
            description="The exam you are looking for does not exist or has been removed."
            action={<Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/exams')}>Back to Exams</Button>}
          />
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title={`Preview: ${exam.title}`}
          subtitle={exam.description || 'Review the exam questions and details below.'}
          onBack={() => navigate('/admin/exams')}
          actions={(
            <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/exams')}>
              Back to Exams
            </Button>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Course" value={exam.course?.title || 'N/A'} icon={FiBook} tone="primary" />
          <StatCard title="Total Questions" value={exam.questions.length} icon={FiHelpCircle} tone="info" />
          <StatCard title="Pass Percentage" value={`${exam.passPercentage || 60}%`} icon={FiTarget} tone="success" />
          <StatCard title="Duration" value={`${exam.duration} min`} icon={FiClock} tone="warning" />
        </div>

        <div className="space-y-6">
          {exam.questions.map((mcq, index) => (
            <Card key={mcq._id}>
              <div className="flex items-start space-x-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-slate-800 mb-4">{mcq.question}</h3>
                  <div className="space-y-3">
                    {mcq.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`flex items-center space-x-3 p-4 border-2 rounded-lg ${option.isCorrect ? 'border-success-500 bg-success-50' : 'border-slate-200'}`}>
                        {option.isCorrect ? <FiCheckCircle className="text-success-600" /> : <FiXCircle className="text-slate-400" />}
                        <span className="font-medium text-slate-700">{String.fromCharCode(65 + optIndex)}.</span>
                        <span className="text-slate-800">{option.text}</span>
                        {option.isCorrect && <Badge variant="success" className="ml-auto">Correct</Badge>}
                      </div>
                    ))}
                  </div>
                  {mcq.explanation && (
                    <div className="mt-4 bg-info-50 border-l-4 border-info-400 p-3 rounded-r">
                      <p className="text-sm font-semibold text-info-800">Explanation:</p>
                      <p className="text-sm text-info-700">{mcq.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default PreviewExam;
