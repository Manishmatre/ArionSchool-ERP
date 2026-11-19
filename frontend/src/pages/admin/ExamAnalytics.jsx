import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiBarChart2, FiUsers, FiCheck, FiTrendingUp, FiArrowLeft } from 'react-icons/fi';
import {
  StatCard, Card, CardHeader, PageLoading, EmptyState, StatusBadge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty, Button, Badge,
} from '../../components/ui';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const ExamAnalytics = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await api.get(`/exams/${examId}/analytics`);
      setAnalytics(res.data.data);
    } catch (error) {
      if (!silent) toast.error('Failed to load exam analytics');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Live results as students submit this exam.
  useAutoRefresh(
    () => fetchAnalytics({ silent: true }),
    { interval: 25000, events: ['exam-submitted', 'exam-result-ready'] }
  );

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading exam analytics..." />
      </Layout>
    );
  }

  if (!analytics || !analytics.exam) {
    return (
      <Layout>
        <PageHeader
          title="Exam Analytics"
          icon={FiBarChart2}
          actions={<Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/exams')}>Back</Button>}
        />
        <EmptyState title="No analytics data" description="Analytics will appear once students take this exam." />
      </Layout>
    );
  }

  const { exam, totalAttempts, passRate, averageScore, questionStats, studentResults } = analytics;

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title={`Analytics: ${exam.title}`}
          subtitle={`Course: ${exam.course?.title || 'N/A'}`}
          icon={FiBarChart2}
          actions={<Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/exams')}>Back</Button>}
        />

        {totalAttempts > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Total Attempts" tone="info" icon={FiUsers} value={totalAttempts} />
              <StatCard title="Pass Rate" tone="success" icon={FiCheck} value={`${passRate.toFixed(1)}%`} />
              <StatCard title="Average Score" tone="purple" icon={FiTrendingUp} value={`${averageScore.toFixed(1)}%`} />
            </div>

            <Card>
              <CardHeader title="Question Performance" icon={FiBarChart2} />
              <div className="space-y-4">
                {exam.questions.map((q, index) => {
                  const stats = questionStats[q._id];
                  const correctPercentage = stats && stats.totalAttempts > 0 ? (stats.correctAttempts / stats.totalAttempts) * 100 : 0;
                  return (
                    <div key={q._id} className="border border-slate-200 rounded-xl p-4">
                      <p className="font-semibold text-slate-800">{index + 1}. {q.question}</p>
                      <p className="text-sm text-slate-600 mt-2">
                        Correct: <span className="font-bold text-success-600">{correctPercentage.toFixed(1)}%</span>
                        {' '}({stats?.correctAttempts || 0}/{stats?.totalAttempts || 0})
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs p-2.5 rounded-lg bg-slate-50 gap-1">
                            <p className="text-slate-700">{opt.text}</p>
                            <Badge variant="neutral">Selected: {stats?.optionsSelected[optIndex] || 0}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card padded={false}>
              <div className="p-5 pb-0">
                <CardHeader title="Student Leaderboard" icon={FiUsers} />
              </div>
              <TableWrapper>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Student</TableHeader>
                      <TableHeader>Score</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Started At</TableHeader>
                      <TableHeader>Completed At</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studentResults.sort((a, b) => b.score - a.score).map((res) => (
                      <TableRow key={res.studentId}>
                        <TableCell><span className="font-medium">{res.studentName}</span></TableCell>
                        <TableCell>{res.score.toFixed(1)}%</TableCell>
                        <TableCell><StatusBadge status={res.isPassed ? 'pass' : 'fail'} label={res.isPassed ? 'Passed' : 'Failed'} /></TableCell>
                        <TableCell>{formatDateTime(res.startedAt)}</TableCell>
                        <TableCell>{formatDateTime(res.completedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            </Card>
          </>
        ) : (
          <EmptyState
            icon={FiBarChart2}
            title="No submissions yet"
            description="Analytics will appear here once students start taking the exam."
          />
        )}
      </div>
    </Layout>
  );
};

export default ExamAnalytics;
