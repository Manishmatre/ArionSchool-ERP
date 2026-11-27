import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { 
  FiStar, FiPlus, FiVideo, FiTrash2, FiEdit2, FiCheckCircle, 
  FiClock, FiAlertCircle, FiAward, FiPlay, FiBriefcase, FiUsers, FiUserCheck
} from 'react-icons/fi';
import { 
  Button, Badge, Modal, PageLoading, EmptyState 
} from '../../components/ui';

const getEmbedUrl = (url) => {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  }
  return url;
};

const FranchiseTestimonials = () => {
  const [activeTab, setActiveTab] = useState('partner'); // 'partner' | 'students'
  const [partnerTestimonials, setPartnerTestimonials] = useState([]);
  const [studentReviews, setStudentReviews] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isWritePartnerModalOpen, setIsWritePartnerModalOpen] = useState(false);
  const [isWriteStudentModalOpen, setIsWriteStudentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const [activeItem, setActiveItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const initialPartnerForm = {
    rating: 5,
    title: '',
    message: '',
    videoUrl: '',
    videoDuration: '',
    designation: 'Principal / Campus Head'
  };

  const initialStudentForm = {
    userName: '',
    designation: 'Student',
    course: '',
    rating: 5,
    title: '',
    message: '',
    videoUrl: '',
    videoDuration: '',
    userRole: 'student'
  };

  const [partnerForm, setPartnerForm] = useState(initialPartnerForm);
  const [studentForm, setStudentForm] = useState(initialStudentForm);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMyPartnerTestimonials(),
        fetchFranchiseStudentReviews(),
        fetchStudentsList(),
        fetchCoursesList()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPartnerTestimonials = async () => {
    try {
      const res = await api.get('/testimonials/my');
      if (res.data.success) {
        setPartnerTestimonials((res.data.data || []).filter((item) => item.userRole !== 'student' && item.designation !== 'Student'));
      }
    } catch (err) {
      console.error('Error fetching partner testimonials:', err);
    }
  };

  const fetchFranchiseStudentReviews = async () => {
    try {
      const res = await api.get('/testimonials/franchise/students');
      if (res.data.success) {
        setStudentReviews(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching student reviews:', err);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const res = await api.get('/students');
      const list = res.data?.students || (Array.isArray(res.data) ? res.data : []);
      setStudents(list);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchCoursesList = async () => {
    try {
      const res = await api.get('/courses');
      const list = res.data?.courses || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCourses(list);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  // Partner submit
  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    if (!partnerForm.message.trim()) {
      toast.error('Please enter your testimonial message');
      return;
    }
    setSubmitting(true);
    try {
      if (isEditModalOpen && activeItem) {
        await api.put(`/testimonials/${activeItem._id}`, partnerForm);
        toast.success('Your testimonial has been updated!');
        setIsEditModalOpen(false);
      } else {
        await api.post('/testimonials', {
          ...partnerForm,
          type: partnerForm.videoUrl ? 'video' : 'campus'
        });
        toast.success('Your campus testimonial has been submitted for approval!');
        setIsWritePartnerModalOpen(false);
      }
      fetchMyPartnerTestimonials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit testimonial');
    } finally {
      setSubmitting(false);
    }
  };

  // Student review submit (School owner adding on student's behalf)
  const handleStudentReviewSubmit = async (e) => {
    e.preventDefault();
    if (!studentForm.userName.trim() || !studentForm.message.trim()) {
      toast.error('Student name and review message are required');
      return;
    }
    setSubmitting(true);
    try {
      if (isEditModalOpen && activeItem) {
        await api.put(`/testimonials/${activeItem._id}`, studentForm);
        toast.success('Student review updated successfully!');
        setIsEditModalOpen(false);
      } else {
        await api.post('/testimonials', {
          ...studentForm,
          type: studentForm.videoUrl ? 'video' : 'course',
          userRole: 'student'
        });
        toast.success('Student review added and sent for approval!');
        setIsWriteStudentModalOpen(false);
      }
      fetchFranchiseStudentReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit student review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeItem) return;
    setSubmitting(true);
    try {
      await api.delete(`/testimonials/${activeItem._id}`);
      toast.success('Review removed successfully');
      setIsDeleteModalOpen(false);
      fetchMyPartnerTestimonials();
      fetchFranchiseStudentReviews();
    } catch (err) {
      toast.error('Failed to delete review');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    setActiveItem(item);
    if (item.userRole === 'student') {
      setStudentForm({
        userName: item.userName || '',
        designation: item.designation || 'Student',
        course: item.course?._id || item.course || '',
        rating: item.rating || 5,
        title: item.title || '',
        message: item.message || '',
        videoUrl: item.videoUrl || '',
        videoDuration: item.videoDuration || '',
        userRole: 'student'
      });
      setIsEditModalOpen(true);
    } else {
      setPartnerForm({
        rating: item.rating || 5,
        title: item.title || '',
        message: item.message || '',
        videoUrl: item.videoUrl || '',
        videoDuration: item.videoDuration || '',
        designation: item.designation || 'Principal / Campus Head'
      });
      setIsEditModalOpen(true);
    }
  };

  const openDeleteModal = (item) => {
    setActiveItem(item);
    setIsDeleteModalOpen(true);
  };

  const openVideoModal = (item) => {
    setActiveItem(item);
    setIsVideoModalOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHeader
          title="Testimonials & Student Reviews"
          subtitle="Manage your school campus leadership story and student/parent reviews"
          actions={
            <div className="flex items-center gap-3">
              {activeTab === 'partner' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    setPartnerForm(initialPartnerForm);
                    setIsWritePartnerModalOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <FiPlus /> Share Campus Story
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    setStudentForm(initialStudentForm);
                    setIsWriteStudentModalOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <FiPlus /> Add Student Review
                </Button>
              )}
            </div>
          }
        />

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('partner')}
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'partner'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FiBriefcase /> Campus Stories ({partnerTestimonials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'students'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FiUsers /> Center Student Reviews ({studentReviews.length})
          </button>
        </div>

        {/* TAB 1: PARTNER STORIES */}
        {activeTab === 'partner' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <FiBriefcase /> Showcase Your Center Success!
                </h3>
                <p className="text-sm text-amber-100 mb-4 leading-relaxed">
                  Share how our LMS, exam engine, and central accreditation have empowered your institution. Approved partner stories are highlighted directly on our national website!
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-amber-200">
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                    <FiAward className="text-amber-300" /> Featured on National Portal
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                    <FiVideo className="text-white" /> Video Stories Highlighted
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <PageLoading />
            ) : partnerTestimonials.length === 0 ? (
              <EmptyState
                title="No partner testimonials submitted yet"
                description="Share your center's growth, student placements, or submit a partner video story."
                action={
                  <Button variant="primary" onClick={() => setIsWritePartnerModalOpen(true)} className="flex items-center gap-2">
                    <FiPlus /> Submit Your Story
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partnerTestimonials.map((item) => {
                  const isVideo = Boolean(item.videoUrl);
                  return (
                    <div
                      key={item._id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <FiStar
                                key={i}
                                className={`w-4 h-4 ${i < item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                              />
                            ))}
                            <span className="text-xs font-bold text-slate-700 ml-1">({item.rating}.0)</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.status === 'approved' ? (
                              <Badge variant="success" className="flex items-center gap-1">
                                <FiCheckCircle /> Live on Website
                              </Badge>
                            ) : item.status === 'rejected' ? (
                              <Badge variant="danger" className="flex items-center gap-1">
                                <FiAlertCircle /> Needs Revision
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="flex items-center gap-1">
                                <FiClock /> In Review
                              </Badge>
                            )}
                            {item.isFeatured && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                ★ Featured
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mb-2">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-50 text-amber-800">
                            {item.designation || 'Campus Principal / Educator'}
                          </span>
                        </div>

                        {item.title && (
                          <h4 className="text-base font-bold text-slate-900 mb-2">
                            {item.title}
                          </h4>
                        )}

                        <p className="text-sm text-slate-600 leading-relaxed italic mb-4">
                          "{item.message}"
                        </p>

                        {isVideo && (
                          <div className="mb-4">
                            <button
                              type="button"
                              onClick={() => openVideoModal(item)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                            >
                              <FiPlay className="w-3.5 h-3.5 fill-rose-600" /> Watch Video Story
                              {item.videoDuration && <span className="text-[10px] text-rose-500">({item.videoDuration})</span>}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Submitted on {new Date(item.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                            title="Edit Testimonial"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(item)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Testimonial"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CENTER STUDENT REVIEWS */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <FiUsers /> Manage Campus Student Reviews
                </h3>
                <p className="text-sm text-blue-100 mb-4 leading-relaxed">
                  View and manage feedback from students and parents at your school campus. You can also feature inspiring student stories and testimonials!
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-blue-200">
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                    <FiUserCheck className="text-emerald-300" /> Center Verified Students
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                    <FiStar className="text-amber-300" /> Course Reviews Displayed Publicly
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <PageLoading />
            ) : studentReviews.length === 0 ? (
              <EmptyState
                title="No student reviews found for your center"
                description="Your students haven't submitted reviews yet, or you can add student reviews directly using the button below."
                action={
                  <Button variant="primary" onClick={() => setIsWriteStudentModalOpen(true)} className="flex items-center gap-2">
                    <FiPlus /> Add Student Review
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {studentReviews.map((r) => {
                  const isVideo = Boolean(r.videoUrl);
                  return (
                    <div
                      key={r._id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <FiStar
                                key={i}
                                className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                              />
                            ))}
                            <span className="text-xs font-bold text-slate-700 ml-1">({r.rating}.0)</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {r.status === 'approved' ? (
                              <Badge variant="success" className="flex items-center gap-1">
                                <FiCheckCircle /> Live on Website
                              </Badge>
                            ) : r.status === 'rejected' ? (
                              <Badge variant="danger" className="flex items-center gap-1">
                                <FiAlertCircle /> Rejected
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="flex items-center gap-1">
                                <FiClock /> Pending Approval
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Student Name & Course */}
                        <div className="mb-2">
                          <h4 className="font-bold text-slate-900 text-base">{r.userName}</h4>
                          <div className="text-xs text-slate-500">{r.designation || 'Student'}</div>
                          {r.courseName && (
                            <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              {r.courseName}
                            </span>
                          )}
                        </div>

                        {r.title && (
                          <h5 className="text-sm font-semibold text-slate-800 mb-1">
                            {r.title}
                          </h5>
                        )}

                        <p className="text-sm text-slate-600 leading-relaxed italic mb-4">
                          "{r.message}"
                        </p>

                        {isVideo && (
                          <div className="mb-4">
                            <button
                              type="button"
                              onClick={() => openVideoModal(r)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                            >
                              <FiPlay className="w-3.5 h-3.5 fill-rose-600" /> Watch Student Video
                              {r.videoDuration && <span className="text-[10px] text-rose-500">({r.videoDuration})</span>}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Submitted on {new Date(r.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                            title="Edit Review"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(r)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Review"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL: SUBMIT / EDIT PARTNER STORY */}
        <Modal
          open={isWritePartnerModalOpen || (isEditModalOpen && activeItem?.userRole !== 'student')}
          onClose={() => {
            setIsWritePartnerModalOpen(false);
            setIsEditModalOpen(false);
          }}
          title={isEditModalOpen ? 'Edit Campus Story' : 'Submit Campus Testimonial'}
          size="md"
        >
          <form onSubmit={handlePartnerSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Role / Title
              </label>
              <input
                type="text"
                placeholder="e.g. Principal / Senior Educator - North Campus"
                value={partnerForm.designation}
                onChange={(e) => setPartnerForm({ ...partnerForm, designation: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Satisfaction Rating
              </label>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setPartnerForm({ ...partnerForm, rating: star })}
                    className="p-1 rounded hover:scale-125 transition"
                  >
                    <FiStar
                      className={`w-7 h-7 ${
                        star <= partnerForm.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm font-bold text-slate-700 ml-2">{partnerForm.rating} Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Headline / Title
              </label>
              <input
                type="text"
                placeholder="e.g. Scaled to 200+ students in 8 months with SES LMS"
                value={partnerForm.title}
                onChange={(e) => setPartnerForm({ ...partnerForm, title: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Testimonial Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe how the Arion School ERP, academic accreditation, and digital campus features have benefited your school..."
                value={partnerForm.message}
                onChange={(e) => setPartnerForm({ ...partnerForm, message: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FiVideo className="text-rose-500 text-base" /> Video Story Link (Optional)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">YouTube Link</label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={partnerForm.videoUrl}
                    onChange={(e) => setPartnerForm({ ...partnerForm, videoUrl: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Video Duration</label>
                  <input
                    type="text"
                    placeholder="3:15"
                    value={partnerForm.videoDuration}
                    onChange={(e) => setPartnerForm({ ...partnerForm, videoDuration: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsWritePartnerModalOpen(false);
                  setIsEditModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {isEditModalOpen ? 'Update Story' : 'Submit Story'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* MODAL: ADD / EDIT STUDENT REVIEW */}
        <Modal
          open={isWriteStudentModalOpen || (isEditModalOpen && activeItem?.userRole === 'student')}
          onClose={() => {
            setIsWriteStudentModalOpen(false);
            setIsEditModalOpen(false);
          }}
          title={isEditModalOpen ? 'Edit Student Review' : 'Add Student Review for Center'}
          subtitle="Record and showcase your student's learning experience, star rating, and video feedback"
          size="md"
        >
          <form onSubmit={handleStudentReviewSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Name <span className="text-rose-500">*</span>
              </label>
              {students.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={studentForm.userName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentForm({ ...studentForm, userName: val });
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">-- Select from Center Students --</option>
                    {students.map((s) => {
                      const fullName = s.fullName || `${s.personalInfo?.firstName || ''} ${s.personalInfo?.lastName || ''}`.trim() || s.name;
                      return (
                        <option key={s._id} value={fullName}>
                          {fullName} ({s.enrollmentNumber || s.studentId || 'Enrolled'})
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="text"
                    placeholder="Or type student full name manually"
                    value={studentForm.userName}
                    onChange={(e) => setStudentForm({ ...studentForm, userName: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={studentForm.userName}
                  onChange={(e) => setStudentForm({ ...studentForm, userName: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enrolled Course
                </label>
                <select
                  value={studentForm.course}
                  onChange={(e) => setStudentForm({ ...studentForm, course: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="">General Center Experience</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation / Batch
                </label>
                <input
                  type="text"
                  placeholder="e.g. DCA Student / Batch 2026"
                  value={studentForm.designation}
                  onChange={(e) => setStudentForm({ ...studentForm, designation: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Star Rating
              </label>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setStudentForm({ ...studentForm, rating: star })}
                    className="p-1 rounded hover:scale-125 transition"
                  >
                    <FiStar
                      className={`w-7 h-7 ${
                        star <= studentForm.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm font-bold text-slate-700 ml-2">{studentForm.rating} Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Title / Summary
              </label>
              <input
                type="text"
                placeholder="e.g. Great faculty support and hands-on computer lab training"
                value={studentForm.title}
                onChange={(e) => setStudentForm({ ...studentForm, title: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Review Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Write student feedback regarding course curriculum, exam tests, and center mentorship..."
                value={studentForm.message}
                onChange={(e) => setStudentForm({ ...studentForm, message: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            {/* Video Testimonial link */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FiVideo className="text-rose-500 text-base" /> Video Story Link (Optional)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">YouTube Link</label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={studentForm.videoUrl}
                    onChange={(e) => setStudentForm({ ...studentForm, videoUrl: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="2:30"
                    value={studentForm.videoDuration}
                    onChange={(e) => setStudentForm({ ...studentForm, videoDuration: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsWriteStudentModalOpen(false);
                  setIsEditModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {isEditModalOpen ? 'Update Review' : 'Save Student Review'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* DELETE MODAL */}
        <Modal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Review"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this review from{' '}
              <strong className="text-slate-900">{activeItem?.userName}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={submitting} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* VIDEO PREVIEW MODAL */}
        <Modal
          open={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          title={activeItem?.title || 'Video Story'}
          size="lg"
        >
          {activeItem?.videoUrl && (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
                <iframe
                  src={getEmbedUrl(activeItem.videoUrl)}
                  title="Video Story"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default FranchiseTestimonials;

