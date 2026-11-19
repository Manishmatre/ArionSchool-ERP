import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  FiBook, FiLayers, FiFileText, FiClock, FiCheckCircle, FiArrowRight,
  FiVideo, FiLink, FiAlignLeft, FiPlayCircle, FiEye, FiChevronDown, FiChevronRight,
  FiExternalLink, FiMaximize2, FiMinimize2
} from 'react-icons/fi';
import { Card, Button, Badge, Modal } from '../../../components/ui';
import { getVideoEmbedUrl, toAbsoluteUrl } from '../../../utils/url';

export default function CourseSyllabusTab({ course, modules = [], onSwitchToCurriculum }) {
  const { user } = useAuth();
  const canManage = user?.role === 'super_admin' || user?.role === 'admin';
  const [expandedModules, setExpandedModules] = useState(() => {
    const initial = {};
    modules.forEach((m, idx) => {
      initial[m._id || idx] = true; // start expanded by default
    });
    return initial;
  });

  const [previewLesson, setPreviewLesson] = useState(null);

  const toggleModule = (id) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded = modules.length > 0 && modules.every((module, idx) => expandedModules[module._id || idx]);
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedModules({});
      return;
    }
    const all = {};
    modules.forEach((m, idx) => {
      all[m._id || idx] = true;
    });
    setExpandedModules(all);
  };

  // Metric calculations
  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const totalMinutes = modules.reduce(
    (sum, m) => sum + (m.lessons || []).reduce((inner, l) => {
      const dur = Number(l.duration) || 0;
      return inner + (dur > 0 ? dur : (l.contentType === 'video' ? 15 : 10));
    }, 0),
    0
  );
  const durationText = totalMinutes > 60
    ? `${(totalMinutes / 60).toFixed(1)} Hours`
    : `${totalMinutes} Minutes`;

  // Count videos and pdfs
  let totalVideos = 0;
  let totalPdfs = 0;
  modules.forEach((m) => {
    (m.lessons || []).forEach((l) => {
      const hasVideo = l.contentType === 'video' || Boolean(getVideoEmbedUrl(l.videoUrl || l.description || l.textContent));
      if (hasVideo) totalVideos++;
      else if (l.contentType === 'pdf' || l.documentUrl) totalPdfs++;
    });
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-800">Course Syllabus Summary</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Read-Only Curriculum
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Official sequence of learning modules and lessons configured for <strong>{course?.title}</strong>.
            {canManage && ' To add, reorder, or update learning materials, switch to the Modules & Lessons tab.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={toggleAll} icon={allExpanded ? FiMinimize2 : FiMaximize2}>
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>

          {canManage && (
            <Button
              variant="primary"
              icon={FiArrowRight}
              onClick={onSwitchToCurriculum}
            >
              Manage Modules & Lessons
            </Button>
          )}
        </div>
      </div>

      {/* 2. Syllabus Metadata Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <FiLayers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Total Modules</p>
            <p className="text-base font-bold text-slate-800">{modules.length}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FiFileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Total Lessons</p>
            <p className="text-base font-bold text-slate-800">{totalLessons}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <FiPlayCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Video Lessons</p>
            <p className="text-base font-bold text-slate-800">{totalVideos}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FiClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Estimated Duration</p>
            <p className="text-base font-bold text-slate-800">{durationText}</p>
          </div>
        </div>
      </div>

      {/* 3. Modules & Lessons Sequence List */}
      {modules.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <FiBook className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">No syllabus entries found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            No modules have been configured for this course yet.
          </p>
          <Button variant="primary" onClick={onSwitchToCurriculum}>
            Create Modules Now
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, modIdx) => {
            const modKey = mod._id || modIdx;
            const isExpanded = Boolean(expandedModules[modKey]);
            const lessons = mod.lessons || [];

            const modMinutes = lessons.reduce((sum, l) => {
              const dur = Number(l.duration) || 0;
              return sum + (dur > 0 ? dur : (l.contentType === 'video' ? 15 : 10));
            }, 0);

            const modDurationFormatted = modMinutes > 60
              ? `${(modMinutes / 60).toFixed(1)} hrs`
              : `${modMinutes} mins`;

            return (
              <div
                key={modKey}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition"
              >
                {/* Module Bar */}
                <div
                  onClick={() => toggleModule(modKey)}
                  className="p-4 md:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 transition shrink-0"
                    >
                      {isExpanded ? (
                        <FiChevronDown className="w-5 h-5 text-primary-600" />
                      ) : (
                        <FiChevronRight className="w-5 h-5" />
                      )}
                    </button>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary-100 text-primary-800 border border-primary-200 shrink-0">
                      Module {String(mod.order || modIdx + 1).padStart(2, '0')}
                    </span>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{mod.title}</h3>
                      {mod.description && (
                        <p className="text-xs text-slate-500 truncate max-w-xl mt-0.5">
                          {mod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 pl-8 md:pl-0 shrink-0">
                    <span className="font-medium text-slate-700">
                      {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <FiClock className="w-3.5 h-3.5 text-amber-600" /> {modDurationFormatted}
                    </span>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwitchToCurriculum();
                      }}
                      className="text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1 hover:underline ml-1"
                    >
                      <span>Manage</span>
                      <FiArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Lessons List Inside Module */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100 bg-white">
                    {lessons.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-4 text-center">
                        No lessons added to this module yet.
                      </p>
                    ) : (
                      lessons.map((lesson, lIdx) => {
                        const hasVideo = lesson.contentType === 'video' || Boolean(getVideoEmbedUrl(lesson.videoUrl || lesson.description || lesson.textContent));
                        const hasPdf = lesson.contentType === 'pdf' || Boolean(lesson.documentUrl);
                        const lessonDuration = Number(lesson.duration) || (hasVideo ? 15 : 10);

                        return (
                          <div
                            key={lesson._id || lIdx}
                            className="p-3.5 md:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-slate-50/50 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="text-slate-400 font-bold w-6 text-right shrink-0">
                                {String(lIdx + 1).padStart(2, '0')}.
                              </span>

                              {/* Content Type Icon */}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                hasVideo
                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                  : hasPdf
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              }`}>
                                {hasVideo ? (
                                  <FiPlayCircle className="w-4 h-4" />
                                ) : hasPdf ? (
                                  <FiFileText className="w-4 h-4" />
                                ) : (
                                  <FiAlignLeft className="w-4 h-4" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 text-sm truncate">
                                    {lesson.title}
                                  </span>
                                  {lesson.isFreePreview && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                      Free Preview
                                    </span>
                                  )}
                                </div>
                                {lesson.description && !lesson.description.startsWith('http') && (
                                  <p className="text-slate-400 text-[11px] truncate max-w-lg mt-0.5">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right: Badges & Preview Action */}
                            <div className="flex items-center gap-3 pl-9 sm:pl-0 shrink-0 justify-end">
                              <span className="text-slate-500 font-medium flex items-center gap-1 font-mono text-[11px]">
                                <FiClock className="w-3 h-3 text-slate-400" />
                                {lessonDuration} mins
                              </span>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                hasVideo
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : hasPdf
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {hasVideo ? 'Video' : hasPdf ? 'PDF' : 'Notes'}
                              </span>

                              <button
                                type="button"
                                onClick={() => setPreviewLesson(lesson)}
                                className="px-2.5 py-1 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition inline-flex items-center gap-1 border border-primary-200/80"
                                title="Preview Content"
                              >
                                <FiEye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Lesson Content Preview Modal */}
      <Modal
        open={Boolean(previewLesson)}
        onClose={() => setPreviewLesson(null)}
        title={previewLesson?.title || 'Lesson Content Preview'}
        size="lg"
      >
        {previewLesson && (() => {
          const videoEmbed = getVideoEmbedUrl(
            previewLesson.videoUrl ||
            previewLesson.textContent ||
            previewLesson.description
          );

          const hasDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(previewLesson.videoUrl || '');
          const isVideo = Boolean(videoEmbed || hasDirectVideo || previewLesson.contentType === 'video');

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-500">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                  isVideo ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {isVideo ? 'Video Lecture' : previewLesson.contentType || 'Learning Content'}
                </span>

                <span className="font-medium font-mono text-slate-600">
                  {previewLesson.duration || (isVideo ? 15 : 10)} mins
                </span>
              </div>

              {/* Video Player */}
              {videoEmbed ? (
                <div className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800">
                  <iframe
                    src={videoEmbed}
                    title={previewLesson.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : hasDirectVideo ? (
                <div className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800">
                  <video
                    controls
                    src={toAbsoluteUrl(previewLesson.videoUrl)}
                    className="w-full h-full"
                  />
                </div>
              ) : null}

              {/* PDF Document Preview */}
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

              {/* Description/Notes (only if not raw video URL) */}
              {previewLesson.description && !previewLesson.description.startsWith('http') && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <strong className="block text-slate-900 mb-1">Description:</strong>
                  {previewLesson.description}
                </div>
              )}

              {/* Text content (only if not raw video URL) */}
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
