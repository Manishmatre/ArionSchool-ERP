const Course = require('../models/Course');
const Topic = require('../models/Topic');
const Exam = require('../models/Exam');
const User = require('../models/User');
const Student = require('../models/Student');
const Franchise = require('../models/SchoolCampus');
const Staff = require('../models/Staff');
const { isSchoolTenantUser, getSchoolTenantId } = require('../utils/tenantAccess');

const searchController = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        courses: [],
        topics: [],
        tests: [],
        users: []
      });
    }

    const searchQuery = q.trim();
    const user = req.user;

    // Initialize results
    let courses = [];
    let topics = [];
    let tests = [];
    let users = [];

    try {
      // Search courses - basic search without complex filtering
      const courseQuery = {
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { shortDescription: { $regex: searchQuery, $options: 'i' } },
          { fullDescription: { $regex: searchQuery, $options: 'i' } }
        ]
      };
      
      // For students, don't filter courses in search - let them see all available courses
      // For school admins, filter by their assigned courses
      if (isSchoolTenantUser(user)) {
        const schoolId = getSchoolTenantId(user);
        const franchise = schoolId ? await Franchise.findById(schoolId) : null;
        if (franchise) {
          courseQuery.$and = [
            {
              $or: [
                { _id: { $in: franchise.courses || [] } },
                { _id: { $in: franchise.additionalCourses || [] } }
              ]
            }
          ];
        } else courseQuery._id = { $in: [] };
      }
      
      courses = await Course.find(courseQuery)
        .populate('program')
        .limit(10)
        .lean();
    } catch (courseError) {
      console.log('Course search error:', courseError.message);
      courses = [];
    }

    try {
      // Search topics - basic search
      const topicQuery = {
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      };
      
      topics = await Topic.find(topicQuery)
        .populate({
          path: 'chapter',
          populate: {
            path: 'course'
          }
        })
        .limit(10)
        .lean();
    } catch (topicError) {
      console.log('Topic search error:', topicError.message);
      topics = [];
    }

    try {
      // Search tests - basic search
      const testQuery = {
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      };
      
      tests = await Exam.find(testQuery)
        .populate('course')
        .limit(10)
        .lean();
    } catch (testError) {
      console.log('Test search error:', testError.message);
      tests = [];
    }

    try {
      // Search users - only for admin roles
      if (user.role === 'super_admin' || isSchoolTenantUser(user)) {
        const userQuery = {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
          ]
        };
        
        if (isSchoolTenantUser(user)) {
          // School admin can only search users in their school
          const schoolId = getSchoolTenantId(user);
          if (schoolId) userQuery.franchise = schoolId;
          else userQuery._id = { $in: [] };
        }
        
        if (userQuery.franchise !== undefined || user.role === 'super_admin') {
          const foundUsers = await User.find(userQuery)
            .populate('franchise')
            .limit(10)
            .lean();
          
          // Get the correct document IDs for each user type
          const processedUsers = await Promise.all(
            foundUsers.map(async (userItem) => {
              let result = {
                ...userItem,
                role: userItem.role || 'user'
              };
              
              // Debug log to see what we're working with
              console.log('Processing user:', userItem.name, 'Original Role:', userItem.role);
              
              // First check if user has a Staff document (this should override the role)
              const staffDoc = await Staff.findOne({ user: userItem._id }).lean();
              if (staffDoc) {
                result.role = 'staff';
                result.staffId = staffDoc._id;
                console.log('Found staff document for:', userItem.name, 'Overriding role to staff, StaffId:', staffDoc._id);
              } else if (userItem.role === 'student') {
                const studentDoc = await Student.findOne({ user: userItem._id }).lean();
                if (studentDoc) {
                  result.studentId = studentDoc._id;
                  console.log('Found studentId:', studentDoc._id);
                }
              } else if (isSchoolTenantUser(userItem)) {
                const franchiseDoc = await Franchise.findById(getSchoolTenantId(userItem)).lean();
                if (franchiseDoc) {
                  result.franchiseId = franchiseDoc._id;
                  console.log('Found franchiseId:', franchiseDoc._id);
                }
              } else {
                // If no specific document found, default to staff for non-student users
                result.role = 'staff';
                console.log('No specific document found, defaulting to staff for:', userItem.name);
              }
              
              console.log('Final role for', userItem.name, ':', result.role);
              return result;
            })
          );
          
          users = processedUsers.filter(u => u);
        }
      }
    } catch (userError) {
      console.log('User search error:', userError.message);
      users = [];
    }

    // Format results with type field
    const formattedResults = {
      courses: courses.map(course => ({
        ...course,
        type: 'course'
      })),
      topics: topics.map(topic => ({
        ...topic,
        type: 'topic'
      })),
      tests: tests.map(test => ({
        ...test,
        type: 'test'
      })),
      users: users.map(userItem => ({
        ...userItem,
        type: 'user'
      }))
    };

    // Debug log to see final results
    console.log('Final search results:', JSON.stringify(formattedResults, null, 2));

    res.json(formattedResults);

  } catch (error) {
    console.error('Search controller error:', error);
    // Return empty results instead of 500 error
    res.json({
      courses: [],
      topics: [],
      tests: [],
      users: []
    });
  }
};

module.exports = { searchController };
