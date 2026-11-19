const mongoose = require('mongoose');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const Course = require('../models/Course');
const MCQ = require('../models/MCQ');

// In-memory cache of synced courses to prevent redundant DB writes on every read
const syncedCoursesCache = new Set();

/**
 * Robust helper to extract and clean video URLs from any text or link.
 * Handles single URLs, query params, and malformed concatenated URLs.
 */
function extractVideoInfo(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const str = rawText.trim();
  if (!str) return null;

  // 1. YouTube (standard watch, shorts, embed, youtu.be)
  const ytMatch = str.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      contentType: 'video',
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      videoId,
      provider: 'youtube'
    };
  }

  // 2. Vimeo
  const vimeoMatch = str.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d{6,})/i);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      contentType: 'video',
      videoUrl: `https://vimeo.com/${videoId}`,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      videoId,
      provider: 'vimeo'
    };
  }

  // 3. Direct video file (mp4, webm, ogg)
  const directMatch = str.match(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|ogg)(?:\?[^\s"'<>]*)?/i);
  if (directMatch) {
    return {
      contentType: 'video',
      videoUrl: directMatch[0],
      embedUrl: directMatch[0],
      provider: 'custom'
    };
  }

  // 4. Google Drive video preview
  const driveMatch = str.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return {
      contentType: 'video',
      videoUrl: `https://drive.google.com/file/d/${fileId}/view`,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      videoId: fileId,
      provider: 'drive'
    };
  }

  return null;
}

/**
 * Analyzes topic/lesson content to accurately determine type, clean URLs, and duration
 */
function resolveLessonAttributes(tp) {
  const rawVideo = String(tp.videoUrl || tp.url || tp.link || '').trim();
  const rawDesc = String(tp.description || tp.topicDescription || tp.textContent || '').trim();
  const rawPdf = String(tp.studyMaterialUrl || tp.pdfUrl || tp.documentUrl || '').trim();

  const videoFound = extractVideoInfo(rawVideo) || extractVideoInfo(rawDesc);

  let contentType = tp.contentType || 'text';
  let videoUrl = '';
  let videoProvider = 'custom';
  let documentUrl = rawPdf;
  let textContent = tp.textContent || '';
  let description = tp.description || tp.topicDescription || '';

  if (videoFound) {
    contentType = 'video';
    videoUrl = videoFound.videoUrl;
    videoProvider = videoFound.provider;
    // If description was just a pasted raw URL, clean it up
    if (description.startsWith('http') && description.includes(videoFound.videoId || 'youtu')) {
      description = '';
    }
    if (textContent.startsWith('http') && textContent.includes(videoFound.videoId || 'youtu')) {
      textContent = '';
    }
  } else if (rawPdf) {
    contentType = 'pdf';
  } else if (tp.contentType) {
    contentType = tp.contentType;
  }

  // Duration: ensure positive minutes (default 15 mins for videos, 10 mins for others if 0)
  let duration = Number(tp.duration) || 0;
  if (duration <= 0) {
    duration = contentType === 'video' ? 15 : 10;
  }

  return {
    contentType,
    videoUrl,
    videoProvider,
    documentUrl,
    documentName: tp.studyMaterialName || tp.documentName || '',
    textContent,
    description,
    duration
  };
}

/**
 * Ensures course curriculum is synchronized across:
 * - Module collection
 * - Lesson collection
 * - Legacy Chapter & Topic collections
 * - MCQ references
 *
 * Fast exit in <1ms if already populated unless force=true.
 */
