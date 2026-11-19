import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiBook, FiEye, FiCopy, FiFileText, FiCheckCircle, FiXCircle, FiUser } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import Pagination from '../../components/Pagination';
import { Button, PageLoading, EmptyState, StatCard, Modal, SelectField, TextField, FormField } from '../../components/ui';
import { checkCourseDependencies, deleteCourse } from '../../api/courseApi';
import api from '../../api/axios';
import { toAbsoluteUrl } from '../../utils/url';

const Courses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestData, setRequestData] = useState({ course: '', requestedSeats: 1 });
  const [isAllocationModalOpen, setAllocationModalOpen] = useState(false);
  const [allocationData, setAllocationData] = useState({ courseId: null, courseTitle: '', franchiseId: '', seats: 0 });
  const [franchises, setFranchises] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [associatedItems, setAssociatedItems] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (isAllocationModalOpen) {
      fetchFranchises();
    }
  }, [isAllocationModalOpen]);

  const fetchCourses = async () => {
    try {
      const url = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/courses/franchise' : '/courses';
      const response = await api.get(url);
      console.log('Courses response:', response.data);
      const coursesData = response.data.courses || response.data.data;
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      console.error('Error response:', error.response?.data);
            console.error('Error message:', error.message);
      toast.error(`Failed to fetch courses: ${error.response?.data?.message || error.message}`);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFranchises = async () => {
    try {
      const response = await api.get('/campuses');
      setFranchises(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch school campuses.');
    }
  };

  const handleAllocateSeats = async (e) => {
    e.preventDefault();
    const { courseId, franchiseId, seats } = allocationData;
    if (!franchiseId || seats < 0) {
      toast.error('Please select a school campus and enter a valid capacity.');
      return;
    }

    try {
      await api.post(`/courses/${courseId}/allocate-seats`, { franchiseId, seats });
      toast.success('Seats allocated successfully!');
      setAllocationModalOpen(false);
      fetchCourses(); // Re-fetch to show updated seat counts if applicable
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to allocate seats.');
    }
  };

  const handleRequestSeats = async (e) => {
    e.preventDefault();
    if (!requestData.course || requestData.requestedSeats < 1) {
      toast.error('Please select a course and enter a valid number of seats.');
      return;
    }

    try {
      await api.post('/seat-requests', requestData);
      toast.success('Seat request submitted successfully!');
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request.');
    }
  };

  const handleDelete = async (course) => {
    setCourseToDelete(course);
    setShowDeleteModal(true);
    
    // Check for associated items
    try {
      const response = await checkCourseDependencies(course._id);
      console.log('Course dependencies response:', response); // Debug log
      if (response.hasAssociated) {
        setAssociatedItems(response.associatedItems);
      } else {
        setAssociatedItems([]);
      }
    } catch (error) {
      console.error('Error checking course dependencies:', error); // Debug log
      // If there's an error, show the modal anyway for simple deletion
      setAssociatedItems([]);
    }
  };

  const confirmDelete = async (deleteAssociated) => {
    if (!courseToDelete) return;
    
    try {
      setDeleteLoading(true);
      await deleteCourse(courseToDelete._id, deleteAssociated);
      toast.success(
        deleteAssociated 
          ? 'Course and all associated items deleted successfully'
          : 'Course deleted successfully'
      );
      fetchCourses();
      setShowDeleteModal(false);
      setCourseToDelete(null);
      setAssociatedItems([]);
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Manage Courses"
          subtitle="Create and manage your courses and subjects"
          icon={FiBook}
          actions={
            ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? (
              <Button variant="success" icon={FiPlus} onClick={() => setIsModalOpen(true)}>Request Seats</Button>
            ) : (
              <Button icon={FiPlus} onClick={() => navigate('/admin/courses/add')}>Add Course</Button>
            )
          }
        />

        {!loading && courses.length > 0 && (
          <StatCard title="Total Courses" tone="primary" icon={FiBook} value={courses.length} />
        )}

        <div className="card card-pad">
          {loading ? (
            <PageLoading message="Loading courses..." />
          ) : courses.length === 0 ? (
            <EmptyState
              icon={FiBook}
              title="No courses yet"
              description="Create your first course to get started."
              action={!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && (
                <Button icon={FiPlus} onClick={() => navigate('/admin/courses/add')}>Add Course</Button>
              )}
            />
          ) : (
            <>
              <div className="card overflow-hidden -mx-1 sm:mx-0">
                <div className="overflow-x-auto">
                <table className="data-table min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Trainer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? 'Enrolled' : 'Students'}
                    </th>
                    {['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Seat Availability
                        </th>
                      </>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Modules
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {courses
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((course) => (
                    <tr key={course._id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {course.thumbnail && (
                            <img 
                              src={toAbsoluteUrl(course.thumbnail)}
                              alt={course.title} 
                              className="w-12 h-12 rounded object-cover mr-3"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <button
                              onClick={() => navigate(`/${['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? 'franchise_admin' : 'admin'}/courses/${course._id}`)}
                              className="text-sm font-medium text-primary-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              {course.title}
                            </button>
                            <div className="text-xs text-slate-500 truncate max-w-xs">
                              {course.shortDescription || course.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-800">
                          {course.courseCode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {course.program?.name || course.category || 'General'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiUser className="text-slate-400 mr-1" size={14} />
                          <div className="text-sm text-slate-900">
                            {course.primaryTrainer?.personalInfo?.firstName || 'Not Assigned'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {course.durationValue} {course.durationType || 'months'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {course.totalHours || 0}hrs
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {course.discountedFee > 0 && course.discountedFee < (course.regularFee || course.price || 0) ? (
                          <>
                            <div className="text-sm font-medium text-green-600">
                              ₹{course.discountedFee.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500 line-through">
                              ₹{(course.regularFee || course.price || 0).toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm font-medium text-slate-900">
                            ₹{course.regularFee?.toLocaleString() || course.price?.toLocaleString() || '0'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiUsers className="text-purple-500 mr-1" size={14} />
                          <span className="text-sm font-medium text-slate-900">
                            {['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? (course.filledSeats || 0) : (course.totalEnrolled || 0)}
                          </span>
                        </div>
                      </td>
                      {['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full inline-block">
                              Seats: {course.filledSeats || 0}/{course.allocatedSeats || 0}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiBook className="text-blue-500 mr-1" size={14} />
                          <span className="text-sm font-medium text-slate-900">
                            {course.curriculum?.length || 0}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {course.curriculum?.reduce((acc, mod) => acc + (mod.topics?.length || 0), 0) || 0} topics
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          course.skillLevel === 'Beginner' ? 'bg-green-100 text-green-800' :
                          course.skillLevel === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          course.skillLevel === 'Advanced' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {course.skillLevel || course.level || 'All'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {course.isActive ? (
                          <span className="flex items-center text-green-600">
                            <FiCheckCircle className="mr-1" size={16} />
                            <span className="text-xs font-semibold">Active</span>
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <FiXCircle className="mr-1" size={16} />
                            <span className="text-xs font-semibold">Inactive</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/${['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? 'franchise_admin' : 'admin'}/courses/${course._id}`)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="View Details"
                          >
                            <FiEye size={18} />
                          </button>
                          {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && (
                            <>
                              <button
                                onClick={() => navigate(`/admin/courses/${course._id}?edit=true`)}
                                className="p-2 text-primary-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Course"
                              >
                                <FiEdit2 size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  setAllocationData({ courseId: course._id, courseTitle: course.title, franchiseId: '', seats: 0 });
                                  setAllocationModalOpen(true);
                                }}
                                className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                title="Allocate Seats"
                              >
                                <FiUser size={18} />
                              </button>
                              <button
                                onClick={() => navigate(`/admin/courses/${course._id}?courseTab=syllabus`)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                title="Manage Syllabus"
                              >
                                <FiFileText size={18} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(course._id);
                              toast.success('Course ID copied!');
                            }}
                            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                            title="Copy Course ID"
                          >
                            <FiCopy size={18} />
                          </button>
                          {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && (
                            <button
                              onClick={() => handleDelete(course)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Course"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
                </div>
              </div>

              {/* Pagination */}
              {courses.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(courses.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={courses.length}
                  onItemsPerPageChange={setItemsPerPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request More Seats"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="request-seats-form">Submit Request</Button>
          </>
        }
      >
        <form id="request-seats-form" onSubmit={handleRequestSeats} className="space-y-4">
          <FormField label="Course" required>
            <SelectField
              value={requestData.course}
              onChange={(e) => setRequestData({ ...requestData, course: e.target.value })}
              required
            >
              <option value="">Select a course</option>
              {courses.map((course) => {
                const allocated = course.allocatedSeats || 0;
                const filled = course.filledSeats || 0;
                const available = allocated - filled;
                return (
                  <option key={course._id} value={course._id}>
                    {course.title} (Available: {available} / Allocated: {allocated})
                  </option>
                );
              })}
            </SelectField>
          </FormField>
          <TextField
            label="Number of Seats"
            type="number"
            min="1"
            value={requestData.requestedSeats}
            onChange={(e) => setRequestData({ ...requestData, requestedSeats: parseInt(e.target.value, 10) })}
            required
          />
        </form>
      </Modal>

      <Modal
        open={isAllocationModalOpen}
        onClose={() => setAllocationModalOpen(false)}
        title="Allocate Seats"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setAllocationModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="allocate-seats-form">Allocate</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 mb-4">
          Course: <span className="font-semibold text-slate-900">{allocationData.courseTitle}</span>
        </p>
        <form id="allocate-seats-form" onSubmit={handleAllocateSeats} className="space-y-4">
          <FormField label="School Campus" required>
            <SelectField
              value={allocationData.franchiseId}
              onChange={(e) => setAllocationData({ ...allocationData, franchiseId: e.target.value })}
              required
            >
              <option value="">Select a campus</option>
              {franchises.map((franchise) => (
                <option key={franchise._id} value={franchise._id}>{franchise.name}</option>
              ))}
            </SelectField>
          </FormField>
          <TextField
            label="Number of Seats"
            type="number"
            min="0"
            value={allocationData.seats}
            onChange={(e) => setAllocationData({ ...allocationData, seats: parseInt(e.target.value, 10) })}
            required
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCourseToDelete(null);
          setAssociatedItems([]);
        }}
        onConfirm={confirmDelete}
        itemType="course"
        itemName={courseToDelete?.title || ''}
        associatedItems={associatedItems}
        loading={deleteLoading}
      />
    </Layout>
  );
};

export default Courses;
