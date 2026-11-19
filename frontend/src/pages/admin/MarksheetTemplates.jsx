import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { getMarksheetTemplates, deleteMarksheetTemplate } from '../../api/marksheetApi';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi';
import {
  PageLoading, Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  IconButton, Badge,
} from '../../components/ui';

const MarksheetTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await getMarksheetTemplates();
      setTemplates(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteMarksheetTemplate(id);
        toast.success('Template deleted successfully');
        fetchTemplates();
      } catch (error) {
        toast.error('Failed to delete template');
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Marksheet Templates" subtitle="Manage your marksheet templates" icon={FiFileText} />
        <PageLoading message="Loading templates..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Marksheet Templates"
          subtitle="Manage your marksheet templates"
          icon={FiFileText}
          actions={<Button icon={FiPlus} onClick={() => navigate('/admin/marksheet-templates/new')}>Add New Template</Button>}
        />

        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Name</TableHeader>
                <TableHeader>Course Type</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableEmpty colSpan={3} title="No templates found" description="Create your first marksheet template to get started." />
              ) : (
                templates.map((template) => (
                  <TableRow key={template._id}>
                    <TableCell><span className="text-sm font-medium text-slate-800">{template.name}</span></TableCell>
                    <TableCell><Badge variant="primary">{template.courseType || 'custom'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <IconButton icon={FiEdit2} variant="primary" title="Edit" onClick={() => navigate(`/admin/marksheet-templates/edit/${template._id}`)} />
                        <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(template._id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>
      </div>
    </Layout>
  );
};

export default MarksheetTemplates;
