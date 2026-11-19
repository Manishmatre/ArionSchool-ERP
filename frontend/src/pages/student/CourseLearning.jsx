import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toAbsoluteUrl, getVideoEmbedUrl } from '../../utils/url';
import {
  FiPlayCircle, FiFileText, FiCheckCircle, FiCheck, FiChevronDown, FiChevronUp,
  FiArrowLeft, FiArrowRight, FiClock, FiBook, FiMaximize2, FiMinimize2,
  FiDownload, FiExternalLink, FiLayers, FiAward, FiShare2
} from 'react-icons/fi';
import { PageLoading, Card, Button, Badge } from '../../components/ui';
import StudentWatermark from '../../components/StudentWatermark';

// Helper to extract clean video URLs from any text or link (standard watch, shorts, embed, youtu.be)
function extractVideoUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const str = raw.trim();

  // 1. YouTube Match
  const ytMatch = str.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  }

  // 2. Vimeo Match
  const vimeoMatch = str.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d{6,})/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://vimeo.com/${vimeoMatch[1]}`;
  }

  // 3. Direct video file
  const directMatch = str.match(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|mov|mkv)(?:\?[^\s"'<>]*)?/i);
  if (directMatch) {
    return directMatch[0];
  }

  // 4. Fallback URL
  if (str.startsWith('http')) {
    return str.split('http')[1] ? `http${str.split('http')[1]}` : str;
  }

  return '';
}

// Format duration
function formatDuration(minutes) {
  const m = Number(minutes) || 0;
  if (m <= 0) return '15m';
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return `${hrs > 0 ? `${hrs}h ` : ''}${mins > 0 ? `${mins}m` : ''}`.trim();
}

// Clean raw URL dump from descriptions
function cleanDescription(desc) {
  if (!desc || typeof desc !== 'string') return '';
  const trimmed = desc.trim();
  if (trimmed.startsWith('http') && (trimmed.includes('youtu.be') || trimmed.includes('youtube.com'))) {
    return '';
  }
  return trimmed;
}

// Normalizer to unify Module & Lesson, Chapter & Topic, and course.curriculum
function normalizeLessonData(item, idx, moduleTitle = '') {
  const rawVideo = String(item.videoUrl || item.url || item.link || '').trim();
  const rawDesc = String(item.description || item.topicDescription || item.textContent || '').trim();
  const rawDoc = String(item.documentUrl || item.studyMaterialUrl || item.pdfUrl || '').trim();
  const rawResource = String(item.resourceUrl || item.resourceLink || '').trim();

  const foundVideo = extractVideoUrl(rawVideo) || extractVideoUrl(rawDesc);
  let resolvedType = item.contentType || 'video';
  let cleanVideo = rawVideo;

  if (foundVideo) {
    resolvedType = 'video';
    cleanVideo = foundVideo;
  } else if (rawDoc) {
    resolvedType = 'pdf';
  } else if (rawResource) {
    resolvedType = 'resource';
  } else if (item.textContent) {
    resolvedType = 'text';
  } else if (rawVideo) {
    resolvedType = 'video';
  }

  return {
    _id: String(item._id || `lesson-${idx}`),
    title: item.title || item.topicTitle || `Lesson ${idx + 1}`,
    description: cleanDescription(rawDesc),
    moduleTitle: moduleTitle || item.module?.title || '',
    contentType: resolvedType,
    videoUrl: cleanVideo,
    videoProvider: item.videoProvider || 'custom',
    documentUrl: rawDoc,
    documentName: item.documentName || item.studyMaterialName || '',
    resourceUrl: rawResource,
    resourceTitle: item.resourceTitle || '',
    textContent: item.textContent || '',
    duration: Number(item.duration) || 0,
    order: typeof item.order === 'number' ? item.order : idx + 1,
    isFreePreview: Boolean(item.isFreePreview)
  };
}

export default function CourseLearning() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [modulesList, setModulesList] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [theaterMode, setTheaterMode] = useState(false);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'materials' | 'resources'
  const [completing, setCompleting] = useState(false);

  // Load course content & enrollment
  useEffect(() => {
    async function loadCourseContent() {
      if (!courseId) return;
      try {
        setLoading(true);

        const [courseRes, enrolledRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get('/courses/my/enrolled').catch(() => ({ data: { data: [] } }))
        ]);

        const courseData = courseRes.data?.data || courseRes.data;
        setCourse(courseData);

        const enrolledList = enrolledRes.data?.data || enrolledRes.data || [];
        const currentEnrollment = enrolledList.find((e) => String(e.course?._id || e.course) === String(courseId)) || null;
        setEnrollment(currentEnrollment);

        let resolvedModules = [];

        // 1. Try modern Module & Lesson collections (first priority)
        try {
          const modRes = await api.get('/modules', { params: { course: courseId } });
          const rawMods = modRes.data?.data || modRes.data || [];

          if (Array.isArray(rawMods) && rawMods.length > 0) {
            const populated = await Promise.all(
              rawMods.map(async (m, mIdx) => {
                try {
                  const lRes = await api.get('/lessons', { params: { module: m._id } });
                  const rawLessons = lRes.data?.data || lRes.data || [];
                  return {
                    _id: String(m._id),
                    title: m.title || `Module ${m.order || mIdx + 1}`,
                    description: m.description || '',
                    duration: m.duration || 0,
                    order: m.order || mIdx + 1,
                    topics: rawLessons.map((l, lIdx) => normalizeLessonData(l, lIdx, m.title))
                  };
                } catch {
                  return {
                    _id: String(m._id),
                    title: m.title || `Module ${m.order || mIdx + 1}`,
                    description: m.description || '',
                    duration: m.duration || 0,
                    order: m.order || mIdx + 1,
                    topics: []
                  };
                }
              })
            );

            if (populated.some((m) => m.topics.length > 0)) {
              resolvedModules = populated;
            }
          }
        } catch (e) {
          console.warn('Could not load from modules collection:', e);
        }

        // 2. Fallback to embedded course.curriculum
        if (resolvedModules.length === 0 && Array.isArray(courseData?.curriculum) && courseData.curriculum.length > 0) {
          resolvedModules = courseData.curriculum.map((mod, mIdx) => ({
            _id: String(mod._id || `mod-${mIdx}`),
            title: mod.title || `Module ${mIdx + 1}`,
            description: mod.description || '',
            duration: mod.duration || 0,
            order: mIdx + 1,
            topics: (mod.topics || []).map((tp, tIdx) => normalizeLessonData(tp, tIdx, mod.title))
          }));
        }

        // 3. Fallback to legacy Chapter & Topic collections
        if (resolvedModules.length === 0) {
          try {
            const chRes = await api.get(`/chapters?course=${courseId}`);
            const rawChapters = chRes.data?.chapters || chRes.data?.data || [];

            if (Array.isArray(rawChapters) && rawChapters.length > 0) {
              const populatedChapters = await Promise.all(
                rawChapters.map(async (ch, chIdx) => {
                  try {
                    const tRes = await api.get(`/topics?chapter=${ch._id}`);
                    const rawTopics = tRes.data?.topics || tRes.data?.data || [];
                    return {
                      _id: String(ch._id),
                      title: ch.title || `Chapter ${chIdx + 1}`,
                      description: ch.description || '',
                      order: ch.order || chIdx + 1,
                      topics: rawTopics.map((tp, tIdx) => normalizeLessonData(tp, tIdx, ch.title))
                    };
                  } catch {
                    return {
                      _id: String(ch._id),
                      title: ch.title || `Chapter ${chIdx + 1}`,
                      topics: []
                    };
                  }
                })
              );
              resolvedModules = populatedChapters;
            }
          } catch (e) {
            console.warn('Could not load from chapters collection:', e);
          }
        }

        setModulesList(resolvedModules);

        // Select initial lesson
        if (resolvedModules.length > 0) {
          const completedSet = new Set((currentEnrollment?.completedTopics || []).map(String));
          let firstPending = null;
          let initialModuleId = resolvedModules[0]._id;

          for (const m of resolvedModules) {
            if (m.topics && m.topics.length > 0) {
              const pending = m.topics.find((t) => !completedSet.has(t._id));
              if (pending && !firstPending) {
                firstPending = pending;
                initialModuleId = m._id;
                break;
              }
            }
          }

          const targetLesson = firstPending || resolvedModules[0]?.topics?.[0] || null;
          if (targetLesson) {
            setActiveTopic(targetLesson);
            setExpandedModules({ [initialModuleId]: true });
          }
        }
      } catch (err) {
        console.error('Error fetching course content:', err);
        toast.error('Failed to load course curriculum');
      } finally {
        setLoading(false);
      }
    }

    loadCourseContent();
  }, [courseId]);

  // Completed IDs set
  const completedIds = useMemo(() => {
    return new Set((enrollment?.completedTopics || []).map(String));
  }, [enrollment]);

  // All lessons flattened
  const allLessons = useMemo(() => {
    return modulesList.flatMap((m) => m.topics || []);
  }, [modulesList]);

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => completedIds.has(l._id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Toggle module expansion
  const toggleModule = (modId) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  // Find adjacent topics
  const { prevLesson, nextLesson } = useMemo(() => {
    if (!activeTopic || allLessons.length === 0) return { prevLesson: null, nextLesson: null };
    const idx = allLessons.findIndex((l) => l._id === activeTopic._id);
    return {
      prevLesson: idx > 0 ? allLessons[idx - 1] : null,
      nextLesson: idx < allLessons.length - 1 ? allLessons[idx + 1] : null
    };
  }, [activeTopic, allLessons]);

  // Switch to lesson and auto-expand module
  const selectLesson = (lesson) => {
    setActiveTopic(lesson);
    const parentMod = modulesList.find((m) => (m.topics || []).some((t) => t._id === lesson._id));
    if (parentMod && !expandedModules[parentMod._id]) {
      setExpandedModules((prev) => ({ ...prev, [parentMod._id]: true }));
    }
  };

  // Mark as complete
  const handleMarkAsComplete = async () => {
    if (!activeTopic?._id) return;
    try {
      setCompleting(true);
      const res = await api.post(`/courses/${courseId}/topics/${activeTopic._id}/complete`);
      if (res.data?.success) {
        setEnrollment(res.data.data);
        toast.success(`Lesson "${activeTopic.title}" marked as complete!`);
        if (nextLesson) {
          selectLesson(nextLesson);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lesson progress');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading course lecture..." />
      </Layout>
    );
  }

  // Render hero media screen
  const renderHeroPlayer = () => {
    if (!activeTopic) {
      return (
        <div className="aspect-video w-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-8">
          <FiPlayCircle className="w-16 h-16 text-slate-600 mb-3 animate-pulse" />
          <p className="text-base font-semibold">Select a lesson from the syllabus to start watching.</p>
        </div>
      );
    }

    // A. Video Player (YouTube, Vimeo, HTML5 / Server video)
    if (activeTopic.contentType === 'video' || activeTopic.videoUrl) {
      let embedUrl = getVideoEmbedUrl(activeTopic.videoUrl);
      if (embedUrl && !embedUrl.includes('autoplay=')) {
        embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1';
      }

      return (
        <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-900 group">
          {embedUrl ? (
            <iframe
              key={`iframe_${activeTopic._id}_${activeTopic.videoUrl || ''}`}
              src={embedUrl}
              title={activeTopic.title}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation"
              className="w-full h-full"
            ></iframe>
          ) : activeTopic.videoUrl ? (
            <video
              key={`video_${activeTopic._id}_${activeTopic.videoUrl || ''}`}
              controls
              autoPlay
              playsInline
              src={toAbsoluteUrl(activeTopic.videoUrl)}
              className="w-full h-full object-contain"
            >
              Your browser does not support HTML5 video streaming.
            </video>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <FiPlayCircle className="w-14 h-14 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Video source URL will be updated soon.</p>
            </div>
          )}

          {/* Tamper-Resistant Anti-Recording Watermark */}
          <StudentWatermark variant="video" />
        </div>
      );
    }

    // B. PDF / Document Viewer
    if (activeTopic.contentType === 'pdf' || activeTopic.documentUrl) {
      const docUrl = toAbsoluteUrl(activeTopic.documentUrl);
      return (
        <div className="relative aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
          <div className="p-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
            <span className="text-xs font-semibold flex items-center gap-2 truncate">
              <FiFileText className="text-amber-400" />
              {activeTopic.documentName || activeTopic.title}
            </span>
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition inline-flex items-center gap-1"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>
          </div>
          <div className="flex-1 relative">
            <iframe src={docUrl} width="100%" height="100%" title={activeTopic.title} className="w-full h-full border-0"></iframe>
            <StudentWatermark variant="video" />
          </div>
        </div>
      );
    }

    // C. Resource / External Link
    if (activeTopic.contentType === 'resource' || activeTopic.resourceUrl) {
      return (
        <div className="aspect-video w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl flex flex-col items-center justify-center text-white p-8 border border-indigo-900/50 shadow-2xl text-center relative overflow-hidden">
          <FiLayers className="w-16 h-16 text-indigo-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{activeTopic.resourceTitle || activeTopic.title}</h3>
          <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
            This lesson includes external practical code exercises, repositories, or reference materials.
          </p>
          <a
            href={activeTopic.resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold text-xs uppercase tracking-wider transition inline-flex items-center gap-2 shadow-lg shadow-primary-900/40"
          >
            <span>Open External Resource</span>
            <FiExternalLink className="w-4 h-4" />
          </a>
          <StudentWatermark variant="video" />
        </div>
      );
    }

    // D. Rich Text Guide
    return (
      <div className="relative aspect-video w-full bg-white rounded-2xl p-6 sm:p-8 overflow-y-auto border border-slate-200 shadow-md">
        <h2 className="text-xl font-bold text-slate-900 mb-4">{activeTopic.title}</h2>
        <div
          className="prose max-w-none text-slate-700 leading-relaxed text-sm"
          dangerouslySetInnerHTML={{ __html: activeTopic.textContent || activeTopic.description || 'Lecture guide and notes.' }}
        />
        <StudentWatermark variant="page" />
      </div>
    );
  };

  const isCurrentCompleted = activeTopic ? completedIds.has(activeTopic._id) : false;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header & Navigation Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-primary-950 to-indigo-950 text-white p-4 sm:p-6 shadow-xl border border-slate-800">
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/student/courses/${courseId}`)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-300 hover:text-white transition mb-2"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Course Home</span>
              </button>

              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">
                {course?.title || 'Interactive Course Workspace'}
              </h1>

              <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-2 text-xs font-medium text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <FiBook className="text-primary-400" />
                  {modulesList.length} {modulesList.length === 1 ? 'Module' : 'Modules'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FiCheckCircle className="text-emerald-400" />
                  {completedCount}/{totalLessons} Lessons Completed
                </span>
                {course?.totalDuration ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FiClock className="text-amber-400" />
                    {formatDuration(course.totalDuration)}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Overall Course Progress */}
            <div className="lg:text-right shrink-0">
              <div className="flex items-center justify-between lg:justify-end gap-3 mb-1.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Progress</span>
                <span className="text-base font-extrabold text-emerald-400">{progressPct}%</span>
              </div>
              <div className="w-full lg:w-52 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Learning Workspace Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT: Spacious Video Screen & Lesson Workspace */}
          <div className={`${theaterMode ? 'xl:col-span-12' : 'xl:col-span-8'} space-y-4 transition-all duration-300`}>
            {/* 1. HERO VIDEO SCREEN */}
            {renderHeroPlayer()}

            {/* 2. LESSON ACTION BAR & HEADER */}
            {activeTopic && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Lesson Meta Badges & Title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                        {activeTopic.contentType === 'video' ? 'Video Lecture' : activeTopic.contentType.toUpperCase()}
                      </span>

                      {activeTopic.duration > 0 && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 flex items-center gap-1">
                          <FiClock className="w-3 h-3 text-slate-500" />
                          {formatDuration(activeTopic.duration)}
                        </span>
                      )}

                      {activeTopic.moduleTitle && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-primary-50 text-primary-700 truncate max-w-[200px]">
                          {activeTopic.moduleTitle}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                      {activeTopic.title}
                    </h2>
                  </div>

                  {/* Actions: Theater Toggle & Complete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTheaterMode(!theaterMode)}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-primary-700 hover:bg-slate-50 transition"
                      title={theaterMode ? 'Exit Theater Mode' : 'Spacious Theater Mode'}
                    >
                      {theaterMode ? <FiMinimize2 className="w-4 h-4" /> : <FiMaximize2 className="w-4 h-4" />}
                    </button>

                    {isCurrentCompleted ? (
                      <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5">
                        <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <Button
                        variant="success"
                        icon={FiCheck}
                        onClick={handleMarkAsComplete}
                        disabled={completing}
                        className="shadow-sm"
                      >
                        {completing ? 'Saving...' : 'Mark as Complete'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Previous & Next Navigation Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FiArrowLeft}
                    onClick={() => prevLesson && selectLesson(prevLesson)}
                    disabled={!prevLesson}
                  >
                    Previous Lesson
                  </Button>

                  <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>Lesson {allLessons.findIndex((l) => l._id === activeTopic._id) + 1} of {totalLessons}</span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    iconRight={FiArrowRight}
                    onClick={() => nextLesson && selectLesson(nextLesson)}
                    disabled={!nextLesson}
                  >
                    Next Lesson
                  </Button>
                </div>
              </div>
            )}

            {/* 3. LESSON TABS: NOTES & MATERIALS */}
            {activeTopic && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex items-center border-b border-slate-200 px-4 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                      activeTab === 'notes'
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FiFileText className="w-3.5 h-3.5" />
                    <span>Lesson Notes & Overview</span>
                  </button>

                  {(activeTopic.documentUrl || activeTopic.pdfUrl) && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('materials')}
                      className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                        activeTab === 'materials'
                          ? 'border-amber-600 text-amber-800'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      <span>Study Materials & PDF</span>
                    </button>
                  )}

                  {activeTopic.resourceUrl && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('resources')}
                      className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                        activeTab === 'resources'
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FiExternalLink className="w-3.5 h-3.5" />
                      <span>Resources & Links</span>
                    </button>
                  )}
                </div>

                {/* Tab Contents */}
                <div className="p-5 md:p-6 text-sm text-slate-700 leading-relaxed">
                  {activeTab === 'notes' && (
                    <div className="space-y-3">
                      {activeTopic.description ? (
                        <p className="whitespace-pre-line text-slate-600">{activeTopic.description}</p>
                      ) : activeTopic.textContent ? (
                        <div
                          className="prose max-w-none text-slate-700"
                          dangerouslySetInnerHTML={{ __html: activeTopic.textContent }}
                        />
                      ) : (
                        <p className="text-slate-400 italic">
                          Follow along with this video lecture and practice the examples demonstrated by your instructor.
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === 'materials' && (activeTopic.documentUrl || activeTopic.pdfUrl) && (
                    <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">
                            {activeTopic.documentName || 'Lecture Notes & Study Material'}
                          </p>
                          <p className="text-[11px] text-slate-500">Official companion document for this session</p>
                        </div>
                      </div>
                      <a
                        href={toAbsoluteUrl(activeTopic.documentUrl || activeTopic.pdfUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition inline-flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <FiDownload className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  )}

                  {activeTab === 'resources' && activeTopic.resourceUrl && (
                    <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <FiExternalLink className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">
                            {activeTopic.resourceTitle || 'External Reference Repository'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{activeTopic.resourceUrl}</p>
                        </div>
                      </div>
                      <a
                        href={activeTopic.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition inline-flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <span>Visit Link</span>
                        <FiExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Course Curriculum Syllabus Sidebar */}
          {!theaterMode && (
            <div className="xl:col-span-4 sticky top-6 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* Sidebar Header */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FiLayers className="text-primary-600" />
                      <span>Course Syllabus</span>
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                      {completedCount}/{totalLessons}
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Modules & Lessons Accordion List */}
                <div className="max-h-[calc(100vh-210px)] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {modulesList.map((mod, mIdx) => {
                    const isExpanded = expandedModules[mod._id];
                    const modLessons = mod.topics || [];
                    const modDone = modLessons.filter((l) => completedIds.has(l._id)).length;
                    const allDone = modLessons.length > 0 && modDone === modLessons.length;

                    return (
                      <div key={mod._id} className="bg-white">
                        {/* Module Header Bar */}
                        <button
                          type="button"
                          onClick={() => toggleModule(mod._id)}
                          className="w-full text-left p-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                allDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {allDone ? '✓' : mIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{mod.title}</p>
                              <p className="text-[10px] text-slate-400">
                                {modDone}/{modLessons.length} done
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400 shrink-0">
                            {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* Module Lessons List */}
                        {isExpanded && (
                          <div className="bg-slate-50/60 divide-y divide-slate-100/80">
                            {modLessons.map((lesson, lIdx) => {
                              const isCompleted = completedIds.has(lesson._id);
                              const isActive = activeTopic?._id === lesson._id;

                              return (
                                <button
                                  type="button"
                                  key={lesson._id}
                                  onClick={() => selectLesson(lesson)}
                                  className={`w-full text-left p-3 pl-8 flex items-center justify-between gap-3 transition border-l-4 ${
                                    isActive
                                      ? 'border-primary-600 bg-primary-50/80 text-primary-900 font-bold'
                                      : 'border-transparent hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="shrink-0">
                                      {isCompleted ? (
                                        <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                                      ) : lesson.contentType === 'video' ? (
                                        <FiPlayCircle className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                                      ) : (
                                        <FiFileText className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs truncate">{lesson.title}</p>
                                      {lesson.duration > 0 && (
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                          <FiClock className="w-2.5 h-2.5" />
                                          {formatDuration(lesson.duration)}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {isActive && (
                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-primary-600 text-white">
                                      Playing
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
