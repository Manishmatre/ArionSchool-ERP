const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Student = require('../models/Student');
const StudentCertificate = require('../models/StudentCertificate');

// Use the same MongoDB URI as the application
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

async function updateStudentIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
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
        
        const oldStudentId = student.studentId || 'No ID';
        
        // Update student document
        await Student.findByIdAndUpdate(student._id, {
          studentId: newStudentId,
          enrollmentNumber: newEnrollmentNumber
        });
        
        console.log(`Updated: ${oldStudentId} -> ${newStudentId}`);
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
        
        const oldCertificateNumber = certificate.certificateNumber || 'No ID';
        
        // Update certificate document
        await StudentCertificate.findByIdAndUpdate(certificate._id, {
          certificateNumber: newCertificateNumber
        });
        
        console.log(`Updated: ${oldCertificateNumber} -> ${newCertificateNumber}`);
        sequenceNumber++;
      }
    }
    
    console.log('\nCertificate numbers updated successfully!');
    console.log('\n=== MIGRATION COMPLETED SUCCESSFULLY! ===');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
updateStudentIds();
