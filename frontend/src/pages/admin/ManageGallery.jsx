import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { FiPlus, FiTrash2, FiImage, FiEdit2, FiEye } from 'react-icons/fi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, Modal, TextField, TextArea, EmptyState, Badge,
} from '../../components/ui';
import {
  getAllImages,
  deleteImage,
  toggleImageStatus,
  getGalleryStats,
  uploadImage,
  updateImage,
} from '../../api/galleryApi';
import { toAbsoluteUrl } from '../../utils/url';

const CATEGORIES = ['students', 'franchises', 'events', 'classrooms', 'achievements', 'other'];

const emptyForm = {
  title: '',
  description: '',
  category: 'events',
  tags: '',
};

const ManageGallery = () => {
  const [images, setImages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form modal (shared for create + edit)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Preview lightbox
  const [previewImage, setPreviewImage] = useState(null);

  const isEditing = Boolean(editingImage);

  useEffect(() => {
    fetchImages();
    fetchStats();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const data = await getAllImages();
      setImages(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch images');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getGalleryStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      await deleteImage(id);
      toast.success('Image deleted successfully');
      fetchImages();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete image');
      console.error(error);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleImageStatus(id);
      toast.success('Image status updated');
      fetchImages();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const resetFileInput = () => {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
  };

  const handleOpenCreate = () => {
    setEditingImage(null);
    setForm(emptyForm);
    resetFileInput();
    setShowFormModal(true);
  };

  const handleOpenEdit = (image) => {
    setEditingImage(image);
    setForm({
      title: image.title || '',
      description: image.description || '',
      category: image.category || 'events',
      tags: Array.isArray(image.tags) ? image.tags.join(', ') : image.tags || '',
    });
    resetFileInput();
    setShowFormModal(true);
  };

  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingImage(null);
    resetFileInput();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(selected);
    setFilePreview(selected ? URL.createObjectURL(selected) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditing && !file) {
      toast.error('Please select an image');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('tags', form.tags || '');
      if (file) {
        formData.append('image', file);
      }

      if (isEditing) {
        await updateImage(editingImage._id, formData);
        toast.success('Image updated successfully');
      } else {
        await uploadImage(formData);
        toast.success('Image uploaded successfully');
      }

      handleCloseForm();
      fetchImages();
      fetchStats();
    } catch (error) {
      toast.error(error?.response?.data?.message || `Failed to ${isEditing ? 'update' : 'upload'} image`);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const filteredImages = images.filter((image) => {
    const matchesSearch =
      image.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (image.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || image.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedImages = filteredImages.slice(startIndex, endIndex);

  const handlePageChange = (page) => setCurrentPage(page);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Manage Gallery" subtitle="Upload, edit and manage gallery images" icon={FiImage} />
        <PageLoading message="Loading gallery..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Manage Gallery"
          subtitle="Upload, edit and manage gallery images"
          icon={FiImage}
          actions={<Button icon={FiPlus} onClick={handleOpenCreate}>Upload Image</Button>}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Images" tone="info" icon={FiImage} value={stats?.total || 0} />
          <StatCard title="Active" tone="success" icon={FiImage} value={stats?.active || 0} />
          <StatCard title="Inactive" tone="danger" icon={FiImage} value={stats?.inactive || 0} />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title or tag..."
          />
          <FilterBarActions>
            <SelectField value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="min-w-[160px]">
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </SelectField>
          </FilterBarActions>
        </FilterBar>

        <Modal
          open={showFormModal}
          onClose={handleCloseForm}
          title={isEditing ? 'Edit Gallery Image' : 'Upload Gallery Image'}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={handleCloseForm} disabled={saving}>Cancel</Button>
              <Button type="submit" form="gallery-form" loading={saving} disabled={saving}>
                {isEditing ? 'Save Changes' : 'Upload'}
              </Button>
            </>
          }
        >
          <form id="gallery-form" onSubmit={handleSubmit} className="space-y-4">
            <TextField label="Title *" name="title" value={form.title} onChange={handleFormChange} required />
            <SelectField label="Category *" name="category" value={form.category} onChange={handleFormChange} required>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </SelectField>
            <TextArea label="Description" name="description" value={form.description} onChange={handleFormChange} />
            <TextField label="Tags (comma separated)" name="tags" value={form.tags} onChange={handleFormChange} placeholder="e.g. event,2026" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Image {isEditing ? '(leave empty to keep current)' : '*'}
              </label>
              <input type="file" accept="image/*" onChange={handleFileChange} required={!isEditing} className="w-full text-sm" />
              {(filePreview || (isEditing && editingImage?.imageUrl)) && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1">{filePreview ? 'New image preview' : 'Current image'}</p>
                  <img
                    src={filePreview || toAbsoluteUrl(editingImage.imageUrl)}
                    alt="Preview"
                    className="h-32 w-full object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}
            </div>
          </form>
        </Modal>

        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fadeIn"
            onClick={() => setPreviewImage(null)}
          >
            <div className="max-w-3xl w-full animate-scaleIn" onClick={(e) => e.stopPropagation()}>
              <img
                src={toAbsoluteUrl(previewImage.imageUrl)}
                alt={previewImage.title}
                className="w-full max-h-[70vh] object-contain rounded-t-2xl"
              />
              <div className="bg-white rounded-b-2xl p-5 border border-slate-200">
                <h3 className="font-semibold text-slate-900">{previewImage.title}</h3>
                <p className="text-sm text-slate-500 capitalize">{previewImage.category}</p>
                {previewImage.description && <p className="text-sm text-slate-600 mt-2">{previewImage.description}</p>}
                {(previewImage.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {previewImage.tags.map((tag, i) => (
                      <Badge key={i} variant="neutral">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.length === 0 ? (
            <div className="col-span-full">
              <EmptyState icon={FiImage} title="No images found" description="Upload your first gallery image to get started." />
            </div>
          ) : (
            paginatedImages.map((image) => (
              <div key={image._id} className="card overflow-hidden card-hover flex flex-col">
                <div className="relative h-44 bg-slate-100 group">
                  <img
                    src={toAbsoluteUrl(image.imageUrl)}
                    alt={image.title}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setPreviewImage(image)}
                  />
                  {!image.isActive && (
                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center pointer-events-none">
                      <Badge variant="neutral">Inactive</Badge>
                    </div>
                  )}
                  <button
                    onClick={() => setPreviewImage(image)}
                    className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    title="Preview"
                    type="button"
                  >
                    <FiEye />
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-slate-800 mb-0.5 truncate">{image.title}</h3>
                  <p className="text-xs text-slate-500 mb-3 capitalize">{image.category}</p>
                  <div className="flex gap-2 mt-auto">
                    <Button variant="secondary" className="!px-2.5 !py-1.5" onClick={() => handleOpenEdit(image)} icon={FiEdit2} />
                    <Button
                      variant={image.isActive ? 'secondary' : 'success'}
                      className="flex-1 !py-1.5 !text-xs"
                      onClick={() => handleToggleStatus(image._id)}
                    >
                      {image.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="danger" className="!px-2.5 !py-1.5" onClick={() => handleDelete(image._id)} icon={FiTrash2} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={filteredImages.length}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
    </Layout>
  );
};

export default ManageGallery;
