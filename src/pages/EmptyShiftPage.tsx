import React from 'react';
import { ArrowLeftCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

const EmptyShiftPage: React.FC = () => {
  const { setCurrentPage } = useApp();
  const navigate = useNavigate();

  const goHome = () => {
    // keep your original app state logic
    setCurrentPage('home');
    // ensure route-based navigation works
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center text-center px-4">
      <ArrowLeftCircle
        size={40}
        className="mb-4 text-yellow-600 cursor-pointer hover:text-yellow-700 transition-colors"
        onClick={goHome}
      />
      <h1 className="text-2xl font-bold text-yellow-800 mb-2">
        No Job Scheduled 🐝
      </h1>
      <p className="text-yellow-700 text-lg max-w-md">
        You don’t have any jobs scheduled for this day – <strong>yet!</strong><br />
        Keep checking back for new shifts!
      </p>
    </div>
  );
};

export default EmptyShiftPage;
