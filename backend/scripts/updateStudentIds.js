const mongoose = require('mongoose');
const Student = require('../models/Student');
const StudentCertificate = require('../models/StudentCertificate');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function updateStudentIds() {
  try {
    console.log('Starting student ID update process...');
    
    // Get all students sorted by creation date
    const students = await Student.find({}).sort({ createdAt: 1 });
    console.log(`Found ${students.length} students to update`);
    
    // Group students by year
    const studentsByYear = {};
    students.forEach(student => {
      const year = student.createdAt.getFullYear();
      if (!studentsByYear[year]) {
        studentsByYear[year] = [];
      }
      studentsByYear[year].push(student);
    });
    
    // Update IDs for each year
    for (const [year, yearStudents] of Object.entries(studentsByYear)) {
      console.log(`\nProcessing year ${year} with ${yearStudents.length} students...`);
      
      let sequenceNumber = 1;
      
      for (const student of yearStudents) {
        const newStudentId = `SES-STU-${year}-${String(sequenceNumber).padStart(4, '0')}`;
        const newEnrollmentNumber = `SES-ENR-${year}-${String(sequenceNumber).padStart(4, '0')}`;
        
        // Update student document
        await Student.findByIdAndUpdate(student._id, {
          studentId: newStudentId,
          enrollmentNumber: newEnrollmentNumber
        });
        
        console.log(`Updated: ${student.studentId || 'No ID'} -> ${newStudentId}`);
        sequenceNumber++;
      }
    }
    
    console.log('\nStudent IDs updated successfully!');
    
    // Now update certificate numbers
    console.log('\nUpdating certificate numbers...');
    const certificates = await StudentCertificate.find({}).sort({ createdAt: 1 });
    console.log(`Found ${certificates.length} certificates to update`);
    
    // Group certificates by year
    const certificatesByYear = {};
    certificates.forEach(cert => {
      const year = cert.createdAt.getFullYear();
      if (!certificatesByYear[year]) {
        certificatesByYear[year] = [];
      }
      certificatesByYear[year].push(cert);
    });
    
    // Update certificate numbers for each year
    for (const [year, yearCertificates] of Object.entries(certificatesByYear)) {
      console.log(`\nProcessing certificates for year ${year} with ${yearCertificates.length} certificates...`);
      
      let sequenceNumber = 1;
      
      for (const certificate of yearCertificates) {
        const newCertificateNumber = `SES-CERT-${year}-${String(sequenceNumber).padStart(4, '0')}`;
        
        // Update certificate document
        await StudentCertificate.findByIdAndUpdate(certificate._id, {
          certificateNumber: newCertificateNumber
        });
        
        console.log(`Updated: ${certificate.certificateNumber || 'No ID'} -> ${newCertificateNumber}`);
        sequenceNumber++;
      }
    }
    
    console.log('\nCertificate numbers updated successfully!');
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
updateStudentIds();
