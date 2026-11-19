import api from './axios';

// Get all students
export const getAllStudents = async (params = {}) => {
  const response = await api.get('/students', { params });
  return response.data;
};

// Get single student
export const getStudent = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

// Create student
export const createStudent = async (data) => {
  const response = await api.post('/students', data);
  return response.data;
};

// Update student
export const updateStudent = async (id, data) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

// Delete student
export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

// Get student dashboard
export const getStudentDashboard = async (id) => {
  const response = await api.get(`/students/${id}/dashboard`);
  return response.data;
};

// Get student progress
export const getStudentProgress = async (id) => {
  const response = await api.get(`/students/${id}/progress`);
  return response.data;
};

export const getStudentResults = async (studentId) => {
  const response = await api.get(`/students/${studentId}/results`);
  return response.data;
};

// Get enrolled courses for a student
export const getStudentEnrolledCourses = async (studentId) => {
  const response = await api.get(`/students/${studentId}/enrolled-courses`);
  return response.data;
};

// Enroll student in course
export const enrollStudentInCourse = async (id, courseId, payment = null) => {
  const body = { courseId };
  if (payment) body.payment = payment;
  const response = await api.post(`/students/${id}/enroll`, body);
  return response.data;
};

// Exam access permissions (admin override for pending fees)
export const getStudentExamAccess = async (id) => {
  const response = await api.get(`/students/${id}/exam-access`);
  return response.data;
};

export const updateStudentExamAccess = async (id, payload) => {
  const response = await api.patch(`/students/${id}/exam-access`, payload);
  return response.data;
};

const studentApi = {
  getAllStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentEnrolledCourses,
  enrollStudentInCourse,
  getStudentExamAccess,
  updateStudentExamAccess
};

export default studentApi;
