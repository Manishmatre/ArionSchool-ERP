import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TbCurrencyRupee } from 'react-icons/tb';
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBook,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';

const reportCategories = [
  {
    id: 'student',
    title: 'Student Reports',
    description: 'Performance, attendance, enrollment, and certificate reports for your school campus.',
    icon: FiUsers,
    reports: [
      { id: 'performance', title: 'Student Performance Report', description: 'Review student academic performance.', path: '/school/reports/student-performance', icon: FiBarChart2 },
      { id: 'attendance', title: 'Attendance Report', description: 'Review attendance records and trends.', path: '/school/reports/student-attendance', icon: FiCalendar },
      { id: 'enrollment', title: 'Enrollment Report', description: 'Track student enrollments by course and batch.', path: '/school/reports/student-enrollment', icon: FiTrendingUp },
      { id: 'certificates', title: 'Certificate Report', description: 'See certificate issue status and details.', path: '/school/reports/student-certificates', icon: FiAward },
    ],
  },
  {
    id: 'course',
    title: 'Course Reports',
    description: 'Course completion, revenue, and popularity for your school campus.',
    icon: FiBook,
    reports: [
      { id: 'revenue', title: 'Course Revenue Report', description: 'Revenue generated from course enrollments.', path: '/school/reports/course-revenue', icon: TbCurrencyRupee },
      { id: 'popularity', title: 'Course Popularity Report', description: 'Compare enrollment and course popularity.', path: '/school/reports/course-popularity', icon: FiTrendingUp },
      { id: 'completion', title: 'Course Completion Report', description: 'Review course completion rates and progress.', path: '/school/reports/course-completion', icon: FiActivity },
    ],
  },
  {
    id: 'financial',
    title: 'Financial Reports',
    description: 'Revenue, payments, outstanding balances, and ledger activity.',
    icon: TbCurrencyRupee,
    reports: [
      { id: 'revenue', title: 'Revenue Report', description: 'Review revenue by source and period.', path: '/school/reports/revenue', icon: TbCurrencyRupee },
      { id: 'payments', title: 'Payment Report', description: 'Review payment history and status.', path: '/school/reports/payments', icon: FiCreditCard },
      { id: 'outstanding', title: 'Outstanding Fees', description: 'Review open fee obligations for your school campus.', path: '/school/reports/outstanding-payments', icon: FiUserCheck },
      { id: 'ledger', title: 'Financial Ledger', description: 'View income, expenses, and transactions.', path: '/school/financial-ledger', icon: FiActivity },
    ],
  },
  {
    id: 'staff',
    title: 'Staff Reports',
    description: 'Attendance, performance, and payroll reports for your school campus staff.',
    icon: FiUserCheck,
    reports: [
      { id: 'attendance', title: 'Staff Attendance Report', description: 'Review staff attendance records and trends.', path: '/school/reports/staff-attendance', icon: FiCalendar },
      { id: 'performance', title: 'Staff Performance Report', description: 'Review staff activity and performance metrics.', path: '/school/reports/staff-performance', icon: FiTrendingUp },
      { id: 'payroll', title: 'Payroll Report', description: 'Review payroll amounts and payment status.', path: '/school/reports/payroll', icon: TbCurrencyRupee },
    ],
  },
];

const FranchiseReports = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category') || 'all';
  const selectedCategory = reportCategories.some((category) => category.id === requestedCategory) ? requestedCategory : 'all';
  const visibleCategories = useMemo(() => reportCategories
    .filter((category) => selectedCategory === 'all' || category.id === selectedCategory), [selectedCategory]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><FiBarChart2 className="h-5 w-5" /></span>
          <div><h1 className="text-lg font-bold text-slate-900">Reports</h1><p className="mt-1 text-sm text-slate-500">Explore your school campus reports. Use the tabs above to filter by area.</p></div>
        </div>
      </div>

      {visibleCategories.map((category) => (
        <section key={category.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><category.icon className="h-4 w-4" /></span>
            <div><h2 className="text-sm font-bold text-slate-900">{category.title}</h2><p className="mt-0.5 text-xs text-slate-500">{category.description}</p></div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {category.reports.map((report) => (
              <article key={`${category.id}-${report.id}`} className="rounded-xl border border-slate-200 p-4 transition hover:border-primary-300 hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><report.icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">{report.title}</h3>
                    <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{report.description}</p>
                    <button type="button" onClick={() => navigate(report.path)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-900"><FiFileText className="h-3.5 w-3.5" />Open report</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default FranchiseReports;
