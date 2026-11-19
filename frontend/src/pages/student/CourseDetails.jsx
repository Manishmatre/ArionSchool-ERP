import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiBook, FiClock, FiUsers, FiCheckCircle, FiPlay,
  FiAward, FiTarget, FiGlobe, FiBarChart2, FiArrowLeft,
  FiChevronRight, FiLayers
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toAbsoluteUrl } from '../../utils/url';
import { PageLoading, Card, Button, Badge, EmptyState } from '../../components/ui';

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const [courseRes, chaptersRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/chapters?course=${courseId}`)
      ]);

      setCourse(courseRes.data.data);
      setChapters(chaptersRes.data.chapters || []);

      try {
        const enrolledRes = await api.get('/courses/my/enrolled');
        const enrolledCourses = enrolledRes.data.data;
        const userEnrollment = enrolledCourses.find(e => e.course._id === courseId);
        if (userEnrollment) {
          setIsEnrolled(true);
          setEnrollment(userEnrollment);
        }
      } catch (error) {
        console.log('Not enrolled yet');
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      alert('Failed to fetch course details');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      await api.post('/admissions/student-enquiry', {
        name: user?.name || 'Student',
        email: user?.email || 'no-email@example.com',
        mobile: user?.mobile || 'N/A',
        enquiryType: 'course',
        course: courseId,
        message: `Enrollment request for course: ${course?.title || ''}`,
      });
      alert('Enrollment request sent. Our team will contact you soon.');
    } catch (error) {
      console.error('Error sending enrollment request:', error);
      alert(error.response?.data?.message || 'Failed to send enrollment request');
    }
  };

  const handleStartCourse = () => {
    navigate(`/student/learn/course/${courseId}`);
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes < 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim() || '0m';
  };

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading course..." />
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <Card>
          <EmptyState
            icon={FiBook}
            title="Course not found"
            description="The course you're looking for doesn't exist."
            action={<Button onClick={() => navigate('/student/courses')}>Back to Courses</Button>}
          />
        </Card>
      </Layout>
    );
  }

  const description = course.fullDescription || course.shortDescription || 'No description available.';
  const durationLabel = course.durationValue
    ? `${course.durationValue} ${course.durationType || 'months'}`
    : null;
  const contentDuration = formatDuration(course.totalDuration);
  const hasDiscount = course.discountedFee > 0 && course.discountedFee < course.regularFee;
  const displayFee = hasDiscount ? course.discountedFee : course.regularFee;
  const isFree = !course.regularFee || course.regularFee === 0;
  const studentCount = course.enrolledStudents?.length || 0;

  const heroMeta = [
    { icon: FiLayers, label: `${chapters.length} Chapters` },
    durationLabel && { icon: FiClock, label: durationLabel },
    course.totalHours ? { icon: FiClock, label: `${course.totalHours} hours` } : null,
    { icon: FiUsers, label: `${studentCount} Students` },
    course.skillLevel && { icon: FiBarChart2, label: course.skillLevel },
    course.language && { icon: FiGlobe, label: course.language },
  ].filter(Boolean);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate('/student/courses')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition"
        >
          <FiArrowLeft /> Back to Courses
        </button>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 text-white shadow-pop">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 sm:p-8 lg:p-10">
            <div className="lg:col-span-2 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {course.skillLevel && (
                  <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold border border-white/20">
                    {course.skillLevel}
                  </span>
                )}
                {course.program?.name && (
                  <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold border border-white/20">
                    {course.program.name}
                  </span>
                )}
                {course.certificateAvailable && (
                  <span className="px-3 py-1 rounded-full bg-amber-400/90 text-amber-950 text-xs font-bold inline-flex items-center gap-1">
                    <FiAward /> Certificate
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3">
                {course.title}
              </h1>
              <p className="text-primary-100 text-sm sm:text-base leading-relaxed max-w-2xl mb-6">
                {course.shortDescription}
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-primary-50">
                {heroMeta.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <m.icon className="text-primary-200" /> {m.label}
                  </span>
                ))}
              </div>

              {isEnrolled && enrollment && (
                <div className="mt-6 max-w-md">
                  <div className="flex items-center justify-between text-xs text-primary-100 mb-1.5">
                    <span>Your Progress</span>
                    <span className="font-semibold text-white">{enrollment.progress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Enroll / price card */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-white text-slate-900 shadow-xl overflow-hidden">
                <div className="aspect-video bg-slate-100 overflow-hidden">
                  {course.thumbnail ? (
                    <img
                      src={toAbsoluteUrl(course.thumbnail)}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-indigo-100">
                      <FiBook className="text-5xl text-primary-400" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-baseline gap-2 mb-4">
                    {isFree ? (
                      <span className="text-2xl font-bold text-success-600">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-slate-900">₹{displayFee?.toLocaleString('en-IN')}</span>
                        {hasDiscount && (
                          <span className="text-sm text-slate-400 line-through">₹{course.regularFee?.toLocaleString('en-IN')}</span>
                        )}
                      </>
                    )}
                  </div>
                  {isEnrolled ? (
                    <Button icon={FiPlay} onClick={handleStartCourse} className="w-full justify-center">
                      Continue Learning
                    </Button>
                  ) : (
                    <Button icon={FiCheckCircle} onClick={handleEnroll} className="w-full justify-center">
                      Request Enrollment
                    </Button>
                  )}
                  <div className="mt-4 space-y-2 text-sm">
                    {durationLabel && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 inline-flex items-center gap-2"><FiClock className="text-slate-400" /> Duration</span>
                        <span className="font-medium text-slate-800">{durationLabel}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 inline-flex items-center gap-2"><FiLayers className="text-slate-400" /> Chapters</span>
                      <span className="font-medium text-slate-800">{chapters.length}</span>
                    </div>
                    {course.language && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 inline-flex items-center gap-2"><FiGlobe className="text-slate-400" /> Language</span>
                        <span className="font-medium text-slate-800">{course.language}</span>
                      </div>
                    )}
                    {course.certificateAvailable && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 inline-flex items-center gap-2"><FiAward className="text-slate-400" /> Certificate</span>
                        <Badge variant="success">Included</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <h2 className="text-lg font-bold text-slate-900 mb-3">About This Course</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{description}</p>
            </Card>

            {/* What you'll learn */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <Card>
                <h2 className="text-lg font-bold text-slate-900 mb-4">What You'll Learn</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {course.learningOutcomes.map((outcome, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <FiCheckCircle className="text-success-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">{outcome}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Course content */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Course Content</h2>
                <span className="text-sm text-slate-500">{chapters.length} chapters</span>
              </div>
              {chapters.length === 0 ? (
                <EmptyState icon={FiBook} title="No chapters available yet" description="Content will be added soon." />
              ) : (
                <div className="space-y-2.5">
                  {chapters.map((chapter, index) => (
                    <div
                      key={chapter._id}
                      className="group border border-slate-200 rounded-xl p-4 hover:border-primary-300 hover:bg-primary-50/40 transition"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-lg font-semibold text-sm flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-800">{chapter.title}</h3>
                            {chapter.description && (
                              <p className="text-slate-500 text-sm mt-0.5 line-clamp-2">{chapter.description}</p>
                            )}
                          </div>
                        </div>
                        {isEnrolled && (
                          <button
                            onClick={() => navigate(`/student/learn/course/${courseId}`)}
                            className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 opacity-0 group-hover:opacity-100 transition"
                          >
                            Start <FiChevronRight />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <Card>
                <h2 className="text-lg font-bold text-slate-900 mb-4">Prerequisites</h2>
                <ul className="space-y-2.5">
                  {course.prerequisites.map((prereq, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <FiTarget className="text-primary-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">{prereq}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Course details */}
            <Card>
              <h3 className="text-base font-semibold text-slate-800 mb-4">Course Details</h3>
              <div className="space-y-3 text-sm">
                {course.language && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Language</span>
                    <span className="font-medium text-slate-800">{course.language}</span>
                  </div>
                )}
                {course.skillLevel && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Skill Level</span>
                    <span className="font-medium text-slate-800">{course.skillLevel}</span>
                  </div>
                )}
                {contentDuration && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Content</span>
                    <span className="font-medium text-slate-800">{contentDuration}</span>
                  </div>
                )}
                {course.targetAudience && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 flex-shrink-0">Audience</span>
                    <span className="font-medium text-slate-800 text-right">{course.targetAudience}</span>
                  </div>
                )}
                {course.certificateAvailable && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Certificate</span>
                    <Badge variant="success">Available</Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <Card>
                <h3 className="text-base font-semibold text-slate-800 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Instructor */}
            {course.instructor && (
              <Card>
                <h3 className="text-base font-semibold text-slate-800 mb-4">Instructor</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-lg">
                      {course.instructor?.name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{course.instructor?.name || 'Admin'}</p>
                    <p className="text-slate-500 text-sm truncate">{course.instructor?.email || 'Instructor'}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetails;
