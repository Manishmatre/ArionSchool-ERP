import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiPlus, FiVideo, FiFile, FiCheckSquare, FiLayers } from 'react-icons/fi';
import {
  PageLoading, FilterBar, SelectField, TextField, TextArea,
  Button, IconButton, Badge, Card, EmptyState, Modal,
  FormGrid, FormField,
} from '../../components/ui';

const ManageTopics = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapter');
  
  const [topics, setTopics] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(chapterIdFromUrl || '');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    chapter: chapterIdFromUrl || '',
    order: 1,
    videoUrl: '',
    duration: 0,
    studyMaterialUrl: '',
    studyMaterialName: '',
  });

  useEffect(() => {
    fetchChapters();
    fetchTopics();
  }, [selectedChapter]);

  const fetchChapters = async () => {
    try {
      const response = await api.get('/chapters');
      setChapters(response.data.chapters);
    } catch (error) {
      toast.error('Failed to fetch chapters');
    }
  };

  const fetchTopics = async () => {
    try {
      const params = selectedChapter ? { chapter: selectedChapter } : {};
      const response = await api.get('/topics', { params });
      setTopics(response.data.topics);
    } catch (error) {
      toast.error('Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (topic) => {
    setEditingTopic(topic);
    setFormData({
      title: topic.title,
      description: topic.description,
      chapter: topic.chapter._id,
      order: topic.order,
      videoUrl: topic.videoUrl || '',
      duration: topic.duration || 0,
      studyMaterialUrl: topic.studyMaterialUrl || '',
      studyMaterialName: topic.studyMaterialName || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;

    try {
      await api.delete(`/topics/${topicId}`);
      toast.success('Topic deleted successfully');
      fetchTopics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete topic');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingTopic) {
        await api.put(`/topics/${editingTopic._id}`, formData);
        toast.success('Topic updated successfully');
      } else {
        await api.post('/topics', formData);
        toast.success('Topic created successfully');
      }
      setShowModal(false);
      setEditingTopic(null);
      setFormData({
        title: '',
        description: '',
        chapter: '',
        order: 1,
        videoUrl: '',
        duration: 0,
        studyMaterialUrl: '',
        studyMaterialName: '',
      });
      fetchTopics();
    } catch (error) {
      toast.error('Failed to save topic');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTopic(null);
    setFormData({
      title: '',
      description: '',
      chapter: '',
      order: 1,
      videoUrl: '',
      duration: 0,
      studyMaterialUrl: '',
      studyMaterialName: '',
    });
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Manage Topics" subtitle="Create and manage topics within chapters" icon={FiLayers} />
        <PageLoading message="Loading topics..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader 
          title="Manage Topics" 
          subtitle="Create and manage topics within chapters" 
          icon={FiLayers}
          actions={(
            <Button icon={FiPlus} onClick={() => setShowModal(true)}>Add Topic</Button>
          )}
        />

        <FilterBar>
          <SelectField
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="flex-1 min-w-[200px] max-w-sm"
          >
            <option value="">All Chapters</option>
            {chapters.map((chapter) => (
              <option key={chapter._id} value={chapter._id}>{chapter.title}</option>
            ))}
          </SelectField>
        </FilterBar>

        {topics.length === 0 ? (
          <Card>
            <EmptyState icon={FiLayers} title="No topics found" description="Add a new topic or adjust your chapter filter." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <Card key={topic._id} hover className="flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge variant="primary">Order: {topic.order}</Badge>
                    <Badge variant="neutral">{topic.chapter.title}</Badge>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <IconButton icon={FiEdit2} variant="primary" title="Edit" onClick={() => handleEdit(topic)} />
                    <IconButton icon={FiTrash2} variant="danger" title="Delete" onClick={() => handleDelete(topic._id)} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-3 mb-1.5">{topic.title}</h3>
                <p className="text-sm text-slate-600 mb-4 flex-1">{topic.description}</p>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  {topic.videoUrl && (
                    <span className="flex items-center gap-1">
                      <FiVideo className="text-primary-600" />
                      Video Available
                    </span>
                  )}
                  {topic.studyMaterialUrl && (
                    <span className="flex items-center gap-1">
                      <FiFile className="text-primary-600" />
                      Material Available
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  icon={FiCheckSquare}
                  className="w-full justify-center"
                  onClick={() => navigate(`/admin/mcqs?topic=${topic._id}`)}
                >
                  Manage MCQs
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingTopic ? 'Edit Topic' : 'Add Topic'}
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="topic-form">{editingTopic ? 'Update' : 'Create'}</Button>
          </>
        )}
      >
        <form id="topic-form" onSubmit={handleSubmit} className="space-y-4">
          <FormGrid cols={2}>
            <FormField label="Title" required>
              <TextField
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Chapter" required>
              <SelectField
                value={formData.chapter}
                onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                required
              >
                <option value="">Select Chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter._id} value={chapter._id}>{chapter.title}</option>
                ))}
              </SelectField>
            </FormField>
          </FormGrid>
          <FormField label="Description" required>
            <TextArea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </FormField>
          <FormGrid cols={2}>
            <FormField label="Order" required>
              <TextField
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                min="1"
                required
              />
            </FormField>
            <FormField label="Duration (minutes)">
              <TextField
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                min="0"
              />
            </FormField>
          </FormGrid>
          <FormField label="Video URL">
            <TextField
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://..."
            />
          </FormField>
          <FormGrid cols={2}>
            <FormField label="Study Material URL">
              <TextField
                type="url"
                value={formData.studyMaterialUrl}
                onChange={(e) => setFormData({ ...formData, studyMaterialUrl: e.target.value })}
                placeholder="https://..."
              />
            </FormField>
            <FormField label="Material Name">
              <TextField
                type="text"
                value={formData.studyMaterialName}
                onChange={(e) => setFormData({ ...formData, studyMaterialName: e.target.value })}
                placeholder="e.g., Chapter 1 Notes.pdf"
              />
            </FormField>
          </FormGrid>
        </form>
      </Modal>
    </Layout>
  );
};

export default ManageTopics;
