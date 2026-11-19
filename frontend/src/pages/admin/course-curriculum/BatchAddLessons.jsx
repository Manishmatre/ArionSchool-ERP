import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiCheckCircle, FiLayers,
  FiVideo, FiFileText, FiLink, FiAlignLeft, FiClock, FiChevronDown, FiChevronUp, FiUpload
} from 'react-icons/fi';
import Layout from '../../../components/Layout';
import PageHeader from '../../../components/PageHeader';
import {
  Card, Button, FormField, FormGrid, TextField, TextArea, SelectField, Badge
} from '../../../components/ui';
import { getCourses, getCourse } from '../../../api/courseApi';
import { getModules, createLesson, uploadLessonMedia } from '../../../api/curriculumApi';

const DEFAULT_LESSON_TEMPLATE = () => ({
  id: Date.now() + Math.random(),
  title: '',
  description: '',
  contentType: 'video',
  duration: 15,
  thumbnail: '',
  videoUrl: '',
  videoProvider: 'custom',
  documentUrl: '',
  documentName: '',
  resourceUrl: '',
  resourceTitle: '',
  textContent: '',
  isFreePreview: false,
  isMandatory: true,
  status: 'active',
  publicationStatus: 'published'
});

export default function BatchAddLessons() {
  const { courseId: paramCourseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(paramCourseId || searchParams.get('courseId') || '');
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(searchParams.get('moduleId') || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Array of lessons being authored
  const [lessons, setLessons] = useState([DEFAULT_LESSON_TEMPLATE()]);
  // Currently expanded lesson index (only one expanded at a time!)
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load courses list if no paramCourseId
        let activeCourseId = selectedCourseId;
        if (!activeCourseId) {
          const coursesRes = await getCourses();
          const list = coursesRes.data || [];
          setCourses(list);
          if (list.length > 0) {
            activeCourseId = list[0]._id;
            setSelectedCourseId(activeCourseId);
          }
        }

        if (activeCourseId) {
          const [courseRes, modsRes] = await Promise.all([
            getCourse(activeCourseId),
            getModules({ course: activeCourseId })
          ]);
          const courseData = courseRes.data || courseRes;
          setCourse(courseData);

          const mods = modsRes.data || [];
          setModules(mods);

          if (!selectedModuleId && mods.length > 0) {
            setSelectedModuleId(mods[0]._id);
          }
        }
      } catch (err) {
        toast.error('Failed to load curriculum context');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [paramCourseId]);

  const handleCourseChange = async (newCourseId) => {
    setSelectedCourseId(newCourseId);
    try {
      const [cRes, mRes] = await Promise.all([
        getCourse(newCourseId),
        getModules({ course: newCourseId })
      ]);
      setCourse(cRes.data || cRes);
      const mods = mRes.data || [];
      setModules(mods);
      setSelectedModuleId(mods[0]?._id || '');
    } catch (err) {
      toast.error('Failed to update course modules');
    }
  };

  // Update a specific field on the active lesson
  const updateLessonField = (index, field, value) => {
    setLessons((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add another lesson (auto-collapses previous lesson!)
  const handleAddAnotherLesson = () => {
    const current = lessons[activeLessonIndex];
    if (current && !current.title.trim()) {
      toast.warning(`Please enter a title for Lesson ${activeLessonIndex + 1} before adding another.`);
      return;
    }

    const nextLesson = DEFAULT_LESSON_TEMPLATE();
    setLessons((prev) => [...prev, nextLesson]);
    // Auto-collapse previous and expand the new one
    setActiveLessonIndex(lessons.length);
  };

  // Remove a lesson

  const [uploadingState, setUploadingState] = useState({});

  const handleUploadForLesson = async (idx, fieldType, file) => {
    if (!file) return;
    try {
      setUploadingState((prev) => ({ ...prev, [idx]: { uploading: true, progress: 0, type: fieldType } }));
      const res = await uploadLessonMedia(file, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setUploadingState((prev) => ({ ...prev, [idx]: { uploading: true, progress: percent, type: fieldType } }));
      });
      if (res.success && res.data?.url) {
        toast.success(`${file.name} uploaded successfully!`);
        if (fieldType === 'video') {
          updateLessonField(idx, 'videoUrl', res.data.url);
          updateLessonField(idx, 'videoProvider', 'custom');
        } else if (fieldType === 'pdf') {
          updateLessonField(idx, 'documentUrl', res.data.url);
          if (!lessons[idx]?.documentName) {
            updateLessonField(idx, 'documentName', file.name.replace(/\.[^/.]+$/, ''));
          }
        } else if (fieldType === 'resource') {
          updateLessonField(idx, 'resourceUrl', res.data.url);
          if (!lessons[idx]?.resourceTitle) {
            updateLessonField(idx, 'resourceTitle', file.name.replace(/\.[^/.]+$/, ''));
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingState((prev) => ({ ...prev, [idx]: { uploading: false, progress: 100, type: fieldType } }));
    }
  };

  const handleRemoveLesson = (indexToRemove) => {
    if (lessons.length <= 1) {
      toast.info('You must have at least one lesson form.');
      return;
    }
    setLessons((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeLessonIndex === indexToRemove) {
      setActiveLessonIndex(Math.max(0, indexToRemove - 1));
    } else if (activeLessonIndex > indexToRemove) {
      setActiveLessonIndex((prev) => prev - 1);
    }
  };

  // Save all lessons in batch
  const handleSaveAllLessons = async () => {
    if (!selectedModuleId) {
      toast.error('Please select a target module');
      return;
    }

    const validLessons = lessons.filter((l) => l.title.trim());
    if (validLessons.length === 0) {
      toast.error('Please provide titles for your lessons');
      return;
    }

    setSaving(true);
    try {
      let createdCount = 0;
      for (const lessonData of validLessons) {
        const { id, ...payload } = lessonData;
        await createLesson({
          ...payload,
          course: selectedCourseId,
          module: selectedModuleId
        });
        createdCount++;
      }

      toast.success(`Successfully created ${createdCount} lessons!`);
      navigate(selectedCourseId ? `/admin/courses/${selectedCourseId}?courseTab=modules` : '/admin/courses');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lessons');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading editor...</p>
        </div>
      </Layout>
    );
  }

  const selectedModule = modules.find((m) => m._id === selectedModuleId);

  return (
    <Layout>
      <div className="w-full space-y-6 pb-12">
        {/* Header */}
        <PageHeader
          title="Add Multiple Lessons"
          subtitle={`Batch author lessons for ${course?.title || 'Course'}`}
          icon={FiLayers}
          actions={
            <Button
              variant="secondary"
              icon={FiArrowLeft}
              onClick={() => navigate(selectedCourseId ? `/admin/courses/${selectedCourseId}?courseTab=modules` : '/admin/courses')}
            >
              Back to Curriculum
            </Button>
          }
        />

        {/* Target Course & Module Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            {courses.length > 0 && !paramCourseId && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Course *
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Module for These Lessons *
              </label>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              >
                {modules.length === 0 ? (
                  <option value="">No modules found for this course</option>
                ) : (
                  modules.map((m) => (
                    <option key={m._id} value={m._id}>
                      Module {m.order}: {m.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 border border-primary-100">
              {lessons.filter((l) => l.title.trim()).length} Lessons Prepared
            </span>
          </div>
        </div>

        {/* Lessons List (with auto-collapse) */}
        <div className="space-y-4">
          {lessons.map((lesson, idx) => {
            const isExpanded = activeLessonIndex === idx;

            return (
              <div
                key={lesson.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isExpanded ? 'border-primary-400 ring-2 ring-primary-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Single-Line Collapsed Summary Bar */}
                <div
                  onClick={() => setActiveLessonIndex(isExpanded ? -1 : idx)}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>

                    <span className="text-xs font-bold text-slate-800 truncate">
                      {lesson.title || `Untitled Lesson ${idx + 1}`}
                    </span>

                    <span className="text-[11px] text-slate-400 capitalize px-2 py-0.5 rounded bg-slate-100 hidden sm:inline">
                      {lesson.contentType}
                    </span>

                    {lesson.duration > 0 && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 hidden sm:inline-flex">
                        <FiClock className="w-3 h-3" />
                        {lesson.duration}m
                      </span>
                    )}

                    {lesson.isFreePreview && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Free Preview
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLessonIndex(isExpanded ? -1 : idx);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-primary-700 bg-slate-100 hover:bg-primary-50 rounded-lg transition inline-flex items-center gap-1"
                    >
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      <span>{isExpanded ? 'Collapse' : 'Edit'}</span>
                    </button>

                    {lessons.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLesson(idx);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                        title="Remove Lesson"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Full-Page Form Section */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 md:p-6 bg-slate-50/50 space-y-4">
                    {/* Basic Info */}
                    <FormGrid cols={2}>
                      <FormField label="Lesson Title" required>
                        <TextField
                          value={lesson.title}
                          onChange={(e) => updateLessonField(idx, 'title', e.target.value)}
                          placeholder="e.g. Setting up Development Environment"
                          required
                        />
                      </FormField>

                      <FormField label="Content Type" required>
                        <SelectField
                          value={lesson.contentType}
                          onChange={(e) => updateLessonField(idx, 'contentType', e.target.value)}
                        >
                          <option value="video">Video Lecture</option>
                          <option value="pdf">PDF Document / Notes</option>
                          <option value="resource">External Resource / URL</option>
                          <option value="text">Text Content / Guide</option>
                          <option value="mixed">Mixed Content Bundle</option>
                        </SelectField>
                      </FormField>
                    </FormGrid>

                    <FormField label="Lesson Description (Optional)">
                      <TextArea
                        value={lesson.description}
                        onChange={(e) => updateLessonField(idx, 'description', e.target.value)}
                        placeholder="Brief overview of what is taught in this lesson..."
                        rows={2}
                      />
                    </FormField>

                    {/* Content Fields */}
                    {(lesson.contentType === 'video' || lesson.contentType === 'mixed') && (
                      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                        <FormGrid cols={2}>
                          <FormField label="Video Provider">
                            <SelectField
                              value={lesson.videoProvider}
                              onChange={(e) => updateLessonField(idx, 'videoProvider', e.target.value)}
                            >
                              <option value="youtube">YouTube</option>
                              <option value="vimeo">Vimeo</option>
                              <option value="drive">Google Drive</option>
                              <option value="custom">Direct MP4 / Custom</option>
                            </SelectField>
                          </FormField>
                          <FormField label="Video URL" required={lesson.contentType === 'video'}>
                            <TextField
                              value={lesson.videoUrl}
                              onChange={(e) => updateLessonField(idx, 'videoUrl', e.target.value)}
                              placeholder="https://..."
                            />
                          </FormField>
                        </FormGrid>

                        {/* Direct Video File Upload */}
                        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block">
                              Or Upload Video Directly (MP4, WebM, MOV)
                            </span>
                          </div>
                          <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition shrink-0 ${
                            uploadingState[idx]?.uploading
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                          }`}>
                            <FiUpload className="w-3.5 h-3.5" />
                            <span>${uploadingState[idx]?.uploading && uploadingState[idx]?.type === 'video' ? `Uploading ${uploadingState[idx]?.progress}%` : 'Upload Video File'}</span>
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
                              className="hidden"
                              disabled={uploadingState[idx]?.uploading}
                              onChange={(e) => {
                                handleUploadForLesson(idx, 'video', e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {lesson.videoUrl && lesson.videoProvider === 'custom' && (
                          <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate">
                            ✓ Video uploaded: {lesson.videoUrl}
                          </div>
                        )}
                      </div>
                    )}

                    {(lesson.contentType === 'pdf' || lesson.contentType === 'mixed') && (
                      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                        <FormGrid cols={2}>
                          <FormField label="Document / PDF URL" required={lesson.contentType === 'pdf'}>
                            <TextField
                              value={lesson.documentUrl}
                              onChange={(e) => updateLessonField(idx, 'documentUrl', e.target.value)}
                              placeholder="https://.../notes.pdf"
                            />
                          </FormField>
                          <FormField label="Document Name">
                            <TextField
                              value={lesson.documentName}
                              onChange={(e) => updateLessonField(idx, 'documentName', e.target.value)}
                              placeholder="e.g. Lesson Notes Cheatsheet"
                            />
                          </FormField>
                        </FormGrid>

                        {/* Direct Document Upload */}
                        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block">
                              Or Upload Document Directly (PDF, DOC, DOCX, TXT)
                            </span>
                          </div>
                          <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition shrink-0 ${
                            uploadingState[idx]?.uploading
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}>
                            <FiUpload className="w-3.5 h-3.5" />
                            <span>${uploadingState[idx]?.uploading && uploadingState[idx]?.type === 'pdf' ? `Uploading ${uploadingState[idx]?.progress}%` : 'Upload Document'}</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.rar,application/pdf"
                              className="hidden"
                              disabled={uploadingState[idx]?.uploading}
                              onChange={(e) => {
                                handleUploadForLesson(idx, 'pdf', e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {lesson.documentUrl && (
                          <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate">
                            ✓ Document uploaded: {lesson.documentName || lesson.documentUrl}
                          </div>
                        )}
                      </div>
                    )}

                    {lesson.contentType === 'resource' && (
                      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                        <FormGrid cols={2}>
                          <FormField label="Resource URL" required>
                            <TextField
                              value={lesson.resourceUrl}
                              onChange={(e) => updateLessonField(idx, 'resourceUrl', e.target.value)}
                              placeholder="https://github.com/..."
                            />
                          </FormField>
                          <FormField label="Resource Title">
                            <TextField
                              value={lesson.resourceTitle}
                              onChange={(e) => updateLessonField(idx, 'resourceTitle', e.target.value)}
                              placeholder="e.g. Code Repository"
                            />
                          </FormField>
                        </FormGrid>

                        {/* Direct Resource Upload */}
                        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block">
                              Or Upload Resource File (ZIP, Code, Cheatsheet)
                            </span>
                          </div>
                          <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition shrink-0 ${
                            uploadingState[idx]?.uploading
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}>
                            <FiUpload className="w-3.5 h-3.5" />
                            <span>${uploadingState[idx]?.uploading && uploadingState[idx]?.type === 'resource' ? 'Uploading...' : 'Upload File'}</span>
                            <input
                              type="file"
                              accept=".zip,.rar,.7z,.pdf,.doc,.docx,.txt,.js,.py,.html,.css,.json"
                              className="hidden"
                              disabled={uploadingState[idx]?.uploading}
                              onChange={(e) => {
                                handleUploadForLesson(idx, 'resource', e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {lesson.resourceUrl && (
                          <div className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 truncate">
                            ✓ Resource uploaded: {lesson.resourceTitle || lesson.resourceUrl}
                          </div>
                        )}
                      </div>
                    )}

                    {(lesson.contentType === 'text' || lesson.contentType === 'mixed') && (
                      <div className="p-4 bg-white rounded-xl border border-slate-200">
                        <FormField label="Text Content / Notes">
                          <TextArea
                            value={lesson.textContent}
                            onChange={(e) => updateLessonField(idx, 'textContent', e.target.value)}
                            placeholder="Enter rich study content, instructions, or code snippets..."
                            rows={3}
                          />
                        </FormField>
                      </div>
                    )}

                    {/* Duration & Settings */}
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                      <div className="w-48">
                        <FormField label="Duration (Minutes)">
                          <TextField
                            type="number"
                            min="0"
                            value={lesson.duration}
                            onChange={(e) => updateLessonField(idx, 'duration', e.target.value)}
                          />
                        </FormField>
                      </div>

                      <div className="flex items-center gap-6 pt-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={lesson.isFreePreview}
                            onChange={(e) => updateLessonField(idx, 'isFreePreview', e.target.checked)}
                            className="rounded text-primary-600 w-4 h-4"
                          />
                          <span>Allow Free Preview</span>
                        </label>

                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={lesson.isMandatory}
                            onChange={(e) => updateLessonField(idx, 'isMandatory', e.target.checked)}
                            className="rounded text-primary-600 w-4 h-4"
                          />
                          <span>Mandatory</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Another Lesson Button (Triggers auto-collapse of previous!) */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleAddAnotherLesson}
            className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/40 hover:bg-primary-50 text-xs font-bold text-primary-700 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <FiPlus className="w-4 h-4 text-primary-600" />
            <span>+ Add Another Lesson (Auto-collapses previous lesson)</span>
          </button>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate(`/admin/courses/${selectedCourseId}?courseTab=modules`)}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Saving to: <strong>{selectedModule?.title || 'Selected Module'}</strong>
            </span>
            <Button
              variant="primary"
              icon={FiCheckCircle}
              onClick={handleSaveAllLessons}
              loading={saving}
            >
              Save All {lessons.filter((l) => l.title.trim()).length} Lessons
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
