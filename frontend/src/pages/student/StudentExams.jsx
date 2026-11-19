import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiBookOpen, FiPlay, FiCheckCircle, FiAward, FiLock, FiClock, FiXCircle } from 'react-icons/fi';
import { StatCard, PageLoading, Card, Button, Badge, EmptyState } from '../../components/ui';

const StudentExams = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const [exams, setExams] = useState({ available: [], attempted: [] });
  const [loading, setLoading] = useState(true);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/exams/student/my-exams');
      setExams(res.data.data || { available: [], attempted: [] });
    } catch (error) {
      console.error('Failed to load exams', error);
      toast.error(error.response?.data?.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => fetchExams();
    socket.on('exam-result-ready', refresh);
    return () => socket.off('exam-result-ready', refresh);
  }, [socket, fetchExams]);

  const parseExamTime = (value) => {
    if (!value) return NaN;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    const str = String(value).trim();
    if (!str.includes('Z') && !str.match(/[+-]\d\d:?\d\d$/)) {
      const parsedIst = new Date(`${str}+05:30`).getTime();
      if (!isNaN(parsedIst)) return parsedIst;
    }
    return new Date(str).getTime();
  };

  const formatDateTime = (value) => {
    const ts = parseExamTime(value);
    return !isNaN(ts) ? new Date(ts).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : '-';
  };

  const now = Date.now();

  const isExamUpcoming = (e) => {
    const startTs = parseExamTime(e.startTime);
    if (!isNaN(startTs)) {
      return now < startTs;
    }
    return e.status === 'scheduled' || e.isUpcoming;
  };

  const isExamExpired = (e) => {
    if (e.status === 'completed') return true;
    const startTs = parseExamTime(e.startTime);
    const durationMinutes = Number(e.duration) || 60;
    const endTs = e.endTime ? parseExamTime(e.endTime) : (startTs + durationMinutes * 60000);
    return !isNaN(endTs) && now > endTs;
  };

  const isExamActive = (e) => {
    return !isExamUpcoming(e) && !isExamExpired(e) && e.status !== 'draft';
  };

  const upcomingExams = (exams.available || []).filter(isExamUpcoming);
  const activeExams = (exams.available || []).filter(isExamActive);
  const missedExams = (exams.available || []).filter((e) => !isExamUpcoming(e) && isExamExpired(e));
  const completedExams = exams.attempted || [];

  const Section = ({ title, icon: Icon, count, accent = 'text-slate-400', children }) => (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={accent} />}
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        <span className="text-xs font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );

  const ExamCard = ({ children, accent = 'bg-slate-200', className = '' }) => (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 pl-6 flex flex-col justify-between transition-all hover:shadow-pop hover:-translate-y-0.5 ${className}`}>
      <span className={`absolute left-0 top-0 h-full w-1.5 ${accent}`} />
      {children}
    </div>
  );

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="Online Exams" subtitle="View and attend active online exams assigned to your courses" icon={FiBookOpen} />

        {loading ? (
          <PageLoading message="Loading exams..." />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Upcoming" tone="info" icon={FiClock} value={upcomingExams.length} />
              <StatCard title="Active" tone="success" icon={FiPlay} value={activeExams.length} />
              <StatCard title="Missed" tone="danger" icon={FiXCircle} value={missedExams.length} />
              <StatCard title="Completed" tone="slate" icon={FiCheckCircle} value={completedExams.length} />
            </div>

            {upcomingExams.length === 0 && activeExams.length === 0 && missedExams.length === 0 && completedExams.length === 0 ? (
              <Card className="card-pad">
                <EmptyState icon={FiBookOpen} title="No exams found for your enrolled courses" description="Please check back later or contact your institute." />
              </Card>
            ) : (
              <div className="space-y-8">
                {activeExams.length > 0 && (
                  <Section title="Active Exams" icon={FiPlay} count={activeExams.length} accent="text-success-500">
                    {activeExams.map((exam) => {
                      const feeBlocked = exam.feeAccess && !exam.feeAccess.allowed && !exam.feeAccess.isEligible;
                      return (
                        <ExamCard key={exam._id} accent={feeBlocked ? 'bg-warning-500' : 'bg-success-500'}>
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <h3 className="text-base font-semibold text-slate-800">{exam.title}</h3>
                              <Badge variant={feeBlocked ? 'warning' : 'success'}>{feeBlocked ? 'Blocked' : 'Live'}</Badge>
                            </div>
                            <p className="text-sm text-slate-500 mb-3">{exam.course?.title || 'N/A'}</p>
                            {feeBlocked && (
                              <div className="mb-3 p-2.5 bg-warning-50 border border-warning-100 rounded-lg text-xs text-warning-700">
                                <div className="flex items-center gap-1 font-semibold mb-1">
                                  <FiLock size={12} /> Pending fees ₹{(exam.feeAccess.totalPending || 0).toLocaleString('en-IN')}
                                </div>
                                Contact your institute admin to request exam access.
                              </div>
                            )}
                            {exam.feeAccess?.overridden && (
                              <div className="mb-3 p-2.5 bg-primary-50 border border-primary-100 rounded-lg text-xs text-primary-800">
                                Admin granted exam access despite pending fees.
                              </div>
                            )}
                            <div className="text-xs text-slate-500 space-y-1">
                              <p className="inline-flex items-center gap-1.5"><FiClock className="text-slate-400" /> Starts: {formatDateTime(exam.startTime)}</p>
                              {exam.endTime && <p className="inline-flex items-center gap-1.5"><FiClock className="text-slate-400" /> Ends: {formatDateTime(exam.endTime)}</p>}
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <Button icon={FiPlay} disabled={feeBlocked} variant={feeBlocked ? 'secondary' : 'primary'} onClick={() => !feeBlocked && navigate(`/student/exam/${exam._id}`)}>
                              {feeBlocked ? 'Fees Pending' : 'Start Exam'}
                            </Button>
                          </div>
                        </ExamCard>
                      );
                    })}
                  </Section>
                )}

                {upcomingExams.length > 0 && (
                  <Section title="Upcoming Exams" icon={FiClock} count={upcomingExams.length} accent="text-info-500">
                    {upcomingExams.map((exam) => {
                      const startTs = new Date(exam.startTime).getTime();
                      const timeDiff = !isNaN(startTs) ? startTs - Date.now() : 0;
                      const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
                      const minsLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                      const countdownStr = hoursLeft > 24
                        ? `${Math.floor(hoursLeft / 24)} days left`
                        : hoursLeft > 0
                        ? `Starts in ${hoursLeft}h ${minsLeft}m`
                        : minsLeft > 0
                        ? `Starts in ${minsLeft} mins`
                        : 'Starting soon';

                      return (
                        <ExamCard key={exam._id} accent="bg-info-500">
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <h3 className="text-base font-semibold text-slate-800">{exam.title}</h3>
                              <Badge variant="info">Upcoming</Badge>
                            </div>
                            <p className="text-sm text-slate-500 mb-2">{exam.course?.title || 'Academic Course'}</p>
                            <div className="text-xs text-slate-500 space-y-1.5">
                              <p className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                <FiClock className="text-info-500" /> Scheduled Start: <strong>{formatDateTime(exam.startTime)}</strong>
                              </p>
                              {timeDiff > 0 && (
                                <p className="text-[11px] font-semibold text-info-700 bg-info-50 px-2 py-0.5 rounded-md inline-block">
                                  ⏳ {countdownStr}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-400">
                                Examination questions and start action will unlock automatically at the scheduled start time.
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                            <span className="text-[11px] font-semibold text-slate-400">Not accessible yet</span>
                            <Button variant="secondary" size="sm" icon={FiClock} disabled className="opacity-75 cursor-not-allowed">
                              Starts at {formatDateTime(exam.startTime)}
                            </Button>
                          </div>
                        </ExamCard>
                      );
                    })}
                  </Section>
                )}

                {missedExams.length > 0 && (
                  <Section title="Missed Exams" icon={FiXCircle} count={missedExams.length} accent="text-danger-500">
                    {missedExams.map((exam) => (
                      <ExamCard key={exam._id} accent="bg-danger-500" className="opacity-90">
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="text-base font-semibold text-slate-800">{exam.title}</h3>
                            <Badge variant="danger">Missed</Badge>
                          </div>
                          <p className="text-sm text-slate-500 mb-3">{exam.course?.title || 'N/A'}</p>
                          <div className="text-xs text-slate-500 space-y-1">
                            <p className="inline-flex items-center gap-1.5"><FiClock className="text-slate-400" /> Started: {formatDateTime(exam.startTime)}</p>
                            <p>Duration: {exam.duration} minutes</p>
                            <p className="text-danger-600 font-semibold">Exam period ended</p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button variant="secondary" icon={FiBookOpen} disabled>Missed</Button>
                        </div>
                      </ExamCard>
                    ))}
                  </Section>
                )}

                {completedExams.length > 0 && (
                  <Section title="Completed Exams" icon={FiCheckCircle} count={completedExams.length} accent="text-primary-500">
                    {completedExams.map((result) => (
                      <ExamCard key={result._id} accent={result.isPassed ? 'bg-success-500' : 'bg-danger-500'}>
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="text-base font-semibold text-slate-800 truncate">{result.exam?.title}</h3>
                              {result.studentCertificate && <Badge variant="warning" icon={FiAward}>Certificate</Badge>}
                              {result.marksheet && <Badge variant="primary" icon={FiAward}>Marksheet</Badge>}
                            </div>
                            <Badge variant={result.isPassed ? 'success' : 'danger'}>{result.isPassed ? 'Passed' : 'Failed'}</Badge>
                          </div>
                          <p className="text-sm text-slate-500 mb-3">{result.exam?.course?.title || result.course?.title || 'N/A'}</p>
                          <div className="flex items-center gap-3">
                            <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl flex-shrink-0 ${
                              result.isPassed ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
                            }`}>
                              <span className="text-xl font-bold leading-none">{result.percentage}%</span>
                              <span className="text-[10px] font-semibold uppercase mt-1">Score</span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <p className="inline-flex items-center gap-1.5"><FiClock className="text-slate-400" /> {formatDateTime(result.completedAt)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button variant="success" icon={FiCheckCircle} onClick={() => navigate(`/student/result/${result._id}`)}>View Result</Button>
                        </div>
                      </ExamCard>
                    ))}
                  </Section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default StudentExams;
