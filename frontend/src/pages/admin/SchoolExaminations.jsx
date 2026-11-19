import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiFileText, FiAward, FiGrid, FiUsers, FiPlus, FiPrinter, FiSearch, FiCheck, FiFilter, FiSave, FiCalendar
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import academicExamApi from '../../api/academicExamApi';
import academicApi from '../../api/academicApi';
import studentApi from '../../api/studentApi';
import TeacherAiModal from '../../components/ai/TeacherAiModal';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton
} from '../../components/ui';

const SchoolExaminations = () => {
  const [activeTab, setActiveTab] = useState('exams');
  const [loading, setLoading] = useState(true);
  const [showTeacherAiModal, setShowTeacherAiModal] = useState(false);

  // Masters
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);

  // Exam Form Modal
  const [showExamModal, setShowExamModal] = useState(false);
  const [examForm, setExamForm] = useState({
    title: '',
    examType: 'half_yearly',
    academicSession: '',
    startDate: '',
    endDate: '',
    gradingSystem: 'cbse_9point'
  });

  // Marks Entry State
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [studentsMarks, setStudentsMarks] = useState([]);
  const [marksMax, setMarksMax] = useState({ theory: 80, practical: 20 });
  const [savingMarks, setSavingMarks] = useState(false);

  // Report Card State
  const [reportStudentSearch, setReportStudentSearch] = useState('');
  const [reportStudents, setReportStudents] = useState([]);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [reportCardData, setReportCardData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Seating Plan State
  const [seatingForm, setSeatingForm] = useState({
    examId: '',
    date: new Date().toISOString().split('T')[0],
    session: 'morning',
    roomName: 'Hall A',
    rows: 5,
    cols: 6,
    classIds: []
  });
  const [generatedSeating, setGeneratedSeating] = useState(null);
  const [generatingSeating, setGeneratingSeating] = useState(false);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    setLoading(true);
    try {
      const [classRes, sessRes, subjRes, examRes] = await Promise.all([
        academicApi.getClasses(),
        academicApi.getSessions(),
        academicApi.getSubjects(),
        academicExamApi.getExams()
      ]);
      setClasses(classRes.data?.data || []);
      setSessions(sessRes.data?.data || []);
      setSubjects(subjRes.data?.data || []);
      setExams(examRes.data?.data || []);
      if (examRes.data?.data?.length > 0) {
        setSelectedExam(examRes.data.data[0]._id);
        setSeatingForm(prev => ({ ...prev, examId: examRes.data.data[0]._id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load academic examination masters');
    } finally {
      setLoading(false);
    }
  };

  // When class changes in Marks tab
  const handleClassChange = (clsId) => {
    setSelectedClass(clsId);
    setSelectedSection('');
    setSelectedSubject('');
    const cls = classes.find(c => c._id === clsId);
    setFilteredSections(cls?.sections || []);
    const subjs = subjects.filter(s => !s.schoolClass || s.schoolClass._id === clsId || s.schoolClass === clsId);
    setFilteredSubjects(subjs);
  };

  const loadStudentsForMarks = async () => {
    if (!selectedExam || !selectedClass) {
      toast.info('Please select both Exam and Class to load students');
      return;
    }
    setLoading(true);
    try {
      const params = { schoolClass: selectedClass };
      if (selectedSection) params.section = selectedSection;
      const studRes = await studentApi.getAllStudents(params);
      const studs = studRes.data?.data || [];

      // Fetch existing marks if any
      const marksRes = await academicExamApi.getMarks({
        examId: selectedExam,
        schoolClassId: selectedClass,
        sectionId: selectedSection,
        subjectId: selectedSubject
      });
      const existingMarks = marksRes.data?.data || [];
      const markMap = {};
      existingMarks.forEach(m => {
        markMap[m.student?._id || m.student] = m;
      });

      const rows = studs.map(s => {
        const existing = markMap[s._id] || {};
        return {
          studentId: s._id,
          studentCode: s.studentId,
          rollNumber: s.rollNumber || '-',
          name: `${s.personalInfo?.firstName || ''} ${s.personalInfo?.lastName || ''}`,
          theoryMarks: existing.theoryMarks ?? '',
          practicalMarks: existing.practicalMarks ?? '',
          isAbsent: existing.isAbsent || false,
          remarks: existing.remarks || ''
        };
      });
      setStudentsMarks(rows);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load students for marks entry');
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (idx, field, value) => {
    setStudentsMarks(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const saveAllMarks = async () => {
    if (!selectedExam || !selectedClass || !selectedSubject) {
      toast.error('Please select Exam, Class, and Subject before saving');
      return;
    }
    setSavingMarks(true);
    try {
      const records = studentsMarks.map(row => ({
        studentId: row.studentId,
        theoryMarks: row.theoryMarks !== '' ? Number(row.theoryMarks) : 0,
        practicalMarks: row.practicalMarks !== '' ? Number(row.practicalMarks) : 0,
        maxTheoryMarks: marksMax.theory,
        maxPracticalMarks: marksMax.practical,
        isAbsent: row.isAbsent,
        remarks: row.remarks
      }));

      await academicExamApi.saveBulkMarks({
        examId: selectedExam,
        schoolClassId: selectedClass,
        sectionId: selectedSection || undefined,
        subjectId: selectedSubject,
        records
      });
      toast.success('All marks and CBSE grades saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSavingMarks(false);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await academicExamApi.createExam(examForm);
      toast.success('Exam schedule created successfully');
      setShowExamModal(false);
      setExamForm({
        title: '',
        examType: 'half_yearly',
        academicSession: '',
        startDate: '',
        endDate: '',
        gradingSystem: 'cbse_9point'
      });
      loadMasters();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create exam');
    }
  };

  // Search student for report card
  const searchStudentsForReport = async (query) => {
    setReportStudentSearch(query);
    if (query.length < 2) {
      setReportStudents([]);
      return;
    }
    try {
      const res = await studentApi.getAllStudents({ search: query });
      setReportStudents(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const generateReportCard = async (student) => {
    if (!selectedExam) {
      toast.info('Please select an Exam from the dropdown above');
      return;
    }
    setSelectedStudentForReport(student);
    setLoadingReport(true);
    try {
      const res = await academicExamApi.getReportCard(student._id, selectedExam);
      setReportCardData(res.data?.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate report card');
    } finally {
      setLoadingReport(false);
    }
  };

  // Generate Seating Plan
  const handleGenerateSeating = async (e) => {
    e.preventDefault();
    if (seatingForm.classIds.length === 0) {
      toast.error('Select at least one class for the seating arrangement');
      return;
    }
    setGeneratingSeating(true);
    try {
      const res = await academicExamApi.generateSeatingPlan(seatingForm);
      setGeneratedSeating(res.data?.data);
      toast.success(res.data?.message || 'Anti-cheat seating plan generated');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate seating plan');
    } finally {
      setGeneratingSeating(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Examinations & CCE Grading"
        subtitle="School Exam Schedules, Bulk Marks Entry, CBSE 9-Point CCE Report Cards, and Anti-Cheat Seating Layouts."
      />

      {/* Tabs */}
      <SubNavTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'exams', label: 'Exam Schedules', icon: FiCalendar },
          { id: 'marks', label: 'Marks Entry & Grading', icon: FiFileText },
          { id: 'report_card', label: 'CCE Report Cards', icon: FiAward },
          { id: 'seating', label: 'Anti-Cheat Seating Plan', icon: FiGrid }
        ]}
      />

      {/* TAB 1: EXAM SCHEDULES */}
      {activeTab === 'exams' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Configured Examination Schedules
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowTeacherAiModal(true)}
                className="flex items-center space-x-2 text-primary-700 border-primary-300 hover:bg-primary-50"
              >
                <HiSparkles className="w-4 h-4 text-amber-500" />
                <span>AI Question Generator</span>
              </Button>
              <Button
                onClick={() => setShowExamModal(true)}
                className="flex items-center space-x-2"
              >
                <FiPlus className="w-4 h-4" />
                <span>Create Examination</span>
              </Button>
            </div>
          </div>

          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Exam Title</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Academic Session</TableHeader>
                  <TableHeader>Start Date</TableHeader>
                  <TableHeader>End Date</TableHeader>
                  <TableHeader>Grading System</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {exams.length === 0 ? (
                  <TableEmpty colSpan={7} message="No examinations configured yet." />
                ) : (
                  exams.map(exam => (
                    <TableRow key={exam._id}>
                      <TableCell className="font-semibold text-gray-900">
                        {exam.title}
                      </TableCell>
                      <TableCell className="capitalize">
                        {exam.examType?.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        {exam.academicSession?.sessionName || 'Current Session'}
                      </TableCell>
                      <TableCell>
                        {exam.startDate ? new Date(exam.startDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {exam.endDate ? new Date(exam.endDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-800 font-mono">
                          {exam.gradingSystem?.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={exam.status === 'scheduled' ? 'warning' : exam.status === 'completed' ? 'success' : 'info'}
                          text={exam.status?.toUpperCase()}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>
      )}

      {/* TAB 2: MARKS ENTRY & BULK GRADING */}
      {activeTab === 'marks' && (
        <div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  1. Select Exam
                </label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="">-- Select Exam --</option>
                  {exams.map(ex => (
                    <option key={ex._id} value={ex._id}>{ex.title} ({ex.examType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  2. Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  3. Section (Optional)
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="">-- All Sections --</option>
                  {filteredSections.map(s => (
                    <option key={s._id} value={s._id}>Section {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  4. Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="">-- Select Subject --</option>
                  {filteredSubjects.map(sub => (
                    <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Max Theory: <strong>{marksMax.theory}</strong></span>
                <span>Max Practical/Viva: <strong>{marksMax.practical}</strong></span>
              </div>
              <Button
                onClick={loadStudentsForMarks}
                disabled={!selectedExam || !selectedClass}
                className="flex items-center space-x-1 text-sm"
              >
                <FiSearch className="w-4 h-4" />
                <span>Load Students Roster</span>
              </Button>
            </div>
          </div>

          {studentsMarks.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">
                  Students Roster ({studentsMarks.length} Students)
                </span>
                <Button
                  onClick={saveAllMarks}
                  disabled={savingMarks}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-2"
                >
                  <FiSave className="w-4 h-4" />
                  <span>{savingMarks ? 'Saving...' : 'Save & Compute CCE Grades'}</span>
                </Button>
              </div>

              <TableWrapper>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Roll</TableHeader>
                      <TableHeader>Student Name</TableHeader>
                      <TableHeader>Theory ({marksMax.theory})</TableHeader>
                      <TableHeader>Practical ({marksMax.practical})</TableHeader>
                      <TableHeader>Total Obtained</TableHeader>
                      <TableHeader>Calculated %</TableHeader>
                      <TableHeader>Absent?</TableHeader>
                      <TableHeader>Remarks</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studentsMarks.map((row, idx) => {
                      const th = Number(row.theoryMarks || 0);
                      const pr = Number(row.practicalMarks || 0);
                      const total = th + pr;
                      const maxTotal = marksMax.theory + marksMax.practical;
                      const pct = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : 0;

                      return (
                        <TableRow key={row.studentId}>
                          <TableCell className="font-mono text-xs">{row.rollNumber}</TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {row.name}
                            <span className="block text-xs text-gray-400">{row.studentCode}</span>
                          </TableCell>
                          <TableCell>
                            <input
                              type="number"
                              disabled={row.isAbsent}
                              max={marksMax.theory}
                              min={0}
                              value={row.theoryMarks}
                              onChange={(e) => handleMarksChange(idx, 'theoryMarks', e.target.value)}
                              className="w-20 px-2 py-1 text-sm border rounded text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="number"
                              disabled={row.isAbsent}
                              max={marksMax.practical}
                              min={0}
                              value={row.practicalMarks}
                              onChange={(e) => handleMarksChange(idx, 'practicalMarks', e.target.value)}
                              className="w-20 px-2 py-1 text-sm border rounded text-center"
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-gray-800">
                            {row.isAbsent ? <span className="text-red-500">ABS</span> : total}
                          </TableCell>
                          <TableCell>
                            {row.isAbsent ? '-' : (
                              <span className={`font-mono text-xs font-bold ${Number(pct) >= 75 ? 'text-emerald-600' : Number(pct) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                                {pct}%
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={row.isAbsent}
                              onChange={(e) => handleMarksChange(idx, 'isAbsent', e.target.checked)}
                              className="rounded text-red-600 focus:ring-red-500"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="text"
                              value={row.remarks}
                              placeholder="Optional remarks"
                              onChange={(e) => handleMarksChange(idx, 'remarks', e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableWrapper>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CCE REPORT CARDS */}
      {activeTab === 'report_card' && (
        <div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Search Student to Generate Official CBSE CCE Report Card
            </h3>
            <div className="flex space-x-3 items-center">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by student name or admission number..."
                  value={reportStudentSearch}
                  onChange={(e) => searchStudentsForReport(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>
              <div className="w-64">
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="">-- Choose Exam --</option>
                  {exams.map(ex => (
                    <option key={ex._id} value={ex._id}>{ex.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {reportStudents.length > 0 && (
              <div className="mt-3 border rounded-lg divide-y max-h-48 overflow-y-auto">
                {reportStudents.map(s => (
                  <div
                    key={s._id}
                    onClick={() => generateReportCard(s)}
                    className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold text-sm text-gray-900">
                        {s.personalInfo?.firstName} {s.personalInfo?.lastName}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">ID: {s.studentId}</span>
                    </div>
                    <span className="text-xs text-indigo-600 font-medium">
                      Generate Card &rarr;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loadingReport && (
            <div className="text-center py-10 text-gray-500">Generating CCE Report Card...</div>
          )}

          {reportCardData && (
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto print:shadow-none print:border-none">
              {/* Header */}
              <div className="text-center border-b pb-4 mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  SES EDUCARE ACADEMY
                </h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                  Continuous and Comprehensive Evaluation (CCE) Student Report Card
                </p>
                <div className="mt-2 text-sm font-semibold text-indigo-600">
                  {reportCardData.exam?.title} ({reportCardData.exam?.academicSession?.sessionName || 'Academic Year'})
                </div>
              </div>

              {/* Student Info Box */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-sm mb-6 border">
                <div>
                  <span className="text-xs text-gray-400 block">Student Name</span>
                  <span className="font-semibold text-gray-900">
                    {reportCardData.student?.personalInfo?.firstName} {reportCardData.student?.personalInfo?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Admission / Roll No</span>
                  <span className="font-semibold">{reportCardData.student?.admissionNumber || reportCardData.student?.studentId} / Roll: {reportCardData.student?.rollNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Class & Section</span>
                  <span className="font-semibold">{reportCardData.student?.schoolClass?.name || 'Class'} - {reportCardData.student?.section?.name || 'A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Attendance</span>
                  <span className="font-semibold text-emerald-600">{reportCardData.summary?.attendancePercentage}</span>
                </div>
              </div>

              {/* Scholastic Table */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Part 1: Scholastic Performance
                </h4>
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead className="bg-gray-100 text-left text-xs uppercase">
                    <tr>
                      <th className="border p-2">Subject</th>
                      <th className="border p-2 text-center">Theory</th>
                      <th className="border p-2 text-center">Practical</th>
                      <th className="border p-2 text-center">Total Marks</th>
                      <th className="border p-2 text-center">Max Marks</th>
                      <th className="border p-2 text-center">CBSE Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportCardData.scholasticPerformance?.map(item => (
                      <tr key={item.subject?._id} className="border-b">
                        <td className="border p-2 font-medium">{item.subject?.name}</td>
                        <td className="border p-2 text-center">{item.isAbsent ? 'ABS' : item.theoryMarks}</td>
                        <td className="border p-2 text-center">{item.isAbsent ? 'ABS' : item.practicalMarks}</td>
                        <td className="border p-2 text-center font-bold">{item.isAbsent ? '0' : item.totalMarks}</td>
                        <td className="border p-2 text-center text-gray-500">{item.maxTotalMarks}</td>
                        <td className="border p-2 text-center font-bold text-indigo-600">
                          {item.grade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={3} className="border p-2 text-right">Grand Total:</td>
                      <td className="border p-2 text-center font-bold text-indigo-600">{reportCardData.summary?.totalObtained}</td>
                      <td className="border p-2 text-center">{reportCardData.summary?.totalMax}</td>
                      <td className="border p-2 text-center font-bold">{reportCardData.summary?.overallGrade}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary Badges & Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-indigo-50 rounded border border-indigo-200 text-center">
                  <span className="text-xs text-gray-500 block">Overall Percentage</span>
                  <span className="text-xl font-bold text-indigo-600">
                    {reportCardData.summary?.overallPercentage}%
                  </span>
                </div>
                <div className="p-3 bg-purple-50 rounded border border-purple-200 text-center">
                  <span className="text-xs text-gray-500 block">CBSE Scale Grade</span>
                  <span className="text-xl font-bold text-purple-600">
                    {reportCardData.summary?.overallGrade}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-center">
                  <span className="text-xs text-gray-500 block">Result Status</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {reportCardData.summary?.resultStatus}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border text-sm mb-8">
                <span className="text-xs font-bold text-gray-400 block uppercase">Teacher Remarks</span>
                <p className="italic text-gray-700 mt-1">
                  "{reportCardData.summary?.teacherRemarks}"
                </p>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-end pt-12 text-center text-xs text-gray-500">
                <div className="border-t border-gray-400 w-32 pt-2">Class Teacher</div>
                <div className="border-t border-gray-400 w-32 pt-2">Exam Controller</div>
                <div className="border-t border-gray-400 w-32 pt-2">Principal Stamp</div>
              </div>

              <div className="mt-6 flex justify-end print:hidden">
                <Button onClick={() => window.print()} className="flex items-center space-x-2">
                  <FiPrinter className="w-4 h-4" />
                  <span>Print Report Card</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ANTI-CHEAT SEATING PLAN */}
      {activeTab === 'seating' && (
        <div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 max-w-3xl">
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              Anti-Cheat Seating Plan Generator (Checkerboard Class Interleaving)
            </h3>
            <form onSubmit={handleGenerateSeating} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Exam
                  </label>
                  <select
                    value={seatingForm.examId}
                    onChange={(e) => setSeatingForm({ ...seatingForm, examId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Exam --</option>
                    {exams.map(ex => (
                      <option key={ex._id} value={ex._id}>{ex.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Room / Examination Hall Name
                  </label>
                  <input
                    type="text"
                    value={seatingForm.roomName}
                    onChange={(e) => setSeatingForm({ ...seatingForm, roomName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    value={seatingForm.date}
                    onChange={(e) => setSeatingForm({ ...seatingForm, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Session
                  </label>
                  <select
                    value={seatingForm.session}
                    onChange={(e) => setSeatingForm({ ...seatingForm, session: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  >
                    <option value="morning">Morning (09:00 - 12:00)</option>
                    <option value="afternoon">Afternoon (01:30 - 04:30)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Rows
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={seatingForm.rows}
                    onChange={(e) => setSeatingForm({ ...seatingForm, rows: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Columns (Seats per row)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={seatingForm.cols}
                    onChange={(e) => setSeatingForm({ ...seatingForm, cols: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Select Classes to Interleave (Adjacent seats will alternate classes to eliminate copying)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg border max-h-40 overflow-y-auto">
                  {classes.map(cls => (
                    <label key={cls._id} className="flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={seatingForm.classIds.includes(cls._id)}
                        onChange={(e) => {
                          const id = cls._id;
                          setSeatingForm(prev => ({
                            ...prev,
                            classIds: e.target.checked
                              ? [...prev.classIds, id]
                              : prev.classIds.filter(x => x !== id)
                          }));
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span>{cls.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={generatingSeating}
                  className="w-full flex justify-center items-center space-x-2"
                >
                  <FiGrid className="w-4 h-4" />
                  <span>{generatingSeating ? 'Calculating Layout...' : 'Generate Anti-Cheat Seating Matrix'}</span>
                </Button>
              </div>
            </form>
          </div>

          {generatedSeating && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-bold text-gray-900">
                    {generatedSeating.roomName} - {generatedSeating.session?.toUpperCase()} SESSION
                  </h4>
                  <p className="text-xs text-gray-400">
                    Capacity: {generatedSeating.capacity} seats | Allocated: {generatedSeating.allocations?.length} students
                  </p>
                </div>
                <Button onClick={() => window.print()} className="flex items-center space-x-2 text-sm">
                  <FiPrinter className="w-4 h-4" />
                  <span>Print Door Chart</span>
                </Button>
              </div>

              {/* Seating Grid Visualizer */}
              <div
                className="grid gap-2 p-4 bg-gray-50 rounded-xl overflow-x-auto"
                style={{
                  gridTemplateColumns: `repeat(${generatedSeating.cols}, minmax(120px, 1fr))`
                }}
              >
                {generatedSeating.allocations?.map((alloc, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border-2 rounded-lg text-center shadow-sm border-indigo-100"
                  >
                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 block mb-1">
                      {alloc.seatNumber}
                    </span>
                    <span className="text-xs font-bold text-gray-900 truncate block">
                      {alloc.student?.personalInfo?.firstName} {alloc.student?.personalInfo?.lastName}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 block mt-0.5">
                      {alloc.schoolClass?.name || 'Class'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono block">
                      Roll: {alloc.student?.rollNumber || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Create New Examination Schedule
            </h3>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Term Examination 2026-27"
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={examForm.examType}
                    onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  >
                    <option value="unit_test">Unit Test</option>
                    <option value="quarterly">Quarterly Exam</option>
                    <option value="half_yearly">Half Yearly Exam</option>
                    <option value="pre_board">Pre-Board Exam</option>
                    <option value="annual">Annual Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Grading System
                  </label>
                  <select
                    value={examForm.gradingSystem}
                    onChange={(e) => setExamForm({ ...examForm, gradingSystem: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  >
                    <option value="cbse_9point">CBSE 9-Point Scale (A1-E2)</option>
                    <option value="icse_percentage">ICSE Percentage Scale</option>
                    <option value="gpa">Standard GPA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Academic Session
                </label>
                <select
                  value={examForm.academicSession}
                  onChange={(e) => setExamForm({ ...examForm, academicSession: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="">-- Active Session --</option>
                  {sessions.map(s => (
                    <option key={s._id} value={s._id}>{s.sessionName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={examForm.startDate}
                    onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={examForm.endDate}
                    onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExamModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Publish Exam Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher AI Pedagogy Assistant Modal */}
      <TeacherAiModal
        isOpen={showTeacherAiModal}
        onClose={() => setShowTeacherAiModal(false)}
      />
    </Layout>
  );
};

export default SchoolExaminations;
