import React from 'react';

const HoneycombPattern: React.FC = () => {
  return (
    <div className="absolute inset-0 opacity-10">
      <svg width="100%" height="100%" viewBox="0 0 200 200" className="absolute inset-0">
        <defs>
          <pattern id="honeycomb" x="0" y="0" width="50" height="43.4" patternUnits="userSpaceOnUse">
            <polygon
              points="25,0 50,14.4 50,28.9 25,43.4 0,28.9 0,14.4"
              fill="none"
              stroke="#0D0D0D"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycomb)" />
      </svg>
    </div>
  );
};

export default HoneycombPattern;