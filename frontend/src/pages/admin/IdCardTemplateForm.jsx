import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import TemplateEditorPage from '../../components/template-editor/TemplateEditorPage';
import { ID_CARD_FIELDS, ID_CARD_PREVIEW } from '../../components/template-editor/fieldCatalogs';
import { sanitizeTemplateFields } from '../../components/template-editor/templateFieldUtils';
import { createIdCardTemplate, updateIdCardTemplate, getIdCardTemplate } from '../../api/idCardApi';
import { toast } from 'react-toastify';
import { FiArrowLeft } from 'react-icons/fi';
import { Button } from '../../components/ui';

const IdCardTemplateForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    templateImage: '',
    fields: []
  });

  useEffect(() => {
    if (isEditing) loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    try {
      const res = await getIdCardTemplate(id);
      const template = res.data;
      if (!template) {
        toast.error('Template not found');
        navigate('/admin/id-cards');
        return;
      }
      setTemplateData({
        name: template.name || '',
        description: template.description || '',
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
        await updateIdCardTemplate(id, data);
        toast.success('Template updated successfully');
      } else {
        await createIdCardTemplate(data);
        toast.success('Template created successfully');
      }
      navigate('/admin/id-cards');
    } catch {
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
        <PageHeader 
          title={isEditing ? 'Edit ID Card Template' : 'Create ID Card Template'}
          description="Design student ID card templates"
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/id-cards')}>
            Back to List
          </Button>
        }
      />
      <TemplateEditorPage
        title="ID Card Canvas"
        templateData={templateData}
        setTemplateData={setTemplateData}
        fieldCatalog={ID_CARD_FIELDS}
        previewMap={ID_CARD_PREVIEW}
        onSave={handleSave}
        loading={loading}
      />
    </Layout>
  );
};

export default IdCardTemplateForm;
