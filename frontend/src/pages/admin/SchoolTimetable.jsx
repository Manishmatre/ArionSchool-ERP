import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiClock, FiCalendar, FiPlus, FiTrash2, FiEdit2, FiCpu, FiUser, FiLayers, FiFilter
} from 'react-icons/fi';
import timetableApi from '../../api/timetableApi';
import academicApi from '../../api/academicApi';
import staffApi from '../../api/staffApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty
} from '../../components/ui';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6];

const SchoolTimetable = () => {
  const [loading, setLoading] = useState(true);

  // Masters
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Selected filters
  const [viewMode, setViewMode] = useState('class'); // 'class' or 'teacher'
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');

  // Timetable entries
  const [entries, setEntries] = useState([]);

  // Manual Entry Modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryForm, setEntryForm] = useState({
    schoolClass: '',
    section: '',
    subject: '',
    teacher: '',
    dayOfWeek: 'Monday',
    periodNumber: 1,
    startTime: '08:30',
    endTime: '09:15',
    roomNumber: 'Room 101'
  });

  // Smart Auto-Generator Modal
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [autoForm, setAutoForm] = useState({
    schoolClass: '',
    section: '',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periodsPerDay: 6,
    clearExisting: true,
    subjectTeacherAllocations: []
  });

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    if (selectedSection || selectedTeacher) {
      loadTimetable();
    }
  }, [selectedSection, selectedTeacher, viewMode]);

  const loadMasters = async () => {
    setLoading(true);
    try {
      const [classRes, subjRes, staffRes, sessRes] = await Promise.all([
        academicApi.getClasses(),
        academicApi.getSubjects(),
        staffApi.getAllStaff(),
        academicApi.getSessions()
      ]);
      const clsList = classRes.data?.data || [];
      setClasses(clsList);
      setSubjects(subjRes.data?.data || []);
      setTeachers(staffRes.data?.data || []);
      setSessions(sessRes.data?.data || []);

      if (clsList.length > 0) {
        setSelectedClass(clsList[0]._id);
        setSections(clsList[0].sections || []);
        if (clsList[0].sections?.length > 0) {
          setSelectedSection(clsList[0].sections[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load timetable masters');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (clsId) => {
    setSelectedClass(clsId);
    const cls = classes.find(c => c._id === clsId);
    const sects = cls?.sections || [];
    setSections(sects);
    if (sects.length > 0) {
      setSelectedSection(sects[0]._id);
    } else {
      setSelectedSection('');
    }
  };

  const loadTimetable = async () => {
    try {
      const params = {};
      if (viewMode === 'class' && selectedSection) {
        params.section = selectedSection;
      } else if (viewMode === 'teacher' && selectedTeacher) {
        params.teacher = selectedTeacher;
      }
      const res = await timetableApi.getTimetable(params);
      setEntries(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load timetable entries');
    }
  };

  const handleOpenAddModal = (day = 'Monday', period = 1) => {
    setEditingEntry(null);
    setEntryForm({
      schoolClass: selectedClass,
      section: selectedSection,
      subject: subjects[0]?._id || '',
      teacher: teachers[0]?._id || '',
      dayOfWeek: day,
      periodNumber: period,
      startTime: getPeriodStartTime(period),
      endTime: getPeriodEndTime(period),
      roomNumber: 'Room 101'
    });
    setShowEntryModal(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setEntryForm({
      _id: entry._id,
      schoolClass: entry.schoolClass?._id || entry.schoolClass,
      section: entry.section?._id || entry.section,
      subject: entry.subject?._id || entry.subject,
      teacher: entry.teacher?._id || entry.teacher,
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      startTime: entry.startTime,
      endTime: entry.endTime,
      roomNumber: entry.roomNumber || ''
    });
    setShowEntryModal(true);
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this period slot?')) return;
    try {
      await timetableApi.deleteEntry(id);
      toast.success('Period removed');
      loadTimetable();
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    try {
      await timetableApi.saveEntry(entryForm);
      toast.success('Timetable entry saved successfully');
      setShowEntryModal(false);
      loadTimetable();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conflict detected or save failed');
    }
  };

  // Setup auto-generate defaults
  const handleOpenAutoModal = () => {
    const allocations = subjects.slice(0, 5).map((subj, idx) => ({
      subjectId: subj._id,
      teacherId: teachers[idx % teachers.length]?._id || '',
      weeklyPeriods: 5,
      roomNumber: 'Classroom'
    }));

    setAutoForm({
      schoolClass: selectedClass,
      section: selectedSection,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      periodsPerDay: 6,
      clearExisting: true,
      subjectTeacherAllocations: allocations
    });
    setShowAutoModal(true);
  };

  const handleRunAutoGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await timetableApi.autoGenerate(autoForm);
      toast.success(res.data?.message || 'Timetable generated successfully');
      setShowAutoModal(false);
      loadTimetable();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Auto-generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const getPeriodStartTime = (period) => {
    const map = { 1: '08:30', 2: '09:15', 3: '10:00', 4: '11:15', 5: '12:00', 6: '12:45' };
    return map[period] || '08:30';
  };

  const getPeriodEndTime = (period) => {
    const map = { 1: '09:15', 2: '10:00', 3: '10:45', 4: '12:00', 5: '12:45', 6: '01:30' };
    return map[period] || '09:15';
  };

  return (
    <Layout>
      <PageHeader
        title="Smart Timetable Management"
        subtitle="Constraint-based automated scheduler, teacher conflict resolution, and interactive weekly class timetables."
      />

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('class')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'class'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Class Timetable
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'teacher'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Teacher Schedule
            </button>
          </div>

          {viewMode === 'class' ? (
            <div className="flex items-center space-x-2">
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-xs bg-gray-50 font-medium"
              >
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-xs bg-gray-50 font-medium"
              >
                {sections.map(s => (
                  <option key={s._id} value={s._id}>Section {s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-xs bg-gray-50 font-medium"
              >
                <option value="">-- Choose Teacher --</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.personalInfo?.firstName} {t.personalInfo?.lastName} ({t.staffId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={handleOpenAutoModal}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-2 text-xs"
          >
            <FiCpu className="w-4 h-4" />
            <span>Smart Auto-Generate</span>
          </Button>

          <Button
            onClick={() => handleOpenAddModal()}
            className="flex items-center space-x-2 text-xs"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Period Slot</span>
          </Button>
        </div>
      </div>

      {/* Timetable Weekly Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                Day / Period
              </th>
              {PERIODS.map(p => (
                <th key={p} className="p-3 text-center text-xs font-semibold text-gray-700 border-l">
                  <span>Period {p}</span>
                  <span className="block text-[10px] text-gray-400 font-normal">
                    {getPeriodStartTime(p)} - {getPeriodEndTime(p)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {DAYS_OF_WEEK.map(day => (
              <tr key={day} className="hover:bg-gray-50/50">
                <td className="p-3 font-semibold text-xs text-gray-800 bg-gray-50/80">
                  {day}
                </td>
                {PERIODS.map(period => {
                  const entry = entries.find(e => e.dayOfWeek === day && e.periodNumber === period);

                  return (
                    <td
                      key={period}
                      className="p-2 border-l align-top min-w-[140px] h-24 relative group"
                    >
                      {entry ? (
                        <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200 h-full flex flex-col justify-between">
                          <div>
                            <span className="font-bold text-xs text-indigo-900 block truncate">
                              {entry.subject?.name}
                            </span>
                            <span className="text-[11px] text-gray-600 block truncate">
                              {viewMode === 'class'
                                ? `${entry.teacher?.personalInfo?.firstName || ''} ${entry.teacher?.personalInfo?.lastName || ''}`
                                : `${entry.schoolClass?.name || 'Class'} - ${entry.section?.name || 'A'}`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                            <span className="font-mono">{entry.roomNumber || 'Rm'}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="text-gray-500 hover:text-indigo-600 p-0.5"
                                title="Edit"
                              >
                                <FiEdit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry._id)}
                                className="text-gray-500 hover:text-red-600 p-0.5"
                                title="Delete"
                              >
                                <FiTrash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleOpenAddModal(day, period)}
                          className="h-full border-2 border-dashed border-gray-100 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:border-indigo-300 cursor-pointer transition-all"
                        >
                          <FiPlus className="w-4 h-4 text-indigo-400" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MANUAL ENTRY / EDIT MODAL */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-md font-bold text-gray-900 mb-4">
              {editingEntry ? 'Edit Period Slot' : 'Assign Timetable Period'}
            </h3>
            <form onSubmit={handleSaveEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={entryForm.dayOfWeek}
                    onChange={(e) => setEntryForm({ ...entryForm, dayOfWeek: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-gray-50"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Period Number
                  </label>
                  <select
                    value={entryForm.periodNumber}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setEntryForm({
                        ...entryForm,
                        periodNumber: p,
                        startTime: getPeriodStartTime(p),
                        endTime: getPeriodEndTime(p)
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-gray-50"
                  >
                    {PERIODS.map(p => (
                      <option key={p} value={p}>Period {p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Subject
                </label>
                <select
                  value={entryForm.subject}
                  onChange={(e) => setEntryForm({ ...entryForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-gray-50"
                  required
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Teacher
                </label>
                <select
                  value={entryForm.teacher}
                  onChange={(e) => setEntryForm({ ...entryForm, teacher: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-gray-50"
                  required
                >
                  <option value="">-- Assign Teacher --</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.personalInfo?.firstName} {t.personalInfo?.lastName} ({t.staffId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={entryForm.startTime}
                    onChange={(e) => setEntryForm({ ...entryForm, startTime: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={entryForm.endTime}
                    onChange={(e) => setEntryForm({ ...entryForm, endTime: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Room No.
                  </label>
                  <input
                    type="text"
                    value={entryForm.roomNumber}
                    onChange={(e) => setEntryForm({ ...entryForm, roomNumber: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEntryModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Period
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMART AUTO-GENERATOR MODAL */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-2 mb-2">
              <FiCpu className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Constraint-Based Smart Timetable Auto-Generator
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Solves teacher-period availability, prevents section clashing, and balances subject distribution across the week.
            </p>

            <form onSubmit={handleRunAutoGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target Class & Section
                  </label>
                  <div className="text-sm font-semibold text-gray-800 bg-gray-50 p-2 rounded">
                    {classes.find(c => c._id === autoForm.schoolClass)?.name} - Section {sections.find(s => s._id === autoForm.section)?.name}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Periods Per Day
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="8"
                    value={autoForm.periodsPerDay}
                    onChange={(e) => setAutoForm({ ...autoForm, periodsPerDay: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Subject-Teacher Weekly Allocations
                </label>
                <div className="space-y-2 border rounded-lg p-3 max-h-56 overflow-y-auto">
                  {autoForm.subjectTeacherAllocations.map((alloc, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      <select
                        value={alloc.subjectId}
                        onChange={(e) => {
                          const updated = [...autoForm.subjectTeacherAllocations];
                          updated[idx].subjectId = e.target.value;
                          setAutoForm({ ...autoForm, subjectTeacherAllocations: updated });
                        }}
                        className="flex-1 px-2 py-1 border rounded"
                      >
                        {subjects.map(s => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>

                      <select
                        value={alloc.teacherId}
                        onChange={(e) => {
                          const updated = [...autoForm.subjectTeacherAllocations];
                          updated[idx].teacherId = e.target.value;
                          setAutoForm({ ...autoForm, subjectTeacherAllocations: updated });
                        }}
                        className="flex-1 px-2 py-1 border rounded"
                      >
                        {teachers.map(t => (
                          <option key={t._id} value={t._id}>
                            {t.personalInfo?.firstName} {t.personalInfo?.lastName}
                          </option>
                        ))}
                      </select>

                      <div className="w-24 flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={alloc.weeklyPeriods}
                          onChange={(e) => {
                            const updated = [...autoForm.subjectTeacherAllocations];
                            updated[idx].weeklyPeriods = Number(e.target.value);
                            setAutoForm({ ...autoForm, subjectTeacherAllocations: updated });
                          }}
                          className="w-12 px-1 py-1 border rounded text-center"
                        />
                        <span className="text-[10px] text-gray-400">p/wk</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = autoForm.subjectTeacherAllocations.filter((_, i) => i !== idx);
                          setAutoForm({ ...autoForm, subjectTeacherAllocations: updated });
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setAutoForm({
                        ...autoForm,
                        subjectTeacherAllocations: [
                          ...autoForm.subjectTeacherAllocations,
                          {
                            subjectId: subjects[0]?._id || '',
                            teacherId: teachers[0]?._id || '',
                            weeklyPeriods: 4,
                            roomNumber: 'Classroom'
                          }
                        ]
                      });
                    }}
                    className="text-xs text-indigo-600 font-semibold flex items-center space-x-1 pt-1"
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                    <span>Add Subject Allocation</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="clearExisting"
                  checked={autoForm.clearExisting}
                  onChange={(e) => setAutoForm({ ...autoForm, clearExisting: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="clearExisting" className="text-xs text-gray-700">
                  Replace / Overwrite any existing period slots for this section
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAutoModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-2"
                >
                  <FiCpu className="w-4 h-4" />
                  <span>{generating ? 'Solving Constraints...' : 'Generate Conflict-Free Schedule'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SchoolTimetable;
