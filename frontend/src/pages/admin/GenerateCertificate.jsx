import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiUser, FiAward, FiArrowLeft, FiEye } from 'react-icons/fi';
import { generateCertificate } from '../../api/certificateApi';
import { getAllStudents, getStudentEnrolledCourses, getStudentResults } from '../../api/studentApi';
import { useAuth } from '../../context/AuthContext';
import {
  Button,
  Card,
  Badge,
  Modal,
  PageLoading,
  EmptyState,
  FormPageLayout,
  FormSection,
  FormGrid,
  FormField,
  SearchInput,
  SelectField,
  TextField,
  TextArea,
  LoadingSpinner,
} from '../../components/ui';

const GenerateCertificate = ({ franchiseMode = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    grade: 'Pass',
    percentage: '',
    certificateType: 'course_completion',
    remarks: '',
    testResultId: '',
  });

  const certificatesPath = franchiseMode ? '/school/certificates' : '/admin/certificates';

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (formData.studentId) {
      fetchEnrolledCourses(formData.studentId);
      fetchStudentResults(formData.studentId);
      const student = students.find((s) => s._id === formData.studentId);
      setSelectedStudent(student);
    } else {
      setEnrolledCourses([]);
      setStudentResults([]);
      setSelectedStudent(null);
    }
  }, [formData.studentId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await getAllStudents({ picker: true, limit: 100 });
      setStudents(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch students');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async (studentId) => {
    try {
      setCoursesLoading(true);
      const data = await getStudentEnrolledCourses(studentId);
      setEnrolledCourses(data.data || []);

      if (formData.courseId) {
        const isEnrolled = data.data?.some(
          (enrollment) => enrollment.course._id === formData.courseId,
        );
        if (!isEnrolled) {
          setFormData((prev) => ({ ...prev, courseId: '' }));
        }
      }
    } catch (error) {
      toast.error('Failed to fetch enrolled courses');
      console.error(error);
      setEnrolledCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchStudentResults = async (studentId) => {
    try {
      const res = await getStudentResults(studentId);
      setStudentResults(res.data || []);
    } catch (error) {
      console.error('Failed to fetch student results:', error);
      setStudentResults([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'testResultId' && value) {
      const result = studentResults.find((r) => r._id === value);
      if (result) {
        setFormData((prev) => ({
          ...prev,
          courseId: result.course?._id || prev.courseId,
          percentage: result.percentage || prev.percentage,
          grade: result.isPassed ? 'Pass' : 'Fail',
          testResultId: value,
        }));
      }
    }
  };

  const handlePreview = () => {
    if (!formData.studentId || !formData.courseId) {
      toast.error('Please select both student and course for preview');
      return;
    }

    const student = students.find((s) => s._id === formData.studentId);
    const enrollment = enrolledCourses.find((e) => e.course._id === formData.courseId);

    if (!student || !enrollment) {
      toast.error('Student or course not found');
      return;
    }

    const year = new Date().getFullYear();
    const certificateNumber = `CERT${year}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    const verificationCode = `VER${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    setPreviewData({
      studentName: student.fullName || `${student.personalInfo?.firstName} ${student.personalInfo?.lastName}`,
      courseName: enrollment.course.title,
      grade: formData.grade,
      issueDate: new Date(),
      verificationCode,
      certificateNumber,
    });

    setShowPreview(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.studentId || !formData.courseId) {
      toast.error('Please select student and course');
      return;
    }

    setLoading(true);
    try {
      await generateCertificate(formData);
      toast.success('Certificate generated successfully');

      setFormData({
        studentId: '',
        courseId: '',
        grade: 'Pass',
        percentage: '',
        certificateType: 'course_completion',
        remarks: '',
        testResultId: '',
      });
      setEnrolledCourses([]);
      setStudentResults([]);
      setSelectedStudent(null);

      navigate(certificatesPath);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate certificate');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const fullName = student.fullName || `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim();
    const studentId = student.studentId || '';
    const searchLower = searchTerm.toLowerCase();
    return fullName.toLowerCase().includes(searchLower)
      || studentId.toLowerCase().includes(searchLower);
  });

  const getStudentLabel = (student) => {
    const name = student.fullName || `${student.personalInfo?.firstName} ${student.personalInfo?.lastName}`;
    return student.studentId ? `${name} (${student.studentId})` : name;
  };

  if (loading && students.length === 0) {
    return (
      <Layout>
        <PageHeader
          title="Generate Certificate"
          subtitle="Create a new certificate for a student"
          icon={FiAward}
        />
        <PageLoading message="Loading students..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Generate Certificate"
        subtitle="Create a new certificate for a student"
        icon={FiAward}
        actions={(
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate(certificatesPath)}>
            Back to Certificates
          </Button>
        )}
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={(
            <>
              <Button type="button" variant="secondary" onClick={() => navigate(certificatesPath)}>
                Cancel
              </Button>
              <Button type="button" variant="ghost" icon={FiEye} onClick={handlePreview}>
                Preview Certificate
              </Button>
              <Button type="submit" loading={loading} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Certificate'}
              </Button>
            </>
          )}
        >
          <FormSection title="Student Selection" subtitle="Search and select the student" icon={FiUser}>
            <FormField label="Search Students" hint="Filter by name or student ID">
              <SearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or student ID..."
              />
            </FormField>

            <SelectField
              label="Student *"
              name="studentId"
              value={formData.studentId}
              onChange={handleInputChange}
              required
              className="mt-4"
            >
              <option value="">Select a Student</option>
              {filteredStudents.map((student) => (
                <option key={student._id} value={student._id}>
                  {getStudentLabel(student)}
                </option>
              ))}
            </SelectField>

            {filteredStudents.length === 0 && searchTerm && (
              <EmptyState
                title="No students found"
                description="Try a different search term or clear the filter."
                className="py-6"
              />
            )}

            {selectedStudent && (
              <Card className="mt-4 bg-slate-50/80" padded>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {getStudentLabel(selectedStudent)}
                  </span>
                  {selectedStudent.studentId && (
                    <Badge variant="primary">{selectedStudent.studentId}</Badge>
                  )}
                  {selectedStudent.status && (
                    <Badge variant={selectedStudent.status === 'active' ? 'success' : 'neutral'}>
                      {selectedStudent.status}
                    </Badge>
                  )}
                </div>
              </Card>
            )}
          </FormSection>

          <FormSection title="Certificate Details" subtitle="Course, grades, and optional test result" icon={FiAward}>
            <FormGrid cols={2}>
              <FormField label="Course *" required className="md:col-span-2">
                {!formData.studentId ? (
                  <SelectField
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    disabled
                  >
                    <option value="">Select a student first</option>
                  </SelectField>
                ) : coursesLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <LoadingSpinner />
                  </div>
                ) : enrolledCourses.length === 0 ? (
                  <EmptyState
                    title="No enrolled courses"
                    description="This student has no enrolled courses. Please enroll the student in a course first."
                  />
                ) : (
                  <SelectField
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a Course</option>
                    {enrolledCourses.map((enrollment) => (
                      <option key={enrollment.course._id} value={enrollment.course._id}>
                        {enrollment.course.title}
                        {enrollment.progress > 0 && ` (${enrollment.progress}% completed)`}
                      </option>
                    ))}
                  </SelectField>
                )}
              </FormField>

              <SelectField
                label="Grade *"
                name="grade"
                value={formData.grade}
                onChange={handleInputChange}
                required
              >
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B+">B+</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="Pass">Pass</option>
                <option value="Distinction">Distinction</option>
              </SelectField>

              <TextField
                label="Percentage (%)"
                type="number"
                name="percentage"
                value={formData.percentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                placeholder="Optional"
              />

              <SelectField
                label="Certificate Type *"
                name="certificateType"
                value={formData.certificateType}
                onChange={handleInputChange}
                required
                className="md:col-span-2"
              >
                <option value="course_completion">Course Completion</option>
                <option value="exam_pass">Exam Pass</option>
                <option value="participation">Participation</option>
                <option value="achievement">Achievement</option>
              </SelectField>

              <FormField
                label="Test Result"
                hint="Optional — auto-fills course, grade, and percentage"
                className="md:col-span-2"
              >
                {!formData.studentId ? (
                  <SelectField name="testResultId" value="" disabled>
                    <option value="">Select a student first</option>
                  </SelectField>
                ) : studentResults.length === 0 ? (
                  <EmptyState
                    title="No test results"
                    description="No exam results found for this student. Enter certificate details manually."
                    className="py-4"
                  />
                ) : (
                  <SelectField
                    name="testResultId"
                    value={formData.testResultId}
                    onChange={handleInputChange}
                  >
                    <option value="">None — enter manually</option>
                    {studentResults.map((result) => (
                      <option key={result._id} value={result._id}>
                        {result.exam?.title || result.course?.title || 'Exam'}
                        {' — '}
                        {result.percentage != null ? `${result.percentage}%` : 'N/A'}
                        {' ('}
                        {result.isPassed ? 'Pass' : 'Fail'}
                        )
                      </option>
                    ))}
                  </SelectField>
                )}
              </FormField>
            </FormGrid>

            <TextArea
              label="Remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              rows={4}
              placeholder="Optional remarks about the certificate"
              className="mt-4"
            />
          </FormSection>
        </FormPageLayout>
      </form>

      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Certificate Preview"
        subtitle="Review before generating"
        size="xl"
        footer={(
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close Preview
          </Button>
        )}
      >
        <div
          className="relative mx-auto flex w-full max-w-[794px] aspect-[210/297] flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-50 to-white border-8 border-double border-amber-600 p-6 sm:p-12 text-center"
          style={{
            backgroundImage: 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)',
          }}
        >
          <div className="absolute top-4 left-4 text-amber-600 text-4xl">❦</div>
          <div className="absolute top-4 right-4 text-amber-600 text-4xl">❦</div>
          <div className="absolute bottom-4 left-4 text-amber-600 text-4xl">❦</div>
          <div className="absolute bottom-4 right-4 text-amber-600 text-4xl">❦</div>

          <div className="relative z-10 flex flex-1 flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-4xl font-serif text-amber-800 mb-2">
                CERTIFICATE OF COMPLETION
              </h2>
              <div className="w-32 h-1 bg-amber-600 mx-auto" />
            </div>

            <div className="mb-8 space-y-4">
              <p className="text-lg text-slate-700 italic">This is to certify that</p>

              <div className="py-4 border-b-2 border-t-2 border-amber-400 my-6">
                <h3 className="text-2xl sm:text-3xl font-bold text-amber-900 uppercase tracking-wide">
                  {previewData.studentName || 'Student Name'}
                </h3>
              </div>

              <p className="text-lg text-slate-700">has successfully completed the course</p>

              <div className="py-3">
                <h4 className="text-xl sm:text-2xl font-semibold text-amber-800">
                  {previewData.courseName || 'Course Name'}
                </h4>
              </div>

              {previewData.grade && (
                <div className="mt-4">
                  <Badge variant="warning">Grade: {previewData.grade}</Badge>
                </div>
              )}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-left sm:text-center">
              <div>
                <p className="text-slate-600 mb-1">Date Issued:</p>
                <p className="font-semibold text-slate-800">
                  {(previewData.issueDate ? new Date(previewData.issueDate) : new Date()).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-slate-600 mb-1">Certificate No:</p>
                <p className="font-semibold text-slate-800">
                  {previewData.certificateNumber || 'CERT2025000001'}
                </p>
              </div>
            </div>

            {previewData.verificationCode && (
              <div className="mt-6 p-3 bg-slate-100 rounded-lg text-left sm:text-center">
                <p className="text-xs text-slate-600 mb-1">Verification Code:</p>
                <p className="font-mono text-sm font-semibold text-slate-800">
                  {previewData.verificationCode}
                </p>
              </div>
            )}

            <div className="mt-10 grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-b-2 border-gray-400 mb-2" />
                <p className="text-sm text-slate-600">Authorized Signature</p>
              </div>
              <div className="text-center">
                <div className="border-b-2 border-gray-400 mb-2" />
                <p className="text-sm text-slate-600">Director</p>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <div className="text-6xl sm:text-8xl font-bold text-amber-600 transform rotate-45">
                SES EDUCARE
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default GenerateCertificate;
