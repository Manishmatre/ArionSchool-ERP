import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiMessageSquare, FiSend, FiClock, FiCalendar, FiPlus, FiCheckCircle, FiBell, FiZap
} from 'react-icons/fi';
import communicationApi from '../../api/communicationApi';
import academicApi from '../../api/academicApi';
import staffApi from '../../api/staffApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';

const CommunicationsHub = () => {
  const [activeTab, setActiveTab] = useState('broadcast');
  const [loading, setLoading] = useState(false);

  // Masters
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Broadcast Form
  const [broadcastForm, setBroadcastForm] = useState({
    schoolClass: '',
    targetAudience: 'parents',
    title: '',
    message: ''
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Automation Trigger Status
  const [automationLog, setAutomationLog] = useState(null);
  const [runningJob, setRunningJob] = useState('');

  // PTM Slots
  const [ptmSlots, setPtmSlots] = useState([]);
  const [showPTMModal, setShowPTMModal] = useState(false);
  const [ptmForm, setPTMForm] = useState({
    title: 'Mid-Term Parent Teacher Meeting',
    teacher: '',
    schoolClass: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '10:15 AM',
    mode: 'in_person'
  });

  useEffect(() => {
    loadMasters();
    loadPTMSlots();
  }, []);

  const loadMasters = async () => {
    try {
      const [clsRes, stfRes] = await Promise.all([
        academicApi.getClasses(),
        staffApi.getAllStaff()
      ]);
      setClasses(clsRes.data?.data || []);
      setTeachers(stfRes.data?.data || []);
      if (clsRes.data?.data?.length > 0) {
        setPTMForm(prev => ({
          ...prev,
          schoolClass: clsRes.data.data[0]._id,
          teacher: stfRes.data?.data?.[0]?._id || ''
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPTMSlots = async () => {
    try {
      const res = await communicationApi.getPTMSlots();
      setPtmSlots(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setSendingBroadcast(true);
    try {
      const res = await communicationApi.broadcast(broadcastForm);
      toast.success(res.data?.message || 'Notice broadcasted successfully');
      setBroadcastForm({
        schoolClass: '',
        targetAudience: 'parents',
        title: '',
        message: ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to send broadcast notice');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleRunTrigger = async (type) => {
    setRunningJob(type);
    try {
      let res;
      if (type === 'absentee') res = await communicationApi.triggerAbsentee();
      else if (type === 'fee') res = await communicationApi.triggerFeeReminders();
      else if (type === 'birthday') res = await communicationApi.triggerBirthdays();

      setAutomationLog(res.data?.data);
      toast.success(res.data?.message || 'Automated workflow executed');
    } catch (err) {
      toast.error('Failed to execute automated trigger');
    } finally {
      setRunningJob('');
    }
  };

  const handleCreatePTM = async (e) => {
    e.preventDefault();
    try {
      await communicationApi.createPTMSlot(ptmForm);
      toast.success('PTM appointment slot scheduled');
      setShowPTMModal(false);
      loadPTMSlots();
    } catch (err) {
      toast.error('Failed to schedule PTM slot');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Communications & Automated Triggers"
        subtitle="WhatsApp & SMS parent broadcast, automated absentee/fee alerts, conversational bot, and PTM slot scheduler."
      />

      {/* Tabs */}
      <SubNavTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'broadcast', label: 'Notice Broadcast', icon: FiSend },
          { id: 'automation', label: 'Background Automations', icon: FiZap },
          { id: 'ptm', label: 'PTM Scheduler', icon: FiCalendar, badge: ptmSlots.length }
        ]}
      />

      {/* TAB 1: BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-md font-bold text-gray-900 mb-2 flex items-center space-x-2">
            <FiMessageSquare className="w-5 h-5 text-indigo-600" />
            <span>Send Instant Parent Notice via WhatsApp & SMS</span>
          </h3>
          <p className="text-xs text-gray-500 mb-6">
            Dispatches official school notices directly to verified parents' phones.
          </p>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Class
                </label>
                <select
                  value={broadcastForm.schoolClass}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, schoolClass: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="">All School Classes</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Recipient Audience
                </label>
                <select
                  value={broadcastForm.targetAudience}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                >
                  <option value="parents">Parents / Guardians</option>
                  <option value="all">Entire Campus Community</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notice Title / Subject
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Annual Sports Day Schedule & Uniform Guidelines"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notice Message Content
              </label>
              <textarea
                rows={5}
                required
                placeholder="Type the announcement details to be delivered via WhatsApp..."
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
              />
            </div>

            <Button
              type="submit"
              disabled={sendingBroadcast}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex justify-center items-center space-x-2"
            >
              <FiSend className="w-4 h-4" />
              <span>{sendingBroadcast ? 'Broadcasting Messages...' : 'Send WhatsApp Broadcast'}</span>
            </Button>
          </form>
        </div>
      )}

      {/* TAB 2: AUTOMATION DASHBOARD */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Absentee Trigger Card */}
            <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                  <FiBell className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-md">
                  Daily Absentee Trigger
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Scans daily attendance records and triggers instant WhatsApp absentee alerts to parents of all students marked absent today.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={() => handleRunTrigger('absentee')}
                  disabled={runningJob === 'absentee'}
                  className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white flex justify-center items-center space-x-1"
                >
                  <FiZap className="w-3.5 h-3.5" />
                  <span>{runningJob === 'absentee' ? 'Executing...' : 'Run Absentee Scanner'}</span>
                </Button>
              </div>
            </div>

            {/* Fee Due Trigger Card */}
            <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <FiClock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-md">
                  Fee Due & Defaulter Reminder
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Queries pending school fee obligations and dispatches payment reminders with direct 1-click Razorpay payment links.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={() => handleRunTrigger('fee')}
                  disabled={runningJob === 'fee'}
                  className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex justify-center items-center space-x-1"
                >
                  <FiZap className="w-3.5 h-3.5" />
                  <span>{runningJob === 'fee' ? 'Executing...' : 'Run Fee Reminder Job'}</span>
                </Button>
              </div>
            </div>

            {/* Birthday Greetings Card */}
            <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-md">
                  Birthday Greetings Trigger
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Finds all students and teachers celebrating birthdays today and delivers customized greeting cards via WhatsApp.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={() => handleRunTrigger('birthday')}
                  disabled={runningJob === 'birthday'}
                  className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white flex justify-center items-center space-x-1"
                >
                  <FiZap className="w-3.5 h-3.5" />
                  <span>{runningJob === 'birthday' ? 'Executing...' : 'Run Birthday Dispatcher'}</span>
                </Button>
              </div>
            </div>
          </div>

          {automationLog && (
            <div className="p-4 bg-gray-50 rounded-xl border">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Execution Result Payload
              </h5>
              <pre className="text-xs font-mono text-gray-800 overflow-x-auto">
                {JSON.stringify(automationLog, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PTM SCHEDULER */}
      {activeTab === 'ptm' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-gray-800">
              Parent-Teacher Meeting (PTM) Appointment Slots
            </h3>
            <Button
              onClick={() => setShowPTMModal(true)}
              className="flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <FiPlus className="w-4 h-4" />
              <span>Schedule PTM Slot</span>
            </Button>
          </div>

          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Event Title</TableHeader>
                  <TableHeader>Teacher</TableHeader>
                  <TableHeader>Class</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Time Slot</TableHeader>
                  <TableHeader>Mode</TableHeader>
                  <TableHeader>Booking Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {ptmSlots.length === 0 ? (
                  <TableEmpty colSpan={7} message="No PTM slots scheduled." />
                ) : (
                  ptmSlots.map(slot => (
                    <TableRow key={slot._id}>
                      <TableCell className="font-semibold text-gray-900">
                        {slot.title}
                      </TableCell>
                      <TableCell className="text-xs">
                        {slot.teacher?.personalInfo?.firstName} {slot.teacher?.personalInfo?.lastName}
                      </TableCell>
                      <TableCell className="text-xs">
                        {slot.schoolClass?.name || 'Class'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(slot.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {slot.startTime} - {slot.endTime}
                      </TableCell>
                      <TableCell className="capitalize text-xs">
                        {slot.mode?.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={slot.status === 'booked' ? 'success' : 'info'}
                          text={slot.status === 'booked' ? 'BOOKED' : 'AVAILABLE'}
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

      {/* SCHEDULE PTM MODAL */}
      {showPTMModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Schedule PTM Appointment Slot
            </h3>
            <form onSubmit={handleCreatePTM} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={ptmForm.title}
                  onChange={(e) => setPTMForm({ ...ptmForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Teacher
                  </label>
                  <select
                    value={ptmForm.teacher}
                    onChange={(e) => setPTMForm({ ...ptmForm, teacher: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.personalInfo?.firstName} {t.personalInfo?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    value={ptmForm.schoolClass}
                    onChange={(e) => setPTMForm({ ...ptmForm, schoolClass: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    required
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={ptmForm.date}
                    onChange={(e) => setPTMForm({ ...ptmForm, date: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10:00 AM"
                    value={ptmForm.startTime}
                    onChange={(e) => setPTMForm({ ...ptmForm, startTime: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10:15 AM"
                    value={ptmForm.endTime}
                    onChange={(e) => setPTMForm({ ...ptmForm, endTime: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPTMModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Confirm Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CommunicationsHub;
