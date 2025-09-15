import React from 'react';

interface HexButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
}

const HexButton: React.FC<HexButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  className = ''
}) => {
  const baseClasses = 'relative inline-flex items-center justify-center font-semibold transition-all duration-300 hover:scale-105 active:scale-95';
  
  const sizeClasses = {
    small: 'px-6 py-3 text-sm',
    medium: 'px-8 py-4 text-base',
    large: 'px-12 py-6 text-lg'
  };
  
  const variantClasses = {
    primary: 'bg-[#F2F2F2] text-[#0D0D0D] hover:bg-[#F2A516] hover:text-[#0D0D0D]',
    accent: 'bg-[#BE3C21] text-[#F2F2F2] hover:bg-[#F2A516] hover:text-[#0D0D0D]',
    secondary: 'bg-[#F2A516] text-[#0D0D0D] hover:bg-[#F3BF18]'
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={{
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
      }}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default HexButton;