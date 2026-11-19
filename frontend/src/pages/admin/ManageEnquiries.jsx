import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import {
  FiTrash2, FiUserCheck, FiEye, FiMail, FiTrendingUp, FiUserPlus,
  FiPhone, FiCalendar, FiFilter, FiRefreshCw, FiCheckCircle, FiPlus,
  FiBook, FiMapPin, FiLayers, FiAward
} from 'react-icons/fi';
import {
  getAllEnquiries,
  deleteEnquiry,
  updateEnquiryStatus,
  getEnquiryStats,
  createEnquiry,
  convertToStudent
} from '../../api/enquiryApi';
import { getCourses } from '../../api/courseApi';
import { getAllFranchises } from '../../api/campusApi';
import { useAuth } from '../../context/AuthContext';
import EnquiryDetailModal from '../../components/EnquiryDetailModal';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  Badge, IconButton, Button, Modal, FormField, FormGrid, TextField, TextArea
} from '../../components/ui';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const STATUS_CONFIG = {
  new: { label: 'New / Uncontacted', class: 'bg-purple-100 text-purple-800 border-purple-200' },
  contacted: { label: 'Contacted', class: 'bg-amber-100 text-amber-800 border-amber-200' },
  interested: { label: 'Interested / Qualified', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  converted: { label: 'Converted to Student', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  not_interested: { label: 'Not Interested', class: 'bg-slate-100 text-slate-700 border-slate-200' },
  closed: { label: 'Closed', class: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const SOURCE_CONFIG = {
  walk_in: { label: 'Walk-in', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  phone: { label: 'Phone Call', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  website: { label: 'Website Form', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  social_media: { label: 'Social Media', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  referral: { label: 'Referral', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  student_portal: { label: 'Student Portal', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  other: { label: 'Other', color: 'bg-slate-50 text-slate-700 border-slate-200' }
};

const PRIORITY_BADGES = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200'
};

const ManageEnquiries = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [enquiries, setEnquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [enquiryToConvert, setEnquiryToConvert] = useState(null);

  // Add Enquiry Form State
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    mobile: '',
    enquiryType: 'course',
    course: '',
    franchise: '',
    source: 'walk_in',
    priority: 'medium',
    city: '',
    state: '',
    notes: ''
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Convert to Student Form State
  const [convertForm, setConvertForm] = useState({
    courseId: '',
    franchiseId: '',
    firstName: '',
    lastName: '',
    gender: 'male',
    dateOfBirth: '',
    fatherName: ''
  });
  const [submittingConvert, setSubmittingConvert] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Background auto-refresh without full-page spinner lock
  useAutoRefresh(
    () => {
      fetchEnquiries({ silent: true });
      fetchStats();
    },
    { interval: 30000 }
  );

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [enquiriesRes, statsRes, coursesRes, franchisesRes] = await Promise.all([
        getAllEnquiries().catch(() => ({ data: [] })),
        getEnquiryStats().catch(() => ({ data: {} })),
        getCourses({ status: 'published', limit: 100 }).catch(() => ({ data: [] })),
        user?.role === 'super_admin' ? getAllFranchises().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);

      setEnquiries(enquiriesRes.data || []);
      setStats(statsRes.data || null);
      setCourses(coursesRes.data || []);
      setFranchises(franchisesRes.data || []);
    } catch (error) {
      console.error('Error loading CRM leads:', error);
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnquiries = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await getAllEnquiries();
      setEnquiries(data.data || []);
    } catch (error) {
      if (!silent) toast.error('Failed to fetch enquiries');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getEnquiryStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this enquiry record?')) return;
    try {
      await deleteEnquiry(id);
      toast.success('Enquiry deleted successfully');
      setEnquiries(prev => prev.filter(e => e._id !== id));
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete enquiry');
      console.error(error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateEnquiryStatus(id, newStatus);
      toast.success('Pipeline status updated');
      setEnquiries(prev => prev.map(e => e._id === id ? { ...e, status: newStatus } : e));
      fetchStats();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const handleView = (id) => {
    setSelectedEnquiryId(id);
    setShowDetailModal(true);
  };

  const handleOpenAddModal = () => {
    setAddForm({
      name: '',
      email: '',
      mobile: '',
      enquiryType: 'course',
      course: '',
      franchise: user?.franchise?._id || user?.franchise || '',
      source: 'walk_in',
      priority: 'medium',
      city: '',
      state: '',
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.mobile.trim() || !addForm.email.trim()) {
      toast.error('Please enter Name, Email, and Mobile number');
      return;
    }

    try {
      setSubmittingAdd(true);
      const res = await createEnquiry(addForm);
      toast.success('Lead enquiry logged successfully!');
      setShowAddModal(false);
      fetchEnquiries();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create enquiry');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenConvertModal = (enquiry) => {
    setEnquiryToConvert(enquiry);
    const nameParts = (enquiry.name || '').trim().split(' ');
    setConvertForm({
      courseId: enquiry.course?._id || enquiry.course || '',
      franchiseId: enquiry.franchise?._id || enquiry.franchise || user?.franchise?._id || user?.franchise || '',
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      gender: 'male',
      dateOfBirth: '',
      fatherName: ''
    });
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!enquiryToConvert) return;

    try {
      setSubmittingConvert(true);
      const payload = {
        name: enquiryToConvert.name,
        email: enquiryToConvert.email,
        mobile: enquiryToConvert.mobile,
        courseId: convertForm.courseId || undefined,
        franchiseId: convertForm.franchiseId || undefined,
        personalInfo: {
          firstName: convertForm.firstName,
          lastName: convertForm.lastName,
          gender: convertForm.gender,
          dateOfBirth: convertForm.dateOfBirth || undefined,
          fatherName: convertForm.fatherName || undefined
        }
      };

      const res = await convertToStudent(enquiryToConvert._id, payload);
      toast.success(res.message || 'Enquiry converted to student successfully!');
      setShowConvertModal(false);
      setEnquiryToConvert(null);
      fetchEnquiries();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to convert enquiry to student');
    } finally {
      setSubmittingConvert(false);
    }
  };

  // Fast client-side filtering via useMemo
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((enquiry) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        enquiry.name?.toLowerCase().includes(q) ||
        enquiry.email?.toLowerCase().includes(q) ||
        enquiry.mobile?.includes(searchTerm) ||
        enquiry.course?.title?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || enquiry.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || enquiry.source === sourceFilter;
      const matchesPriority = priorityFilter === 'all' || enquiry.priority === priorityFilter;
      const matchesType = typeFilter === 'all' || enquiry.enquiryType === typeFilter;

      return matchesSearch && matchesStatus && matchesSource && matchesPriority && matchesType;
    });
  }, [enquiries, searchTerm, statusFilter, sourceFilter, priorityFilter, typeFilter]);

  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEnquiries = filteredEnquiries.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => setCurrentPage(page);
  const handleItemsPerPageChange = (n) => {
    setItemsPerPage(n);
    setCurrentPage(1);
  };

  if (loading && enquiries.length === 0) {
    return (
      <Layout>
        <PageHeader
          title="CRM & Lead Management"
          subtitle="Track inquiries, qualify prospects, and convert leads into active enrolled students"
          icon={FiMail}
        />
        <PageLoading message="Loading CRM leads..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                icon={FiRefreshCw}
                onClick={() => { fetchEnquiries(); fetchStats(); }}
                className="text-xs"
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                icon={FiPlus}
                onClick={handleOpenAddModal}
                className="text-xs"
              >
                + Log New Lead
              </Button>
            </div>
          }
        />

        {/* CRM Metric Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Leads" tone="info" icon={FiUserCheck} value={stats?.total || 0} />
          <StatCard title="New / Uncontacted" tone="purple" icon={FiUserPlus} value={stats?.new || 0} />
          <StatCard title="In Follow-up" tone="amber" icon={FiPhone} value={(stats?.contacted || 0) + (stats?.interested || 0)} />
          <StatCard title="Converted Students" tone="success" icon={FiAward} value={stats?.converted || 0} />
          <StatCard title="Conversion Rate" tone="indigo" icon={FiTrendingUp} value={`${stats?.conversionRate || 0}%`} />
        </div>

        {/* Pipeline Stage Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Leads', count: stats?.total || enquiries.length },
            { id: 'new', label: 'New', count: stats?.new || 0 },
            { id: 'contacted', label: 'Contacted', count: stats?.contacted || 0 },
            { id: 'interested', label: 'Qualified', count: stats?.interested || 0 },
            { id: 'converted', label: 'Converted', count: stats?.converted || 0 },
            { id: 'not_interested', label: 'Closed / Lost', count: stats?.notInterested || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Multi-Filter Bar */}
        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, email, mobile, or course..."
          />
          <FilterBarActions>
            <SelectField
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
              className="min-w-[130px]"
            >
              <option value="all">All Sources</option>
              <option value="walk_in">Walk-in</option>
              <option value="phone">Phone Call</option>
              <option value="website">Website</option>
              <option value="social_media">Social Media</option>
              <option value="referral">Referral</option>
              <option value="student_portal">Student Portal</option>
            </SelectField>

            <SelectField
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
              className="min-w-[120px]"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </SelectField>

            <SelectField
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="min-w-[130px]"
            >
              <option value="all">All Types</option>
              <option value="course">Course Lead</option>
              <option value="admission">Admission</option>
              <option value="franchise">School</option>
              <option value="general">General</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        {/* CRM Leads Table */}
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Prospect / Contact</TableHeader>
                <TableHeader>Target Course</TableHeader>
                <TableHeader>Source & Priority</TableHeader>
                <TableHeader>Stage / Status</TableHeader>
                <TableHeader>Lead Status</TableHeader>
                <TableHeader>Logged Date</TableHeader>
                <TableHeader className="text-right">CRM Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginatedEnquiries.length === 0 ? (
                <TableEmpty colSpan={7} title="No CRM enquiries found" description="Try clearing your search query or filters." />
              ) : (
                paginatedEnquiries.map((enquiry) => {
                  const isConverted = enquiry.status === 'converted' || Boolean(enquiry.convertedToStudent);
                  const studentId = enquiry.convertedToStudent?.studentId || enquiry.student?.studentId;
                  const sourceMeta = SOURCE_CONFIG[enquiry.source] || SOURCE_CONFIG.other;

                  return (
                    <TableRow key={enquiry._id}>
                      {/* Name & Contact */}
                      <TableCell className="font-medium text-slate-900">
                        <div>
                          <span className="font-semibold text-slate-900 block">{enquiry.name}</span>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <a href={`tel:${enquiry.mobile}`} className="hover:text-primary-600 flex items-center gap-1">
                              <FiPhone className="w-3 h-3 text-slate-400" />
                              {enquiry.mobile}
                            </a>
                            <span>•</span>
                            <a href={`mailto:${enquiry.email}`} className="hover:text-primary-600 truncate max-w-[180px]">
                              {enquiry.email}
                            </a>
                          </div>
                          {(enquiry.city || enquiry.state) && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {[enquiry.city, enquiry.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Course */}
                      <TableCell>
                        {enquiry.course?.title ? (
                          <div>
                            <span className="font-medium text-slate-800 text-xs block">{enquiry.course.title}</span>
                            {enquiry.course.duration && (
                              <span className="text-[10px] text-slate-400">{enquiry.course.duration}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 capitalize">{enquiry.enquiryType || 'General'}</span>
                        )}
                      </TableCell>

                      {/* Source & Priority */}
                      <TableCell>
                        <div className="space-y-1">
                          <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md border ${sourceMeta.color}`}>
                            {sourceMeta.label}
                          </span>
                          {enquiry.priority && (
                            <span className={`block w-max px-1.5 py-0.2 text-[10px] font-bold rounded uppercase tracking-wider border ${PRIORITY_BADGES[enquiry.priority] || PRIORITY_BADGES.medium}`}>
                              {enquiry.priority}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Stage / Status Dropdown */}
                      <TableCell>
                        <select
                          value={enquiry.status}
                          onChange={(e) => handleStatusChange(enquiry._id, e.target.value)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border focus:ring-2 focus:ring-primary-500 cursor-pointer ${
                            STATUS_CONFIG[enquiry.status]?.class || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="interested">Interested</option>
                          <option value="converted">Converted</option>
                          <option value="not_interested">Not Interested</option>
                          <option value="closed">Closed</option>
                        </select>
                      </TableCell>

                      {/* Lead Status */}
                      <TableCell>
                        {isConverted ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <FiCheckCircle className="w-3 h-3" /> Enrolled
                            </span>
                            {studentId && (
                              <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                                {studentId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Prospect Lead
                          </span>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-xs text-slate-500">
                        {new Date(enquiry.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* CONVERT DIRECTLY TO STUDENT BUTTON */}
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(enquiry)}
                              title="Convert to Enrolled Student"
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition flex items-center gap-1 shadow-2xs"
                            >
                              <FiUserPlus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Convert</span>
                            </button>
                          )}

                          <IconButton
                            icon={FiEye}
                            variant="primary"
                            title="View CRM Details & Notes"
                            onClick={() => handleView(enquiry._id)}
                          />
                          <IconButton
                            icon={FiTrash2}
                            variant="danger"
                            title="Delete Lead"
                            onClick={() => handleDelete(enquiry._id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredEnquiries.length}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </TableWrapper>
      </div>

      {/* DETAIL & FOLLOW-UP MODAL */}
      <EnquiryDetailModal
        enquiryId={selectedEnquiryId}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEnquiryId(null);
        }}
        onUpdated={() => {
          fetchEnquiries({ silent: true });
          fetchStats();
        }}
        onConvertToStudent={(enquiry) => {
          handleOpenConvertModal(enquiry);
        }}
      />

      {/* CONVERT LEAD TO STUDENT MODAL */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => {
          setShowConvertModal(false);
          setEnquiryToConvert(null);
        }}
        title="Convert Lead to Active Enrolled Student"
        size="lg"
      >
        {enquiryToConvert && (
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <FiUserPlus className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-900 text-sm">Convert Lead & Create Student Profile</p>
                <p className="text-emerald-700 mt-0.5">
                  This action will generate a permanent Student ID, create login credentials, email the student their welcome package, and enroll them into the course curriculum.
                </p>
              </div>
            </div>

            {/* Applicant Profile Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Applicant Name:</span>
                <span className="font-bold text-slate-800 ml-1.5">{enquiryToConvert.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Mobile:</span>
                <span className="font-bold text-slate-800 ml-1.5">{enquiryToConvert.mobile}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-bold text-slate-800 ml-1.5">{enquiryToConvert.email}</span>
              </div>
            </div>

            <FormGrid cols={2}>
              <FormField label="First Name" required>
                <TextField
                  value={convertForm.firstName}
                  onChange={(e) => setConvertForm({ ...convertForm, firstName: e.target.value })}
                  placeholder="First Name"
                  required
                />
              </FormField>

              <FormField label="Last Name">
                <TextField
                  value={convertForm.lastName}
                  onChange={(e) => setConvertForm({ ...convertForm, lastName: e.target.value })}
                  placeholder="Last Name"
                />
              </FormField>
            </FormGrid>

            <FormGrid cols={2}>
              <FormField label="Target Course for Enrollment" required>
                <SelectField
                  value={convertForm.courseId}
                  onChange={(e) => setConvertForm({ ...convertForm, courseId: e.target.value })}
                  required
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title} {c.courseCode ? `(${c.courseCode})` : ''}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              {user?.role === 'super_admin' ? (
                <FormField label="Assign School / Center">
                  <SelectField
                    value={convertForm.franchiseId}
                    onChange={(e) => setConvertForm({ ...convertForm, franchiseId: e.target.value })}
                  >
                    <option value="">Head Office / Main Branch</option>
                    {franchises.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} {f.code ? `(${f.code})` : ''}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              ) : (
                <FormField label="Gender">
                  <SelectField
                    value={convertForm.gender}
                    onChange={(e) => setConvertForm({ ...convertForm, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </SelectField>
                </FormField>
              )}
            </FormGrid>

            <FormGrid cols={2}>
              <FormField label="Father / Guardian Name">
                <TextField
                  value={convertForm.fatherName}
                  onChange={(e) => setConvertForm({ ...convertForm, fatherName: e.target.value })}
                  placeholder="Father / Guardian Name"
                />
              </FormField>

              <FormField label="Date of Birth">
                <TextField
                  type="date"
                  value={convertForm.dateOfBirth}
                  onChange={(e) => setConvertForm({ ...convertForm, dateOfBirth: e.target.value })}
                />
              </FormField>
            </FormGrid>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowConvertModal(false);
                  setEnquiryToConvert(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={FiCheckCircle}
                loading={submittingConvert}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Confirm & Enroll as Student
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* LOG NEW LEAD / ENQUIRY MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Log New CRM Lead / Enquiry"
        size="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <FormGrid cols={2}>
            <FormField label="Prospect Full Name" required>
              <TextField
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                required
              />
            </FormField>

            <FormField label="Mobile Phone" required>
              <TextField
                type="tel"
                value={addForm.mobile}
                onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })}
                placeholder="e.g. 9876543210"
                required
              />
            </FormField>
          </FormGrid>

          <FormGrid cols={2}>
            <FormField label="Email Address" required>
              <TextField
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="e.g. rahul@example.com"
                required
              />
            </FormField>

            <FormField label="Lead Source">
              <SelectField
                value={addForm.source}
                onChange={(e) => setAddForm({ ...addForm, source: e.target.value })}
              >
                <option value="walk_in">Walk-in Inquiry</option>
                <option value="phone">Direct Phone Call</option>
                <option value="website">Website Inquiry</option>
                <option value="social_media">Social Media (FB/IG/WhatsApp)</option>
                <option value="referral">Student Referral</option>
                <option value="other">Other</option>
              </SelectField>
            </FormField>
          </FormGrid>

          <FormGrid cols={2}>
            <FormField label="Target Course">
              <SelectField
                value={addForm.course}
                onChange={(e) => setAddForm({ ...addForm, course: e.target.value })}
              >
                <option value="">-- General / No Specific Course --</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="Lead Priority">
              <SelectField
                value={addForm.priority}
                onChange={(e) => setAddForm({ ...addForm, priority: e.target.value })}
              >
                <option value="high">High (Urgent Callback)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="low">Low (General Query)</option>
              </SelectField>
            </FormField>
          </FormGrid>

          <FormGrid cols={2}>
            <FormField label="City">
              <TextField
                value={addForm.city}
                onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                placeholder="e.g. Raipur"
              />
            </FormField>

            <FormField label="State">
              <TextField
                value={addForm.state}
                onChange={(e) => setAddForm({ ...addForm, state: e.target.value })}
                placeholder="e.g. Chhattisgarh"
              />
            </FormField>
          </FormGrid>

          {user?.role === 'super_admin' && (
            <FormField label="School Branch">
              <SelectField
                value={addForm.franchise}
                onChange={(e) => setAddForm({ ...addForm, franchise: e.target.value })}
              >
                <option value="">Main Office / Head Office</option>
                {franchises.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} {f.code ? `(${f.code})` : ''}
                  </option>
                ))}
              </SelectField>
            </FormField>
          )}

          <FormField label="Inquiry Message / Counselor Remarks">
            <TextArea
              rows={3}
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              placeholder="Requirement details, timing preference, background..."
            />
          </FormField>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={FiPlus}
              loading={submittingAdd}
            >
              Log Lead
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default ManageEnquiries;
