const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');

const updateCourseProgress = async (userId, courseId) => {
  try {
    // 1. Find all topics for the given course
    const chapters = await Chapter.find({ course: courseId, isActive: true });
    const chapterIds = chapters.map(c => c._id);
    const topics = await Topic.find({ chapter: { $in: chapterIds }, isActive: true });
    const topicIds = topics.map(t => t._id);

    if (topicIds.length === 0) {
      return; // No topics in the course, so progress is 0
    }

    // 2. Find all completed topics for the student in that course
    const progressRecords = await Progress.find({ student: userId, topic: { $in: topicIds }, videoWatched: true });
    const completedTopicsCount = progressRecords.length;

    // 3. Calculate the progress percentage
    const totalTopicsCount = topics.length;
    const progressPercentage = totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

    // 4. Find the corresponding enrollment and update it
    const enrollment = await Enrollment.findOne({ student: userId, course: courseId });

    if (enrollment) {
      enrollment.progress = progressPercentage;
      if (progressPercentage === 100) {
        enrollment.completionDate = new Date();
        enrollment.status = 'completed';
      }
      await enrollment.save();
    }
  } catch (error) {
    console.error(`Error updating course progress for user ${userId} and course ${courseId}:`, error);
  }
};

module.exports = { updateCourseProgress };
