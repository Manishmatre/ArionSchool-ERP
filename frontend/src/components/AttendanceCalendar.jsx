import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const AttendanceCalendar = ({ 
  attendanceData = {}, 
  students = [], 
  onDateSelect, 
  selectedDate,
  user,
  loading = false 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate || new Date()));
  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    generateCalendarDays(currentDate);
  }, [currentDate]);

  const generateCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday (or Monday if you prefer)
    const startDay = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    setCalendarDays(days);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getAttendanceForDate = (date) => {
    if (!date) return null;
    
    // Use local timezone formatting to avoid UTC issues
    const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
    const dayAttendance = {};
    
    students.forEach(student => {
      const studentAttendance = attendanceData[student._id];
      if (studentAttendance) {
        // Handle both array (calendar view) and single record (list view) structures
        let attendanceRecord = null;
        
        if (Array.isArray(studentAttendance)) {
          // Calendar view: find the record for this specific date
          attendanceRecord = studentAttendance.find(record => {
            const recordDate = new Date(record.date).toLocaleDateString('en-CA');
            return recordDate === dateStr;
          });
        } else if (studentAttendance && studentAttendance.date) {
          // Single record structure
          const recordDate = new Date(studentAttendance.date).toLocaleDateString('en-CA');
          if (recordDate === dateStr) {
            attendanceRecord = studentAttendance;
          }
        }
        
        if (attendanceRecord) {
          dayAttendance[student._id] = attendanceRecord;
        }
      }
    });
    
    return dayAttendance;
  };

  const getAttendanceStats = (date) => {
    if (!date) return { present: 0, absent: 0, total: 0 };
    
    const dayAttendance = getAttendanceForDate(date);
    const stats = { present: 0, absent: 0, total: 0 };
    
    Object.values(dayAttendance).forEach(record => {
      stats.total++;
      if (record.status === 'present') {
        stats.present++;
      } else if (record.status === 'absent') {
        stats.absent++;
      }
    });
    
    return stats;
  };

  // Debug function to log data structure
  useEffect(() => {
    console.log('AttendanceCalendar Debug:', {
      attendanceData,
      students,
      studentsCount: students.length,
      attendanceKeys: Object.keys(attendanceData),
      sampleData: attendanceData[students[0]?._id]
    });
  }, [attendanceData, students]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'half_day': return 'bg-yellow-500';
      case 'leave': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === new Date(selectedDate).toDateString();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-semibold text-slate-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-20"></div>;
            }

            const stats = getAttendanceStats(date);
            const today = isToday(date);
            const selected = isSelected(date);

            return (
              <div
                key={date.toISOString()}
                onClick={() => onDateSelect && onDateSelect(date.toISOString().split('T')[0])}
                className={`
                  h-20 border rounded-lg p-2 cursor-pointer transition-all
                  ${today ? 'ring-2 ring-blue-500' : ''}
                  ${selected ? 'bg-blue-50 border-blue-500' : 'border-slate-200 hover:border-slate-300'}
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex flex-col h-full">
                  {/* Date number */}
                  <div className={`
                    text-sm font-medium mb-1
                    ${today ? 'text-primary-600' : 'text-slate-900'}
                  `}>
                    {date.getDate()}
                  </div>

                  {/* Attendance stats */}
                  {stats.total > 0 && (
                    <div className="flex-1 flex flex-col justify-end space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-600 font-medium">{stats.present}</span>
                        <span className="text-red-600 font-medium">{stats.absent}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-green-500 h-1 rounded-full"
                          style={{ width: `${stats.total > 0 ? (stats.present / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Status indicators for small screens */}
                  {stats.total > 0 && (
                    <div className="flex space-x-1 mt-1">
                      {Object.values(getAttendanceForDate(date)).slice(0, 3).map((record, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full ${getStatusColor(record.status)}`}
                        ></div>
                      ))}
                      {stats.total > 3 && (
                        <span className="text-xs text-slate-500">+{stats.total - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-600">Absent</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-slate-600">Half Day</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-slate-600">Leave</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
