import Calendar from '../components/Calendar';
import UpcomingShifts from '../components/UpcomingShifts';
import { useApp } from '../contexts/AppContext';
import type { FC } from 'react';

const HomePage: FC = () => {
  const { shifts, user } = useApp();

  const userShifts = shifts.filter((shift) => shift.userId === user.id);

  return (
    <div className="page-shell">
      <div className="rounded-2xl border border-amber-100 bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Buzzing into Action - Welcome to BeeWork!</h1>
          <p className="text-gray-600 text-sm">Your daily hustle, beautifully organized.</p>
        </div>

        <div className="space-y-6">
          <Calendar shifts={userShifts} />
          <UpcomingShifts shifts={userShifts} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
