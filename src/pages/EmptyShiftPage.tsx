import { ArrowLeftCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import type { FC } from 'react';

const EmptyShiftPage: FC = () => {
  const { setCurrentPage } = useApp();
  const navigate = useNavigate();

  const goHome = () => {
    setCurrentPage('home');
    navigate('/home');
  };

  return (
    <div className="page-shell min-h-[60dvh] items-center justify-center text-center">
      <div className="space-y-3">
        <ArrowLeftCircle
          size={40}
          className="mx-auto text-yellow-600 cursor-pointer hover:text-yellow-700 transition-colors"
          onClick={goHome}
        />
        <h1 className="text-2xl font-bold text-yellow-800">No Job Scheduled</h1>
        <p className="text-yellow-700 text-lg max-w-md mx-auto">
          You do not have any jobs scheduled for this day yet. Keep checking back for new shifts!
        </p>
      </div>
    </div>
  );
};

export default EmptyShiftPage;
