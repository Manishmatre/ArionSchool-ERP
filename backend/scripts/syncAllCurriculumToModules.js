/**
 * Script to synchronize all courses, chapters, topics, and curriculum into
 * the unified Course -> Modules -> Lessons architecture with smart video detection.
 *
 * Usage:
 *   node scripts/syncAllCurriculumToModules.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const MCQ = require('../models/MCQ');
const { ensureCourseCurriculumSynced } = require('../utils/curriculumBridge');

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/edutest-pro';
  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  console.log('Connected to MongoDB successfully.');

  const courses = await Course.find({}).select('_id title courseCode');
  console.log(`Found ${courses.length} courses to inspect and synchronize.\n`);

  let totalModules = 0;
  let totalLessons = 0;
  let totalVideoLessons = 0;
  let totalCoursesSynced = 0;

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    console.log(`[${i + 1}/${courses.length}] Synchronizing curriculum for: "${course.title}" (${course.courseCode || course._id})...`);

    // Force sync to re-detect videos, durations, and MCQ links
    await ensureCourseCurriculumSynced(course._id, true);

    const mCount = await Module.countDocuments({ course: course._id });
    const lCount = await Lesson.countDocuments({ course: course._id });
    const vCount = await Lesson.countDocuments({ course: course._id, contentType: 'video' });
    const mcqCount = await MCQ.countDocuments({ course: course._id });

    totalModules += mCount;
    totalLessons += lCount;
    totalVideoLessons += vCount;
    totalCoursesSynced++;

    console.log(`   -> Result: ${mCount} Modules | ${lCount} Lessons (${vCount} Videos) | ${mcqCount} MCQs linked.\n`);
  }

  console.log('====================================================');
  console.log('Curriculum & Video Synchronization Summary:');
  console.log(`Courses Processed: ${totalCoursesSynced}`);
  console.log(`Total Modules in System: ${totalModules}`);
  console.log(`Total Lessons in System: ${totalLessons}`);
  console.log(`Total Video Lessons: ${totalVideoLessons}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB. Synchronization complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error during synchronization:', err);
  process.exit(1);
});
