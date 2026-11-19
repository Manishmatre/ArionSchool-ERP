import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { FiPlus, FiEdit2, FiTrash2, FiLayers } from 'react-icons/fi';
import { getAllPrograms, createProgram, updateProgram, deleteProgram, checkProgramDependencies } from '../../api/programApi';
import {
  PageLoading, Button, Modal, TextField, TextArea,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  Badge, IconButton,
} from '../../components/ui';

const ManagePrograms = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [currentProgram, setCurrentProgram] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [associatedItems, setAssociatedItems] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    icon: 'FiBook',
    color: '#3B82F6',
    order: 0,
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const data = await getAllPrograms();
      setPrograms(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch programs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateProgram(currentProgram._id, formData);
        toast.success('Program updated successfully');
      } else {
        await createProgram(formData);
        toast.success('Program created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchPrograms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (program) => {
    setEditMode(true);
    setCurrentProgram(program);
    setFormData({
      name: program.name,
      code: program.code,
      description: program.description,
      icon: program.icon || 'FiBook',
      color: program.color || '#3B82F6',
      order: program.order || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (program) => {
    setProgramToDelete(program);
    setShowDeleteModal(true);
    try {
      const response = await checkProgramDependencies(program._id);
      if (response.hasAssociated) {
        setAssociatedItems(response.associatedItems);
      } else {
        setAssociatedItems([]);
      }
    } catch (error) {
      console.error('Error checking dependencies:', error);
      setAssociatedItems([]);
    }
  };

  const confirmDelete = async (deleteAssociated) => {
    if (!programToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteProgram(programToDelete._id, deleteAssociated);
      toast.success(
        deleteAssociated
          ? 'Program and all associated items deleted successfully'
          : 'Program deleted successfully'
      );
      fetchPrograms();
      setShowDeleteModal(false);
      setProgramToDelete(null);
      setAssociatedItems([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete program');
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '', icon: 'FiBook', color: '#3B82F6', order: 0 });
    setEditMode(false);
    setCurrentProgram(null);
  };

  const totalPages = Math.ceil(programs.length / itemsPerPage);
  const paginated = programs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const addProgramAction = (
    <Button icon={FiPlus} onClick={() => { resetForm(); setShowModal(true); }}>
      Add Program
    </Button>
  );

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Programs" subtitle="Manage course categories" icon={FiLayers} actions={addProgramAction} />
        <PageLoading message="Loading programs..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Programs"
          subtitle="Manage course categories"
          icon={FiLayers}
          actions={addProgramAction}
        />

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Program</TableHeader>
                <TableHeader>Code</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Courses</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableEmpty colSpan={6} title="No programs found" description="Create your first program to get started." />
              ) : (
                paginated.map((program) => (
                  <TableRow key={program._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: program.color }}
                        >
                          <FiLayers />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{program.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">{program.code}</span></TableCell>
                    <TableCell className="!whitespace-normal max-w-xs"><span className="text-slate-600 line-clamp-2">{program.description}</span></TableCell>
                    <TableCell><Badge variant="primary">{program.courseCount || 0} Courses</Badge></TableCell>
                    <TableCell><Badge variant={program.isActive ? 'success' : 'danger'}>{program.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <IconButton icon={FiEdit2} variant="primary" title="Edit" onClick={() => handleEdit(program)} />
                        <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(program)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {programs.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={programs.length}
            />
          )}
        </TableWrapper>
      </div>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editMode ? 'Edit Program' : 'Add Program'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" form="program-form">{editMode ? 'Update' : 'Create'}</Button>
          </>
        }
      >
        <form id="program-form" onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Program Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            label="Program Code"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          />
          <TextArea
            label="Description"
            required
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-11 border border-slate-200 rounded-xl cursor-pointer"
              />
            </div>
            <TextField
              label="Order"
              type="number"
              min="0"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
            />
          </div>
        </form>
      </Modal>

      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setProgramToDelete(null);
          setAssociatedItems([]);
        }}
        onConfirm={confirmDelete}
        itemType="program"
        itemName={programToDelete?.name || ''}
        associatedItems={associatedItems}
        loading={deleteLoading}
      />
    </Layout>
  );
};

export default ManagePrograms;
