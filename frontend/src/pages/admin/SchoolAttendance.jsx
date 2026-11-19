import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiCalendar, FiCheck, FiX, FiClock, FiSearch, FiSave, FiUsers, FiCheckCircle
} from 'react-icons/fi';
import api from '../../api/axios';
import academicApi from '../../api/academicApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';

const SchoolAttendance = () => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await academicApi.getClasses();
      const clsList = res.data?.data || [];
      setClasses(clsList);
      if (clsList.length > 0) {
        setSelectedClass(clsList[0]._id);
        const sects = clsList[0].sections || [];
        setSections(sects);
        if (sects.length > 0) setSelectedSection(sects[0]._id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClassChange = (clsId) => {
    setSelectedClass(clsId);
    const cls = classes.find(c => c._id === clsId);
    const sects = cls?.sections || [];
    setSections(sects);
    if (sects.length > 0) setSelectedSection(sects[0]._id);
    else setSelectedSection('');
  };

  const loadRoster = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const params = {
        schoolClass: selectedClass,
        date: attendanceDate
      };
      if (selectedSection) params.section = selectedSection;

      const res = await api.get('/attendance/school-daily', { params });
      setRoster(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load class attendance roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) loadRoster();
  }, [selectedClass, selectedSection, attendanceDate]);

  const updateStatus = (studentId, status) => {
    setRoster(prev => prev.map(s => (s.studentId === studentId ? { ...s, status } : s)));
  };

  const markAllPresent = () => {
    setRoster(prev => prev.map(s => ({ ...s, status: 'present' })));
    toast.info('Marked all students as Present');
  };

  const saveAttendance = async () => {
    if (roster.length === 0) return;
    if (roster.some((student) => !['present', 'absent', 'late', 'half_day', 'leave'].includes(student.status))) {
      toast.error('Mark an attendance status for every student before saving.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/attendance/school-daily', {
        schoolClass: selectedClass,
        section: selectedSection || undefined,
        date: attendanceDate,
        records: roster.map(r => ({
          studentId: r.studentId,
          status: r.status,
          remarks: r.remarks
        }))
      });
      toast.success('Class attendance saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const totalCount = roster.length;
  const presentCount = roster.filter(r => r.status === 'present').length;
  const absentCount = roster.filter(r => r.status === 'absent').length;
  const lateCount = roster.filter(r => r.status === 'late').length;
  const unmarkedCount = roster.filter(r => r.status === 'unmarked').length;
  const attendancePct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <Layout>
      <PageHeader
        title="Daily Class Attendance Register"
        subtitle="One-click class attendance marking, walk-through RFID integration, and automated parent absentee notifications."
      />

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-primary-500/20"
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">All Sections</option>
              {sections.map(s => (
                <option key={s._id} value={s._id}>Section {s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Attendance Date
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllPresent}
            className="text-xs"
          >
            Mark All Present
          </Button>

          <Button
            onClick={saveAttendance}
            disabled={saving || roster.length === 0 || unmarkedCount > 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center space-x-1"
          >
            <FiSave className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Attendance Register'}</span>
          </Button>
        </div>
      </div>

      {/* Quick Attendance Stats */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="p-3 bg-white rounded-lg border border-gray-200 text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Roster</span>
            <span className="text-xl font-bold text-gray-900">{totalCount}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase block">Present</span>
            <span className="text-xl font-bold text-emerald-600">{presentCount}</span>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
            <span className="text-[10px] font-bold text-red-600 uppercase block">Absent</span>
            <span className="text-xl font-bold text-red-600">{absentCount}</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
            <span className="text-[10px] font-bold text-amber-600 uppercase block">Late</span>
            <span className="text-xl font-bold text-amber-600">{lateCount}</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-center">
            <span className="text-[10px] font-bold text-indigo-600 uppercase block">Attendance Rate</span>
            <span className="text-xl font-bold text-indigo-600">{attendancePct}%</span>
          </div>
        </div>
      )}
      {unmarkedCount > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          {unmarkedCount} student{unmarkedCount === 1 ? '' : 's'} still need an attendance status. Use “Mark All Present” only after confirming the class register.
        </p>
      )}

      {/* Roster Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Roll</TableHeader>
              <TableHeader>Student Name</TableHeader>
              <TableHeader>Admission #</TableHeader>
              <TableHeader>Source</TableHeader>
              <TableHeader>Attendance Status</TableHeader>
              <TableHeader>Remarks</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={6} message="Loading student roster..." />
            ) : roster.length === 0 ? (
              <TableEmpty colSpan={6} message="No students enrolled in this class/section." />
            ) : (
              roster.map(student => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-mono text-xs font-bold">
                    {student.rollNumber}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    {student.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-400">
                    {student.admissionNumber}
                  </TableCell>
                  <TableCell className="capitalize text-xs text-gray-500">
                    {student.source === 'rfid' ? (
                      <span className="text-purple-600 font-bold">RFID Gate</span>
                    ) : (
                      'Manual'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {['present', 'absent', 'late', 'half_day', 'leave'].map(st => {
                        const isSelected = student.status === st;
                        const colors = {
                          present: isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600',
                          absent: isSelected ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600',
                          late: isSelected ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600',
                          half_day: isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600',
                          leave: isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600',
                        };

                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateStatus(student.studentId, st)}
                            className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-all ${colors[st]}`}
                          >
                            {st === 'half_day' ? 'Half' : st}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      placeholder="Optional notes"
                      value={student.remarks || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRoster(prev => prev.map(s => (s.studentId === student.studentId ? { ...s, remarks: val } : s)));
                      }}
                      className="px-2 py-1 text-xs border rounded w-full"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrapper>
    </Layout>
  );
};

export default SchoolAttendance;
