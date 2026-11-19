import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { FiCalendar, FiCheck, FiX, FiClock, FiUsers, FiList } from 'react-icons/fi';
import StaffAttendanceCalendar from '../../components/StaffAttendanceCalendar';
import { useAuth } from '../../context/AuthContext';
import { getAllStaff } from '../../api/staffApi';
import { markAttendance, getAttendance, updateAttendance } from '../../api/staffAttendanceApi';
import {
  StatCard, FilterBar, FilterBarActions, SearchInput, SelectField, Button,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge,
} from '../../components/ui';

const FranchiseStaffAttendance = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchStaff();
    fetchAttendance();
  }, [selectedDate, viewMode]);

  const fetchStaff = async () => {
    try {
      // For school users, only fetch staff from their franchise
      const params = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? { franchise: user.franchise } : {};
      const data = await getAllStaff({ ...params, status: 'active' });
      setStaff(data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.staffId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${member.personalInfo?.firstName} ${member.personalInfo?.lastName}`
        .toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

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
      
      // For school users, only fetch their franchise attendance
      if (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)) {
        params.franchise = user.franchise;
      }
      
      const data = await getAttendance(params);
      console.log('Fetched school staff attendance data:', data.data);
      
      const attendanceMap = {};
      (data.data || []).forEach(record => {
        if(record.staff?._id) {
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
      
      console.log('Processed school staff attendance map:', attendanceMap);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'half-day': return 'bg-yellow-100 text-yellow-800';
      case 'leave': return 'bg-blue-100 text-blue-800';
      case 'holiday': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Layout> 
      <div className="space-y-6">
        {/* Header */}
        <PageHeader title="Staff Attendance" subtitle="Mark daily attendance for staff members" icon={FiCalendar} compact />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Staff" tone="info" icon={FiUsers} value={staff.length} />
          <StatCard title="Present" tone="success" icon={FiCheck} value={Object.values(attendance).filter((a) => a && a.status === 'present').length} />
          <StatCard title="Absent" tone="danger" icon={FiX} value={Object.values(attendance).filter((a) => a && a.status === 'absent').length} />
          <StatCard title="Half Day" tone="amber" icon={FiClock} value={Object.values(attendance).filter((a) => a && a.status === 'half-day').length} />
          <StatCard title="On Leave" tone="purple" icon={FiCalendar} value={Object.values(attendance).filter((a) => a && a.status === 'leave').length} />
        </div>

        <FilterBar>
          <SearchInput className="flex-1 max-w-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by staff name or ID..." />
          <FilterBarActions>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600'}`}>
                <FiList /> List
              </button>
              <button onClick={() => setViewMode('calendar')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'calendar' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600'}`}>
                <FiCalendar /> Calendar
              </button>
            </div>
            {viewMode === 'list' && (
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
            )}
          </FilterBarActions>
        </FilterBar>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <StaffAttendanceCalendar
            attendanceData={attendance}
            staff={staff}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
            loading={loading}
          />
        )}

        {/* Staff List - Only show in list view */}
        {viewMode === 'list' && (
          <>
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Staff ID</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Designation</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedStaff.length === 0 ? (
                  <TableEmpty colSpan={5} title="No staff found" description="Try adjusting your search or date filter." />
                ) : paginatedStaff.map((member) => {
                let attendanceRecord = null;
                const staffAttendance = attendance[member._id];
                if (staffAttendance) {
                  if (Array.isArray(staffAttendance)) {
                    attendanceRecord = staffAttendance.find((record) => new Date(record.date).toLocaleDateString('en-CA') === selectedDate);
                  } else if (staffAttendance.date) {
                    const recordDate = new Date(staffAttendance.date).toLocaleDateString('en-CA');
                    if (recordDate === selectedDate) attendanceRecord = staffAttendance;
                  }
                }
                return (
                    <TableRow key={member._id}>
                      <TableCell><span className="font-medium text-slate-900">{member.staffId}</span></TableCell>
                      <TableCell><span className="font-medium">{member.personalInfo?.firstName} {member.personalInfo?.lastName}</span></TableCell>
                      <TableCell><span className="capitalize">{member.employmentDetails?.designation}</span></TableCell>
                      <TableCell>
                        {attendanceRecord ? <StatusBadge status={attendanceRecord.status} /> : <span className="text-sm text-slate-400">Not marked</span>}
                      </TableCell>
                      <TableCell>
                        {!attendanceRecord ? (
                          <div className="flex flex-wrap gap-1.5">
                            <Button className="text-xs py-1.5 px-2.5" variant="success" onClick={() => handleMarkAttendance(member._id, 'present')} disabled={loading}>Present</Button>
                            <Button className="text-xs py-1.5 px-2.5" variant="danger" onClick={() => handleMarkAttendance(member._id, 'absent')} disabled={loading}>Absent</Button>
                            <Button className="text-xs py-1.5 px-2.5" variant="secondary" onClick={() => handleMarkAttendance(member._id, 'half-day')} disabled={loading}>Half Day</Button>
                            <Button className="text-xs py-1.5 px-2.5" variant="ghost" onClick={() => handleMarkAttendance(member._id, 'leave')} disabled={loading}>Leave</Button>
                          </div>
                        ) : (
                          <SelectField value={attendanceRecord.status} onChange={(e) => handleMarkAttendance(member._id, e.target.value)} disabled={loading} className="w-36">
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="half-day">Half Day</option>
                            <option value="leave">Leave</option>
                          </SelectField>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} itemsPerPage={itemsPerPage} totalItems={filteredStaff.length} onItemsPerPageChange={handleItemsPerPageChange} />
          </>
        )}
      </div>
    </Layout>
  );
};

export default FranchiseStaffAttendance;
