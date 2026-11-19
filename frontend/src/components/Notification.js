import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext.jsx';

const Notification = () => {
  const socket = useSocket();
  const { user } = useAuth();
  const userId = user?._id;
  const userRole = user?.role;

  useEffect(() => {
    if (!socket) return undefined;

    const onNewEnrollment = (data) => {
      toast.info(data.message);
      window.dispatchEvent(new CustomEvent('new-enrollment', { detail: data }));
    };

    const onCourseUpdated = (data) => {
      toast.success(`Course "${data.title}" has been updated`);
      window.dispatchEvent(new CustomEvent('course-updated', { detail: data }));
    };

    const onCourseStatsUpdated = (data) => {
      toast.success(data.message);
      window.dispatchEvent(new CustomEvent('course-stats-updated', { detail: data }));
    };

    const onClassUpdated = (data) => {
      toast.info(`Online class "${data.title}" has been updated`);
      window.dispatchEvent(new CustomEvent('class-updated', { detail: data }));
    };

    const onProgressUpdated = (data) => {
      if (userRole === 'student' || userRole === 'super_admin' || userRole === 'franchise_admin') {
        window.dispatchEvent(new CustomEvent('progress-updated', { detail: data }));
      }
    };

    const onAttendanceUpdated = () => {
      toast.info('Attendance has been updated');
      window.dispatchEvent(new CustomEvent('attendance-updated'));
    };

    const onParticipantJoined = (data) => {
      toast.info(data.message);
      window.dispatchEvent(new CustomEvent('class-participant-joined', { detail: data }));
    };

    const onParticipantLeft = (data) => {
      toast.info(data.message);
      window.dispatchEvent(new CustomEvent('class-participant-left', { detail: data }));
    };

    const onBatchCreated = (data) => {
      toast.success(data.message);
      window.dispatchEvent(new CustomEvent('batch-created', { detail: data }));
    };

    const onPaymentVerified = (data) => {
      toast.success(data.message);
      window.dispatchEvent(new CustomEvent('payment-verified', { detail: data }));
    };

    const onExamSubmitted = (data) => {
      if (userRole === 'super_admin' || userRole === 'franchise_admin') {
        toast.info(`${data.studentName || 'Student'} submitted "${data.examTitle}"`);
      }
      window.dispatchEvent(new CustomEvent('exam-submitted', { detail: data }));
    };

    const onExamResultReady = (data) => {
      if (userRole === 'student') {
        toast.success(
          data.isPassed
            ? `You passed "${data.examTitle}" with ${data.percentage}%!`
            : `Result ready for "${data.examTitle}"`
        );
      }
      window.dispatchEvent(new CustomEvent('exam-result-ready', { detail: data }));
    };

    socket.on('new-enrollment', onNewEnrollment);
    socket.on('course-updated', onCourseUpdated);
    socket.on('course-stats-updated', onCourseStatsUpdated);
    socket.on('class-updated', onClassUpdated);
    socket.on('progress-updated', onProgressUpdated);
    socket.on('attendance-updated', onAttendanceUpdated);
    socket.on('class-participant-joined', onParticipantJoined);
    socket.on('class-participant-left', onParticipantLeft);
    socket.on('batch-created', onBatchCreated);
    socket.on('payment-verified', onPaymentVerified);
    socket.on('exam-submitted', onExamSubmitted);
    socket.on('exam-result-ready', onExamResultReady);

    return () => {
      socket.off('new-enrollment', onNewEnrollment);
      socket.off('course-updated', onCourseUpdated);
      socket.off('course-stats-updated', onCourseStatsUpdated);
      socket.off('class-updated', onClassUpdated);
      socket.off('progress-updated', onProgressUpdated);
      socket.off('attendance-updated', onAttendanceUpdated);
      socket.off('class-participant-joined', onParticipantJoined);
      socket.off('class-participant-left', onParticipantLeft);
      socket.off('batch-created', onBatchCreated);
      socket.off('payment-verified', onPaymentVerified);
      socket.off('exam-submitted', onExamSubmitted);
      socket.off('exam-result-ready', onExamResultReady);
    };
  }, [socket, userId, userRole]);

  return null;
};

export default Notification;
