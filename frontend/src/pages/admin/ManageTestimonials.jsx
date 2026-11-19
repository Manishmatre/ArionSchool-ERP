import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { 
  FiStar, FiCheck, FiX, FiClock, FiVideo, FiTrash2, 
  FiEdit2, FiPlus, FiEye, FiAward, FiMessageSquare, FiExternalLink, FiPlay
} from 'react-icons/fi';
import {
  StatCard, PageLoading, FilterBar, SearchInput, SelectField,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  Badge, Button, IconButton, Modal
} from '../../components/ui';

// Helper to extract YouTube embed URL
const getEmbedUrl = (url) => {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  }
  return url;
};

const ManageTestimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [videoFilter, setVideoFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    hasVideo: 0,
    avgRating: 5
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const [activeTestimonial, setActiveTestimonial] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const initialFormState = {
    userName: '',
    userRole: 'student',
    userEmail: '',
    designation: '',
    course: '',
    rating: 5,
    title: '',
    message: '',
    videoUrl: '',
    videoDuration: '',
    avatar: '',
    status: 'approved',
    isFeatured: false,
    adminComment: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchTestimonials();
  }, [currentPage, statusFilter, roleFilter, videoFilter, ratingFilter, searchTerm]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      const list = res.data?.courses || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCourses(list);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter,
        role: roleFilter,
        search: searchTerm
      };
      if (videoFilter === 'video') params.hasVideo = 'true';
      if (ratingFilter !== 'all') params.rating = ratingFilter;

      const res = await api.get('/testimonials/admin/all', { params });
      if (res.data.success) {
        setTestimonials(res.data.data || []);
        setTotalCount(res.data.total || 0);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Error loading testimonials:', err);
      toast.error('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStatus = async (id, newStatus) => {
    try {
      const res = await api.patch(`/testimonials/admin/${id}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Review ${newStatus} successfully!`);
        fetchTestimonials();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleToggleFeatured = async (id, currentFeatured) => {
    try {
      const res = await api.patch(`/testimonials/admin/${id}/status`, { isFeatured: !currentFeatured });
      if (res.data.success) {
        toast.success(!currentFeatured ? 'Marked as Featured!' : 'Unmarked from Featured');
        fetchTestimonials();
      }
    } catch (err) {
      toast.error('Failed to update featured flag');
    }
  };

  const openAddModal = () => {
    setFormData(initialFormState);
    setIsAddModalOpen(true);
  };

  const openEditModal = (t) => {
    setActiveTestimonial(t);
    setFormData({
      userName: t.userName || '',
      userRole: t.userRole || 'student',
      userEmail: t.userEmail || '',
      designation: t.designation || '',
      course: t.course?._id || t.course || '',
      rating: t.rating || 5,
      title: t.title || '',
      message: t.message || '',
      videoUrl: t.videoUrl || '',
      videoDuration: t.videoDuration || '',
      avatar: t.avatar || '',
      status: t.status || 'approved',
      isFeatured: Boolean(t.isFeatured),
      adminComment: t.adminComment || ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (t) => {
    setActiveTestimonial(t);
    setIsDeleteModalOpen(true);
  };

  const openVideoModal = (t) => {
    setActiveTestimonial(t);
    setIsVideoModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userName || !formData.message) {
      toast.error('Reviewer name and review message are required');
      return;
    }
    setSubmitting(true);
    try {
      if (isEditModalOpen && activeTestimonial) {
        await api.put(`/testimonials/${activeTestimonial._id}`, formData);
        toast.success('Testimonial updated successfully');
        setIsEditModalOpen(false);
      } else {
        await api.post('/testimonials', formData);
        toast.success('Testimonial created successfully');
        setIsAddModalOpen(false);
      }
      fetchTestimonials();
    } catch (err) {
      console.error('Error saving testimonial:', err);
      toast.error(err.response?.data?.message || 'Failed to save testimonial');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeTestimonial) return;
    setSubmitting(true);
    try {
      await api.delete(`/testimonials/${activeTestimonial._id}`);
      toast.success('Testimonial deleted successfully');
      setIsDeleteModalOpen(false);
      fetchTestimonials();
    } catch (err) {
      toast.error('Failed to delete testimonial');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Reviews & Testimonials"
          subtitle="Manage student feedback, school stories, ratings, and video testimonials"
          action={
            <Button variant="primary" onClick={openAddModal} className="flex items-center gap-2">
              <FiPlus /> Add Testimonial
            </Button>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total Reviews"
            value={stats.total}
            icon={FiMessageSquare}
            color="primary"
            subtext={`Avg: ${Number(stats.avgRating || 5).toFixed(1)} ★`}
          />
          <StatCard
            title="Pending Review"
            value={stats.pending}
            icon={FiClock}
            color="warning"
            subtext={stats.pending > 0 ? "Requires action" : "All cleared"}
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={FiCheck}
            color="success"
            subtext="Live on platform"
          />
          <StatCard
            title="Featured"
            value={stats.featured}
            icon={FiAward}
            color="indigo"
            subtext="Showcased on site"
          />
          <StatCard
            title="Video Stories"
            value={stats.hasVideo}
            icon={FiVideo}
            color="rose"
            subtext="Interactive clips"
          />
        </div>

        {/* Filters Bar */}
        <FilterBar className="flex-wrap gap-3">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search reviewer name, review text, title..."
            />
          </div>

          <div className="w-40">
            <SelectField
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </SelectField>
          </div>

          <div className="w-40">
            <SelectField
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="franchise_admin">School Partner</option>
              <option value="alumni">Alumni</option>
              <option value="super_admin">Official / Admin</option>
            </SelectField>
          </div>

          <div className="w-36">
            <SelectField
              value={videoFilter}
              onChange={(e) => {
                setVideoFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Types</option>
              <option value="video">Has Video</option>
            </SelectField>
          </div>

          <div className="w-32">
            <SelectField
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Stars</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </SelectField>
          </div>
        </FilterBar>

        {/* Testimonials Table */}
        {loading ? (
          <PageLoading />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Reviewer</TableHeader>
                  <TableHeader>Rating</TableHeader>
                  <TableHeader>Review & Message</TableHeader>
                  <TableHeader>Associated With</TableHeader>
                  <TableHeader>Media</TableHeader>
                  <TableHeader>Featured</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {testimonials.length === 0 ? (
                  <TableEmpty colSpan={8} message="No reviews or testimonials match your filter" />
                ) : (
                  testimonials.map((t) => {
                    const isVideo = Boolean(t.videoUrl);
                    return (
                      <TableRow key={t._id}>
                        {/* Reviewer details */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {t.avatar ? (
                              <img
                                src={t.avatar}
                                alt={t.userName}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                                {t.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{t.userName}</div>
                              <div className="text-xs text-slate-500">{t.designation || 'Student'}</div>
                              <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                t.userRole === 'franchise_admin' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : t.userRole === 'super_admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {t.userRole === 'franchise_admin' ? 'Franchise Partner' : t.userRole === 'super_admin' ? 'Admin' : 'Student'}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Rating */}
                        <TableCell>
                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <FiStar
                                key={i}
                                className={`w-3.5 h-3.5 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                              />
                            ))}
                            <span className="text-xs font-semibold text-slate-700 ml-1">({t.rating})</span>
                          </div>
                        </TableCell>

                        {/* Title & Message */}
                        <TableCell className="max-w-xs">
                          {t.title && <div className="font-semibold text-xs text-slate-900 mb-1">{t.title}</div>}
                          <p className="text-xs text-slate-600 line-clamp-3 italic">"{t.message}"</p>
                        </TableCell>

                        {/* Associated With */}
                        <TableCell>
                          {t.courseName ? (
                            <div className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-1 rounded inline-block">
                              {t.courseName}
                            </div>
                          ) : t.franchiseName ? (
                            <div className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block">
                              {t.franchiseName}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">General Experience</span>
                          )}
                        </TableCell>

                        {/* Media badge / Watch button */}
                        <TableCell>
                          {isVideo ? (
                            <button
                              type="button"
                              onClick={() => openVideoModal(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                            >
                              <FiPlay className="w-3 h-3 fill-rose-600" /> Watch
                              {t.videoDuration && <span className="text-[10px] text-rose-500">({t.videoDuration})</span>}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Text Only</span>
                          )}
                        </TableCell>

                        {/* Featured Toggle */}
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(t._id, t.isFeatured)}
                            className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                              t.isFeatured
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-300'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title={t.isFeatured ? 'Featured on Website' : 'Click to feature'}
                          >
                            <FiAward className={`w-3.5 h-3.5 ${t.isFeatured ? 'fill-amber-500 text-amber-600' : ''}`} />
                            {t.isFeatured ? 'Featured' : 'No'}
                          </button>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant={
                              t.status === 'approved' ? 'success' :
                              t.status === 'rejected' ? 'danger' : 'warning'
                            }
                          >
                            {t.status.toUpperCase()}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatus(t._id, 'approved')}
                                  title="Approve Review"
                                  className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                                >
                                  <FiCheck className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatus(t._id, 'rejected')}
                                  title="Reject Review"
                                  className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                                >
                                  <FiX className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <IconButton
                              icon={FiEdit2}
                              title="Edit"
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(t)}
                            />
                            <IconButton
                              icon={FiTrash2}
                              title="Delete"
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:bg-rose-50"
                              onClick={() => openDeleteModal(t)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        )}

        {/* Pagination */}
        {totalCount > itemsPerPage && (
          <div className="flex justify-center mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}

        {/* ADD / EDIT MODAL */}
        <Modal
          open={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
          }}
          title={isEditModalOpen ? 'Edit Testimonial / Review' : 'Add New Testimonial'}
          subtitle="Configure reviewer profile, rating, feedback text, video link, and approval state"
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Kumar"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Student - Web Development / Patna Center"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Role
                </label>
                <select
                  value={formData.userRole}
                  onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="franchise_admin">School Partner</option>
                  <option value="alumni">Alumni</option>
                  <option value="super_admin">Official / Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Star Rating (1 - 5)
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
                        className={`w-6 h-6 ${
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
                  Associated Course (Optional)
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
                  Avatar / Photo URL
                </label>
                <input
                  type="text"
                  placeholder="https://... photo link"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Headline / Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Life changing course with excellent placement support"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Testimonial / Review Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Write the detailed testimonial or student feedback here..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            {/* Video Testimonial Fields */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FiVideo className="text-rose-500 text-base" /> Video Testimonial Link (Optional)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    YouTube / Video URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Duration Badge (e.g. 2:45)
                  </label>
                  <input
                    type="text"
                    placeholder="2:45"
                    value={formData.videoDuration}
                    onChange={(e) => setFormData({ ...formData, videoDuration: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Moderation Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="approved">Approved (Live)</option>
                  <option value="pending">Pending Moderation</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="isFeaturedCheck"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <label htmlFor="isFeaturedCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Feature on Public Website & Homepage Carousel
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {isEditModalOpen ? 'Save Changes' : 'Create Testimonial'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* DELETE CONFIRMATION MODAL */}
        <Modal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Testimonial"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete the testimonial from{' '}
              <strong className="text-slate-900">{activeTestimonial?.userName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={submitting} onClick={handleDelete}>
                Delete Testimonial
              </Button>
            </div>
          </div>
        </Modal>

        {/* VIDEO PREVIEW MODAL */}
        <Modal
          open={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          title={activeTestimonial ? `${activeTestimonial.userName}'s Video Story` : 'Video Story'}
          subtitle={activeTestimonial?.title || 'Video Testimonial'}
          size="lg"
        >
          {activeTestimonial?.videoUrl && (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
                <iframe
                  src={getEmbedUrl(activeTestimonial.videoUrl)}
                  title={activeTestimonial.userName}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-700 italic">"{activeTestimonial.message}"</p>
                <div className="mt-2 text-xs text-slate-500 font-medium">
                  {activeTestimonial.userName} &bull; {activeTestimonial.designation}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default ManageTestimonials;
