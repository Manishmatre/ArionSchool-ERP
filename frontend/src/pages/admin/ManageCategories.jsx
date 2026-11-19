import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiBook, FiFolder } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import api from '../../api/axios';
import {
  PageLoading, Button, Modal, Card, TextField, TextArea, Badge,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty, IconButton,
} from '../../components/ui';

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '', color: '#3B82F6' });

  const [categoryStats, setCategoryStats] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/courses/categories');
      const nextCategories = response.data.data || [];
      const stats = Object.fromEntries(nextCategories.map((category) => [category.name, category.courseCount || 0]));
      setCategoryStats(stats);
      setCategories(nextCategories);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load course categories.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, name: formData.name.trim() };
      if (editingCategory) {
        await api.put(`/courses/categories/${editingCategory._id}`, payload);
        toast.success('Course category updated.');
      } else {
        await api.post('/courses/categories', payload);
        toast.success('Course category created.');
      }
      setShowModal(false);
      resetForm();
      await fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the course category.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description, icon: category.icon, color: category.color });
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    const courseCount = categoryStats[category.name] || 0;
    if (courseCount > 0) {
      toast.error(`Reassign the ${courseCount} course(s) in ${category.name} before deleting it.`);
      return;
    }
    if (!window.confirm(`Delete the ${category.name} category?`)) return;
    try {
      await api.delete(`/courses/categories/${category._id}`);
      toast.success('Course category deleted.');
      await fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the course category.');
      await fetchCategories();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', icon: '', color: '#3B82F6' });
    setEditingCategory(null);
  };

  const totalPages = Math.ceil(categories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCategories = categories.slice(startIndex, startIndex + itemsPerPage);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Course Categories" subtitle="Manage course categories and organization" icon={FiFolder} />
        <PageLoading message="Loading categories..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Course Categories"
          subtitle="Manage course categories and organization"
          icon={FiFolder}
          actions={<Button icon={FiPlus} onClick={() => { resetForm(); setShowModal(true); }}>Add Category</Button>}
        />

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Category</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader className="text-center">Courses</TableHeader>
                <TableHeader className="text-center">Status</TableHeader>
                <TableHeader className="text-center">Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginatedCategories.length === 0 ? <TableEmpty colSpan={5} title="No course categories yet" description="Add a category to organize course records." /> : paginatedCategories.map((category) => {
                const courseCount = categoryStats[category.name] || 0;
                return (
                  <TableRow key={category.name}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          {category.icon}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="!whitespace-normal max-w-xs"><span className="text-slate-600">{category.description}</span></TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                        <FiBook className="text-slate-400" /> {courseCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={courseCount > 0 ? 'success' : 'neutral'}>{courseCount > 0 ? 'Active' : 'Empty'}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <IconButton icon={FiEdit2} variant="primary" title="Edit Category" onClick={() => handleEdit(category)} />
                        <IconButton
                          icon={FiTrash2}
                          variant="danger"
                          title={courseCount > 0 ? 'Cannot delete - has courses' : 'Delete Category'}
                          disabled={courseCount > 0}
                          onClick={() => handleDelete(category)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={categories.length}
            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
          />
        </TableWrapper>

        <Card className="card-pad">
          <h2 className="section-title mb-4">Category Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((category) => {
              const count = categoryStats[category.name] || 0;
              const total = Object.values(categoryStats).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={category.name} className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="text-xs text-slate-500">{category.name}</div>
                  <div className="text-xs text-primary-600 font-medium mt-1">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" form="category-form" disabled={saving}>{saving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}</Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <TextField
              label="Category Name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <TextArea label="Description" name="description" required rows={3} value={formData.description} onChange={handleChange} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Icon (Emoji)" name="icon" value={formData.icon} onChange={handleChange} placeholder="🔬" maxLength="2" className="[&_input]:text-2xl [&_input]:text-center" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
              <input type="color" name="color" value={formData.color} onChange={handleChange} className="w-full h-11 border border-slate-200 rounded-xl cursor-pointer" />
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-600 mb-2">Preview:</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${formData.color}20` }}>
                {formData.icon || '📚'}
              </div>
              <div>
                <div className="font-bold text-slate-800">{formData.name || 'Category Name'}</div>
                <div className="text-sm text-slate-500">{formData.description || 'Description'}</div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default ManageCategories;