async function ensureCourseCurriculumSynced(courseId, force = false) {
  if (!courseId) return;
  const cIdStr = String(courseId);

  // Fast in-memory cache check: if checked during this process lifecycle and not forced, return immediately!
  if (!force && syncedCoursesCache.has(cIdStr)) {
    return;
  }

  try {
    const courseDoc = await Course.findById(courseId).select('title curriculum trainers primaryTrainer');
    if (!courseDoc) return;

    const moduleCount = await Module.countDocuments({ course: courseId });

    // FAST EXIT: If course already has modules and not forced, register cache and exit in 1ms!
    if (!force && moduleCount > 0) {
      syncedCoursesCache.add(cIdStr);
      return;
    }

    const chapterCount = await Chapter.countDocuments({ course: courseId });
    const hasEmbeddedCurriculum = Array.isArray(courseDoc.curriculum) && courseDoc.curriculum.length > 0;

    // Case 1: Convert legacy Chapter & Topic records to Module & Lesson
    if (chapterCount > 0 && (moduleCount === 0 || force)) {
      const chapters = await Chapter.find({ course: courseId }).sort({ order: 1, createdAt: 1 });
      for (const ch of chapters) {
        const topics = await Topic.find({ chapter: ch._id }).sort({ order: 1, createdAt: 1 });
        let totalModDuration = 0;

        for (const tp of topics) {
          const attrs = resolveLessonAttributes(tp);
          totalModDuration += attrs.duration;

          await Lesson.findByIdAndUpdate(
            tp._id,
            {
              $set: {
                title: tp.title,
                description: attrs.description,
                course: courseId,
                module: ch._id,
                order: tp.order || 1,
                contentType: attrs.contentType,
                videoUrl: attrs.videoUrl,
                videoProvider: attrs.videoProvider,
                documentUrl: attrs.documentUrl,
                documentName: attrs.documentName,
                textContent: attrs.textContent,
                duration: attrs.duration,
                status: tp.isActive !== false ? 'active' : 'inactive',
                publicationStatus: 'published',
                updatedAt: new Date()
              },
              $setOnInsert: {
                _id: tp._id,
                createdAt: tp.createdAt || new Date()
              }
            },
            { upsert: true, new: true }
          );
        }

        await Module.findByIdAndUpdate(
          ch._id,
          {
            $set: {
              title: ch.title,
              description: ch.description || '',
              course: courseId,
              order: ch.order || 1,
              duration: totalModDuration,
              durationUnit: 'minutes',
              status: ch.isActive !== false ? 'active' : 'inactive',
              publicationStatus: 'published',
              updatedAt: new Date()
            },
            $setOnInsert: {
              _id: ch._id,
              createdAt: ch.createdAt || new Date()
            }
          },
          { upsert: true, new: true }
        );
      }

      await syncCourseMCQs(courseId);
      syncedCoursesCache.add(cIdStr);
      return;
    }

    // Case 2: Convert embedded course.curriculum to Module & Lesson
    if (hasEmbeddedCurriculum && (moduleCount === 0 || force)) {
      for (let mIdx = 0; mIdx < courseDoc.curriculum.length; mIdx++) {
        const item = courseDoc.curriculum[mIdx];
        const modId = item._id || new mongoose.Types.ObjectId();
        const topics = item.topics || [];
        let totalModDuration = 0;

        for (let tIdx = 0; tIdx < topics.length; tIdx++) {
          const tp = topics[tIdx];
          const lessonId = tp._id || new mongoose.Types.ObjectId();
          const attrs = resolveLessonAttributes(tp);
          totalModDuration += attrs.duration;

          await Lesson.findByIdAndUpdate(
            lessonId,
            {
              $set: {
                title: tp.topicTitle || tp.title,
                description: attrs.description,
                course: courseId,
                module: modId,
                order: tp.order || (tIdx + 1),
                contentType: attrs.contentType,
                videoUrl: attrs.videoUrl,
                videoProvider: attrs.videoProvider,
                documentUrl: attrs.documentUrl,
                documentName: attrs.documentName,
                textContent: attrs.textContent,
                duration: attrs.duration,
                status: 'active',
                publicationStatus: 'published',
                updatedAt: new Date()
              },
              $setOnInsert: {
                _id: lessonId,
                createdAt: new Date()
              }
            },
            { upsert: true, new: true }
          );

          // Mirror to legacy Topic
          await Topic.findByIdAndUpdate(
            lessonId,
            {
              $set: {
                title: tp.topicTitle || tp.title,
                description: attrs.description || 'Lesson topic',
                chapter: modId,
                order: tp.order || (tIdx + 1),
                videoUrl: attrs.videoUrl,
                studyMaterialUrl: attrs.documentUrl,
                duration: attrs.duration,
                isActive: true,
                createdBy: courseDoc.trainers?.[0] || courseDoc.primaryTrainer || new mongoose.Types.ObjectId()
              },
              $setOnInsert: { _id: lessonId }
            },
            { upsert: true }
          );
        }

        await Module.findByIdAndUpdate(
          modId,
          {
            $set: {
              title: item.title,
              description: item.description || '',
              course: courseId,
              order: mIdx + 1,
              duration: totalModDuration,
              durationUnit: 'minutes',
              status: 'active',
              publicationStatus: 'published',
              updatedAt: new Date()
            },
            $setOnInsert: {
              _id: modId,
              createdAt: new Date()
            }
          },
          { upsert: true, new: true }
        );

        // Mirror to legacy Chapter
        await Chapter.findByIdAndUpdate(
          modId,
          {
            $set: {
              title: item.title,
              description: item.description || 'Module curriculum',
              course: courseId,
              order: mIdx + 1,
              isActive: true,
              createdBy: courseDoc.trainers?.[0] || courseDoc.primaryTrainer || new mongoose.Types.ObjectId()
            },
            $setOnInsert: { _id: modId }
          },
          { upsert: true }
        );
      }

      await syncCourseMCQs(courseId);
      syncedCoursesCache.add(cIdStr);
      return;
    }

    // Case 3: If forced and modules already exist, re-scan lessons to fix video detection
    if (force && moduleCount > 0) {
      const lessons = await Lesson.find({ course: courseId });
      for (const lsn of lessons) {
        const attrs = resolveLessonAttributes(lsn);
        if (attrs.contentType !== lsn.contentType || attrs.videoUrl !== lsn.videoUrl || (lsn.duration || 0) <= 0) {
          lsn.contentType = attrs.contentType;
          lsn.videoUrl = attrs.videoUrl || lsn.videoUrl;
          lsn.videoProvider = attrs.videoProvider;
          lsn.duration = attrs.duration;
          await lsn.save();
        }
      }
    }

    syncedCoursesCache.add(cIdStr);
  } catch (err) {
    console.error('ensureCourseCurriculumSynced error:', err);
  }
}

