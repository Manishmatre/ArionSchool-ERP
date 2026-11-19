const Student = require('../models/Student');
const User = require('../models/User');
const SchoolClass = require('../models/SchoolClass');
const Section = require('../models/Section');

class ExcelImportService {
  /**
   * Validate and preview student bulk rows
   */
  async previewStudents(rows, franchiseId) {
    const preview = [];
    const errors = [];
    let validCount = 0;

    const classes = await SchoolClass.find({ franchise: franchiseId });
    const classMap = {};
    classes.forEach(c => {
      classMap[c.name.trim().toLowerCase()] = c._id;
      classMap[c.code?.trim().toLowerCase()] = c._id;
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors = [];

      if (!row.firstName) rowErrors.push('First Name is required');
      if (!row.mobileNumber && !row.fatherMobile) rowErrors.push('Mobile Number is required');
      if (!row.className) rowErrors.push('Class Name is required');

      const matchedClass = classMap[row.className?.trim().toLowerCase()];
      if (row.className && !matchedClass) {
        rowErrors.push(`Class "${row.className}" does not exist in Academic Setup`);
      }

      const isValid = rowErrors.length === 0;
      if (isValid) validCount++;

      preview.push({
        rowNumber: i + 1,
        data: row,
        matchedClassId: matchedClass || null,
        isValid,
        errors: rowErrors
      });
    }

    return {
      totalRows: rows.length,
      validCount,
      errorCount: rows.length - validCount,
      preview
    };
  }

  /**
   * Commit verified student bulk rows
   */
  async commitStudents(rows, franchiseId, academicSessionId) {
    const createdStudents = [];
    const year = new Date().getFullYear();

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      if (!item.isValid) continue;

      const r = item.data;
      const count = await Student.countDocuments();
      const serial = String(count + i + 1).padStart(4, '0');
      const studentId = `SES-STU-${year}-${serial}`;
      const admissionNumber = `SES-ADM-${year}-${serial}`;

      const student = await Student.create({
        studentId,
        admissionNumber,
        rollNumber: r.rollNumber || String(i + 1),
        franchise: franchiseId,
        academicSession: academicSessionId,
        schoolClass: item.matchedClassId,
        personalInfo: {
          firstName: r.firstName,
          lastName: r.lastName || '',
          gender: r.gender || 'male',
          dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth) : new Date('2015-01-01'),
          phone: r.mobileNumber || r.fatherMobile,
          email: r.email || `${studentId.toLowerCase()}@seseducare.com`,
          fatherName: r.fatherName || 'Father',
          fatherMobile: r.fatherMobile || r.mobileNumber,
          motherName: r.motherName || 'Mother',
          bloodGroup: r.bloodGroup || 'O+',
          address: {
            street: r.address || 'Address',
            city: r.city || 'City',
            state: r.state || 'State',
            pincode: r.pincode || '000000'
          }
        },
        status: 'active'
      });

      createdStudents.push(student);
    }

    return {
      success: true,
      importedCount: createdStudents.length,
      students: createdStudents
    };
  }
}

module.exports = new ExcelImportService();
