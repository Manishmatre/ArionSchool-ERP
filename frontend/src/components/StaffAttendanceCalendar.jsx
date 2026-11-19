import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const StaffAttendanceCalendar = ({ 
  attendanceData = {}, 
  staff = [], 
  onDateSelect, 
  selectedDate,
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
    
    staff.forEach(member => {
      const staffAttendance = attendanceData[member._id];
      if (staffAttendance) {
        // Handle both array (calendar view) and single record (list view) structures
        let attendanceRecord = null;
        
        if (Array.isArray(staffAttendance)) {
          // Calendar view: find the record for this specific date
          attendanceRecord = staffAttendance.find(record => {
            const recordDate = new Date(record.date).toLocaleDateString('en-CA');
            return recordDate === dateStr;
          });
        } else if (staffAttendance && staffAttendance.date) {
          // Single record structure
          const recordDate = new Date(staffAttendance.date).toLocaleDateString('en-CA');
          if (recordDate === dateStr) {
            attendanceRecord = staffAttendance;
          }
        }
        
        if (attendanceRecord) {
          dayAttendance[member._id] = attendanceRecord;
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
    console.log('StaffAttendanceCalendar Debug:', {
      attendanceData,
      staff,
      staffCount: staff.length,
      attendanceKeys: Object.keys(attendanceData),
      sampleData: attendanceData[staff[0]?._id]
    });
  }, [attendanceData, staff]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'half-day': return 'bg-yellow-500';
      case 'leave': return 'bg-blue-500';
      case 'holiday': return 'bg-purple-500';
      default: return 'bg-gray-300';
    }
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  const isToday = (date) => {
    return date && 
           date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    const selected = new Date(selectedDate);
    return date.getDate() === selected.getDate() && 
           date.getMonth() === selected.getMonth() && 
           date.getFullYear() === selected.getFullYear();
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-semibold text-slate-900">{monthYear}</h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Week day headers */}
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
            const attendancePercentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
            
            return (
              <div
                key={date.toISOString()}
                onClick={() => onDateSelect && onDateSelect(date)}
                className={`
                  h-20 p-2 border rounded-lg cursor-pointer transition-all
                  ${isToday(date) ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}
                  ${isSelected(date) ? 'ring-2 ring-blue-500' : ''}
                  ${!isToday(date) && !isSelected(date) ? 'hover:bg-slate-50' : ''}
                `}
              >
                <div className="text-xs font-medium text-slate-900 mb-1">
                  {date.getDate()}
                </div>
                
                {stats.total > 0 ? (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-600">
                      {stats.present}/{stats.total}
                    </div>
                    
                    {/* Attendance indicator bar */}
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${attendancePercentage >= 80 ? 'bg-green-500' : 
                                       attendancePercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${attendancePercentage}%` }}
                      />
                    </div>
                    
                    {/* Status dots for visual representation */}
                    <div className="flex flex-wrap gap-1">
                      {Object.values(getAttendanceForDate(date)).slice(0, 3).map((record, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full ${getStatusColor(record.status)}`}
                        />
                      ))}
                      {stats.total > 3 && (
                        <div className="text-xs text-slate-500">+{stats.total - 3}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No data</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-600">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-slate-600">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-slate-600">Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-slate-600">Holiday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAttendanceCalendar;
