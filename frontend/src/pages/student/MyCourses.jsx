import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { FiBook, FiClock, FiUsers, FiCheckCircle, FiPlay, FiEye, FiSend } from 'react-icons/fi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import api from '../../api/axios';
import { createStudentCourseRequest, getMyEnquiries } from '../../api/enquiryApi';
import { toAbsoluteUrl } from '../../utils/url';
import {
  PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, Card, Badge, EmptyState,
} from '../../components/ui';

const LEVEL_VARIANT = { Beginner: 'success', Intermediate: 'warning', Advanced: 'danger' };
const REQUEST_STATUS = {
  new: { text: 'Pending Review', variant: 'primary' },
  contacted: { text: 'Contacted', variant: 'warning' },
  interested: { text: 'In Progress', variant: 'primary' },
  converted: { text: 'Approved', variant: 'success' },
  not_interested: { text: 'Declined', variant: 'danger' },
  closed: { text: 'Closed', variant: 'neutral' },
};

const Courses = () => {
  const [allCourses, setAllCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [myEnquiries, setMyEnquiries] = useState([]);
  const [requestingId, setRequestingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('enrolled');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const handleProgressUpdate = (event) => {
      const data = event.detail;
      setEnrolledCourses((prev) =>
        prev.map((enrollment) =>
          enrollment._id === data.enrollment._id
            ? { ...enrollment, progress: data.progress, completedTopics: data.completedTopics, lastAccessedAt: data.timestamp }
            : enrollment
        )
      );
    };
    const handleNewEnrollment = (event) => {
      if (event.detail.studentId === user?._id) fetchCourses();
    };
    window.addEventListener('progress-updated', handleProgressUpdate);
    window.addEventListener('new-enrollment', handleNewEnrollment);
    return () => {
      window.removeEventListener('progress-updated', handleProgressUpdate);
      window.removeEventListener('new-enrollment', handleNewEnrollment);
    };
  }, [user?._id]);

  const fetchCourses = async () => {
    try {
      const [allCoursesRes, enrolledRes, enquiriesRes] = await Promise.all([
        api.get('/courses'),
        api.get('/courses/my/enrolled'),
        getMyEnquiries(),
      ]);
      setAllCourses(allCoursesRes.data.data || []);
      setEnrolledCourses(enrolledRes.data.data || []);
      setMyEnquiries(enquiriesRes.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId, courseTitle) => {
    const existing = getCourseRequest(courseId);
    if (existing) {
      toast.info(`Request already ${existing.status?.replace('_', ' ')}`);
      return;
    }
    try {
      setRequestingId(courseId);
      const res = await createStudentCourseRequest({ courseId, message: `Enrollment request for course: ${courseTitle || ''}` });
      toast.success(res.message || 'Enrollment request sent successfully');
      const enquiriesRes = await getMyEnquiries();
      setMyEnquiries(enquiriesRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send enrollment request');
    } finally {
      setRequestingId(null);
    }
  };

  const getCourseRequest = (courseId) =>
    myEnquiries.find((e) => (e.course?._id || e.course)?.toString() === courseId?.toString());

  const handleStartCourse = (courseId) => navigate(`/student/learn/course/${courseId}`);
  const isEnrolled = (courseId) => enrolledCourses.some((e) => e.course._id === courseId);

  const matchesFilters = (course) => {
    const matchesSearch =
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    return matchesSearch && matchesCategory;
  };

  const filteredEnrolledCourses = enrolledCourses.filter((enrollment) => matchesFilters(enrollment.course));
  const filteredAvailableCourses = allCourses.filter((course) => !isEnrolled(course._id) && matchesFilters(course));

  const currentCourses =
    activeTab === 'enrolled' ? filteredEnrolledCourses : activeTab === 'available' ? filteredAvailableCourses : myEnquiries;
  const totalPages = Math.ceil(currentCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCourses = currentCourses.slice(startIndex, startIndex + itemsPerPage);

  const categories = ['all', ...new Set(allCourses.map((course) => course.category).filter(Boolean))];

  const tabs = [
    { key: 'enrolled', label: `Enrolled Courses (${enrolledCourses.length})` },
    { key: 'available', label: `Browse Courses (${filteredAvailableCourses.length})` },
    { key: 'requests', label: `My Requests (${myEnquiries.length})` },
  ];

  if (loading) {
    return (
      <Layout>
        <PageHeader title="My Courses" subtitle="Browse and manage your enrolled courses" icon={FiBook} />
        <PageLoading message="Loading courses..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="My Courses" subtitle="Browse and manage your enrolled courses" icon={FiBook} />

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search courses..."
          />
          <FilterBarActions>
            <SelectField
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="min-w-[170px]"
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category === 'all' ? 'All Categories' : category}</option>
              ))}
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <Card padded={false}>
          <div className="border-b border-slate-200 px-4 sm:px-6">
            <div className="flex gap-4 sm:gap-8 overflow-x-auto whitespace-nowrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                    activeTab === tab.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === 'enrolled' && (
              paginatedCourses.length === 0 ? (
                <EmptyState
                  icon={FiBook}
                  title="No enrolled courses found"
                  description={searchTerm || categoryFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Browse available courses to get started.'}
                  action={<Button onClick={() => setActiveTab('available')}>Browse Available Courses</Button>}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginatedCourses.map((enrollment) => {
                      const course = enrollment.course;
                      return (
                        <div key={enrollment._id} className="rounded-2xl border border-slate-200 overflow-hidden hover:shadow-card transition-shadow bg-white">
                          {course.thumbnail && (
                            <div className="relative h-44 overflow-hidden bg-slate-100">
                              <img src={toAbsoluteUrl(course.thumbnail)} alt={course.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                              <span className="absolute top-2 right-2"><Badge variant="success">Enrolled</Badge></span>
                            </div>
                          )}
                          <div className="p-5">
                            <h3 className="text-base font-semibold text-slate-800 line-clamp-1">{course.title}</h3>
                            <p className="text-slate-500 text-sm mt-1 line-clamp-2">{course.description}</p>
                            <div className="my-4">
                              <div className="flex justify-between text-sm mb-1.5">
                                <span className="text-slate-500">Progress</span>
                                <span className="font-semibold text-primary-600">{enrollment.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${enrollment.progress}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                              <span className="flex items-center gap-1"><FiBook className="text-slate-400" />{course.category}</span>
                              {course.duration > 0 && <span className="flex items-center gap-1"><FiClock className="text-slate-400" />{course.duration}h</span>}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="secondary" icon={FiEye} className="flex-1 justify-center" onClick={() => navigate(`/student/courses/${course._id}`)}>Details</Button>
                              <Button icon={FiPlay} className="flex-1 justify-center" onClick={() => handleStartCourse(course._id)}>Continue</Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-6">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredEnrolledCourses.length}
                        onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
                      />
                    </div>
                  )}
                </>
              )
            )}

            {activeTab === 'available' && (
              filteredAvailableCourses.length === 0 ? (
                <EmptyState icon={FiBook} title="No courses available at the moment" description="Please check back later." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAvailableCourses.map((course) => {
                    const request = getCourseRequest(course._id);
                    const statusInfo = request ? REQUEST_STATUS[request.status] || { text: request.status, variant: 'neutral' } : null;
                    return (
                      <div key={course._id} className="rounded-2xl border border-slate-200 overflow-hidden hover:shadow-card transition-shadow bg-white">
                        {course.thumbnail && (
                          <img src={toAbsoluteUrl(course.thumbnail)} alt={course.title} className="w-full h-44 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        )}
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-base font-bold text-slate-800 line-clamp-1">{course.title}</h3>
                            {course.level && <Badge variant={LEVEL_VARIANT[course.level] || 'neutral'}>{course.level}</Badge>}
                          </div>
                          <p className="text-slate-500 text-sm mb-3 line-clamp-2">{course.description}</p>
                          <div className="flex items-center gap-4 mb-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><FiBook />{course.category}</span>
                            {course.duration > 0 && <span className="flex items-center gap-1"><FiClock />{course.duration}h</span>}
                            <span className="flex items-center gap-1"><FiUsers />{course.enrolledStudents?.length || 0}</span>
                          </div>
                          {course.tags && course.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {course.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">{tag}</span>
                              ))}
                            </div>
                          )}
                          <div className="pt-3 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold">
                                {course.discountedFee > 0 && course.discountedFee < (course.regularFee || course.price || 0) ? (
                                  <>
                                    <span className="text-success-600">₹{course.discountedFee.toLocaleString()}</span>
                                    <span className="text-sm text-slate-400 line-through ml-2">₹{(course.regularFee || course.price || 0).toLocaleString()}</span>
                                  </>
                                ) : (
                                  <span className="text-slate-800">₹{(course.regularFee || course.price || 0).toLocaleString()}</span>
                                )}
                              </span>
                              <button onClick={() => navigate(`/student/courses/${course._id}`)} className="flex items-center gap-1 px-2.5 py-1 text-primary-600 hover:bg-primary-50 rounded-lg transition text-sm font-medium">
                                <FiEye /> Details
                              </button>
                            </div>
                            {isEnrolled(course._id) ? (
                              <Button variant="success" icon={FiCheckCircle} className="w-full justify-center" onClick={() => handleStartCourse(course._id)}>Enrolled - Start Learning</Button>
                            ) : request ? (
                              <div className="space-y-1 text-center">
                                <Badge variant={statusInfo.variant} className="w-full justify-center py-2">{statusInfo.text}</Badge>
                                <p className="text-xs text-slate-500">Requested {new Date(request.createdAt).toLocaleDateString('en-IN')}</p>
                              </div>
                            ) : (
                              <Button icon={FiSend} loading={requestingId === course._id} disabled={requestingId === course._id} className="w-full justify-center" onClick={() => handleEnroll(course._id, course.title)}>
                                {requestingId === course._id ? 'Sending...' : 'Request Enrollment'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {activeTab === 'requests' && (
              myEnquiries.length === 0 ? (
                <EmptyState icon={FiSend} title="No enrollment requests yet" action={<Button onClick={() => setActiveTab('available')}>Browse Courses</Button>} />
              ) : (
                <div className="space-y-3">
                  {myEnquiries.map((enquiry) => {
                    const statusInfo = REQUEST_STATUS[enquiry.status] || { text: enquiry.status, variant: 'neutral' };
                    return (
                      <div key={enquiry._id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-slate-800">{enquiry.course?.title || 'Course'}</h4>
                          <p className="text-sm text-slate-500 mt-1">{enquiry.message}</p>
                          <p className="text-xs text-slate-400 mt-2">Submitted {new Date(enquiry.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                        <Badge variant={statusInfo.variant} className="self-start">{statusInfo.text}</Badge>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Courses;
