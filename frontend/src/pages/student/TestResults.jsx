import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiEye, FiClock, FiCheckCircle, FiXCircle, FiPlus, FiBarChart2 } from 'react-icons/fi';
import { PageLoading, Card, Button, Badge, EmptyState } from '../../components/ui';

const FILTERS = [
  { key: 'all', label: 'All Tests' },
  { key: 'topic', label: 'Topic Tests' },
  { key: 'chapter', label: 'Chapter Tests' },
  { key: 'full', label: 'Full Tests' },
  { key: 'exam', label: 'Exams' },
];

const TestResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchResults();
  }, [filter]);

  const fetchResults = async () => {
    try {
      const params = filter !== 'all' ? { testType: filter } : {};
      const response = await api.get('/tests/my-results', { params });
      setResults(response.data.results);
    } catch (error) {
      toast.error('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    toast.info('Certificate download is now available through the new certificate system. Please contact your administrator.');
  };

  const scoreTone = (p) => (p >= 80 ? 'success' : p >= 60 ? 'warning' : 'danger');
  const scoreBorder = (p) => (p >= 80 ? 'border-success-400' : p >= 60 ? 'border-warning-400' : 'border-danger-400');
  const scoreLabel = (p) => (p >= 80 ? 'Excellent' : p >= 60 ? 'Good' : 'Needs Improvement');
  const scoreText = (p) => (p >= 80 ? 'text-success-600' : p >= 60 ? 'text-warning-600' : 'text-danger-600');

  if (loading) {
    return (
      <Layout>
        <PageHeader title="My Test Results" subtitle="View your test performance and scores" icon={FiBarChart2} />
        <PageLoading message="Loading results..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="My Test Results"
          subtitle="View your test performance and scores"
          icon={FiBarChart2}
          actions={<Button as={Link} to="/student/test" icon={FiPlus}>Take New Test</Button>}
        />

        <Card className="card-pad">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f.key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Card>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-5">
            {results.map((result) => (
              <div key={result._id} className={`card overflow-hidden border-l-4 ${scoreBorder(result.percentage)}`}>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="neutral">{result.testType.charAt(0).toUpperCase() + result.testType.slice(1)} Test</Badge>
                        {result.topic && <Badge variant="primary">{result.topic.title}</Badge>}
                        {result.chapter && !result.topic && <Badge variant="primary">{result.chapter.title}</Badge>}
                      </div>
                      <p className="text-sm text-slate-500">Completed on {new Date(result.completedAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold mb-1 ${scoreText(result.percentage)}`}>{result.percentage}%</div>
                      <Badge variant={scoreTone(result.percentage)}>{scoreLabel(result.percentage)}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Total Questions</p>
                      <p className="text-xl font-bold text-slate-800">{result.totalQuestions}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                      <FiCheckCircle className="text-success-600" />
                      <div>
                        <p className="text-xs text-slate-500">Correct</p>
                        <p className="text-xl font-bold text-slate-800">{result.correctAnswers}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                      <FiXCircle className="text-danger-600" />
                      <div>
                        <p className="text-xs text-slate-500">Wrong</p>
                        <p className="text-xl font-bold text-slate-800">{result.wrongAnswers}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                      <FiClock className="text-primary-600" />
                      <div>
                        <p className="text-xs text-slate-500">Time</p>
                        <p className="text-xl font-bold text-slate-800">{Math.floor(result.totalTimeTaken / 60)}m</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button as={Link} to={`/student/result/${result._id}`} icon={FiEye}>View Detailed Results</Button>
                    {result.certificate && <Button variant="success" onClick={handleDownload}>Download Certificate</Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="card-pad">
            <EmptyState icon={FiBarChart2} title="No test results found" action={<Button as={Link} to="/student/test">Take Your First Test</Button>} />
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default TestResults;
