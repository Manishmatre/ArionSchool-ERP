const mongoose = require('mongoose');
const SchoolCampus = require('../models/SchoolCampus');
const Student = require('../models/Student');

async function fixCampusStudentCounts() {
  const campuses = await SchoolCampus.find();
  console.log(`Found ${campuses.length} school campuses`);

  for (const campus of campuses) {
    const studentCount = await Student.countDocuments({ franchise: campus._id });
    console.log(`Campus ${campus.name} (${campus.code}): ${studentCount} students`);
  }
}

module.exports = fixCampusStudentCounts;
