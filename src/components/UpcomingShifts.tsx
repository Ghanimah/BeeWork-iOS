import React from 'react';
import { MapPin, Clock, DollarSign } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import BeeIcon from './BeeIcon';
import { Shift } from '../types'; // ✅ Import the correct type

interface UpcomingShiftsProps {
  shifts: Shift[];
}

const UpcomingShifts: React.FC<UpcomingShiftsProps> = ({ shifts }) => {
  const { setSelectedShift, setCurrentPage } = useApp();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Compare date only

  const upcomingShifts = shifts
    .filter(shift => {
      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate > today && shift.status === 'scheduled';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextShift = upcomingShifts[0];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleShiftClick = () => {
    if (nextShift) {
      setSelectedShift(nextShift);
      setCurrentPage('shift-detail');
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Upcoming Shifts</h3>

      {nextShift ? (
        <div
          className="card cursor-pointer hover:shadow-xl transition-shadow duration-200"
          onClick={handleShiftClick}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <BeeIcon size={20} className="text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Next Shift</h4>
                <p className="text-sm text-gray-600">{formatDate(nextShift.date)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-gray-600">
              <MapPin size={16} />
              <span className="text-sm">{nextShift.location}</span>
            </div>

            <div className="flex items-center space-x-3 text-gray-600">
              <DollarSign size={16} />
              <span className="text-sm">${nextShift.hourlyWage}/hour</span>
            </div>

            <div className="flex items-center space-x-3 text-gray-600">
              <Clock size={16} />
              <span className="text-sm">Tap to view details</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-8">
          <BeeIcon size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No upcoming shifts scheduled</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingShifts;

