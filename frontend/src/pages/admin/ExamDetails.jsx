import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiClock, FiCheckSquare, FiFileText,
  FiAward, FiUsers, FiLayers, FiCheck, FiX, FiEye, FiBarChart2,
  FiSearch, FiDownload, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import {
  Card, StatCard, Badge, StatusBadge, Button, PageLoading, EmptyState,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell
} from '../../components/ui';

export default function ExamDetails() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Search within student results
  const [resultSearch, setResultSearch] = useState('');

  const fetchExam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/exams/${examId}`);
      setExam(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load exam details');
      navigate('/admin/exams');
    } finally {
      setLoading(false);
    }
  }, [examId, navigate]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  // Real-time socket event for live submission updates
  useEffect(() => {
    if (!socket || !examId) return undefined;

    socket.emit('join-exam', examId);

    const onExamSubmitted = (data) => {
      if (String(data.examId) === String(examId)) {
        toast.info('New student submission received! Refreshing data...');
        fetchExam();
      }
    };

    socket.on('exam-submitted', onExamSubmitted);

    return () => {
      socket.off('exam-submitted', onExamSubmitted);
    };
  }, [socket, examId, fetchExam]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
    try {
      await api.delete(`/exams/${examId}`);
      toast.success('Exam deleted successfully');
      navigate('/admin/exams');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete exam');
    }
  };

  const getDurationMinutes = (examData) => {
    if (!examData || !examData.duration) return 'N/A';
    return `${examData.duration} min`;
  };

  const filteredResults = useMemo(() => {
    if (!exam?.results) return [];
    if (!resultSearch.trim()) return exam.results;
    const q = resultSearch.toLowerCase();
    return exam.results.filter((res) => {
      const profile = res.studentProfile;
      const studentName = profile
        ? `${profile.personalInfo?.firstName || ''} ${profile.personalInfo?.lastName || ''}`.trim()
        : res.student?.name || '';
      const email = res.student?.email || '';
      const studentId = profile?.studentId || '';
      return (
        studentName.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        studentId.toLowerCase().includes(q)
      );
    });
  }, [exam?.results, resultSearch]);

  if (loading || !exam) {
    return (
      <Layout>
        <PageHeader title="Exam Details" subtitle="Loading assessment details..." icon={FiFileText} />
        <PageLoading message="Loading exam details..." />
      </Layout>
    );
  }

  const summary = exam.resultSummary || { total: 0, passed: 0, failed: 0, passRate: 0 };
  const totalQuestions = exam.questions?.length || 0;
  const totalMarks = (exam.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Main Header */}
        <PageHeader
          title={exam.title}
          subtitle={`Course: ${exam.course?.title || 'General Assessment'}`}
          icon={FiFileText}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                icon={FiArrowLeft}
                onClick={() => navigate('/admin/exams')}
              >
                Back to Exams
              </Button>
              <Button
                variant="secondary"
                icon={FiEye}
                onClick={() => navigate(`/admin/exams/preview/${examId}`)}
              >
                Preview Paper
              </Button>
              <Button
                variant="secondary"
                icon={FiBarChart2}
                onClick={() => navigate(`/admin/exams/${examId}/analytics`)}
              >
                Analytics
              </Button>
              {user.role === 'super_admin' && (
                <>
                  <Button
                    variant="primary"
                    icon={FiEdit2}
                    onClick={() => navigate(`/admin/exams/${examId}/edit`)}
                  >
                    Edit Exam
                  </Button>
                  <Button
                    variant="danger"
                    icon={FiTrash2}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Status & Quick Tags Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={exam.status} />
            <Badge variant="primary" className="text-xs">
              {exam.course?.title || 'Course'}
            </Badge>
            {exam.franchise ? (
              <Badge variant="purple" className="text-xs">
                Campus: {exam.franchise.name}
              </Badge>
            ) : (
              <Badge variant="info" className="text-xs">
                Global (All Campuses)
              </Badge>
            )}
            {exam.mode && (
              <Badge variant="slate" className="text-xs capitalize">
                Mode: {exam.mode}
              </Badge>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Exam ID: <span className="font-mono text-slate-700 font-semibold">{exam._id}</span>
          </div>
        </div>

        {/* Consolidated Standardized Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            icon={FiCheckSquare}
            title="Questions"
            value={totalQuestions}
            tone="info"
          />
          <StatCard
            icon={FiAward}
            title="Total Marks"
            value={totalMarks}
            tone="primary"
          />
          <StatCard
            icon={FiClock}
            title="Duration"
            value={getDurationMinutes(exam)}
            tone="purple"
          />
          <StatCard
            icon={FiAward}
            title="Pass Required"
            value={`${exam.passPercentage}%`}
            tone="slate"
          />
          <StatCard
            icon={FiUsers}
            title="Submissions"
            value={summary.total || exam.attemptsCount || 0}
            tone="amber"
          />
          <StatCard
            icon={FiCheckCircle}
            title="Passed"
            value={summary.passed || 0}
            tone="success"
          />
          <StatCard
            icon={FiAlertCircle}
            title="Pass Rate"
            value={`${summary.passRate || 0}%`}
            tone={summary.passRate >= 60 ? 'success' : 'danger'}
          />
        </div>

        {/* Modern Sub-Topbar Navigation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FiFileText className="w-4 h-4" />
              <span>Overview & Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'questions'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FiCheckSquare className="w-4 h-4" />
              <span>Exam Questions</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'questions'
                    ? 'bg-primary-800 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {totalQuestions}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'results'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FiUsers className="w-4 h-4" />
              <span>Student Submissions</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'results'
                    ? 'bg-primary-800 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {exam.results?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/admin/exams/${examId}/analytics`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition whitespace-nowrap ml-auto"
            >
              <FiBarChart2 className="w-4 h-4 text-primary-600" />
              <span>View In-Depth Analytics →</span>
            </button>
          </div>
        </div>

        {/* Tab 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Details & Schedule */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description Card */}
              <Card className="border border-slate-200 shadow-xs">
                <div className="p-6 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Exam Overview & Description
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {exam.description || 'No description provided for this examination.'}
                  </p>
                  {exam.instructions && (
                    <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                      <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-1">
                        Candidate Instructions:
                      </p>
                      <p className="text-xs text-amber-900">{exam.instructions}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Schedule and Parameters Card */}
              <Card className="border border-slate-200 shadow-xs">
                <div className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Schedule & Configuration
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Course</span>
                      <span className="text-xs font-bold text-slate-800">{exam.course?.title || 'N/A'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Duration</span>
                      <span className="text-xs font-bold text-slate-800">{exam.duration} Minutes</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Start Date & Time</span>
                      <span className="text-xs font-bold text-slate-800">
                        {exam.startTime ? new Date(exam.startTime).toLocaleString('en-IN') : 'Immediate'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">End / Expiry Date</span>
                      <span className="text-xs font-bold text-slate-800">
                        {exam.endTime ? new Date(exam.endTime).toLocaleString('en-IN') : 'No Expiry'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Campus Scope</span>
                      <span className="text-xs font-bold text-slate-800">
                        {exam.franchise?.name ? `${exam.franchise.name} (${exam.franchise.code || ''})` : 'All Campuses (Global)'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Max Attempts</span>
                      <span className="text-xs font-bold text-slate-800">{exam.maxAttempts || 1} Attempt</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Negative Marking</span>
                      <span className="text-xs font-bold text-slate-800">
                        {exam.negativeMarking ? `Yes (-${exam.negativeMarksPerQuestion || 0} marks)` : 'Disabled'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Passing Benchmark</span>
                      <span className="text-xs font-bold text-emerald-700">
                        {exam.passPercentage}% ({Math.ceil((totalMarks * (exam.passPercentage || 60)) / 100)} / {totalMarks} Marks)
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Col: Performance Summary */}
            <div className="space-y-6">
              <Card className="border border-slate-200 shadow-xs">
                <div className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Performance Snapshot
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Total Attempts</span>
                      <span className="font-bold text-slate-800">{summary.total}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Passed Candidates</span>
                      <span className="font-bold text-emerald-600">{summary.passed}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Failed Candidates</span>
                      <span className="font-bold text-rose-600">{summary.failed}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="font-bold text-slate-700">Pass Rate</span>
                      <span className="font-bold text-primary-700">{summary.passRate}%</span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(summary.passRate || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FiEye}
                      className="w-full"
                      onClick={() => setActiveTab('results')}
                    >
                      View All Submissions ({exam.results?.length || 0})
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: QUESTIONS */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Question Paper Structure ({totalQuestions} Questions • {totalMarks} Marks)
              </h3>
              <Button
                variant="secondary"
                size="sm"
                icon={FiEye}
                onClick={() => navigate(`/admin/exams/preview/${examId}`)}
              >
                Candidate Preview
              </Button>
            </div>

            {(!exam.questions || exam.questions.length === 0) ? (
              <EmptyState
                icon={FiCheckSquare}
                title="No questions attached to this exam"
                description="Please edit the exam to add questions."
              />
            ) : (
              <div className="space-y-3">
                {exam.questions.map((q, idx) => {
                  const moduleTitle = typeof q.module === 'object' ? q.module?.title : 'Module';
                  return (
                    <Card key={q._id || idx} className="border border-slate-200 hover:border-slate-300 transition shadow-xs">
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-4">
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
                                  {q.difficulty || 'medium'}
                                </Badge>
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {q.marks || 1} {q.marks === 1 ? 'Mark' : 'Marks'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Options preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.options || []).map((opt, optIdx) => (
                            <div
                              key={opt._id || optIdx}
                              className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition ${
                                opt.isCorrect
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold shadow-2xs'
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
                              {opt.isCorrect && (
                                <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                            <span className="font-bold text-slate-700">Explanation: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: RESULTS */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full max-w-md">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search submissions by student name, ID or email..."
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live socket updates active
              </div>
            </div>

            {(!exam.results || exam.results.length === 0) ? (
              <EmptyState
                icon={FiUsers}
                title="No student attempts recorded yet"
                description="When students complete this examination, their scores and certificates will appear here in real time."
              />
            ) : filteredResults.length === 0 ? (
              <EmptyState
                icon={FiSearch}
                title="No matching submissions found"
                description="Try searching with a different student name or ID."
              />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Student</TableHeader>
                      <TableHeader>Score</TableHeader>
                      <TableHeader>Percentage</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Certificate</TableHeader>
                      <TableHeader>Time Taken</TableHeader>
                      <TableHeader>Submission Date</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {filteredResults.map((result) => {
                      const profile = result.studentProfile;
                      const studentName = profile
                        ? `${profile.personalInfo?.firstName || ''} ${profile.personalInfo?.lastName || ''}`.trim()
                        : result.student?.name || 'Student';
                      const studentId = profile?.studentId || result.student?.email || 'N/A';

                      return (
                        <TableRow key={result._id}>
                          <TableCell className="!whitespace-normal">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                                {studentName.charAt(0) || 'S'}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-slate-900">{studentName}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{studentId}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="font-bold text-xs text-slate-800">
                              {result.score}
                            </span>
                            <span className="text-slate-400 text-xs">
                              {' '}/ {result.maxScore || result.totalQuestions || totalMarks}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800">{result.percentage}%</span>
                              <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    result.isPassed ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(result.percentage || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant={result.isPassed ? 'success' : 'danger'} className="text-[10px]">
                              {result.isPassed ? 'Passed' : 'Failed'}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {result.studentCertificate ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <FiAward className="w-3 h-3" />
                                {result.studentCertificate.certificateNumber || 'Certified'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-slate-600">
                            {result.totalTimeTaken
                              ? `${Math.floor(result.totalTimeTaken / 60)}m ${result.totalTimeTaken % 60}s`
                              : '—'}
                          </TableCell>

                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                            {new Date(result.completedAt || result.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableWrapper>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
