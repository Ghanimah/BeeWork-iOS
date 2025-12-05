import { useEffect, useState } from 'react';
import { Calendar, Clock, Save } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { auth, db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { defaultAvailability, normalizeAvailability } from '../utils/availability';

const AvailabilityPage: React.FC = () => {
  const { availability, setAvailability } = useApp();
  const [localAvailability, setLocalAvailability] = useState(() => normalizeAvailability(availability ?? defaultAvailability));

  useEffect(() => {
    setLocalAvailability(normalizeAvailability(availability));
  }, [availability]);

  const today = new Date();
  const isFriday = today.getDay() === 5;
  const canEdit = isFriday;
  const isDisabled = !canEdit;

  // Reordered to start from Sunday
  const days = [
    { key: 'sunday', label: 'Sunday' },
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
  ] as const;

  const handleAvailabilityChange = (day: string, available: boolean) => {
    if (!canEdit) return;

    setLocalAvailability((prev) =>
      normalizeAvailability(
        prev.map((item) =>
          item.day === day
            ? {
                ...item,
                available,
                startTime: available ? item.startTime || '09:00' : undefined,
                endTime: available ? item.endTime || '17:00' : undefined,
              }
            : item
        )
      )
    );
  };

  const handleTimeChange = (day: string, type: 'startTime' | 'endTime', value: string) => {
    if (!canEdit) return;

    setLocalAvailability((prev) =>
      normalizeAvailability(prev.map((item) => (item.day === day ? { ...item, [type]: value } : item)))
    );
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('User not signed in.');
      return;
    }

    const normalizedLocal = normalizeAvailability(localAvailability);
    const cleanedAvailability = normalizedLocal.map((item) => {
      const base = { day: item.day, available: item.available };
      if (item.available) {
        return {
          ...base,
          startTime: item.startTime ?? '09:00',
          endTime: item.endTime ?? '17:00',
        };
      }
      return base;
    });

    setAvailability(normalizeAvailability(cleanedAvailability));

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          availability: cleanedAvailability,
        },
        { merge: true }
      );

      alert('Availability saved to database!');
    } catch (error) {
      console.error('Firestore save error:', error);
      alert('Error saving to Firestore');
    }
  };

  return (
    <div className="page-shell space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Bee Availability</h1>
        <p className="text-gray-600 text-sm">
          {canEdit ? 'You can edit your availability today!' : 'Availability can only be edited on Fridays'}
        </p>
      </div>

      {!canEdit && (
        <div className="card border-yellow-200 bg-yellow-50/70">
          <div className="flex items-start space-x-3">
            <Calendar size={20} className="text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Editing Restricted</p>
              <p className="text-yellow-700 text-sm">Come back on Friday to update your availability</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {days.map(({ key, label }) => {
          const dayAvailability = localAvailability.find((item) => item.day === key);

          return (
            <div key={key} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dayAvailability?.available || false}
                    onChange={(e) => handleAvailabilityChange(key, e.target.checked)}
                    disabled={isDisabled}
                    className="sr-only peer"
                  />
                  <span className="sr-only">Toggle availability for {label}</span>
                  <div
                    className={`w-11 h-6 rounded-full peer transition-colors ${
                      dayAvailability?.available ? 'bg-green-500' : 'bg-gray-300'
                    } ${canEdit ? '' : 'opacity-50'}`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        dayAvailability?.available ? 'translate-x-5' : 'translate-x-0'
                      } mt-0.5 ml-0.5`}
                    />
                  </div>
                </label>
              </div>

              {dayAvailability?.available && (
                <div className="flex flex-row gap-3 items-start w-full">
                  <div className="flex flex-col gap-1 flex-1">
                    <label htmlFor={`${key}-start`} className="block text-sm font-medium text-gray-700">
                      Start Time
                    </label>
                    <div className="relative flex items-center h-10 w-full">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        id={`${key}-start`}
                        value={dayAvailability.startTime || '09:00'}
                        onChange={(e) => handleTimeChange(key, 'startTime', e.target.value)}
                        disabled={isDisabled}
                        className={`h-10 w-full flex-1 pl-8 pr-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          canEdit ? '' : 'bg-gray-50 text-gray-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    <label htmlFor={`${key}-end`} className="block text-sm font-medium text-gray-700">
                      End Time
                    </label>
                    <div className="relative flex items-center h-10 w-full">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        id={`${key}-end`}
                        value={dayAvailability.endTime || '17:00'}
                        onChange={(e) => handleTimeChange(key, 'endTime', e.target.value)}
                        disabled={isDisabled}
                        className={`h-10 w-full flex-1 pl-8 pr-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          canEdit ? '' : 'bg-gray-50 text-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Save size={20} />
            <span>Save Availability</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AvailabilityPage;
