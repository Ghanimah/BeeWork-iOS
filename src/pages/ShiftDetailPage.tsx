import React from 'react';
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  Play,
  Square,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const ShiftDetailPage: React.FC = () => {
  const { selectedShift, setCurrentPage, punchIn, punchOut } = useApp();

  if (!selectedShift) return null;

  const calculateHours = () => {
    if (selectedShift.startTime && selectedShift.endTime) {
      const start = new Date(selectedShift.startTime);
      const end = new Date(selectedShift.endTime);
      return Math.max(0, (end.getTime() - start.getTime()) / 3600000);
    } else if (selectedShift.startTime) {
      const start = new Date(selectedShift.startTime);
      const now = new Date();
      return Math.max(0, (now.getTime() - start.getTime()) / 3600000);
    }
    return 0;
  };

  const getDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const requireNearby = (callback: () => void) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          selectedShift.latitude,
          selectedShift.longitude
        );
        if (dist <= 20) {
          callback();
        } else {
          alert('You must be within 20 meters of the job site.');
        }
      },
      () => alert('Location permission is required.')
    );
  };

  const handlePunchIn = () => {
    requireNearby(() => punchIn(selectedShift.id));
  };

  const handlePunchOut = () => {
    requireNearby(() => punchOut(selectedShift.id));
  };

  const currentHours = calculateHours();
  const earnings = currentHours * selectedShift.hourlyWage;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-32">
      <div className="px-4 pt-8 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setCurrentPage('home')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Shift Details</h1>
        </div>

        <div className="card mb-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 text-center">
            {selectedShift.title}
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin size={18} />
              <span>{selectedShift.location}</span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedShift.latitude},${selectedShift.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center space-x-1"
            >
              <ExternalLink size={16} />
              <span>Map</span>
            </a>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <Clock size={18} />
            <span>
              {selectedShift.startTime
                ? new Date(selectedShift.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--'}{' '}
              -{' '}
              {selectedShift.endTime
                ? new Date(selectedShift.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--'}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <Clock size={18} />
            <span>
              {currentHours.toFixed(2)} hours • ${earnings.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <DollarSign size={18} />
            <span>${selectedShift.hourlyWage}/hour</span>
          </div>
        </div>
      </div>

      {/* ✅ Fixed Punch In/Out Button with Geolocation Check */}
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="max-w-md mx-auto">
          {selectedShift.status === 'scheduled' && (
            <button
              onClick={handlePunchIn}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <Play size={20} />
              <span>Punch In</span>
            </button>
          )}

          {selectedShift.status === 'in-progress' && (
            <button
              onClick={handlePunchOut}
              className="w-full btn-danger py-4 flex items-center justify-center space-x-2"
            >
              <Square size={20} />
              <span>Punch Out</span>
            </button>
          )}

          {selectedShift.status === 'completed' && (
            <div className="text-center text-blue-700 font-medium p-4 bg-blue-50 rounded-xl">
              Shift Completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftDetailPage;
