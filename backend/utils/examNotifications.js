const Notification = require('../models/Notification');
const { getIO } = require('./socket');

const emitExamSubmitted = (payload) => {
  const io = getIO();
  io.emit('exam-submitted', payload);

  if (payload.examId) {
    io.to(`exam:${payload.examId}`).emit('exam-submitted', payload);
  }

  if (payload.franchiseId) {
    io.to(`franchise:${payload.franchiseId}`).emit('exam-submitted', payload);
  }
};

const emitExamResultReady = (userId, payload) => {
  const io = getIO();
  io.to(`user:${userId}`).emit('exam-result-ready', payload);
};

const createExamResultNotifications = async ({
  studentUserId,
  studentName,
  examTitle,
  examId,
  resultId,
  isPassed,
  percentage,
  certificateId,
  marksheetId,
  franchiseId,
  createdBy
}) => {
  const creatorId = createdBy || studentUserId;
  const resultLink = `/student/result/${resultId}`;

  const studentMessage = isPassed
    ? `You passed "${examTitle}" with ${percentage}%.${certificateId ? ' Your certificate is ready to download.' : ''}`
    : `Your result for "${examTitle}" is ${percentage}%. Review your answers and keep practicing.`;

  await Notification.create({
    title: isPassed ? 'Exam Passed!' : 'Exam Result Available',
    message: studentMessage,
    type: isPassed ? 'success' : 'info',
    category: 'exam',
    recipients: 'specific_users',
    specificUsers: [studentUserId],
    link: resultLink,
    priority: isPassed ? 'high' : 'medium',
    status: 'sent',
    sentAt: new Date(),
    createdBy: creatorId
  });

  if (certificateId) {
    await Notification.create({
      title: 'Certificate Generated',
      message: `Your certificate for "${examTitle}" has been generated after passing the exam.`,
      type: 'success',
      category: 'certificate',
      recipients: 'specific_users',
      specificUsers: [studentUserId],
      link: '/student/certificates',
      priority: 'high',
      status: 'sent',
      sentAt: new Date(),
      createdBy: creatorId
    });
  }

  const adminMessage = `${studentName || 'A student'} ${isPassed ? 'passed' : 'attempted'} "${examTitle}" (${percentage}%).`;

  await Notification.create({
    title: 'New Exam Submission',
    message: adminMessage,
    type: 'info',
    category: 'exam',
    recipients: franchiseId ? 'specific_franchise' : 'franchise_admins',
    specificFranchise: franchiseId || undefined,
    link: `/admin/exams/${examId}`,
    priority: 'medium',
    status: 'sent',
    sentAt: new Date(),
    createdBy: creatorId
  });

  const socketPayload = {
    examId,
    resultId,
    studentUserId,
    studentName,
    examTitle,
    isPassed,
    percentage,
    certificateId: certificateId || null,
    marksheetId: marksheetId || null,
    franchiseId: franchiseId || null
  };

  emitExamSubmitted(socketPayload);
  emitExamResultReady(studentUserId, socketPayload);
};

module.exports = {
  createExamResultNotifications,
  emitExamSubmitted,
  emitExamResultReady
};
