import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import BeeIcon from './BeeIcon';
import { Shift } from '../types'; // ✅ Import Shift type
import { useNavigate } from 'react-router-dom'; // ✅ added

interface CalendarProps {
  shifts: Shift[];
}

const Calendar: React.FC<CalendarProps> = ({ shifts }) => {
  const { setCurrentPage, setSelectedShift } = useApp();
  const navigate = useNavigate(); // ✅ added

  const today = new Date();
  const startYear = today.getFullYear();
  const endYear = startYear + 1;

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(day);

  const hasShift = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.some(shift => shift.date === dateStr);
  };

  const getShiftForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.find(shift => shift.date === dateStr);
  };

  const handleDayClick = (day: number) => {
    const shift = getShiftForDay(day);
    if (shift) {
      setSelectedShift(shift);
      setCurrentPage('shift-detail'); // ✅ keep your state logic
      navigate('/shift');             // ✅ added route navigation
    } else {
      setCurrentPage('no-shift');     // ✅ keep your state logic
      navigate('/empty');             // ✅ added route navigation
    }
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      if (currentYear > startYear) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      }
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      if (currentYear < endYear) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      }
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center w-full text-sm font-semibold text-gray-600">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={index}
            onClick={() => day && handleDayClick(day)}
            className={`w-full h-14 flex flex-col items-center justify-center rounded-lg cursor-pointer
              ${day ? 'text-gray-800' : ''}
              ${day && hasShift(day) ? 'bg-amber-100' : ''}
              ${day && isToday(day) ? 'border border-amber-500' : ''}
              hover:bg-amber-50 transition-colors`}
          >
            {day && (
              <>
                <span className="text-sm font-medium">{day}</span>
                {isToday(day) && <div className="w-2 h-2 rounded-full bg-amber-500 mt-1" />}
                {hasShift(day) && (
                  <div className="mt-1">
                    <BeeIcon size={16} className="text-amber-600" />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
