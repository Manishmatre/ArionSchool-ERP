import { FiType, FiEye, FiGrid, FiEdit3, FiImage } from 'react-icons/fi';

export const CUSTOM_TEXT_FIELD = {
  value: 'customText',
  label: 'Custom Text Field',
  type: 'customText',
  icon: FiEdit3
};

export const appendCustomTextField = (fields) => [...fields, CUSTOM_TEXT_FIELD];

export const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Helvetica'];

export const FONT_WEIGHTS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: '300', label: 'Light' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' }
];

export const COMMON_PREVIEW = {
  studentName: 'JOHN DOE',
  studentId: 'SES-STU-20XX-XXXX',
  enrollmentNumber: 'SES-ENR-20XX-XXXX',
  fatherName: 'ROBERT DOE',
  motherName: 'MARY DOE',
  dateOfBirth: '15 January 2000',
  studentEmail: 'john@example.com',
  studentPhone: '+91 9876543210',
  courseName: 'Advanced Web Development',
  courseCode: 'AWD101',
  courseDuration: '6 Months',
  session: '2025-2026',
  gender: 'Male',
  grade: 'A+',
  percentage: '95%',
  totalMarks: '600',
  obtainedMarks: '570',
  franchiseName: 'ABC Education Center',
  franchiseCode: 'FRN001',
  franchiseAddress: '123, Main Street, New Delhi, India',
  certificateNo: 'SES-CERT-20XX-XXXX',
  marksheetNo: 'SES-MARKS-20XX-XXXX',
  issueDate: new Date().toLocaleDateString('en-IN'),
  qrCode: 'QR',
  marksTable: 'MARKS TABLE'
};

export const MARKSHEET_FIELDS = [
  { value: 'studentName', label: 'Student Name', type: 'text', icon: FiType },
  { value: 'studentId', label: 'Student ID', type: 'text', icon: FiType },
  { value: 'enrollmentNumber', label: 'Enrollment No', type: 'text', icon: FiType },
  { value: 'gender', label: 'Gender', type: 'text', icon: FiType },
  { value: 'fatherName', label: 'Father Name', type: 'text', icon: FiType },
  { value: 'motherName', label: 'Mother Name', type: 'text', icon: FiType },
  { value: 'dateOfBirth', label: 'Date Of Birth', type: 'text', icon: FiType },
  { value: 'studentEmail', label: 'Student Email', type: 'text', icon: FiType },
  { value: 'studentPhone', label: 'Student Phone', type: 'text', icon: FiType },
  { value: 'courseName', label: 'Course Name', type: 'text', icon: FiType },
  { value: 'courseCode', label: 'Course Code', type: 'text', icon: FiType },
  { value: 'courseDuration', label: 'Course Duration', type: 'text', icon: FiType },
  { value: 'session', label: 'Session', type: 'text', icon: FiType },
  { value: 'grade', label: 'Grade', type: 'text', icon: FiType },
  { value: 'percentage', label: 'Percentage', type: 'text', icon: FiType },
  { value: 'totalMarks', label: 'Total Marks', type: 'text', icon: FiType },
  { value: 'obtainedMarks', label: 'Obtained Marks', type: 'text', icon: FiType },
  { value: 'franchiseName', label: 'School Campus Name', type: 'text', icon: FiType },
  { value: 'franchiseCode', label: 'Campus Code', type: 'text', icon: FiType },
  { value: 'franchiseAddress', label: 'Campus Address', type: 'text', icon: FiType },
  { value: 'marksheetNo', label: 'Marksheet No', type: 'text', icon: FiType },
  { value: 'issueDate', label: 'Issue Date', type: 'text', icon: FiType },
  { value: 'studentPhoto', label: 'Student Photo', type: 'image', icon: FiEye },
  { value: 'franchiseOwnerSignature', label: 'Principal / Head Signature', type: 'image', icon: FiEdit3 },
  { value: 'superAdminSignature', label: 'Admin Signature', type: 'image', icon: FiEdit3 },
  { value: 'companySeal', label: 'Company Seal', type: 'image', icon: FiEdit3 },
  { value: 'qrCode', label: 'QR Code', type: 'qrCode', icon: FiEye },
  { value: 'marksTable', label: 'Marks Table', type: 'table', icon: FiGrid },
  CUSTOM_TEXT_FIELD
];

