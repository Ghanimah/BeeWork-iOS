import React from 'react';
import Calendar from '../components/Calendar';
import UpcomingShifts from '../components/UpcomingShifts';
import { useApp } from '../contexts/AppContext';

const HomePage: React.FC = () => {
  const { shifts, user } = useApp();

  const userShifts = shifts.filter(shift => shift.userId === user.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      <div className="px-4 pt-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Buzzing into Action – Welcome to BeeWork!🐝
            </h1>
            <p className="text-gray-600">Your daily hustle, beautifully organized.</p>
          </div>

          {/* ✅ Pass user-specific shifts to components */}
          <Calendar shifts={userShifts} />
          <UpcomingShifts shifts={userShifts} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
