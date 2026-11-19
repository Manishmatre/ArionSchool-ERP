const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const StudentCertificate = require('../models/StudentCertificate');

// Use the same MongoDB URI as the application
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

async function updateCertificateIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('Starting certificate ID update process...');
    
    // Get all certificates sorted by creation date
    const certificates = await StudentCertificate.find({}).sort({ createdAt: 1 });
    console.log(`Found ${certificates.length} certificates to update`);
    
    // Group certificates by year
    const certificatesByYear = {};
    certificates.forEach(cert => {
      // Use createdAt if available, otherwise use current year
      const year = cert.createdAt ? cert.createdAt.getFullYear() : new Date().getFullYear();
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
    console.log('\n=== CERTIFICATE ID MIGRATION COMPLETED SUCCESSFULLY! ===');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
updateCertificateIds();
