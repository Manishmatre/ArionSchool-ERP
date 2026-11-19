import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import Pagination from '../../components/Pagination';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiPlus, FiBook } from 'react-icons/fi';
import {
  PageLoading, FilterBar, FilterBarActions, SelectField, TextField, TextArea,
  Button, IconButton, Badge, Card, EmptyState, Modal,
  FormField,
} from '../../components/ui';

const ManageChapters = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get('course');
  
  const [chapters, setChapters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(courseIdFromUrl || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState(null);
  const [associatedItems, setAssociatedItems] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: courseIdFromUrl || '',
    order: 1,
  });

  useEffect(() => {
    fetchChapters();
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch courses');
    }
  };

  const fetchChapters = async () => {
    try {
      const url = selectedCourse ? `/chapters?course=${selectedCourse}` : '/chapters';
      const response = await api.get(url);
      setChapters(response.data.chapters);
    } catch (error) {
      toast.error('Failed to fetch chapters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, [selectedCourse]);

  const handleEdit = (chapter) => {
    setEditingChapter(chapter);
    setFormData({
      title: chapter.title,
      description: chapter.description,
      course: chapter.course?._id || chapter.course || '',
      order: chapter.order,
    });
    setShowModal(true);
  };

  const handleDelete = async (chapter) => {
    setChapterToDelete(chapter);
    setShowDeleteModal(true);
    
    // Check for associated items
    try {
      const response = await api.get(`/chapters/${chapter._id}/check-dependencies`);
      console.log('Chapter dependencies response:', response); // Debug log
      if (response.data.hasAssociated) {
        setAssociatedItems(response.data.associatedItems);
      } else {
        setAssociatedItems([]);
      }
    } catch (error) {
      console.error('Error checking chapter dependencies:', error); // Debug log
      // If there's an error, show the modal anyway for simple deletion
      setAssociatedItems([]);
    }
  };

  const confirmDelete = async (deleteAssociated) => {
    if (!chapterToDelete) return;
    
    try {
      setDeleteLoading(true);
      await api.delete(`/chapters/${chapterToDelete._id}`, {
        data: { deleteAssociated }
      });
      toast.success(
        deleteAssociated 
          ? 'Chapter and all associated items deleted successfully'
          : 'Chapter deleted successfully'
      );
      fetchChapters();
      setShowDeleteModal(false);
      setChapterToDelete(null);
      setAssociatedItems([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete chapter');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingChapter) {
        await api.put(`/chapters/${editingChapter._id}`, formData);
        toast.success('Chapter updated successfully');
      } else {
        await api.post('/chapters', formData);
        toast.success('Chapter created successfully');
      }
      setShowModal(false);
      setEditingChapter(null);
      setFormData({ title: '', description: '', order: 1 });
      fetchChapters();
    } catch (error) {
      toast.error('Failed to save chapter');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingChapter(null);
    setFormData({ title: '', description: '', order: 1 });
  };

  // Pagination logic
  const totalPages = Math.ceil(chapters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChapters = chapters.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Manage Chapters" subtitle="Create and manage course chapters" icon={FiBook} />
        <PageLoading message="Loading chapters..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader 
          title="Manage Chapters" 
          subtitle="Create and manage course chapters" 
          icon={FiBook}
          actions={(
            <Button icon={FiPlus} onClick={() => setShowModal(true)}>Add Chapter</Button>
          )}
        />

        <FilterBar>
          <SelectField
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="flex-1 min-w-[200px] max-w-sm"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>{course.title}</option>
            ))}
          </SelectField>
          {selectedCourse && (
            <FilterBarActions>
              <Button variant="ghost" onClick={() => setSelectedCourse('')}>Clear Filter</Button>
            </FilterBarActions>
          )}
        </FilterBar>

        {paginatedChapters.length === 0 ? (
          <Card>
            <EmptyState icon={FiBook} title="No chapters found" description="Add a new chapter or adjust your course filter." />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedChapters.map((chapter) => (
                <Card key={chapter._id} hover className="flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <Badge variant="primary">Order: {chapter.order}</Badge>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <IconButton icon={FiEdit2} variant="primary" title="Edit" onClick={() => handleEdit(chapter)} />
                      <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(chapter)} />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1.5">{chapter.title}</h3>
                  <p className="text-sm text-slate-600 mb-3 flex-1">{chapter.description}</p>
                  {chapter.course && (
                    <p className="text-xs text-primary-600 mb-2">
                      Course: {chapter.course.title || chapter.course}
                    </p>
                  )}
                  <div className="text-xs text-slate-500 mb-4">
                    Created: {new Date(chapter.createdAt).toLocaleDateString()}
                  </div>
                  <Button
                    variant="secondary"
                    icon={FiBook}
                    className="w-full justify-center"
                    onClick={() => navigate(`/admin/topics?chapter=${chapter._id}`)}
                  >
                    View Topics
                  </Button>
                </Card>
              ))}
            </div>

            <Card padded={false} className="overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                totalItems={chapters.length}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </Card>
          </>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingChapter ? 'Edit Chapter' : 'Add Chapter'}
        size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="chapter-form">{editingChapter ? 'Update' : 'Create'}</Button>
          </>
        )}
      >
        <form id="chapter-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Course" required>
            <SelectField
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              required
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>{course.title}</option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="Title" required>
            <TextField
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Description" required>
            <TextArea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </FormField>
          <FormField label="Order" required>
            <TextField
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              min="1"
              required
            />
          </FormField>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setChapterToDelete(null);
          setAssociatedItems([]);
        }}
        onConfirm={confirmDelete}
        itemType="chapter"
        itemName={chapterToDelete?.title}
        associatedItems={associatedItems}
        loading={deleteLoading}
      />
    </Layout>
  );
};

export default ManageChapters;
