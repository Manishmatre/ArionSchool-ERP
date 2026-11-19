import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiAlertTriangle, FiAward, FiPlus, FiCheck, FiFilter, FiUser
} from 'react-icons/fi';
import disciplineApi from '../../api/disciplineApi';
import studentApi from '../../api/studentApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';

const StudentDiscipline = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [students, setStudents] = useState([]);

  const [form, setForm] = useState({
    studentId: '',
    recordType: 'merit',
    category: 'sports_excellence',
    title: '',
    description: '',
    points: 10,
    actionTaken: 'Commendation Letter / Merit Badge',
    parentNotified: true
  });

  useEffect(() => {
    loadRecords();
    loadStudents();
  }, [typeFilter]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.recordType = typeFilter;
      const res = await disciplineApi.getRecords(params);
      setRecords(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load discipline records');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await studentApi.getAllStudents({ limit: 100 });
      setStudents(res.data?.data || []);
      if (res.data?.data?.length > 0) {
        setForm(prev => ({ ...prev, studentId: res.data.data[0]._id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await disciplineApi.createRecord(form);
      toast.success('Record logged successfully');
      setShowLogModal(false);
      setForm({
        studentId: students[0]?._id || '',
        recordType: 'merit',
        category: 'sports_excellence',
        title: '',
        description: '',
        points: 10,
        actionTaken: 'Commendation Letter / Merit Badge',
        parentNotified: true
      });
      loadRecords();
    } catch (err) {
      console.error(err);
      toast.error('Failed to log discipline record');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await disciplineApi.acknowledge(id);
      toast.success('Parent acknowledgment marked');
      loadRecords();
    } catch (err) {
      toast.error('Failed to mark acknowledgment');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Student Discipline & Merits"
        subtitle="Merit badges, behavioral incident tracking, corrective actions, and parent notification acknowledgments."
      />

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium"
          >
            <option value="">All Logs</option>
            <option value="merit">Merits & Achievements</option>
            <option value="demerit">Demerits & Warnings</option>
            <option value="disciplinary_incident">Disciplinary Incidents</option>
          </select>
        </div>

        <Button
          onClick={() => setShowLogModal(true)}
          className="flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <FiPlus className="w-4 h-4" />
          <span>Log Incident / Merit</span>
        </Button>
      </div>

      {/* Records Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Student Name</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Title & Category</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Points</TableHeader>
              <TableHeader>Action Taken</TableHeader>
              <TableHeader>Parent Acknowledged?</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableEmpty colSpan={7} message="No discipline logs found." />
            ) : (
              records.map(r => (
                <TableRow key={r._id}>
                  <TableCell className="font-semibold text-gray-900">
                    {r.student?.personalInfo?.firstName} {r.student?.personalInfo?.lastName}
                    <span className="block text-[11px] text-gray-400">
                      {r.schoolClass?.name} | Roll: {r.student?.rollNumber || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded capitalize ${
                      r.recordType === 'merit'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {r.recordType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900 block">
                      {r.title}
                    </span>
                    <span className="text-[11px] text-gray-400 capitalize">
                      {r.category?.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(r.incidentDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold">
                    <span className={r.points >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {r.points > 0 ? `+${r.points}` : r.points} pts
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {r.actionTaken || '-'}
                  </TableCell>
                  <TableCell>
                    {r.parentAcknowledged ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                        <FiCheck className="w-3.5 h-3.5" />
                        <span>Acknowledged</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(r._id)}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] rounded"
                      >
                        Mark Acknowledged
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      {/* LOG MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Log Merit or Disciplinary Incident
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Student
                </label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.personalInfo?.firstName} {s.personalInfo?.lastName} ({s.admissionNumber || s.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Record Type
                  </label>
                  <select
                    value={form.recordType}
                    onChange={(e) => {
                      const t = e.target.value;
                      setForm({
                        ...form,
                        recordType: t,
                        points: t === 'merit' ? 10 : -5,
                        category: t === 'merit' ? 'sports_excellence' : 'uniform_violation'
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  >
                    <option value="merit">Merit / Achievement</option>
                    <option value="demerit">Demerit / Minor Infraction</option>
                    <option value="disciplinary_incident">Disciplinary Incident</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Points Impact
                  </label>
                  <input
                    type="number"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Incident / Achievement Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Olympiad Gold Medal or Late to Morning Assembly"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Action Taken / Recognition
                </label>
                <input
                  type="text"
                  placeholder="e.g. Certificate awarded in assembly, or Written warning given"
                  value={form.actionTaken}
                  onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLogModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Log Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StudentDiscipline;
