import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import TemplateEditorPage from '../../components/template-editor/TemplateEditorPage';
import { STUDENT_CERTIFICATE_FIELDS, COMMON_PREVIEW } from '../../components/template-editor/fieldCatalogs';
import { sanitizeTemplateFields } from '../../components/template-editor/templateFieldUtils';
import {
  createStudentCertificateTemplate,
  updateStudentCertificateTemplate,
  getStudentCertificateTemplates
} from '../../api/studentCertificateApi';
import { getCourses } from '../../api/courseApi';
import { getTemplateAssets } from '../../api/templateAssetApi';
import { toast } from 'react-toastify';
import { FiArrowLeft } from 'react-icons/fi';
import { Button } from '../../components/ui';

const StudentCertificateTemplateForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [previewAssets, setPreviewAssets] = useState({});
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    courseType: '',
    templateImage: '',
    targetType: 'franchise',
    fields: []
  });

  useEffect(() => {
    getCourses().then((res) => setCourses(res.data || [])).catch(() => toast.error('Failed to load courses'));
    getTemplateAssets().then((res) => setPreviewAssets(Object.fromEntries((res.data?.data?.assets || []).filter((asset) => asset.url).map((asset) => [asset.key, asset.url])))).catch(() => {});
    if (isEditing) loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    try {
      const res = await getStudentCertificateTemplates();
      const template = (res.data || []).find((t) => t._id === id);
      if (!template) {
        toast.error('Template not found');
        navigate('/admin/student-certificates');
        return;
      }
      setTemplateData({
        name: template.name || '',
        description: template.description || '',
        courseType: template.courseType || '',
        targetType: template.targetType || 'franchise',
        templateImage: template.templateImage || '',
        fields: sanitizeTemplateFields(template.fields)
      });
    } catch {
      toast.error('Failed to load template');
    }
  };

  const handleSave = async (data) => {
    try {
      setLoading(true);
      if (isEditing) {
        await updateStudentCertificateTemplate(id, data);
        toast.success('Template updated successfully');
      } else {
        await createStudentCertificateTemplate(data);
        toast.success('Template created successfully');
      }
      navigate('/admin/student-certificates');
    } catch {
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const metaSection = (
            <>
              <div>
        <label className="block text-xs font-medium text-slate-600">Course Type *</label>
                      <select
                        value={templateData.courseType}
          onChange={(e) => setTemplateData((prev) => ({ ...prev, courseType: e.target.value }))}
          className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                        required
                      >
          <option value="">Select Course</option>
          {courses.map((course) => (
                          <option key={course._id} value={course.title}>
                            {course.courseCode ? `${course.courseCode} - ${course.title}` : course.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
        <label className="block text-xs font-medium text-slate-600">Target Audience *</label>
                      <select
                        value={templateData.targetType}
          onChange={(e) => setTemplateData((prev) => ({ ...prev, targetType: e.target.value }))}
          className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="franchise">School Students</option>
          <option value="main_branch">Main Branch Students</option>
                      </select>
                    </div>
    </>
  );

  return (
    <Layout>
      <PageHeader
        title={isEditing ? 'Edit Certificate Template' : 'Create Certificate Template'}
        description="Design student certificate templates"
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/student-certificates')}>
            Back to List
          </Button>
        }
      />
      <TemplateEditorPage
        title="Certificate Canvas"
        templateData={templateData}
        setTemplateData={setTemplateData}
        fieldCatalog={STUDENT_CERTIFICATE_FIELDS}
        previewMap={COMMON_PREVIEW}
        previewAssets={previewAssets}
        metaSection={metaSection}
        onSave={handleSave}
        loading={loading}
        pageFormat="a4-portrait"
      />
    </Layout>
  );
};

export default StudentCertificateTemplateForm;
