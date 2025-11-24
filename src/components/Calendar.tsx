import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Shift } from '../types';
import { useNavigate } from 'react-router-dom';

interface CalendarProps {
  shifts: Shift[];
}

const Calendar: React.FC<CalendarProps> = ({ shifts }) => {
  const { setCurrentPage, setSelectedShift } = useApp();
  const navigate = useNavigate();

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
      setCurrentPage('shift-detail');
      navigate('/shift');
    } else {
      setCurrentPage('no-shift');
      navigate('/empty');
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
    <div className="rounded-2xl border border-amber-100 bg-white shadow-[0_12px_36px_-26px_rgba(0,0,0,0.35)] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Previous month">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Next month">
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2 text-[11px] text-gray-500 font-semibold">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center w-full">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, index) => {
          const key = day
            ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            : `pad-${index}`;
          if (day === null) {
            return <div key={key} className="w-full h-14" />;
          }
          const has = hasShift(day);
          const todayFlag = isToday(day);
          return (
            <button
              type="button"
              key={key}
              onClick={() => handleDayClick(day)}
              aria-label={`Day ${day}${has ? ', has shift' : ''}`}
              className="w-full h-14 flex flex-col items-center justify-center rounded-xl cursor-pointer text-gray-800 hover:bg-amber-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span
                className={`text-sm font-medium w-10 h-10 flex items-center justify-center rounded-full ${
                  todayFlag ? 'bg-amber-500 text-white' : ''
                }`}
              >
                {day}
              </span>
              {has && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
