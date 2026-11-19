import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiBook, FiCheckSquare, FiTrendingUp, FiClock, FiAward, FiTarget, FiCalendar, FiPlay, FiEye } from 'react-icons/fi';
import { StatCard, PageLoading, Card, Button, Badge, EmptyState } from '../../components/ui';

const StudentProgress = () => {
  const [progressSummary, setProgressSummary] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const [coursesRes, testsRes] = await Promise.all([
        api.get('/courses/my/enrolled'),
        api.get('/tests/my-results'),
      ]);
      const enrolledCoursesData = coursesRes.data.data || [];
      setEnrolledCourses(enrolledCoursesData);
      setRecentTests(testsRes.data.results || testsRes.data || []);

      let totalTopics = 0;
      let completedTopics = 0;
      let totalDuration = 0;
      enrolledCoursesData.forEach((enrollment) => {
        const course = enrollment.course;
        if (course && course.curriculum) {
          course.curriculum.forEach((module) => {
            if (module.topics) {
              totalTopics += module.topics.length;
              if (enrollment.completedTopics) {
                module.topics.forEach((topic) => {
                  if (enrollment.completedTopics.includes(topic._id)) completedTopics++;
                });
              }
              totalDuration += (module.topics || []).reduce((acc, t) => acc + (t.duration || 0), 0);
            }
          });
        }
      });
      const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
      setProgressSummary({
        overallProgress,
        totalTopics,
        completedTopics,
        totalDuration: Math.round(totalDuration / 60),
        totalChapters: enrolledCoursesData.reduce((acc, e) => acc + (e.course?.curriculum?.length || 0), 0),
      });
    } catch (error) {
      toast.error('Failed to fetch progress data');
    } finally {
      setLoading(false);
    }
  };

  const avgScore = recentTests.length > 0
    ? `${Math.round(recentTests.reduce((acc, test) => acc + (test.percentage || 0), 0) / recentTests.length)}%`
    : 'N/A';

  const progressBadge = () => {
    const p = progressSummary?.overallProgress || 0;
    if (p === 100) return <span className="px-3 py-1 bg-success-500 text-white text-sm rounded-full font-medium inline-flex items-center gap-1"><FiAward /> Mastered</span>;
    if (p >= 75) return <span className="px-3 py-1 bg-warning-500 text-white text-sm rounded-full font-medium">Almost There</span>;
    if (p >= 50) return <span className="px-3 py-1 bg-white/90 text-primary-700 text-sm rounded-full font-medium">Good Progress</span>;
    return <span className="px-3 py-1 bg-white text-primary-600 text-sm rounded-full font-medium">Just Started</span>;
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="My Progress" subtitle="Track your learning journey and achievements" icon={FiTrendingUp} />
        <PageLoading message="Loading progress..." />
      </Layout>
    );
  }

  const testTone = (p) => (p >= 80 ? 'success' : p >= 60 ? 'warning' : 'danger');

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="My Progress" subtitle="Track your learning journey and achievements" icon={FiTrendingUp} />

        <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-2xl shadow-elevated p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1 w-full">
              <h2 className="text-2xl font-bold mb-4">Learning Journey Progress</h2>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                {[
                  ['Completed Topics', progressSummary?.completedTopics || 0],
                  ['Total Topics', progressSummary?.totalTopics || 0],
                  ['Active Courses', enrolledCourses.length],
                  ['Tests Taken', recentTests.length],
                  ['Avg Score', avgScore],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-white/70 text-sm">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/20 rounded-full h-3">
                <div className="bg-white h-3 rounded-full transition-all duration-500" style={{ width: `${progressSummary?.overallProgress || 0}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-white/70 text-sm">
                <span>{progressSummary?.totalDuration || 0} hours of learning</span>
                <span>{enrolledCourses.filter((c) => c.progress === 100).length} courses completed</span>
              </div>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-5xl font-bold">{progressSummary?.overallProgress || 0}%</div>
              <p className="text-white/70 mt-2">Overall Complete</p>
              <div className="mt-3">{progressBadge()}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Enrolled Courses" tone="info" icon={FiBook} value={enrolledCourses.length} subtitle="Active" />
          <StatCard title="Topics Completed" tone="success" icon={FiCheckSquare} value={progressSummary?.completedTopics || 0} subtitle={progressSummary?.totalTopics > 0 ? `${Math.round((progressSummary.completedTopics / progressSummary.totalTopics) * 100)}% completion rate` : ''} />
          <StatCard title="Average Test Score" tone="purple" icon={FiTarget} value={avgScore} subtitle="Performance" />
          <StatCard title="Total Learning Time" tone="amber" icon={FiClock} value={`${progressSummary?.totalDuration || 0}h`} subtitle="Across all courses" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="card-pad">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">My Courses</h2>
              <button onClick={() => navigate('/student/courses')} className="text-primary-600 text-sm font-medium hover:text-primary-700">View All →</button>
            </div>
            <div className="space-y-3">
              {enrolledCourses.slice(0, 3).map((enrollment) => {
                const course = enrollment.course;
                return (
                  <div key={enrollment._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{course.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{course.category}</p>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                        <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${enrollment.progress || 0}%` }} />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-lg font-bold text-primary-600">{enrollment.progress || 0}%</div>
                      <button onClick={() => navigate(`/student/learn/course/${course._id}`)} className="text-xs text-primary-600 hover:text-primary-700 mt-1">Continue →</button>
                    </div>
                  </div>
                );
              })}
              {enrolledCourses.length === 0 && (
                <EmptyState icon={FiBook} title="No courses enrolled yet" action={<Button onClick={() => navigate('/student/courses')}>Browse Courses</Button>} />
              )}
            </div>
          </Card>

          <Card className="card-pad">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Recent Tests</h2>
              <button onClick={() => navigate('/student/results')} className="text-purple-600 text-sm font-medium hover:text-purple-700">View All →</button>
            </div>
            <div className="space-y-3">
              {recentTests.slice(0, 3).map((test) => (
                <div key={test._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-sm">{test.testType === 'topic' ? test.topic?.title : test.chapter?.title || 'Test'}</h3>
                    <p className="text-xs text-slate-500 mt-1">{new Date(test.completedAt).toLocaleDateString()}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={testTone(test.percentage)}>{test.percentage}%</Badge>
                      <span className="text-xs text-slate-500">{test.correctAnswers}/{test.totalQuestions} correct</span>
                    </div>
                  </div>
                  <FiTarget className={`text-xl ${test.percentage >= 80 ? 'text-success-600' : test.percentage >= 60 ? 'text-warning-600' : 'text-danger-600'}`} />
                </div>
              ))}
              {recentTests.length === 0 && (
                <EmptyState icon={FiTarget} title="No tests taken yet" action={<Button onClick={() => navigate('/student/tests')}>Take Test</Button>} />
              )}
            </div>
          </Card>
        </div>

        <Card className="card-pad">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Detailed Course Progress</h2>
            <button onClick={() => navigate('/student/courses')} className="text-primary-600 text-sm font-medium hover:text-primary-700">View All Courses →</button>
          </div>
          {enrolledCourses.length > 0 ? (
            <div className="space-y-5">
              {enrolledCourses.map((enrollment) => {
                const course = enrollment.course;
                return (
                  <div key={enrollment._id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-card transition-shadow">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-bold text-slate-800">{course.title}</h3>
                          <Badge variant="primary">{course.category}</Badge>
                        </div>
                        <p className="text-slate-500 text-sm mb-3 line-clamp-2">{course.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><FiBook className="text-slate-400" />{course.duration || 0}h</span>
                          <span className="flex items-center gap-1"><FiCheckSquare className="text-slate-400" />{enrollment.completedTopics?.length || 0} topics completed</span>
                          {enrollment.lastAccessedAt && (
                            <span className="flex items-center gap-1"><FiCalendar className="text-slate-400" />Last: {new Date(enrollment.lastAccessedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-center lg:text-right">
                        <div className="text-3xl font-bold text-primary-600 mb-1">{enrollment.progress || 0}%</div>
                        <p className="text-sm text-slate-500 mb-3">Course Progress</p>
                        <div className="flex gap-2">
                          <Button variant="secondary" icon={FiEye} className="!px-3 !py-2 !text-sm" onClick={() => navigate(`/student/courses/${course._id}`)}>Details</Button>
                          <Button icon={FiPlay} className="!px-3 !py-2 !text-sm" onClick={() => navigate(`/student/learn/course/${course._id}`)}>Continue</Button>
                        </div>
                      </div>
                    </div>
                    <div className="mb-1">
                      <div className="flex justify-between text-sm text-slate-500 mb-2">
                        <span>Progress</span>
                        <span className="font-medium">{enrollment.progress || 0}% Complete</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-primary-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${enrollment.progress || 0}%` }} />
                      </div>
                    </div>
                    {enrollment.completedTopics && enrollment.completedTopics.length > 0 && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-sm text-slate-600">
                        <FiCheckSquare className="text-success-500" />
                        <span>{enrollment.completedTopics.length} topics completed</span>
                        {enrollment.progress === 100 && <Badge variant="success" icon={FiAward} className="ml-auto">Completed</Badge>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={FiBook} title="No Courses Enrolled" description="Start your learning journey by enrolling in courses." action={<Button onClick={() => navigate('/student/courses')}>Browse Available Courses</Button>} />
          )}
        </Card>

        {progressSummary && progressSummary.overallProgress < 100 && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl shadow-card p-6 flex items-center gap-4">
            <FiTrendingUp className="text-4xl flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold mb-1">Keep Going!</h3>
              <p className="text-white/90 text-sm">
                You're {progressSummary.overallProgress}% through your learning journey.
                {progressSummary.overallProgress >= 75 && " You're almost there!"}
                {progressSummary.overallProgress < 75 && progressSummary.overallProgress >= 50 && ' Great progress!'}
                {progressSummary.overallProgress < 50 && ' Keep up the good work!'}
              </p>
            </div>
          </div>
        )}

        {progressSummary && progressSummary.overallProgress === 100 && (
          <div className="bg-gradient-to-r from-success-400 to-success-600 text-white rounded-2xl shadow-card p-6 flex items-center gap-4">
            <FiCheckSquare className="text-4xl flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold mb-1">Congratulations! 🎉</h3>
              <p className="text-white/90 text-sm">You've completed all topics! Keep practicing with tests to master the content.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentProgress;
