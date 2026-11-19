import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiCalendar, FiPlus, FiClock, FiMapPin, FiUsers, FiTrash2, FiTag
} from 'react-icons/fi';
import schoolEventApi from '../../api/schoolEventApi';
import {
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge
} from '../../components/ui';

const SchoolEventsCalendar = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showEventModal, setShowEventModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: 'academic',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '09:00 AM',
    endTime: '01:00 PM',
    location: 'School Main Auditorium',
    targetAudience: 'all',
    isHoliday: false
  });

  useEffect(() => {
    loadEvents();
  }, [typeFilter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.eventType = typeFilter;
      const res = await schoolEventApi.getEvents(params);
      setEvents(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await schoolEventApi.createEvent(form);
      toast.success('Event added to school calendar');
      setShowEventModal(false);
      setForm({
        title: '',
        description: '',
        eventType: 'academic',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '09:00 AM',
        endTime: '01:00 PM',
        location: 'School Main Auditorium',
        targetAudience: 'all',
        isHoliday: false
      });
      loadEvents();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add event');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event from the calendar?')) return;
    try {
      await schoolEventApi.deleteEvent(id);
      toast.success('Event deleted');
      loadEvents();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="School Events & Academic Calendar"
        subtitle="Manage academic schedules, holidays, examinations, sports activities, cultural fests, and PTM dates."
      />

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium"
          >
            <option value="">All Event Categories</option>
            <option value="holiday">Official School Holidays</option>
            <option value="academic">Academic Milestones</option>
            <option value="examination">Exam Schedules</option>
            <option value="ptm">Parent-Teacher Meetings</option>
            <option value="sports">Sports Events</option>
            <option value="cultural">Cultural Fests</option>
          </select>
        </div>

        <Button
          onClick={() => setShowEventModal(true)}
          className="flex items-center space-x-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add School Event</span>
        </Button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {events.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-gray-400 text-sm">
            No events scheduled for this category.
          </div>
        ) : (
          events.map(ev => {
            const isHoliday = ev.isHoliday || ev.eventType === 'holiday';
            return (
              <div
                key={ev._id}
                className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${
                  isHoliday
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-indigo-100 text-indigo-800">
                      {ev.eventType}
                    </span>
                    <button
                      onClick={() => handleDelete(ev._id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-bold text-gray-900 text-base">
                    {ev.title}
                  </h4>
                  {ev.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {ev.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center space-x-1.5 font-semibold text-indigo-600">
                    <FiCalendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(ev.startDate).toLocaleDateString()}
                      {new Date(ev.startDate).toDateString() !== new Date(ev.endDate).toDateString() && ` - ${new Date(ev.endDate).toLocaleDateString()}`}
                    </span>
                  </div>
                  {ev.startTime && (
                    <div className="flex items-center space-x-1.5 text-gray-400">
                      <FiClock className="w-3.5 h-3.5" />
                      <span>{ev.startTime} - {ev.endTime}</span>
                    </div>
                  )}
                  {ev.location && (
                    <div className="flex items-center space-x-1.5 text-gray-400">
                      <FiMapPin className="w-3.5 h-3.5" />
                      <span>{ev.location}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Add Event to Academic Calendar
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Athletic Meet 2026 or Diwali Holidays"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Event Category
                  </label>
                  <select
                    value={form.eventType}
                    onChange={(e) => {
                      const t = e.target.value;
                      setForm({ ...form, eventType: t, isHoliday: t === 'holiday' });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  >
                    <option value="academic">Academic</option>
                    <option value="holiday">Holiday</option>
                    <option value="examination">Examination</option>
                    <option value="ptm">Parent-Teacher Meeting</option>
                    <option value="sports">Sports</option>
                    <option value="cultural">Cultural</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description / Guidelines
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Add Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SchoolEventsCalendar;
