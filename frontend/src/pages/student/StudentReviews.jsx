import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { 
  FiStar, FiPlus, FiVideo, FiTrash2, FiEdit2, FiCheckCircle, 
  FiClock, FiAlertCircle, FiMessageSquare, FiPlay 
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

const StudentReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const [activeReview, setActiveReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const initialForm = {
    course: '',
    rating: 5,
    title: '',
    message: '',
    videoUrl: '',
    videoDuration: '',
    designation: 'Student'
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchMyReviews();
    fetchCourses();
  }, []);

  const fetchMyReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/testimonials/my');
      if (res.data.success) {
        setReviews(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching student reviews:', err);
      toast.error('Failed to load your reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      const list = res.data?.courses || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCourses(list);
    } catch (err) {
      console.error('Error fetching courses list:', err);
    }
  };

  const openWriteModal = () => {
    setFormData(initialForm);
    setIsWriteModalOpen(true);
  };

  const openEditModal = (r) => {
    setActiveReview(r);
    setFormData({
      course: r.course?._id || r.course || '',
      rating: r.rating || 5,
      title: r.title || '',
      message: r.message || '',
      videoUrl: r.videoUrl || '',
      videoDuration: r.videoDuration || '',
      designation: r.designation || 'Student'
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (r) => {
    setActiveReview(r);
    setIsDeleteModalOpen(true);
  };

  const openVideoModal = (r) => {
    setActiveReview(r);
    setIsVideoModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      toast.error('Please enter your review / testimonial message');
      return;
    }
    setSubmitting(true);
    try {
      if (isEditModalOpen && activeReview) {
        await api.put(`/testimonials/${activeReview._id}`, formData);
        toast.success('Your review has been updated and sent for review!');
        setIsEditModalOpen(false);
      } else {
        await api.post('/testimonials', formData);
        toast.success('Thank you! Your review has been submitted for admin approval.');
        setIsWriteModalOpen(false);
      }
      fetchMyReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeReview) return;
    setSubmitting(true);
    try {
      await api.delete(`/testimonials/${activeReview._id}`);
      toast.success('Review removed from your panel');
      setIsDeleteModalOpen(false);
      fetchMyReviews();
    } catch (err) {
      toast.error('Failed to delete review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHeader
          title="Reviews & Testimonials"
          subtitle="Share your learning experience, course feedback, or record a video story"
          action={
            <Button variant="primary" onClick={openWriteModal} className="flex items-center gap-2">
              <FiPlus /> Share Your Experience
            </Button>
          }
        />

        {/* Motivational Banner */}
        <div className="bg-gradient-to-r from-primary-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-xl font-bold mb-2">Inspire Future Learners!</h3>
            <p className="text-sm text-primary-100 mb-4 leading-relaxed">
              Your honest feedback helps us improve and guides prospective students to choose the best courses. You can share your story in words or drop a YouTube link for a video testimonial!
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-primary-200">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                <FiCheckCircle className="text-emerald-400" /> Reviewed by Admin
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                <FiVideo className="text-rose-400" /> Video Testimonials Supported
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                <FiStar className="text-amber-300" /> Featured on Website
              </span>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <PageLoading />
        ) : reviews.length === 0 ? (
          <EmptyState
            title="No reviews submitted yet"
            description="You haven't submitted any reviews or course feedback yet. Click the button below to share your experience!"
            action={
              <Button variant="primary" onClick={openWriteModal} className="flex items-center gap-2">
                <FiPlus /> Write Your First Review
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((r) => {
              const isVideo = Boolean(r.videoUrl);
              return (
                <div
                  key={r._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    {/* Header: Rating & Status */}
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
                            <FiAlertCircle /> Needs Revision
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <FiClock /> In Review
                          </Badge>
                        )}
                        {r.isFeatured && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            ★ Featured
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Associated Course or Institute */}
                    <div className="mb-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                        {r.courseName || 'General Institute Review'}
                      </span>
                    </div>

                    {/* Title */}
                    {r.title && (
                      <h4 className="text-base font-bold text-slate-900 mb-2">
                        {r.title}
                      </h4>
                    )}

                    {/* Review text */}
                    <p className="text-sm text-slate-600 leading-relaxed italic mb-4">
                      "{r.message}"
                    </p>

                    {/* Video Badge / Action */}
                    {isVideo && (
                      <div className="mb-4">
                        <button
                          type="button"
                          onClick={() => openVideoModal(r)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                        >
                          <FiPlay className="w-3.5 h-3.5 fill-rose-600" /> Watch Video Story
                          {r.videoDuration && <span className="text-[10px] text-rose-500">({r.videoDuration})</span>}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Footer & Actions */}
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
                        title="Remove Review"
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

        {/* WRITE / EDIT REVIEW MODAL */}
        <Modal
          open={isWriteModalOpen || isEditModalOpen}
          onClose={() => {
            setIsWriteModalOpen(false);
            setIsEditModalOpen(false);
          }}
          title={isEditModalOpen ? 'Edit Your Review' : 'Share Your Experience'}
          subtitle="Your honest feedback inspires other students and helps us deliver excellence"
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Course (Optional)
              </label>
              <select
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">General Institute Experience</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Headline / Designation
              </label>
              <input
                type="text"
                placeholder="e.g. Student - Web Development / DCA Batch 2026"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
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
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="p-1 rounded hover:scale-125 transition"
                  >
                    <FiStar
                      className={`w-7 h-7 ${
                        star <= formData.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm font-bold text-slate-700 ml-2">{formData.rating} Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Title / Summary
              </label>
              <input
                type="text"
                placeholder="e.g. Practical curriculum that landed me my first internship!"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Feedback & Testimonial <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe your learning experience, mentorship, hands-on tests, or career transformation..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            {/* Video Testimonial */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FiVideo className="text-rose-500 text-base" /> Video Testimonial Link (Optional)
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  YouTube or Video Link
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Upload your video to YouTube (Public or Unlisted) and paste the link here.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsWriteModalOpen(false);
                  setIsEditModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {isEditModalOpen ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* DELETE MODAL */}
        <Modal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Remove Review"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to remove this review from your panel?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={submitting} onClick={handleDelete}>
                Remove
              </Button>
            </div>
          </div>
        </Modal>

        {/* VIDEO PREVIEW MODAL */}
        <Modal
          open={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          title={activeReview?.title || 'Your Video Story'}
          size="lg"
        >
          {activeReview?.videoUrl && (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
                <iframe
                  src={getEmbedUrl(activeReview.videoUrl)}
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

export default StudentReviews;
