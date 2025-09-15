import React from 'react';

interface BeeIconProps {
  size?: number;
  className?: string;
}

const BeeIcon: React.FC<BeeIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M12 22C8.69 22 6 19.31 6 16C6 12.69 8.69 10 12 10C15.31 10 18 12.69 18 16C18 19.31 15.31 22 12 22M12 12C9.79 12 8 13.79 8 16C8 18.21 9.79 20 12 20C14.21 20 16 18.21 16 16C16 13.79 14.21 12 12 12M3 6L5 8L7 6L5 4L3 6M17 6L19 8L21 6L19 4L17 6M12 14C13.1 14 14 14.9 14 16C14 17.1 13.1 18 12 18C10.9 18 10 17.1 10 16C10 14.9 10.9 14 12 14Z" />
    </svg>
  );
};

export default BeeIcon;