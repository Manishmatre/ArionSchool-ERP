import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiFileText, FiPlus, FiCalendar, FiCheckCircle, FiTrash2, FiEye, FiDownload, FiCheck, FiFilter
} from 'react-icons/fi';
import homeworkApi from '../../api/homeworkApi';
import academicApi from '../../api/academicApi';
import staffApi from '../../api/staffApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge, IconButton
} from '../../components/ui';

const SchoolHomework = () => {
  const [loading, setLoading] = useState(true);

  // Masters
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Filter
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [filteredSections, setFilteredSections] = useState([]);

  // Homework list
  const [homeworkList, setHomeworkList] = useState([]);

  // Create Homework Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [homeworkForm, setHomeworkForm] = useState({
    title: '',
    description: '',
    schoolClass: '',
    section: '',
    subject: '',
    teacher: '',
    dueDate: '',
    maxMarks: 10
  });

  // Submissions Modal
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Evaluation Form
  const [evaluatingSubmission, setEvaluatingSubmission] = useState(null);
  const [evalForm, setEvalForm] = useState({
    marksObtained: '',
    teacherFeedback: '',
    status: 'evaluated'
  });

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    loadHomework();
  }, [selectedClass, selectedSection]);

  const loadMasters = async () => {
    setLoading(true);
    try {
      const [classRes, subjRes, staffRes] = await Promise.all([
        academicApi.getClasses(),
        academicApi.getSubjects(),
        staffApi.getAllStaff()
      ]);
      setClasses(classRes.data?.data || []);
      setSubjects(subjRes.data?.data || []);
      setTeachers(staffRes.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load homework masters');
    } finally {
      setLoading(false);
    }
  };

  const handleClassFilterChange = (clsId) => {
    setSelectedClass(clsId);
    setSelectedSection('');
    const cls = classes.find(c => c._id === clsId);
    setFilteredSections(cls?.sections || []);
  };

  const loadHomework = async () => {
    try {
      const params = {};
      if (selectedClass) params.schoolClass = selectedClass;
      if (selectedSection) params.section = selectedSection;
      const res = await homeworkApi.getHomework(params);
      setHomeworkList(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load homework list');
    }
  };

  const handleCreateHomework = async (e) => {
    e.preventDefault();
    try {
      await homeworkApi.createHomework(homeworkForm);
      toast.success('Homework assignment published successfully');
      setShowCreateModal(false);
      setHomeworkForm({
        title: '',
        description: '',
        schoolClass: '',
        section: '',
        subject: '',
        teacher: '',
        dueDate: '',
        maxMarks: 10
      });
      loadHomework();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to publish homework');
    }
  };

  const handleDeleteHomework = async (id) => {
    if (!window.confirm('Delete this homework assignment?')) return;
    try {
      await homeworkApi.deleteHomework(id);
      toast.success('Homework assignment deleted');
      loadHomework();
    } catch (err) {
      toast.error('Failed to delete homework');
    }
  };

  const handleOpenSubmissions = async (hw) => {
    setSelectedHomework(hw);
    setShowSubmissionsModal(true);
    setLoadingSubmissions(true);
    try {
      const res = await homeworkApi.getSubmissions(hw._id);
      setSubmissions(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load homework submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (!evaluatingSubmission) return;
    try {
      await homeworkApi.evaluateSubmission(evaluatingSubmission._id, evalForm);
      toast.success('Submission evaluated');
      setEvaluatingSubmission(null);
      // reload submissions
      const res = await homeworkApi.getSubmissions(selectedHomework._id);
      setSubmissions(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to evaluate submission');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Homework & Assignments"
        subtitle="Daily class-wise homework tasks, student digital submissions, teacher grading, and feedback."
      />

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <select
            value={selectedClass}
            onChange={(e) => handleClassFilterChange(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClass}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50"
          >
            <option value="">All Sections</option>
            {filteredSections.map(s => (
              <option key={s._id} value={s._id}>Section {s.name}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={() => {
            if (classes.length > 0) {
              setHomeworkForm(prev => ({
                ...prev,
                schoolClass: classes[0]._id,
                section: classes[0].sections?.[0]?._id || '',
                subject: subjects[0]?._id || '',
                teacher: teachers[0]?._id || ''
              }));
            }
            setShowCreateModal(true);
          }}
          className="flex items-center space-x-2 text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Post Homework</span>
        </Button>
      </div>

      {/* Homework Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Title & Subject</TableHeader>
              <TableHeader>Class & Section</TableHeader>
              <TableHeader>Assigned Teacher</TableHeader>
              <TableHeader>Due Date</TableHeader>
              <TableHeader>Max Marks</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {homeworkList.length === 0 ? (
              <TableEmpty colSpan={6} message="No homework assignments posted for this selection." />
            ) : (
              homeworkList.map(hw => {
                const isOverdue = new Date(hw.dueDate) < new Date();
                return (
                  <TableRow key={hw._id}>
                    <TableCell>
                      <span className="font-semibold text-gray-900 block">
                        {hw.title}
                      </span>
                      <span className="text-xs text-indigo-600 font-medium">
                        {hw.subject?.name || 'Subject'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">
                      {hw.schoolClass?.name || 'Class'} - {hw.section?.name || 'A'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {hw.teacher?.personalInfo?.firstName} {hw.teacher?.personalInfo?.lastName}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={`font-semibold ${isOverdue ? 'text-amber-600' : 'text-gray-700'}`}>
                        {new Date(hw.dueDate).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {hw.maxMarks} pts
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSubmissions(hw)}
                          className="flex items-center space-x-1 text-xs py-1 px-2.5"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          <span>Submissions</span>
                        </Button>
                        <button
                          onClick={() => handleDeleteHomework(hw._id)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      {/* CREATE HOMEWORK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Post Homework Assignment
            </h3>
            <form onSubmit={handleCreateHomework} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4 Exercise Questions 1 to 10"
                  value={homeworkForm.title}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Instructions / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide instructions, hints, or textbook page numbers..."
                  value={homeworkForm.description}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    value={homeworkForm.schoolClass}
                    onChange={(e) => {
                      const clsId = e.target.value;
                      const cls = classes.find(c => c._id === clsId);
                      setHomeworkForm({
                        ...homeworkForm,
                        schoolClass: clsId,
                        section: cls?.sections?.[0]?._id || ''
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    value={homeworkForm.section}
                    onChange={(e) => setHomeworkForm({ ...homeworkForm, section: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Section --</option>
                    {classes
                      .find(c => c._id === homeworkForm.schoolClass)
                      ?.sections?.map(s => (
                        <option key={s._id} value={s._id}>Section {s.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={homeworkForm.subject}
                    onChange={(e) => setHomeworkForm({ ...homeworkForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Teacher
                  </label>
                  <select
                    value={homeworkForm.teacher}
                    onChange={(e) => setHomeworkForm({ ...homeworkForm, teacher: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    <option value="">-- Choose Teacher --</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.personalInfo?.firstName} {t.personalInfo?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Submission Due Date
                  </label>
                  <input
                    type="date"
                    value={homeworkForm.dueDate}
                    onChange={(e) => setHomeworkForm({ ...homeworkForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={homeworkForm.maxMarks}
                    onChange={(e) => setHomeworkForm({ ...homeworkForm, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Publish Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMISSIONS MODAL */}
      {showSubmissionsModal && selectedHomework && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl border border-gray-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-md font-bold text-gray-900">
                  Submissions: {selectedHomework.title}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedHomework.schoolClass?.name} - {selectedHomework.section?.name} | Max Marks: {selectedHomework.maxMarks}
                </p>
              </div>
              <button
                onClick={() => setShowSubmissionsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            {loadingSubmissions ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading student submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No student submissions submitted yet.</div>
            ) : (
              <div className="divide-y">
                {submissions.map(sub => (
                  <div key={sub._id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="font-semibold text-sm text-gray-900 block">
                        {sub.student?.personalInfo?.firstName} {sub.student?.personalInfo?.lastName}
                      </span>
                      <span className="text-xs text-gray-400 block">
                        Roll: {sub.student?.rollNumber || '-'} | Submitted: {new Date(sub.submittedAt).toLocaleString()}
                      </span>
                      {sub.studentNotes && (
                        <p className="text-xs italic text-gray-600 mt-1">
                          "{sub.studentNotes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {sub.status === 'evaluated' ? (
                        <div className="text-right">
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800">
                            {sub.marksObtained} / {selectedHomework.maxMarks} Marks
                          </span>
                          {sub.teacherFeedback && (
                            <span className="text-[11px] text-gray-400 block mt-0.5">
                              {sub.teacherFeedback}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEvaluatingSubmission(sub);
                            setEvalForm({
                              marksObtained: sub.marksObtained ?? '',
                              teacherFeedback: sub.teacherFeedback || '',
                              status: 'evaluated'
                            });
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded font-medium"
                        >
                          Grade / Feedback
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EVALUATION DRAWER */}
            {evaluatingSubmission && (
              <div className="mt-4 p-4 border rounded-xl bg-gray-50">
                <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                  Grade Submission for {evaluatingSubmission.student?.personalInfo?.firstName}
                </h4>
                <form onSubmit={handleEvaluate} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Marks (Max: {selectedHomework.maxMarks})
                      </label>
                      <input
                        type="number"
                        max={selectedHomework.maxMarks}
                        min="0"
                        value={evalForm.marksObtained}
                        onChange={(e) => setEvalForm({ ...evalForm, marksObtained: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        value={evalForm.status}
                        onChange={(e) => setEvalForm({ ...evalForm, status: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      >
                        <option value="evaluated">Approved / Evaluated</option>
                        <option value="resubmit_required">Needs Revision</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Teacher Feedback Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Well written solutions, neat diagrams."
                      value={evalForm.teacherFeedback}
                      onChange={(e) => setEvalForm({ ...evalForm, teacherFeedback: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEvaluatingSubmission(null)}
                      className="px-3 py-1 text-xs border rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded"
                    >
                      Submit Grade
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SchoolHomework;
