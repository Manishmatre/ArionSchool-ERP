// seed-test-data.js - Run this to create test chapters and topics
// Usage: node seed-test-data.js

const mongoose = require('mongoose');
const Chapter = require('./models/Chapter');
const Topic = require('./models/Topic');
const Course = require('./models/Course');
require('dotenv').config();

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
    console.log('✅ Connected to MongoDB');

    // Get existing courses or create test course
    let courses = await Course.find({ isActive: true }).limit(3);
    
    if (courses.length === 0) {
      console.log('ℹ️  No courses found. Creating test course...');
      const testCourse = await Course.create({
        title: 'Test Course for MCQs',
        courseCode: 'TEST-001',
        description: 'Test course for MCQ management',
        // Add other required fields based on your Course model
      });
      courses = [testCourse];
      console.log('✅ Created test course:', testCourse._id);
    } else {
      console.log(`ℹ️  Found ${courses.length} existing courses`);
    }

    // For each course, create chapters and topics
    for (const course of courses) {
      console.log(`\n📚 Processing course: ${course.title} (${course._id})`);
      
      // Check if chapters already exist for this course
      let existingChapters = await Chapter.find({ course: course._id, isActive: true });
      
      if (existingChapters.length === 0) {
        console.log(`   Creating chapters for ${course.title}...`);
        
        // Create chapters
        for (let i = 1; i <= 3; i++) {
          const chapter = await Chapter.create({
            title: `Chapter ${i}: Introduction to ${course.title}`,
            description: `This is chapter ${i} of ${course.title}. It covers fundamental concepts and principles.`,
            course: course._id,
            order: i,
            isActive: true,
            createdBy: '000000000000000000000000' // Admin user ID
          });
          console.log(`   ✅ Created Chapter ${i}: ${chapter._id}`);

          // Create topics for each chapter
          for (let j = 1; j <= 2; j++) {
            const topic = await Topic.create({
              title: `Topic ${i}.${j}: Lesson Content`,
              description: `This is topic ${i}.${j} under Chapter ${i}. It contains detailed learning material.`,
              chapter: chapter._id,
              order: j,
              isActive: true,
              createdBy: '000000000000000000000000' // Admin user ID
            });
            console.log(`      ✅ Created Topic ${i}.${j}: ${topic._id}`);
          }
        }
      } else {
        console.log(`   ℹ️  ${existingChapters.length} chapters already exist for this course`);
        
        // Show existing chapters and topics count
        for (const chapter of existingChapters) {
          const topicsCount = await Topic.countDocuments({ chapter: chapter._id, isActive: true });
          console.log(`      - ${chapter.title} (${topicsCount} topics)`);
        }
      }
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('✅ You can now add MCQs in the admin panel.');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Go to Academics → MCQs');
    console.log('2. Click "Add MCQ"');
    console.log('3. Select a Course → Chapters will load');
    console.log('4. Select a Chapter → Topics will load');
    console.log('5. Create your MCQ!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
