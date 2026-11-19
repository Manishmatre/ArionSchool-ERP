import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { FiArrowLeft, FiCheckSquare, FiSquare, FiFileText, FiClipboard, FiList, FiPlus, FiTrash2, FiEdit3, FiCalendar } from 'react-icons/fi';
import { getAllStudents, getStudentEnrolledCourses } from '../../api/studentApi';
import { getAllFranchises } from '../../api/campusApi';
import { getMarksheetTemplates, generateMarksheet, renderMarksheetPreview, getStudentExamResultsByCourse } from '../../api/marksheetApi';
import { getTemplateAssets } from '../../api/templateAssetApi';
import CustomFieldsForm from '../../components/template-editor/CustomFieldsForm';
import { getCustomTextFields } from '../../components/template-editor/templateFieldUtils';
import MarksheetLivePreview from '../../components/template-editor/MarksheetLivePreview';
import { filterTemplatesForStudentCourse } from '../../utils/templateMatching';
import { useAuth } from '../../context/AuthContext';
import {
  Button,
  PageLoading,
  PageHeader,
  FormPageLayout,
  FormSection,
  FormGrid,
  SelectField,
  Card,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TextField,
} from '../../components/ui';

const emptyMarkRow = () => ({ subject: '', totalMarks: 100, minMarks: 40, obtainedMarks: 0 });