/**
 * Ensures all MCQs for a course link module & chapter, lesson & topic bidirectionally
 */
async function syncCourseMCQs(courseId) {
  try {
    const mcqs = await MCQ.find({ course: courseId });
    for (const mcq of mcqs) {
      let changed = false;
      if (mcq.chapter && !mcq.module) {
        mcq.module = mcq.chapter;
        changed = true;
      }
      if (mcq.topic && !mcq.lesson) {
        mcq.lesson = mcq.topic;
        changed = true;
      }
      if (mcq.module && !mcq.chapter) {
        mcq.chapter = mcq.module;
        changed = true;
      }
      if (mcq.lesson && !mcq.topic) {
        mcq.topic = mcq.lesson;
        changed = true;
      }
      if (changed) {
        await mcq.save();
      }
    }
  } catch (e) {
    console.error('syncCourseMCQs error:', e);
  }
}

/**
 * Sync curriculum for all courses in database (forced)
 */
async function syncAllCoursesCurriculum() {
  try {
    const courses = await Course.find({}).select('_id title');
    let synced = 0;
    for (const c of courses) {
      await ensureCourseCurriculumSynced(c._id, true);
      synced++;
    }
    return synced;
  } catch (err) {
    console.error('syncAllCoursesCurriculum error:', err);
    return 0;
  }
}

module.exports = {
  extractVideoInfo,
  resolveLessonAttributes,
  ensureCourseCurriculumSynced,
  syncCourseMCQs,
  syncAllCoursesCurriculum
};
