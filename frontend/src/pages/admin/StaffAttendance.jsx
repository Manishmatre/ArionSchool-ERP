import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiCalendar, FiCheck, FiX, FiClock, FiUsers, FiList } from 'react-icons/fi';
import StaffAttendanceCalendar from '../../components/StaffAttendanceCalendar';
import { getAllStaff } from '../../api/staffApi';
import { markAttendance, getAttendance, updateAttendance } from '../../api/staffAttendanceApi';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField,
  Button, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge,
} from '../../components/ui';

const StaffAttendance = () => {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [franchiseFilter, setFranchiseFilter] = useState('all');
  const [franchises, setFranchises] = useState([]);

  useEffect(() => {
    fetchStaff();
    fetchAttendance();
  }, [selectedDate, viewMode]);

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff({ status: 'active' });
      setStaff(data.data || []);

      // Extract schools from staff data for the filter dropdown
      const franchiseMap = new Map();
      data.data?.forEach(staff => {
        if (staff.franchise) {
          franchiseMap.set(staff.franchise._id, staff.franchise);
        }
      });
      setFranchises(Array.from(franchiseMap.values()));
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch =
      member.staffId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${member.personalInfo?.firstName} ${member.personalInfo?.lastName}`
        .toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFranchise = franchiseFilter === 'all' || member.franchise?._id === franchiseFilter;

    return matchesSearch && matchesFranchise;
  });

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      // For calendar view, fetch entire month data
      const params = {};
      if (viewMode === 'calendar' && selectedDate) {
        const date = new Date(selectedDate);
        const year = date.getFullYear();
        const month = date.getMonth();
        const startDate = new Date(year, month, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (selectedDate) {
        params.date = selectedDate;
      }

      const data = await getAttendance(params);

      const attendanceMap = {};
      (data.data || []).forEach(record => {
        if (record.staff?._id) {
          // For calendar view, store all records by staff ID
          if (!attendanceMap[record.staff._id]) {
            attendanceMap[record.staff._id] = [];
          }
          attendanceMap[record.staff._id].push(record);
        }
      });

      // For list view, convert to single record per staff for the selected date
      if (viewMode === 'list' && selectedDate) {
        Object.keys(attendanceMap).forEach(staffId => {
          const records = attendanceMap[staffId];
          const recordForDate = records.find(r => {
            const recordDate = new Date(r.date).toLocaleDateString('en-CA');
            return recordDate === selectedDate;
          });
          attendanceMap[staffId] = recordForDate || null;
        });
      }

      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (staffId, status) => {
    try {
      setLoading(true);

      // Check if attendance already exists for this staff member on this date
      let attendanceRecord = null;
      const staffAttendance = attendance[staffId];

      if (staffAttendance) {
        if (Array.isArray(staffAttendance)) {
          // Calendar view: find the record for this specific date
          attendanceRecord = staffAttendance.find(record => {
            const recordDate = new Date(record.date).toLocaleDateString('en-CA');
            return recordDate === selectedDate;
          });
        } else if (staffAttendance.date) {
          // Single record structure (list view)
          const recordDate = new Date(staffAttendance.date).toLocaleDateString('en-CA');
          if (recordDate === selectedDate) {
            attendanceRecord = staffAttendance;
          }
        }
      }

      const attendanceData = {
        status,
        checkIn: status === 'present' ? '09:00' : null,
        checkOut: status === 'present' ? '18:00' : null
      };

      if (attendanceRecord) {
        // Update existing attendance
        await updateAttendance(attendanceRecord._id, attendanceData);
        toast.success('Attendance updated successfully');
      } else {
        // Create new attendance
        await markAttendance({
          staffId,
          date: selectedDate,
          ...attendanceData
        });
        toast.success('Attendance marked successfully');
      }

      fetchAttendance();
    } catch (error) {
      console.error('Attendance operation error:', error);
      toast.error(error.response?.data?.message || 'Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    const dateStr = date.toLocaleDateString('en-CA');
    setSelectedDate(dateStr);
  };

  const presentCount = Object.values(attendance).filter(a => a && a.status === 'present').length;
  const absentCount = Object.values(attendance).filter(a => a && a.status === 'absent').length;
  const halfDayCount = Object.values(attendance).filter(a => a && a.status === 'half-day').length;
  const leaveCount = Object.values(attendance).filter(a => a && a.status === 'leave').length;

  if (initialLoading) {
    return (
      <Layout>
        <PageHeader title="Staff Attendance" subtitle="Mark daily attendance for staff members" icon={FiCalendar} />
        <PageLoading message="Loading staff..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Staff Attendance"
          subtitle="Mark daily attendance for staff members"
          icon={FiCalendar}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Total Staff" tone="info" icon={FiUsers} value={staff.length} />
          <StatCard title="Present" tone="success" icon={FiCheck} value={presentCount} />
          <StatCard title="Absent" tone="danger" icon={FiX} value={absentCount} />
          <StatCard title="Half Day" tone="warning" icon={FiClock} value={halfDayCount} />
          <StatCard title="On Leave" tone="purple" icon={FiCalendar} value={leaveCount} />
        </div>

        <FilterBar>
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by staff name or ID..."
          />
          <FilterBarActions>
            <SelectField value={franchiseFilter} onChange={(e) => setFranchiseFilter(e.target.value)} className="min-w-[150px]">
              <option value="all">All Campuses</option>
              {franchises.map(franchise => (
                <option key={franchise._id} value={franchise._id}>{franchise.name}</option>
              ))}
            </SelectField>

            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                  viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FiList className="text-base" /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                  viewMode === 'calendar' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FiCalendar className="text-base" /> Calendar
              </button>
            </div>

            {viewMode === 'list' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            )}
          </FilterBarActions>
        </FilterBar>

        {viewMode === 'calendar' && (
          <StaffAttendanceCalendar
            attendanceData={attendance}
            staff={staff}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
            loading={loading}
          />
        )}

        {viewMode === 'list' && (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Staff ID</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Designation</TableHeader>
                  <TableHeader>Campus / School</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableEmpty colSpan={6} title="No staff members found" description="Try adjusting your search or school filter." />
                ) : (
                  filteredStaff.map((member) => {
                    // Handle both array and single record structures
                    let attendanceRecord = null;
                    const staffAttendance = attendance[member._id];

                    if (staffAttendance) {
                      if (Array.isArray(staffAttendance)) {
                        attendanceRecord = staffAttendance.find(record => {
                          const recordDate = new Date(record.date).toLocaleDateString('en-CA');
                          return recordDate === selectedDate;
                        });
                      } else if (staffAttendance.date) {
                        const recordDate = new Date(staffAttendance.date).toLocaleDateString('en-CA');
                        if (recordDate === selectedDate) {
                          attendanceRecord = staffAttendance;
                        }
                      }
                    }

                    return (
                      <TableRow key={member._id}>
                        <TableCell><span className="font-mono text-slate-800">{member.staffId}</span></TableCell>
                        <TableCell className="!whitespace-normal">
                          <span className="text-sm font-medium text-slate-800">
                            {member.personalInfo?.firstName} {member.personalInfo?.lastName}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize">{member.employmentDetails?.designation}</TableCell>
                        <TableCell>{member.franchise?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {attendanceRecord ? (
                            <StatusBadge status={attendanceRecord.status} />
                          ) : (
                            <span className="text-sm text-slate-400">Not marked</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!attendanceRecord ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button variant="success" className="!px-2.5 !py-1 !text-xs" disabled={loading} onClick={() => handleMarkAttendance(member._id, 'present')}>Present</Button>
                              <Button variant="danger" className="!px-2.5 !py-1 !text-xs" disabled={loading} onClick={() => handleMarkAttendance(member._id, 'absent')}>Absent</Button>
                              <Button variant="secondary" className="!px-2.5 !py-1 !text-xs" disabled={loading} onClick={() => handleMarkAttendance(member._id, 'half-day')}>Half Day</Button>
                              <Button variant="primary" className="!px-2.5 !py-1 !text-xs" disabled={loading} onClick={() => handleMarkAttendance(member._id, 'leave')}>Leave</Button>
                            </div>
                          ) : (
                            <SelectField
                              value={attendanceRecord.status}
                              onChange={(e) => handleMarkAttendance(member._id, e.target.value)}
                              disabled={loading}
                              className="min-w-[130px]"
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="half-day">Half Day</option>
                              <option value="leave">Leave</option>
                            </SelectField>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </Layout>
  );
};

export default StaffAttendance;
