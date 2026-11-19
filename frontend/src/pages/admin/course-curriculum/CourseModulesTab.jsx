import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiPlus, FiEdit2, FiTrash2, FiCopy, FiMove, FiChevronDown, FiChevronRight,
  FiVideo, FiFileText, FiLink, FiAlignLeft, FiLayers, FiClock, FiCheckCircle,
  FiEye, FiMoreVertical, FiArrowUp, FiArrowDown, FiSearch, FiFilter, FiExternalLink,
  FiFolder, FiAlertCircle, FiRefreshCw, FiUpload
} from 'react-icons/fi';
import {
  Card, Button, Badge, Modal, FormField, FormGrid, TextField, TextArea, SelectField
} from '../../../components/ui';
import {
  getModules, createModule, updateModule, deleteModule, reorderModules, duplicateModule,
  getLessons, createLesson, updateLesson, deleteLesson, moveLesson, duplicateLesson, reorderLessons, uploadLessonMedia
} from '../../../api/curriculumApi';
import { getVideoEmbedUrl, toAbsoluteUrl } from '../../../utils/url';

const CONTENT_TYPE_CONFIG = {
  video: { label: 'Video', icon: FiVideo, color: 'bg-red-50 text-red-700 border-red-200' },
  pdf: { label: 'PDF Document', icon: FiFileText, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  resource: { label: 'External Resource', icon: FiLink, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  text: { label: 'Text Content', icon: FiAlignLeft, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mixed: { label: 'Mixed Content', icon: FiLayers, color: 'bg-purple-50 text-purple-700 border-purple-200' }
};

export default function CourseModulesTab({ courseId, courseTitle, onCurriculumUpdated }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'super_admin' || user?.role === 'admin';
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPublication, setFilterPublication] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('order');

  // Modals state
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleSubmitting, setModuleSubmitting] = useState(false);
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    thumbnail: '',
    duration: '',
    durationUnit: 'hours',
    order: '',
    status: 'active',
    publicationStatus: 'published'
  });

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [targetModuleForLesson, setTargetModuleForLesson] = useState(null);
  const [lessonSubmitting, setLessonSubmitting] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    contentType: 'video',
    duration: '',
    order: '',
    thumbnail: '',
    videoUrl: '',
    videoProvider: 'custom',
    videoThumbnail: '',
    documentUrl: '',
    documentName: '',
    resourceUrl: '',
    resourceTitle: '',
    resourceDescription: '',
    textContent: '',
    isFreePreview: false,
    isMandatory: true,
    status: 'active',
    publicationStatus: 'published'
  });

  // Move Lesson state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingLesson, setMovingLesson] = useState(null);
  const [targetDestinationModuleId, setTargetDestinationModuleId] = useState('');
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  // Lesson Preview state
  const [previewLesson, setPreviewLesson] = useState(null);

  // Drag and drop state
  const [draggedModuleIndex, setDraggedModuleIndex] = useState(null);
  const [draggedLessonInfo, setDraggedLessonInfo] = useState(null); // { moduleId, index }


  // Direct file upload handler for lessons (videos, PDFs, resources)
  const handleFileUpload = async (e, fieldType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMedia(true);
      setUploadProgress(0);

      const res = await uploadLessonMedia(file, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setUploadProgress(percent);
      });

      if (res.success && res.data?.url) {
        toast.success(`${file.name} uploaded successfully!`);
        if (fieldType === 'video') {
          setLessonForm((prev) => ({
            ...prev,
            videoUrl: res.data.url,
            videoProvider: 'custom'
          }));
        } else if (fieldType === 'pdf') {
          setLessonForm((prev) => ({
            ...prev,
            documentUrl: res.data.url,
            documentName: prev.documentName || file.name.replace(/\.[^/.]+$/, '')
          }));
        } else if (fieldType === 'resource') {
          setLessonForm((prev) => ({
            ...prev,
            resourceUrl: res.data.url,
            resourceTitle: prev.resourceTitle || file.name.replace(/\.[^/.]+$/, '')
          }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  // Load curriculum
  const fetchCurriculum = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const res = await getModules({ course: courseId });
      const mods = res.data || [];
      setModules(mods);

      // Auto-expand first module if none expanded
      if (mods.length > 0 && Object.keys(expandedModules).length === 0) {
        setExpandedModules({ [mods[0]._id]: true });
      }

      if (onCurriculumUpdated) onCurriculumUpdated(mods);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load course modules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, [courseId]);

  // Expand / Collapse toggling
  const toggleModule = (id) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allModulesExpanded = modules.length > 0 && modules.every((module) => expandedModules[module._id]);
  const toggleAllModules = () => {
    if (allModulesExpanded) return setExpandedModules({});
    const all = {};
    modules.forEach((m) => { all[m._id] = true; });
    setExpandedModules(all);
  };

  // Summary statistics calculations
  const totalModulesCount = modules.length;
  const allLessons = useMemo(() => modules.flatMap((m) => m.lessons || []), [modules]);
  const totalLessonsCount = allLessons.length;
  const publishedLessonsCount = allLessons.filter((l) => l.publicationStatus !== 'draft').length;
  const totalMinutes = allLessons.reduce((sum, l) => sum + (Number(l.duration) || 0), 0);
  const totalDurationFormatted = totalMinutes > 60
    ? `${(totalMinutes / 60).toFixed(1)} hrs`
    : `${totalMinutes} mins`;

  // Search & Filtered Modules
  const filteredModules = useMemo(() => {
    let result = [...modules];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result
        .map((mod) => {
          const modTitleMatches = mod.title?.toLowerCase().includes(q);
          const modDescMatches = mod.description?.toLowerCase().includes(q);
          const matchingLessons = (mod.lessons || []).filter(
            (l) => l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
          );

          if (modTitleMatches || modDescMatches || matchingLessons.length > 0) {
            return {
              ...mod,
              lessons: modTitleMatches || modDescMatches ? mod.lessons : matchingLessons
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    // Filter by publication
    if (filterPublication !== 'all') {
      result = result.filter((m) => m.publicationStatus === filterPublication);
    }

    // Filter by active status
    if (filterStatus !== 'all') {
      result = result.filter((m) => m.status === filterStatus);
    }

    // Sort
    if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else {
      result.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return result;
  }, [modules, searchQuery, filterPublication, filterStatus, sortBy]);

  // MODULE CRUD Handlers
  const handleOpenAddModule = () => {
    setEditingModule(null);
    setModuleForm({
      title: '',
      description: '',
      thumbnail: '',
      duration: '',
      durationUnit: 'hours',
      order: modules.length + 1,
      status: 'active',
      publicationStatus: 'published'
    });
    setModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod) => {
    setEditingModule(mod);
    setModuleForm({
      title: mod.title || '',
      description: mod.description || '',
      thumbnail: mod.thumbnail || '',
      duration: mod.duration || '',
      durationUnit: mod.durationUnit || 'hours',
      order: mod.order || 1,
      status: mod.status || 'active',
      publicationStatus: mod.publicationStatus || 'published'
    });
    setModuleModalOpen(true);
  };

  const handleSaveModule = async (e) => {
    e.preventDefault();
    if (!moduleForm.title.trim()) {
      toast.error('Module title is required');
      return;
    }
    setModuleSubmitting(true);
    try {
      if (editingModule) {
        await updateModule(editingModule._id, moduleForm);
        toast.success('Module updated successfully');
      } else {
        const res = await createModule({ ...moduleForm, course: courseId });
        toast.success('Module created successfully');
        if (res?.data?._id) {
          setExpandedModules((prev) => ({ ...prev, [res.data._id]: true }));
        }
      }
      setModuleModalOpen(false);
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save module');
    } finally {
      setModuleSubmitting(false);
    }
  };

  const handleDeleteModule = async (mod) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete module "${mod.title}" and its ${mod.lessons?.length || 0} lessons? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteModule(mod._id);
      toast.success('Module deleted successfully');
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete module');
    }
  };

  const handleDuplicateModule = async (mod) => {
    try {
      await duplicateModule(mod._id);
      toast.success(`Duplicated module "${mod.title}" successfully`);
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate module');
    }
  };

  const handleToggleModuleStatus = async (mod) => {
    const nextStatus = mod.status === 'active' ? 'inactive' : 'active';
    try {
      await updateModule(mod._id, { status: nextStatus });
      toast.success(`Module set to ${nextStatus}`);
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update module status');
    }
  };

  // Drag and drop for modules
  const handleModuleDragStart = (index) => {
    setDraggedModuleIndex(index);
  };

  const handleModuleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleModuleDrop = async (dropIndex) => {
    if (draggedModuleIndex === null || draggedModuleIndex === dropIndex) return;

    const updated = [...modules];
    const [moved] = updated.splice(draggedModuleIndex, 1);
    updated.splice(dropIndex, 0, moved);

    setModules(updated);
    setDraggedModuleIndex(null);

    try {
      const orderedIds = updated.map((m) => m._id);
      await reorderModules(orderedIds);
      toast.success('Modules reordered successfully');
    } catch (err) {
      toast.error('Failed to save new module order');
      await fetchCurriculum();
    }
  };

  const handleMoveModuleOrder = async (modIndex, direction) => {
    const targetIndex = modIndex + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const updated = [...modules];
    const [moved] = updated.splice(modIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setModules(updated);
    try {
      const orderedIds = updated.map((m) => m._id);
      await reorderModules(orderedIds);
      toast.success('Module reordered');
    } catch (err) {
      toast.error('Failed to update module order');
      await fetchCurriculum();
    }
  };

  // LESSON CRUD Handlers
  const handleOpenAddLesson = (mod) => {
    setEditingLesson(null);
    setTargetModuleForLesson(mod);
    const existingLessons = mod?.lessons || [];
    setLessonForm({
      title: '',
      description: '',
      contentType: 'video',
      duration: '',
      order: existingLessons.length + 1,
      thumbnail: '',
      videoUrl: '',
      videoProvider: 'custom',
      videoThumbnail: '',
      documentUrl: '',
      documentName: '',
      resourceUrl: '',
      resourceTitle: '',
      resourceDescription: '',
      textContent: '',
      isFreePreview: false,
      isMandatory: true,
      status: 'active',
      publicationStatus: 'published'
    });
    setLessonModalOpen(true);
  };

  const handleOpenEditLesson = (mod, lesson) => {
    setEditingLesson(lesson);
    setTargetModuleForLesson(mod);
    setLessonForm({
      title: lesson.title || '',
      description: lesson.description || '',
      contentType: lesson.contentType || 'video',
      duration: lesson.duration || '',
      order: lesson.order || 1,
      thumbnail: lesson.thumbnail || '',
      videoUrl: lesson.videoUrl || '',
      videoProvider: lesson.videoProvider || 'custom',
      videoThumbnail: lesson.videoThumbnail || '',
      documentUrl: lesson.documentUrl || '',
      documentName: lesson.documentName || '',
      resourceUrl: lesson.resourceUrl || '',
      resourceTitle: lesson.resourceTitle || '',
      resourceDescription: lesson.resourceDescription || '',
      textContent: lesson.textContent || '',
      isFreePreview: Boolean(lesson.isFreePreview),
      isMandatory: lesson.isMandatory !== undefined ? Boolean(lesson.isMandatory) : true,
      status: lesson.status || 'active',
      publicationStatus: lesson.publicationStatus || 'published'
    });
    setLessonModalOpen(true);
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      toast.error('Lesson title is required');
      return;
    }
    setLessonSubmitting(true);
    try {
      if (editingLesson) {
        await updateLesson(editingLesson._id, lessonForm);
        toast.success('Lesson updated successfully');
      } else {
        await createLesson({
          ...lessonForm,
          module: targetModuleForLesson._id,
          course: courseId
        });
        toast.success(`Lesson added to ${targetModuleForLesson.title}`);
      }
      setLessonModalOpen(false);
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lesson');
    } finally {
      setLessonSubmitting(false);
    }
  };

  const handleDeleteLesson = async (lesson) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete lesson "${lesson.title}"?`);
    if (!confirmDelete) return;

    try {
      await deleteLesson(lesson._id);
      toast.success('Lesson deleted successfully');
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete lesson');
    }
  };

  const handleDuplicateLesson = async (lesson) => {
    try {
      await duplicateLesson(lesson._id);
      toast.success(`Duplicated lesson "${lesson.title}"`);
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate lesson');
    }
  };

  const handleToggleLessonStatus = async (lesson) => {
    const nextStatus = lesson.status === 'active' ? 'inactive' : 'active';
    try {
      await updateLesson(lesson._id, { status: nextStatus });
      toast.success(`Lesson set to ${nextStatus}`);
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lesson status');
    }
  };

  // Move Lesson to another module
  const handleOpenMoveLesson = (lesson, currentMod) => {
    setMovingLesson(lesson);
    const otherMods = modules.filter((m) => m._id !== currentMod._id);
    setTargetDestinationModuleId(otherMods[0]?._id || '');
    setMoveModalOpen(true);
  };

  const handleExecuteMoveLesson = async (e) => {
    e.preventDefault();
    if (!targetDestinationModuleId) {
      toast.error('Please select a destination module');
      return;
    }
    setMoveSubmitting(true);
    try {
      await moveLesson(movingLesson._id, targetDestinationModuleId);
      toast.success('Lesson moved to new module successfully');
      setMoveModalOpen(false);
      setExpandedModules((prev) => ({ ...prev, [targetDestinationModuleId]: true }));
      await fetchCurriculum();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move lesson');
    } finally {
      setMoveSubmitting(false);
    }
  };

  // Drag and drop for lessons within a module
  const handleLessonDragStart = (moduleId, index) => {
    setDraggedLessonInfo({ moduleId, index });
  };

  const handleLessonDragOver = (e) => {
    e.preventDefault();
  };

  const handleLessonDrop = async (moduleId, dropIndex) => {
    if (!draggedLessonInfo || draggedLessonInfo.moduleId !== moduleId || draggedLessonInfo.index === dropIndex) {
      return;
    }

    const mod = modules.find((m) => m._id === moduleId);
    if (!mod || !mod.lessons) return;

    const updatedLessons = [...mod.lessons];
    const [moved] = updatedLessons.splice(draggedLessonInfo.index, 1);
    updatedLessons.splice(dropIndex, 0, moved);

    // Optimistically update
    setModules((prev) =>
      prev.map((m) => (m._id === moduleId ? { ...m, lessons: updatedLessons } : m))
    );
    setDraggedLessonInfo(null);

    try {
      const orderedIds = updatedLessons.map((l) => l._id);
      await reorderLessons(orderedIds);
      toast.success('Lessons reordered successfully');
    } catch (err) {
      toast.error('Failed to save lesson order');
      await fetchCurriculum();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-bold text-slate-800">Course Curriculum</h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 border border-primary-200">
                {totalModulesCount} {totalModulesCount === 1 ? 'Module' : 'Modules'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {totalLessonsCount} {totalLessonsCount === 1 ? 'Lesson' : 'Lessons'}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Organize and manage course modules, lessons, and learning materials independently.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={FiLayers}
              onClick={() => {
                const isFranchise = typeof window !== 'undefined' && window.location.pathname.startsWith('/school');
                const basePath = isFranchise ? '/school' : '/admin';
                navigate(`${basePath}/courses/${courseId}/add-lessons`);
              }}
            >
              Batch Add Lessons
            </Button>
            <Button variant="primary" icon={FiPlus} onClick={handleOpenAddModule}>
              Add New Module
            </Button>
          </div>
        )}
      </div>

      {/* 2. Compact Summary Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <FiLayers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Modules</p>
            <p className="text-xl font-bold text-slate-800">{totalModulesCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FiFileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Lessons</p>
            <p className="text-xl font-bold text-slate-800">{totalLessonsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FiClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Course Duration</p>
            <p className="text-xl font-bold text-slate-800">{totalDurationFormatted}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FiCheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Published Lessons</p>
            <p className="text-xl font-bold text-slate-800">{publishedLessonsCount}</p>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules or lessons..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={filterPublication}
            onChange={(e) => setFilterPublication(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Visibility</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="order">Custom Order</option>
            <option value="name">Module Name</option>
            <option value="recent">Recently Updated</option>
          </select>

          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          <button type="button" onClick={toggleAllModules} className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
            {allModulesExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* 4. Modules List */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading curriculum modules...</p>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3">
            <FiFolder className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No curriculum modules found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? 'No modules or lessons match your search query.'
              : 'Start organizing your course curriculum by creating your first module.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button variant="primary" icon={FiPlus} onClick={handleOpenAddModule}>
              Add First Module
            </Button>
            <Button variant="secondary" icon={FiRefreshCw} onClick={fetchCurriculum}>
              Refresh / Sync Syllabus
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredModules.map((mod, modIndex) => {
            const isExpanded = Boolean(expandedModules[mod._id]);
            const modLessons = mod.lessons || [];
            const modDurationMins = modLessons.reduce((sum, l) => sum + (Number(l.duration) || 0), 0);
            const modDurationFormatted = modDurationMins > 60
              ? `${(modDurationMins / 60).toFixed(1)} hrs`
              : `${modDurationMins} mins`;

            return (
              <div
                key={mod._id}
                draggable={canManage} onDragStart={() => canManage && handleModuleDragStart(modIndex)}
                onDragOver={(e) => handleModuleDragOver(e, modIndex)}
                onDrop={() => handleModuleDrop(modIndex)}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Module Header Bar */}
                <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white select-none">
                  {/* Left: Reorder Handle, Expand Toggle, Module Tag & Title */}
                  <div className="flex items-start gap-3 flex-1">
                    {canManage && (
                      <div
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 pt-1 shrink-0"
                        title="Drag to reorder module"
                      >
                        <FiMove className="w-4 h-4" />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleModule(mod._id)}
                      className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition shrink-0 mt-0.5"
                      title={isExpanded ? 'Collapse module' : 'Expand module'}
                    >
                      {isExpanded ? (
                        <FiChevronDown className="w-5 h-5 text-primary-600" />
                      ) : (
                        <FiChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 cursor-pointer" onClick={() => toggleModule(mod._id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                          MODULE {String(mod.order || modIndex + 1).padStart(2, '0')}
                        </span>
                        {mod.publicationStatus === 'draft' && (
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                            Draft
                          </span>
                        )}
                        {mod.status === 'inactive' && (
                          <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-800 hover:text-primary-700 transition">
                        {mod.title}
                      </h3>
                      {mod.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {mod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Lesson Counts & Duration */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 pl-10 md:pl-0">
                    <div className="flex items-center gap-1.5">
                      <FiFileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        <strong className="text-slate-700">{modLessons.length}</strong>{' '}
                        {modLessons.length === 1 ? 'Lesson' : 'Lessons'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <FiClock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{modDurationFormatted}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {canManage && (
                    <div className="flex items-center gap-2 pl-10 md:pl-0 justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={FiPlus}
                        onClick={() => handleOpenAddLesson(mod)}
                      >
                        Add Lesson
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModule(mod)}
                        className="p-2 rounded-xl text-slate-500 hover:text-primary-700 hover:bg-primary-50 transition border border-transparent hover:border-primary-100"
                        title="Edit Module Details"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateModule(mod)}
                        className="p-2 rounded-xl text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100"
                        title="Duplicate Module"
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteModule(mod)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 transition border border-transparent hover:border-red-100"
                        title="Delete Module"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Lessons Section */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:p-6 space-y-3">
                    {modLessons.length === 0 ? (
                      <div className="bg-white p-6 rounded-xl border border-dashed border-slate-200 text-center">
                        <p className="text-sm font-semibold text-slate-700 mb-0.5">No lessons added yet.</p>
                        <p className="text-xs text-slate-500 mb-3">
                          Start building this module by adding your first lesson.
                        </p>
                        {canManage && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={FiPlus}
                            onClick={() => handleOpenAddLesson(mod)}
                          >
                            Add First Lesson
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {modLessons.map((lesson, lessonIndex) => {
                          const conf = CONTENT_TYPE_CONFIG[lesson.contentType] || CONTENT_TYPE_CONFIG.video;
                          const ContentIcon = conf.icon;

                          return (
                            <div
                              key={lesson._id}
                              draggable={canManage} onDragStart={() => canManage && handleLessonDragStart(mod._id, lessonIndex)}
                              onDragOver={handleLessonDragOver}
                              onDrop={() => handleLessonDrop(mod._id, lessonIndex)}
                              className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                            >
                              {/* Left: Drag, Number & Content Icon */}
                              <div className="flex items-center gap-3">
                                {canManage && (
                                  <div
                                    className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 transition shrink-0"
                                    title="Drag to reorder lesson"
                                  >
                                    <FiMove className="w-3.5 h-3.5" />
                                  </div>
                                )}

                                <span className="text-xs font-semibold text-slate-400 w-5 text-center">
                                  {lesson.order || lessonIndex + 1}.
                                </span>

                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${conf.color}`}>
                                  <ContentIcon className="w-4 h-4" />
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-semibold text-slate-800">
                                      {lesson.title}
                                    </h4>
                                    {lesson.isFreePreview && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Free Preview
                                      </span>
                                    )}
                                    {lesson.publicationStatus === 'draft' && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                        Draft
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                    <span>{conf.label}</span>
                                    {lesson.duration > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <FiClock className="w-3 h-3" />
                                          {lesson.duration} mins
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Lesson Quick Actions */}
                              <div className="flex items-center gap-1.5 justify-end pl-8 sm:pl-0">
                                <button
                                  type="button"
                                  onClick={() => setPreviewLesson(lesson)}
                                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-primary-700 hover:bg-slate-100 rounded-lg transition inline-flex items-center gap-1"
                                  title="Preview Lesson Content"
                                >
                                  <FiEye className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>

                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditLesson(mod, lesson)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-primary-700 hover:bg-primary-50 transition"
                                      title="Edit Lesson"
                                    >
                                      <FiEdit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateLesson(lesson)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition"
                                      title="Duplicate Lesson"
                                    >
                                      <FiCopy className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenMoveLesson(lesson, mod)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
                                      title="Move to another Module"
                                    >
                                      <FiFolder className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLesson(lesson)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                                      title="Delete Lesson"
                                    >
                                      <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Bottom Add Lesson Button */}
                    {canManage && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddLesson(mod)}
                          className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:text-primary-700 hover:border-primary-300 hover:bg-white transition flex items-center justify-center gap-2"
                        >
                          <FiPlus className="w-4 h-4 text-primary-600" />
                          <span>Add Lesson to {mod.title}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. ADD / EDIT MODULE MODAL */}
      <Modal
        open={moduleModalOpen}
        onClose={() => setModuleModalOpen(false)}
        title={editingModule ? 'Edit Module' : 'Add New Module'}
        size="md"
      >
        <form onSubmit={handleSaveModule} className="space-y-4">
          <p className="text-xs text-slate-500">
            {editingModule
              ? 'Update the module title, duration, and publication status.'
              : `Add a new module to organize lessons under ${courseTitle || 'this course'}.`}
          </p>

          <FormField label="Module Title" required>
            <TextField
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
              placeholder="e.g. HTML Fundamentals or Core Accounting Principles"
              required
            />
          </FormField>

          <FormField label="Module Description">
            <TextArea
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              placeholder="Short summary of what learners will study in this module..."
              rows={3}
            />
          </FormField>

          <FormGrid cols={2}>
            <FormField label="Estimated Duration">
              <TextField
                type="number"
                min="0"
                value={moduleForm.duration}
                onChange={(e) => setModuleForm({ ...moduleForm, duration: e.target.value })}
                placeholder="e.g. 12"
              />
            </FormField>

            <FormField label="Duration Unit">
              <SelectField
                value={moduleForm.durationUnit}
                onChange={(e) => setModuleForm({ ...moduleForm, durationUnit: e.target.value })}
              >
                <option value="hours">Hours</option>
                <option value="minutes">Minutes</option>
              </SelectField>
            </FormField>
          </FormGrid>

          <FormGrid cols={2}>
            <FormField label="Visibility Status">
              <SelectField
                value={moduleForm.status}
                onChange={(e) => setModuleForm({ ...moduleForm, status: e.target.value })}
              >
                <option value="active">Active (Visible)</option>
                <option value="inactive">Inactive (Hidden)</option>
              </SelectField>
            </FormField>

            <FormField label="Publication Status">
              <SelectField
                value={moduleForm.publicationStatus}
                onChange={(e) => setModuleForm({ ...moduleForm, publicationStatus: e.target.value })}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </SelectField>
            </FormField>
          </FormGrid>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={moduleSubmitting}>
              {editingModule ? 'Save Module' : 'Create Module'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. ADD / EDIT LESSON MODAL */}
      <Modal
        open={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        title={editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
        size="lg"
      >
        <form onSubmit={handleSaveLesson} className="space-y-4">
          <p className="text-xs text-slate-500">
            {targetModuleForLesson
              ? `Learning content for Module: ${targetModuleForLesson.title}`
              : 'Add learning content and resources.'}
          </p>

          {/* Section A: Basic Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Section A: Basic Information
            </h4>

            <FormField label="Lesson Title" required>
              <TextField
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="e.g. Introduction to HTML Document Structure"
                required
              />
            </FormField>

            <FormField label="Lesson Description">
              <TextArea
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                placeholder="Brief summary of topics covered in this lesson..."
                rows={2}
              />
            </FormField>

            <FormGrid cols={2}>
              <FormField label="Content Type" required>
                <SelectField
                  value={lessonForm.contentType}
                  onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value })}
                >
                  <option value="video">Video Lecture</option>
                  <option value="pdf">PDF Document / Notes</option>
                  <option value="resource">External Resource / URL</option>
                  <option value="text">Text Content / Guide</option>
                  <option value="mixed">Mixed Content Bundle</option>
                </SelectField>
              </FormField>

              <FormField label="Duration (Minutes)">
                <TextField
                  type="number"
                  min="0"
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                  placeholder="e.g. 25"
                />
              </FormField>
            </FormGrid>
          </div>

          {/* Section B: Learning Content (Dynamic) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Section B: Learning Content ({CONTENT_TYPE_CONFIG[lessonForm.contentType]?.label})
            </h4>

            {(lessonForm.contentType === 'video' || lessonForm.contentType === 'mixed') && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <FormGrid cols={2}>
                  <FormField label="Video Provider">
                    <SelectField
                      value={lessonForm.videoProvider}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoProvider: e.target.value })}
                    >
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="drive">Google Drive</option>
                      <option value="custom">Direct MP4 / Custom</option>
                    </SelectField>
                  </FormField>

                  <FormField label="Video URL" required={lessonForm.contentType === 'video'}>
                    <TextField
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... or MP4 URL"
                    />
                  </FormField>
                </FormGrid>

                {/* Direct Video File Upload */}
                <div className="pt-2.5 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Upload Video Directly (MP4, WebM, MOV)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Upload local video files directly from your computer instead of pasting a URL.
                      </span>
                    </div>

                    <label className={`cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition shrink-0 ${
                      uploadingMedia
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                    }`}>
                      <FiUpload className="w-3.5 h-3.5" />
                      <span>{uploadingMedia ? `Uploading ${uploadProgress}%...` : 'Upload Video File'}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
                        className="hidden"
                        disabled={uploadingMedia}
                        onChange={(e) => handleFileUpload(e, 'video')}
                      />
                    </label>
                  </div>

                  {uploadingMedia && (
                    <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}

                  {lessonForm.videoUrl && lessonForm.videoProvider === 'custom' && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                      <FiCheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="truncate flex-1">Video ready: {lessonForm.videoUrl}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(lessonForm.contentType === 'pdf' || lessonForm.contentType === 'mixed') && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <FormGrid cols={2}>
                  <FormField label="Document / PDF URL" required={lessonForm.contentType === 'pdf'}>
                    <TextField
                      value={lessonForm.documentUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, documentUrl: e.target.value })}
                      placeholder="https://.../notes.pdf"
                    />
                  </FormField>

                  <FormField label="Document Name / Label">
                    <TextField
                      value={lessonForm.documentName}
                      onChange={(e) => setLessonForm({ ...lessonForm, documentName: e.target.value })}
                      placeholder="e.g. Chapter 1 Notes & Cheatsheet"
                    />
                  </FormField>
                </FormGrid>

                {/* Direct Document Upload */}
                <div className="pt-2.5 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Upload Document Directly (PDF, DOC, DOCX, TXT)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Upload local PDF lecture notes, slides, or study materials.
                      </span>
                    </div>

                    <label className={`cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition shrink-0 ${
                      uploadingMedia
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}>
                      <FiUpload className="w-3.5 h-3.5" />
                      <span>{uploadingMedia ? `Uploading ${uploadProgress}%...` : 'Upload Document'}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.rar,application/pdf"
                        className="hidden"
                        disabled={uploadingMedia}
                        onChange={(e) => handleFileUpload(e, 'pdf')}
                      />
                    </label>
                  </div>

                  {lessonForm.documentUrl && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                      <FiCheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="truncate flex-1">Document ready: {lessonForm.documentName || lessonForm.documentUrl}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {lessonForm.contentType === 'resource' && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <FormField label="Resource URL" required>
                  <TextField
                    value={lessonForm.resourceUrl}
                    onChange={(e) => setLessonForm({ ...lessonForm, resourceUrl: e.target.value })}
                    placeholder="https://github.com/... or official documentation"
                  />
                </FormField>
                <FormField label="Resource Title">
                  <TextField
                    value={lessonForm.resourceTitle}
                    onChange={(e) => setLessonForm({ ...lessonForm, resourceTitle: e.target.value })}
                    placeholder="e.g. Starter Code Repository"
                  />
                </FormField>
                {/* Direct Resource Upload */}
                <div className="pt-2.5 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Upload Resource File (ZIP, PDF, Code, Cheatsheet)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Upload project archives, starter templates, cheatsheets, or exercise files.
                      </span>
                    </div>

                    <label className={`cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition shrink-0 ${
                      uploadingMedia
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}>
                      <FiUpload className="w-3.5 h-3.5" />
                      <span>{uploadingMedia ? `Uploading ${uploadProgress}%...` : 'Upload File'}</span>
                      <input
                        type="file"
                        accept=".zip,.rar,.7z,.pdf,.doc,.docx,.txt,.js,.py,.html,.css,.json"
                        className="hidden"
                        disabled={uploadingMedia}
                        onChange={(e) => handleFileUpload(e, 'resource')}
                      />
                    </label>
                  </div>

                  {lessonForm.resourceUrl && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200">
                      <FiCheckCircle className="w-4 h-4 shrink-0 text-blue-600" />
                      <span className="truncate flex-1">Resource ready: {lessonForm.resourceTitle || lessonForm.resourceUrl}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(lessonForm.contentType === 'text' || lessonForm.contentType === 'mixed') && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <FormField label="Text Content / Notes">
                  <TextArea
                    value={lessonForm.textContent}
                    onChange={(e) => setLessonForm({ ...lessonForm, textContent: e.target.value })}
                    placeholder="Enter reading material, code examples, markdown, or step-by-step instructions..."
                    rows={4}
                  />
                </FormField>
              </div>
            )}
          </div>

          {/* Section C: Lesson Settings */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Section C: Settings & Visibility
            </h4>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={lessonForm.isFreePreview}
                  onChange={(e) => setLessonForm({ ...lessonForm, isFreePreview: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span>Allow Free Preview</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={lessonForm.isMandatory}
                  onChange={(e) => setLessonForm({ ...lessonForm, isMandatory: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span>Mandatory to Complete</span>
              </label>
            </div>

            <FormGrid cols={2}>
              <FormField label="Publication Status">
                <SelectField
                  value={lessonForm.publicationStatus}
                  onChange={(e) => setLessonForm({ ...lessonForm, publicationStatus: e.target.value })}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </SelectField>
              </FormField>

              <FormField label="Visibility Status">
                <SelectField
                  value={lessonForm.status}
                  onChange={(e) => setLessonForm({ ...lessonForm, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </SelectField>
              </FormField>
            </FormGrid>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setLessonModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={lessonSubmitting}>
              {editingLesson ? 'Save Lesson' : 'Create Lesson'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. MOVE LESSON MODAL */}
      <Modal
        open={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title="Move Lesson to Another Module"
        size="sm"
      >
        <form onSubmit={handleExecuteMoveLesson} className="space-y-4">
          <p className="text-xs text-slate-500">
            Select the destination module for <strong>"{movingLesson?.title}"</strong>.
            Historical progress and student completions will be preserved.
          </p>

          <FormField label="Destination Module" required>
            <SelectField
              value={targetDestinationModuleId}
              onChange={(e) => setTargetDestinationModuleId(e.target.value)}
              required
            >
              {modules
                .filter((m) => m._id !== movingLesson?.module)
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    Module {m.order}: {m.title}
                  </option>
                ))}
            </SelectField>
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setMoveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={moveSubmitting}>
              Move Lesson
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. LESSON PREVIEW MODAL */}
      <Modal
        open={Boolean(previewLesson)}
        onClose={() => setPreviewLesson(null)}
        title={previewLesson?.title || 'Lesson Preview'}
        size="lg"
      >
        {previewLesson && (() => {
          const candidateVideo = previewLesson.videoUrl || 
            (previewLesson.textContent && previewLesson.textContent.includes('http') ? previewLesson.textContent : '') ||
            (previewLesson.description && previewLesson.description.includes('http') ? previewLesson.description : '');
          const videoEmbed = getVideoEmbedUrl(candidateVideo);
          const hasDirectVideo = candidateVideo && /\.(mp4|webm|ogg)(\?.*)?$/i.test(candidateVideo);

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CONTENT_TYPE_CONFIG[previewLesson.contentType]?.color || 'bg-slate-100 text-slate-700'}`}>
                  {videoEmbed || hasDirectVideo ? 'Video' : CONTENT_TYPE_CONFIG[previewLesson.contentType]?.label}
                </span>
                {previewLesson.duration > 0 && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    {previewLesson.duration} mins
                  </span>
                )}
              </div>

              {/* Video Player */}
              {videoEmbed ? (
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-sm border border-slate-800">
                  <iframe
                    src={videoEmbed}
                    title={previewLesson.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : hasDirectVideo ? (
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-sm border border-slate-800">
                  <video
                    controls
                    src={toAbsoluteUrl(previewLesson.videoUrl || candidateVideo)}
                    className="w-full h-full"
                  />
                </div>
              ) : null}

              {/* Document preview */}
              {previewLesson.documentUrl && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-900 text-sm font-semibold">
                    <FiFileText className="w-5 h-5 text-amber-600" />
                    <span>{previewLesson.documentName || 'Download Study Document'}</span>
                  </div>
                  <a
                    href={toAbsoluteUrl(previewLesson.documentUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition inline-flex items-center gap-1"
                  >
                    <span>Open PDF</span>
                    <FiExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Resource preview */}
              {previewLesson.resourceUrl && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between gap-3">
                  <div className="text-blue-900 text-sm font-semibold">
                    <span>{previewLesson.resourceTitle || 'External Resource Link'}</span>
                  </div>
                  <a
                    href={previewLesson.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition inline-flex items-center gap-1"
                  >
                    <span>Visit Link</span>
                    <FiExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Description (hide if it was just a raw video URL) */}
              {previewLesson.description && !previewLesson.description.startsWith('http') && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                  {previewLesson.description}
                </p>
              )}

              {/* Text content (hide if it was just a raw video link that is rendered above) */}
              {previewLesson.textContent && !videoEmbed && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {previewLesson.textContent}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setPreviewLesson(null)}>
                  Close Preview
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

