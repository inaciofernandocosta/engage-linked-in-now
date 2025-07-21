import React from 'react';

interface PWAStatusBarProps {
  isOnline: boolean;
}

const PWAStatusBar = ({ isOnline }: PWAStatusBarProps) => {
  return (
    <div className="bg-black text-white text-xs px-4 py-1 flex justify-between items-center">
      <div className="flex items-center space-x-1">
        <span className="font-medium">9:41</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-destructive'}`}></div>
        <span>📶</span>
        <span>🔋 85%</span>
      </div>
    </div>
  );
};

export default PWAStatusBar;