const GenerateMarksheet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [studentCourses, setStudentCourses] = useState({});
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [franchiseFilter, setFranchiseFilter] = useState('');

  const [generationMode, setGenerationMode] = useState('manual');
  const [studentExams, setStudentExams] = useState([]);
  const [selectedExams, setSelectedExams] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [previewAssets, setPreviewAssets] = useState({});
  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState('');
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [previewRenderError, setPreviewRenderError] = useState('');
  const previewUrlRef = useRef('');

  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    templateId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    marks: [emptyMarkRow()]
  });

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((t) => t._id === formData.templateId) || null,
    [filteredTemplates, formData.templateId]
  );
  const selectedStudent = useMemo(() => students.find((student) => student._id === formData.studentId), [students, formData.studentId]);
  const selectedEnrollment = useMemo(
    () => studentCourses[formData.studentId]?.find((enrollment) => enrollment.course?._id === formData.courseId),
    [studentCourses, formData.studentId, formData.courseId]
  );
  const selectedCourse = selectedEnrollment?.course;
  const selectedSession = selectedEnrollment?.session || selectedEnrollment?.academicYear || selectedEnrollment?.batch?.batchName || selectedEnrollment?.batch?.name || selectedCourse?.session || selectedStudent?.session || selectedStudent?.academicInfo?.session || (() => {
    const d = selectedStudent?.admissionDate || selectedStudent?.createdAt || new Date();
    const yr = new Date(d).getFullYear();
    return `${yr} - ${yr + 1}`;
  })();

  const customFields = useMemo(
    () => getCustomTextFields(selectedTemplate?.fields || []),
    [selectedTemplate]
  );

  useEffect(() => {
    fetchInitialData();
    getTemplateAssets()
      .then((response) => setPreviewAssets(Object.fromEntries((response.data?.data?.assets || []).filter((asset) => asset.url).map((asset) => [asset.key, asset.url]))))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (formData.studentId) {
      fetchStudentCourses(formData.studentId);
    } else {
      setStudentCourses({});
      setFilteredTemplates([]);
      setStudentExams([]);
      setSelectedExams([]);
      setCustomFieldValues({});
    }
  }, [formData.studentId]);

  useEffect(() => {
    if (formData.courseId) {
      const enrollment = studentCourses[formData.studentId]?.find((e) => e.course?._id === formData.courseId);
      const student = students.find((s) => s._id === formData.studentId);

      if (!enrollment?.course || !student) return;

      const matchingTemplates = filterTemplatesForStudentCourse({
        templates,
        course: enrollment.course,
        student,
        userRole: user?.role,
      });
      setFilteredTemplates(matchingTemplates);
      if (!formData.templateId || (formData.templateId !== 'default' && !matchingTemplates.some((t) => t._id === formData.templateId))) {
        setFormData((prev) => ({ ...prev, templateId: 'default' }));
      }
    } else {
      setFilteredTemplates([]);
      setStudentExams([]);
      setSelectedExams([]);
    }
  }, [formData.courseId, formData.studentId, studentCourses, templates, students, user?.role]);

  useEffect(() => {
    if (!formData.studentId || !formData.courseId) {
      setStudentExams([]);
      setSelectedExams([]);
      return undefined;
    }

    let active = true;
    getStudentExamResultsByCourse(formData.studentId, formData.courseId)
      .then((response) => {
        if (active) setStudentExams(response.data.data || []);
      })
      .catch(() => {
        if (active) setStudentExams([]);
      });

    return () => { active = false; };
  }, [formData.studentId, formData.courseId]);

  useEffect(() => {
    setCustomFieldValues({});
  }, [formData.templateId]);

  useEffect(() => {
    setIsRenderingPreview(true);
    setPreviewRenderError('');
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await renderMarksheetPreview({
          studentId: formData.studentId || undefined,
          courseId: formData.courseId,
          templateId: formData.templateId,
          previewStudent: selectedStudent ? {
            studentId: selectedStudent.studentId,
            enrollmentNumber: selectedStudent.enrollmentNumber,
            franchise: selectedStudent.franchise ? {
              name: selectedStudent.franchise.name,
              code: selectedStudent.franchise.code,
              address: selectedStudent.franchise.address,
              isMainBranch: selectedStudent.franchise.isMainBranch,
              owner: { ownerSignature: selectedStudent.franchise.owner?.ownerSignature }
            } : undefined,
            personalInfo: {
              firstName: selectedStudent.personalInfo?.firstName,
              lastName: selectedStudent.personalInfo?.lastName,
              fatherName: selectedStudent.personalInfo?.fatherName,
              motherName: selectedStudent.personalInfo?.motherName,
              dateOfBirth: selectedStudent.personalInfo?.dateOfBirth,
              gender: selectedStudent.personalInfo?.gender,
              photo: selectedStudent.personalInfo?.photo
            },
            user: { profilePicture: selectedStudent.user?.profilePicture }
          } : undefined,
          previewCourse: selectedCourse ? {
            title: selectedCourse.title,
            duration: selectedCourse.duration || (selectedCourse.durationValue ? `${selectedCourse.durationValue} ${selectedCourse.durationType ? (selectedCourse.durationType.charAt(0).toUpperCase() + selectedCourse.durationType.slice(1)) : 'Months'}` : (selectedCourse.totalHours ? `${selectedCourse.totalHours} Hours` : '6 Months'))
          } : undefined,
          session: selectedSession,
          issueDate: formData.issueDate,
          marks: formData.marks.filter((mark) => mark.subject?.trim()),
          customFieldValues
        });
        if (cancelled) return;
        const nextUrl = URL.createObjectURL(response.data);
        const previousUrl = previewUrlRef.current;
        previewUrlRef.current = nextUrl;
        setRenderedPreviewUrl(nextUrl);
        setIsRenderingPreview(false);
        if (previousUrl) URL.revokeObjectURL(previousUrl);
      } catch {
        if (!cancelled) {
          setIsRenderingPreview(false);
          setPreviewRenderError('Could not refresh the print preview. Check your connection and try again.');
        }
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.studentId, formData.courseId, formData.templateId, formData.issueDate, formData.marks, customFieldValues, selectedStudent, selectedCourse, selectedSession]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const promises = [getAllStudents({ picker: true, limit: 100 }), getMarksheetTemplates()];
      if (user.role === 'super_admin') {
        promises.push(getAllFranchises());
      }
      const [studentsRes, templatesRes, franchisesRes] = await Promise.all(promises);
      setStudents(studentsRes.data || []);
      setTemplates(templatesRes.data.data || []);
      if (franchisesRes) {
        setFranchises(franchisesRes.data || []);
      }
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentCourses = async (studentId) => {
    const student = students.find((item) => item._id === studentId);
    const cachedEnrollments = (student?.enrolledCourses || [])
      .filter((enrollment) => enrollment?.course && enrollment.isActive !== false)
      .map((enrollment) => ({
        enrollmentId: enrollment._id,
        enrolledAt: enrollment.enrolledAt,
        session: enrollment.session,
        academicYear: enrollment.academicYear,
        batch: enrollment.batch,
        course: enrollment.course
      }));
    if (cachedEnrollments.length > 0) {
      setStudentCourses((prev) => ({ ...prev, [studentId]: cachedEnrollments }));
      return;
    }

    try {
      const enrolledRes = await getStudentEnrolledCourses(studentId);
      setStudentCourses((prev) => ({ ...prev, [studentId]: enrolledRes.data || [] }));
    } catch {
      setStudentCourses((prev) => ({ ...prev, [studentId]: [] }));
    }
  };

  const updateMarksFromExams = (exams, selectedIds) => {
    const selectedExamsData = exams.filter((exam) => selectedIds.includes(exam._id));
    const marks = selectedExamsData.map((exam) => {
      const max = exam.maxScore || exam.totalQuestions || 100;
      return {
        subject: exam.examTitle,
        totalMarks: max,
        minMarks: Math.round(max * 0.4),
        obtainedMarks: Math.min(Number(exam.score) || 0, Number(max))
      };
    });
    setFormData((prev) => ({ ...prev, marks: marks.length ? marks : [emptyMarkRow()] }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'studentId') {
      setGenerationMode('manual');
      setStudentExams([]);
      setSelectedExams([]);
      setFormData((prev) => ({ ...prev, studentId: value, courseId: '', templateId: '' }));
      return;
    }
    if (name === 'courseId') {
      setGenerationMode('manual');
      setStudentExams([]);
      setSelectedExams([]);
      setFormData((prev) => ({ ...prev, courseId: value, templateId: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const switchToExamMode = () => {
    setGenerationMode('exam');
    if (studentExams.length > 0) {
      const allIds = studentExams.map((e) => e._id);
      setSelectedExams(allIds);
      updateMarksFromExams(studentExams, allIds);
    } else {
      setSelectedExams([]);
      setFormData((prev) => ({ ...prev, marks: [emptyMarkRow()] }));
    }
  };

  const switchToManualMode = () => {
    setGenerationMode('manual');
    setSelectedExams([]);
    setFormData((prev) => ({
      ...prev,
      marks: prev.marks.length ? prev.marks : [emptyMarkRow()]
    }));
  };

  const toggleExamSelection = (examId) => {
    const newSelected = selectedExams.includes(examId)
      ? selectedExams.filter((id) => id !== examId)
      : [...selectedExams, examId];
    setSelectedExams(newSelected);
    updateMarksFromExams(studentExams, newSelected);
  };

  const selectAllExams = () => {
    if (selectedExams.length === studentExams.length) {
      setSelectedExams([]);
      setFormData((prev) => ({ ...prev, marks: [emptyMarkRow()] }));
    } else {
      const allIds = studentExams.map((e) => e._id);
      setSelectedExams(allIds);
      updateMarksFromExams(studentExams, allIds);
    }
  };

  const handleMarkChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      marks: prev.marks.map((mark, markIndex) => {
        if (markIndex !== index) return mark;
        if (field === 'subject') return { ...mark, subject: value };
        const enteredValue = Math.max(0, Number(value) || 0);
        if (field === 'totalMarks') {
          return { ...mark, totalMarks: enteredValue, minMarks: Math.round(enteredValue * 0.4), obtainedMarks: Math.min(Number(mark.obtainedMarks) || 0, enteredValue) };
        }
        if (field === 'minMarks') {
          return { ...mark, minMarks: enteredValue };
        }
        return { ...mark, obtainedMarks: Math.min(enteredValue, Number(mark.totalMarks) || 0) };
      })
    }));
  };

  const addMarkRow = () => {
    setFormData((prev) => ({ ...prev, marks: [...prev.marks, emptyMarkRow()] }));
  };

  const removeMarkRow = (index) => {
    if (formData.marks.length <= 1) {
      toast.error('At least one subject row is required');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      marks: prev.marks.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.courseId || !formData.templateId) {
      toast.error('Please select a student, course, and template');
      return;
    }

    const validMarks = formData.marks.filter((m) => m.subject?.trim());
    if (validMarks.length === 0) {
      toast.error('Please add at least one subject with marks');
      return;
    }

    if (generationMode === 'exam' && selectedExams.length === 0) {
      toast.error('Please select at least one exam, or switch to manual entry');
      return;
    }

    for (const field of customFields) {
      if (!customFieldValues[field.fieldName]?.trim()) {
        toast.error(`Please fill in custom field: ${field.label || field.fieldName}`);
        return;
      }
    }

    setLoading(true);
    try {
      await generateMarksheet(formData.studentId, {
        courseId: formData.courseId,
        templateId: formData.templateId,
        session: selectedSession,
        issueDate: formData.issueDate,
        marks: validMarks,
        customFieldValues,
        selectedExams: generationMode === 'exam' ? selectedExams : []
      });
      toast.success('Marksheet generated successfully!');
      navigate('/admin/marksheet-templates');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate marksheet');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    if (user.role === 'super_admin' && franchiseFilter) {
      return student.franchise?._id === franchiseFilter;
    }
    return true;
  });

  const totalMarks = formData.marks.reduce((acc, mark) => acc + (Number(mark.totalMarks) || 0), 0);
  const totalMinMarks = formData.marks.reduce((acc, mark) => acc + (mark.minMarks != null ? Number(mark.minMarks) : Math.round((Number(mark.totalMarks) || 100) * 0.4)), 0);
  const totalObtained = formData.marks.reduce((acc, mark) => acc + (Number(mark.obtainedMarks) || 0), 0);
  const percentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(2) : 0;

  const canSubmit =
    formData.studentId &&
    formData.courseId &&
    formData.templateId &&
    formData.marks.some((m) => m.subject?.trim()) &&
    (generationMode === 'manual' || selectedExams.length > 0);

  if (loading && students.length === 0) {
    return (
      <Layout>
        <PageHeader
          title="Generate Marksheet"
          subtitle="Create a marksheet manually or from exam results"
          icon={FiFileText}
        />
        <PageLoading message="Loading students and templates..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Generate Marksheet"
        subtitle="Create a marksheet manually or from exam results — supports Hindi/English custom fields"
        icon={FiFileText}
        actions={(
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/marksheet-templates')}>
            Back to Management
          </Button>
        )}
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={(
            <Button type="submit" loading={loading} disabled={loading || !canSubmit}>
              {loading ? 'Generating...' : 'Generate Marksheet'}
            </Button>
          )}
        >
          <FormSection title="Marksheet Details" icon={FiClipboard}>
            <FormGrid cols={2}>
              {user.role === 'super_admin' && (
                <SelectField
                  label="Filter by Campus"
                  value={franchiseFilter}
                  onChange={(e) => setFranchiseFilter(e.target.value)}
                >
                  <option value="">All Campuses</option>
                  {franchises.map((f) => (
                    <option key={f._id} value={f._id}>{f.name}</option>
                  ))}
                </SelectField>
              )}
              <SelectField
                label="Student *"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                required
                className={['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? 'md:col-span-2' : ''}
              >
                <option value="">Select a Student</option>
                {filteredStudents.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.personalInfo?.firstName} {s.personalInfo?.lastName} ({s.studentId})
                  </option>
                ))}
              </SelectField>
            </FormGrid>

            <SelectField
              label="Course *"
              name="courseId"
              value={formData.courseId}
              onChange={handleInputChange}
              required
              disabled={!formData.studentId}
              className="mt-4"
            >
              <option value="">Select a Course</option>
              {(studentCourses[formData.studentId] || []).map((e) => (
                <option key={e.course?._id} value={e.course?._id}>{e.course?.title}</option>
              ))}
            </SelectField>

            <SelectField
              label="Template *"
              name="templateId"
              value={formData.templateId}
              onChange={handleInputChange}
              required
              disabled={!formData.courseId}
              className="mt-4"
            >
              <option value="">Select a Template</option>
              <option value="default">⭐ Official Default Marksheet Template (Automatically matched to student branch)</option>
              {filteredTemplates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.courseType}) - {t.targetType === 'main_branch' ? 'Main Branch' : 'Franchise'}
                </option>
              ))}
            </SelectField>

            <div className="mt-4">
              <label htmlFor="marksheet-issue-date" className="block text-sm font-medium text-slate-700 mb-1">
                Marksheet Date *
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="marksheet-issue-date"
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Choose an earlier date when issuing a back-dated marksheet.</p>
            </div>

            {selectedTemplate && (
              <div className="mt-4">
                <CustomFieldsForm
                  template={selectedTemplate}
                  values={customFieldValues}
                  onChange={setCustomFieldValues}
                  documentType="marksheet"
                />
              </div>
            )}
          </FormSection>

          {formData.courseId && (
            <FormSection
              title="Marks Entry"
              subtitle="Enter marks manually or pull from completed exams"
              icon={FiList}
            >
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  type="button"
                  variant={generationMode === 'manual' ? 'primary' : 'secondary'}
                  icon={FiEdit3}
                  onClick={switchToManualMode}
                >
                  Manual Entry
                </Button>
                <Button
                  type="button"
                  variant={generationMode === 'exam' ? 'primary' : 'secondary'}
                  icon={FiList}
                  onClick={switchToExamMode}
                  disabled={studentExams.length === 0}
                >
                  From Exams {studentExams.length > 0 ? `(${studentExams.length})` : ''}
                </Button>
              </div>

              {generationMode === 'exam' && studentExams.length > 0 && (
                <>
                  <div className="flex justify-end mb-4">
                    <Button type="button" variant="ghost" className="text-sm" onClick={selectAllExams}>
                      {selectedExams.length === studentExams.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="space-y-3 mb-6">
                    {studentExams.map((exam) => {
                      const isSelected = selectedExams.includes(exam._id);
                      return (
                        <Card
                          key={exam._id}
                          hover
                          className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50/50' : ''
                            }`}
                          onClick={() => toggleExamSelection(exam._id)}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              {isSelected ? (
                                <FiCheckSquare className="text-primary-600 w-5 h-5 flex-shrink-0" />
                              ) : (
                                <FiSquare className="text-slate-400 w-5 h-5 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate">{exam.examTitle}</p>
                                <p className="text-sm text-slate-500">
                                  Completed: {new Date(exam.completedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-semibold text-slate-800">
                                {exam.score}/{exam.maxScore || exam.totalQuestions}
                              </p>
                              <Badge variant={exam.isPassed ? 'success' : 'danger'}>
                                {exam.isPassed ? 'Passed' : 'Failed'}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              {generationMode === 'manual' && (
                <Card className="bg-primary-50/40 border border-primary-100 mb-4" padded>
                  <p className="text-sm text-primary-800">
                    Enter subject names and marks manually. No exam is required. You can type subject names in Hindi or English.
                  </p>
                </Card>
              )}

              {generationMode === 'exam' && studentExams.length === 0 && (
                <Card className="bg-warning-50 border border-warning-200 mb-4" padded>
                  <p className="text-sm font-medium text-warning-800">No exams found for this student in the selected course.</p>
                  <p className="text-sm text-warning-700 mt-1">Use <strong>Manual Entry</strong> to generate a marksheet without exams.</p>
                </Card>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="w-16 text-center">SR. NO.</TableHeader>
                      <TableHeader>SUBJECT</TableHeader>
                      <TableHeader className="text-center w-24">MAX.</TableHeader>
                      <TableHeader className="text-center w-24">MIN.</TableHeader>
                      <TableHeader className="text-center w-40 whitespace-nowrap">OBTAINED MARKS</TableHeader>
                      {generationMode === 'manual' && <TableHeader className="w-16" />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.marks.map((mark, index) => {
                      const minScore = mark.minMarks != null ? mark.minMarks : Math.round((Number(mark.totalMarks) || 100) * 0.4);
                      return (
                        <TableRow key={index}>
                          <TableCell className="text-center font-medium text-slate-500">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            {generationMode === 'manual' ? (
                              <TextField
                                value={mark.subject}
                                onChange={(e) => handleMarkChange(index, 'subject', e.target.value)}
                                placeholder="Subject name (Hindi / English)"
                                className="min-w-[200px]"
                              />
                            ) : (
                              mark.subject || '—'
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {generationMode === 'manual' ? (
                              <TextField
                                type="number"
                                min="0"
                                value={mark.totalMarks}
                                onChange={(e) => handleMarkChange(index, 'totalMarks', e.target.value)}
                                className="w-24 mx-auto text-center"
                              />
                            ) : (
                              mark.totalMarks
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {generationMode === 'manual' ? (
                              <TextField
                                type="number"
                                min="0"
                                value={mark.minMarks != null ? mark.minMarks : minScore}
                                onChange={(e) => handleMarkChange(index, 'minMarks', e.target.value)}
                                className="w-24 mx-auto text-center"
                              />
                            ) : (
                              minScore
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {generationMode === 'manual' ? (
                              <TextField
                                type="number"
                                min="0"
                                max={mark.totalMarks}
                                value={mark.obtainedMarks}
                                onChange={(e) => handleMarkChange(index, 'obtainedMarks', e.target.value)}
                                className="w-24 mx-auto text-center"
                              />
                            ) : (
                              mark.obtainedMarks
                            )}
                          </TableCell>
                          {generationMode === 'manual' && (
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-danger-600 hover:text-danger-700 p-1"
                                onClick={() => removeMarkRow(index)}
                                aria-label="Remove row"
                              >
                                <FiTrash2 />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell className="text-center"></TableCell>
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-center">{totalMarks}</TableCell>
                      <TableCell className="text-center">{totalMinMarks}</TableCell>
                      <TableCell className="text-center">{totalObtained}</TableCell>
                      {generationMode === 'manual' && <TableCell />}
                    </TableRow>
                    <TableRow className="bg-slate-100 font-bold">
                      <TableCell colSpan={2}>Percentage</TableCell>
                      <TableCell className="text-center" colSpan={generationMode === 'manual' ? 4 : 3}>
                        <Badge variant="primary">{percentage}%</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {generationMode === 'manual' && (
                <div className="mt-3">
                  <Button type="button" variant="secondary" icon={FiPlus} onClick={addMarkRow}>
                    Add Subject Row
                  </Button>
                </div>
              )}
            </FormSection>
          )}

          <FormSection title="Live A4 Print Preview" subtitle="Updates as you select the student and edit marks" icon={FiFileText}>
            <MarksheetLivePreview
              student={selectedStudent}
              course={selectedCourse}
              template={selectedTemplate}
              marks={formData.marks}
              issueDate={formData.issueDate}
              assets={previewAssets}
              renderedImageUrl={renderedPreviewUrl}
              serverRendered
              isRendering={isRenderingPreview}
              renderError={previewRenderError}
            />
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default GenerateMarksheet;