export const STUDENT_CERTIFICATE_FIELDS = MARKSHEET_FIELDS.filter(
  (f) => f.value !== 'marksTable' && f.value !== 'customText' && f.value !== 'marksheetNo' && !['totalMarks', 'obtainedMarks', 'percentage', 'grade'].includes(f.value)
).concat([
  { value: 'certificateNo', label: 'Certificate No', type: 'text', icon: FiType },
  { value: 'grade', label: 'Grade', type: 'text', icon: FiType },
  { value: 'percentage', label: 'Percentage', type: 'text', icon: FiType },
  CUSTOM_TEXT_FIELD
]);

export const FRANCHISE_CERTIFICATE_FIELDS = [
  { value: 'franchiseName', label: 'School Campus Name', type: 'text', icon: FiType },
  { value: 'franchiseCode', label: 'Campus Code', type: 'text', icon: FiType },
  { value: 'franchiseAddress', label: 'Campus Address', type: 'text', icon: FiType },
  { value: 'ownerName', label: 'Principal / Head Name', type: 'text', icon: FiType },
  { value: 'ownerEmail', label: 'Principal Email', type: 'text', icon: FiType },
  { value: 'ownerPhone', label: 'Principal Phone', type: 'text', icon: FiType },
  { value: 'planName', label: 'Affiliation Type', type: 'text', icon: FiType },
  { value: 'certificateNumber', label: 'Certificate Number', type: 'text', icon: FiType },
  { value: 'issueDate', label: 'Issue Date', type: 'text', icon: FiType },
  { value: 'validUntil', label: 'Valid Until', type: 'text', icon: FiType },
  { value: 'franchiseLogo', label: 'School / Campus Logo', type: 'image', icon: FiImage },
  { value: 'companySeal', label: 'Company Seal', type: 'image', icon: FiEdit3 },
  { value: 'superAdminSignature', label: 'Admin Signature', type: 'image', icon: FiEdit3 },
  { value: 'qrCode', label: 'QR Code', type: 'qrCode', icon: FiEye },
  CUSTOM_TEXT_FIELD
];

export const ID_CARD_FIELDS = [
  { value: 'studentName', label: 'Student Name', type: 'text', icon: FiType },
  { value: 'studentId', label: 'Student ID', type: 'text', icon: FiType },
  { value: 'enrollmentNumber', label: 'Enrollment No', type: 'text', icon: FiType },
  { value: 'course', label: 'Course', type: 'text', icon: FiType },
  { value: 'batch', label: 'Batch', type: 'text', icon: FiType },
  { value: 'phone', label: 'Phone', type: 'text', icon: FiType },
  { value: 'email', label: 'Email', type: 'text', icon: FiType },
  { value: 'address', label: 'Address', type: 'text', icon: FiType },
  { value: 'dob', label: 'Date of Birth', type: 'text', icon: FiType },
  { value: 'bloodGroup', label: 'Blood Group', type: 'text', icon: FiType },
  { value: 'fatherName', label: 'Father Name', type: 'text', icon: FiType },
  { value: 'motherName', label: 'Mother Name', type: 'text', icon: FiType },
  { value: 'admissionDate', label: 'Admission Date', type: 'text', icon: FiType },
  { value: 'franchiseName', label: 'School Campus Name', type: 'text', icon: FiType },
  { value: 'studentPhoto', label: 'Student Photo', type: 'image', icon: FiImage },
  { value: 'instituteLogo', label: 'Institute Logo', type: 'image', icon: FiImage },
  { value: 'signature', label: 'Signature', type: 'image', icon: FiEdit3 },
  CUSTOM_TEXT_FIELD
];

export const ID_CARD_PREVIEW = {
  ...COMMON_PREVIEW,
  course: 'Computer Science',
  batch: 'Batch A',
  phone: '+91 9876543210',
  email: 'john.doe@email.com',
  address: '123 Main Street, City',
  dob: '01/01/2000',
  bloodGroup: 'B+',
  admissionDate: '15/06/2024'
};

export const FRANCHISE_CERT_PREVIEW = {
  franchiseName: 'ABC Education Center',
  franchiseCode: 'FRN001',
  franchiseAddress: '123 Main Street, New Delhi',
  ownerName: 'Rajesh Kumar',
  ownerEmail: 'owner@abc.com',
  ownerPhone: '+91 9876543210',
  planName: 'Gold Plan',
  certificateNumber: 'FC-20XX-XXXX',
  issueDate: new Date().toLocaleDateString('en-IN'),
  validUntil: '31 Dec 2027',
  qrCode: 'QR'
};
