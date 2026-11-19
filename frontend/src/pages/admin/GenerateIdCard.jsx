import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiArrowLeft, FiCreditCard } from 'react-icons/fi';
import { getAllStudents } from '../../api/studentApi';
import { getAllFranchises } from '../../api/campusApi';
import { getIdCardTemplates, generateIdCard } from '../../api/idCardApi';
import CustomFieldsForm from '../../components/template-editor/CustomFieldsForm';
import { getCustomTextFields } from '../../components/template-editor/templateFieldUtils';
import { useAuth } from '../../context/AuthContext';
import {
  Button, PageLoading, FormPageLayout, FormSection, FormGrid, FormField, SelectField, TextField,
} from '../../components/ui';

const GenerateIdCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [franchiseFilter, setFranchiseFilter] = useState('');

  const [formData, setFormData] = useState({
    studentId: '',
    templateId: '',
  });
  const [customFieldValues, setCustomFieldValues] = useState({});

  const fetchStudents = useCallback(async (search = '', franchise = '') => {
    setStudentsLoading(true);
    try {
      const params = { picker: true, limit: 50, search };
      if (user.role === 'super_admin' && franchise) {
        params.franchise = franchise;
      }
      const res = await getAllStudents(params);
      setStudents(res.data || []);
    } catch (error) {
      toast.error('Failed to search students');
      console.error(error);
    } finally {
      setStudentsLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setInitialLoading(true);
        if (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role)) {
          const [templatesRes] = await Promise.all([
            getIdCardTemplates(),
            fetchStudents('', '')
          ]);
          setTemplates(templatesRes.data || []);
        } else {
          const [templatesRes, franchisesRes] = await Promise.all([
            getIdCardTemplates(),
            getAllFranchises(),
            fetchStudents('', '')
          ]);
          setTemplates(templatesRes.data || []);
          setFranchises(franchisesRes.data || []);
        }
      } catch (error) {
        toast.error('Failed to fetch data');
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitial();
  }, [user.role, fetchStudents]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents(searchTerm, franchiseFilter);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, franchiseFilter, fetchStudents]);

  useEffect(() => {
    setCustomFieldValues({});
  }, [formData.templateId]);

  const selectedTemplate = templates.find((t) => t._id === formData.templateId);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.templateId) {
      toast.error('Please select a student and a template');
      return;
    }

    const customFields = getCustomTextFields(selectedTemplate?.fields);
    for (let i = 0; i < customFields.length; i += 1) {
      const field = customFields[i];
      if (!customFieldValues[field.fieldName]?.trim()) {
        const label = customFields.length > 1 ? `custom text field ${i + 1}` : 'value to print';
        toast.error(`Please enter ${label}`);
        return;
      }
    }

    setGenerating(true);
    try {
      await generateIdCard(formData.studentId, formData.templateId, customFieldValues);
      toast.success('ID Card generated successfully!');
      navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school/id-cards' : '/admin/id-cards');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate ID card');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const backTo = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school/id-cards' : '/admin/id-cards';

  if (initialLoading) {
    return (
      <Layout>
        <PageHeader title="Generate Student ID Card" subtitle="Create a new ID card for a student" icon={FiCreditCard} />
        <PageLoading message="Loading templates and students..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Generate Student ID Card"
        subtitle="Create a new ID card for a student"
        icon={FiCreditCard}
        actions={(
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate(backTo)}>
            Back to Management
          </Button>
        )}
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={(
            <Button type="submit" loading={generating} disabled={generating}>
              {generating ? 'Generating...' : 'Generate ID Card'}
            </Button>
          )}
        >
          <FormSection title="ID Card Details" icon={FiCreditCard}>
            <FormGrid cols={3}>
              {user.role === 'super_admin' && (
                <SelectField
                  label="Filter by School Campus"
                  value={franchiseFilter}
                  onChange={(e) => setFranchiseFilter(e.target.value)}
                >
                  <option value="">All Campuses</option>
                  {franchises.map((franchise) => (
                    <option key={franchise._id} value={franchise._id}>{franchise.name}</option>
                  ))}
                </SelectField>
              )}
              <TextField
                label="Search Student"
                type="text"
                placeholder="Search by name or student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? 'md:col-span-2' : ''}
              />
              <FormField label="Student" required hint="Showing up to 50 students — use search to narrow results">
                <SelectField
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  required
                  disabled={studentsLoading}
                >
                  <option value="">
                    {studentsLoading ? 'Loading students...' : 'Select a Student'}
                  </option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.personalInfo.firstName} {student.personalInfo.lastName} ({student.studentId})
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </FormGrid>

            <SelectField
              label="Template *"
              name="templateId"
              value={formData.templateId}
              onChange={handleInputChange}
              required
              className="mt-4"
            >
              <option value="">Select a Template</option>
              <option value="default">⭐ Official Default ID Card Template (Standard Dual Front &amp; Back)</option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </SelectField>

            <div className="mt-4">
              <CustomFieldsForm
                template={selectedTemplate}
                values={customFieldValues}
                onChange={setCustomFieldValues}
              />
            </div>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default GenerateIdCard;
