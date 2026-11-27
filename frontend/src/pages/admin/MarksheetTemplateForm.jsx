import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import BuiltInTemplateForm from '../../components/template-editor/BuiltInTemplateForm';
import { MARKSHEET_FIELDS, COMMON_PREVIEW } from '../../components/template-editor/fieldCatalogs';
import { sanitizeTemplateFields } from '../../components/template-editor/templateFieldUtils';
import { createMarksheetTemplate, updateMarksheetTemplate, getMarksheetTemplates } from '../../api/marksheetApi';
import { getCourses } from '../../api/courseApi';
import { getTemplateAssets } from '../../api/templateAssetApi';
import { toast } from 'react-toastify';
import { FiArrowLeft } from 'react-icons/fi';
import { Button } from '../../components/ui';

const MarksheetTemplateForm = () => {
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
    course: '',
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
      const res = await getMarksheetTemplates();
      const template = res.data?.data?.find((t) => t._id === id);
      if (!template) {
        toast.error('Template not found');
        navigate('/admin/marksheet-templates');
        return;
      }
      setTemplateData({
          name: template.name || '',
          description: template.description || '',
          courseType: template.courseType || '',
          course: template.course?._id || template.course || '',
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
        await updateMarksheetTemplate(id, data);
        toast.success('Template updated successfully');
      } else {
        await createMarksheetTemplate(data);
        toast.success('Template created successfully');
      }
      navigate('/admin/marksheet-templates');
    } catch {
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    const course = courses.find((c) => c._id === courseId);
    setTemplateData((prev) => ({
      ...prev,
      course: courseId,
      courseType: course?.title || '',
    }));
  };

  const selectedCourseId =
    templateData.course ||
    courses.find((c) => c.title === templateData.courseType)?._id ||
    '';

  const metaSection = (
            <>
              <div>
        <label className="block text-xs font-medium text-slate-600">Course Type *</label>
                      <select
                        value={selectedCourseId}
          onChange={handleCourseChange}
          className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                        required
                      >
          <option value="">Select Course</option>
          {courses.map((course) => (
                          <option key={course._id} value={course._id}>
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
        title={isEditing ? 'Edit Marksheet Template' : 'Create Marksheet Template'}
        description="Choose fields for the built-in marksheet layout and add optional background artwork."
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/marksheet-templates')}>
            Back to List
          </Button>
        }
      />
      <BuiltInTemplateForm
        title="Marksheet Template" description="Choose what to print and upload a background design."

        templateData={templateData}
        setTemplateData={setTemplateData}
        fieldCatalog={MARKSHEET_FIELDS}
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

export default MarksheetTemplateForm;

