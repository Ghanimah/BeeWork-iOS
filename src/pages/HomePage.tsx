import Calendar from '../components/Calendar';
import UpcomingShifts from '../components/UpcomingShifts';
import { useApp } from '../contexts/AppContext';
import type { FC } from 'react';

const HomePage: FC = () => {
  const { shifts, user } = useApp();

  const userShifts = shifts.filter((shift) => shift.userId === user.id);

  return (
    <div className="page-shell space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to BeeWork</h1>
        <p className="text-sm text-gray-600">Your daily hustle, beautifully organized.</p>
      </div>

      <Calendar shifts={userShifts} />

      <UpcomingShifts shifts={userShifts} />
    </div>
  );
};

export default HomePage;
