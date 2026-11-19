import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCalendar, FiClock, FiCheckSquare, FiBookOpen, FiAward,
  FiUsers, FiArrowRight, FiLayers
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { StatCard, Button } from '../../components/ui';
import TeacherAiModal from '../../components/ai/TeacherAiModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import homeworkApi from '../../api/homeworkApi';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAiModal, setShowAiModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState([]);
  const [homework, setHomework] = useState([]);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const timetableRes = await api.get('/timetable');
      const entries = timetableRes.data?.data || [];
      setTimetable(entries);
      const teacherId = entries.find((entry) => entry.teacher?._id)?.teacher?._id;
      if (teacherId) {
        const homeworkRes = await homeworkApi.getHomework({ teacher: teacherId });
        setHomework(homeworkRes.data?.data || []);
      } else {
        setHomework([]);
      }
    } catch (err) {
      console.error(err);
      setTimetable([]);
      setHomework([]);
    } finally {
      setLoading(false);
    }
  };

  const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const todaySchedule = timetable.filter((entry) => entry.dayOfWeek === todayName);
  const classesToday = new Set(todaySchedule.map((entry) => `${entry.schoolClass?._id || ''}:${entry.section?._id || ''}`)).size;
  const getLessonStatus = (entry) => {
    const now = new Date();
    const [startHour, startMinute] = String(entry.startTime || '00:00').split(':').map(Number);
    const [endHour, endMinute] = String(entry.endTime || '00:00').split(':').map(Number);
    const start = new Date();
    start.setHours(startHour, startMinute, 0, 0);
    const end = new Date();
    end.setHours(endHour, endMinute, 0, 0);
    return now < start ? 'upcoming' : now <= end ? 'in-progress' : 'completed';
  };
  const completedToday = todaySchedule.filter((entry) => getLessonStatus(entry) === 'completed').length;

  return (
    <Layout
      title="Teacher & Faculty Workspace"
      breadcrumbs={`Academics / Faculty / ${user?.name || 'Educator'}`}
      actions={(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={HiSparkles}
            onClick={() => setShowAiModal(true)}
            className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
          >
            AI Lesson Planner
          </Button>
          <Button
            variant="primary"
            icon={FiCheckSquare}
            onClick={() => navigate('/school/school-attendance')}
            className="text-xs"
          >
            Mark Daily Attendance
          </Button>
        </div>
      )}
    >
      <PageHeader />

      {/* 1. TEACHER WELCOME BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 rounded-2xl p-6 text-white mb-6 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="bg-primary-500/20 text-primary-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-primary-500/30">
              Academic Faculty Portal
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-2">Welcome back, {user?.name || 'Teacher'}!</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {loading ? 'Loading your assigned classes and timetable…' : `You have ${todaySchedule.length} lecture period${todaySchedule.length === 1 ? '' : 's'} scheduled today. Keep your students engaged with formative assessments and attendance tracking.`}
            </p>
          </div>
          <button
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition transform hover:-translate-y-0.5 shrink-0"
          >
            <HiSparkles className="w-4 h-4 text-slate-950" />
            <span>Generate CBSE Lesson Plan</span>
          </button>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Lecture Periods"
          value={todaySchedule.length}
          icon={FiClock}
          tone="primary"
          subtitle={`${completedToday} completed · ${Math.max(0, todaySchedule.length - completedToday)} remaining`}
        />
        <StatCard
          title="Assigned Homework"
          value={homework.length}
          icon={FiBookOpen}
          tone="amber"
          subtitle="Homework assigned to your classes"
          onClick={() => navigate('/school/homework')}
        />
        <StatCard
          title="Classes Today"
          value={classesToday}
          icon={FiLayers}
          tone="indigo"
          subtitle="Distinct class and section groups"
          onClick={() => navigate('/school/students')}
        />
        <StatCard
          title="Weekly Timetable Entries"
          value={timetable.length}
          icon={FiCalendar}
          tone="success"
          subtitle="Periods assigned to your account"
          onClick={() => navigate('/school/timetable')}
        />
      </div>

      {/* 3. TWO COLUMN LAYOUT: SCHEDULE & ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Lecture Timetable */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FiCalendar className="text-primary-600" />
                <span>Today's Class Schedule & Timetable</span>
              </h3>
              <p className="text-xs text-slate-500">Periods assigned to your teacher account</p>
            </div>
            <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="space-y-3">
            {todaySchedule.length === 0 && !loading ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No timetable periods are assigned for today.</p> : todaySchedule.map((item) => {
              const status = getLessonStatus(item);
              return (
              <div
                key={item._id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-primary-200 hover:shadow-xs transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] text-slate-400 uppercase leading-none">P</span>
                    <span className="text-sm font-black text-slate-900 leading-none">{item.periodNumber}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.schoolClass?.name || 'Class'}{item.section?.name ? `-${item.section.name}` : ''}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-primary-700">{item.subject?.name || 'Subject'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.startTime}–{item.endTime} • Room: <strong className="text-slate-700">{item.roomNumber || 'Not assigned'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    status === 'completed' ? 'bg-slate-200 text-slate-600' :
                    status === 'in-progress' ? 'bg-emerald-100 text-emerald-700 animate-pulse' :
                    'bg-primary-50 text-primary-700'
                  }`}>
                    {status}
                  </span>
                  <button
                    onClick={() => navigate('/school/school-attendance')}
                    className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
                  >
                    Take Attendance
                  </button>
                </div>
              </div>
            );})}
          </div>
        </div>

        {/* Right Col: Quick Teacher Actions & Copilot */}
        <div className="space-y-6">
          {/* AI Pedagogy Copilot Promo Card */}
          <div className="bg-gradient-to-tr from-amber-50 via-orange-50 to-amber-100 rounded-2xl p-5 border border-amber-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-3 shadow-xs">
              <HiSparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">SES AI Lesson Assistant</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Generate 45-minute lesson plans, rubrics, and diagnostic formative quiz questions in Hindi or English in seconds.
            </p>
            <button
              onClick={() => setShowAiModal(true)}
              className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <span>Launch Teacher Copilot</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/school/homework')}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2"><FiBookOpen className="text-primary-600" /> Assign New Homework</span>
                <FiArrowRight className="text-slate-400" />
              </button>
              <button
                onClick={() => navigate('/school/examinations')}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2"><FiAward className="text-indigo-600" /> Enter Term Marks</span>
                <FiArrowRight className="text-slate-400" />
              </button>
              <button
                onClick={() => navigate('/school/students')}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2"><FiUsers className="text-emerald-600" /> View Class Student List</span>
                <FiArrowRight className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Teacher Modal */}
      {showAiModal && (
        <TeacherAiModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </Layout>
  );
}
