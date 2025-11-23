import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import BeeIcon from './BeeIcon';
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
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Previous month">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Next month">
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
              className={`w-full h-14 flex flex-col items-center justify-center rounded-lg cursor-pointer text-gray-800 hover:bg-amber-50 transition-colors ${
                has ? 'bg-amber-100' : ''
              } ${todayFlag ? 'border border-amber-500' : ''}`}
            >
              <span className="text-sm font-medium">{day}</span>
              {todayFlag && <div className="w-2 h-2 rounded-full bg-amber-500 mt-1" />}
              {has && (
                <div className="mt-1">
                  <BeeIcon size={16} className="text-amber-600" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
