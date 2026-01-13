
import React from 'react';
import { GameStats } from '../types';

interface StatBarProps {
  stats: GameStats;
}

const StatBar: React.FC<StatBarProps> = ({ stats }) => {
  const statItems = [
    { label: '智力', value: stats.intelligence, color: 'bg-blue-500', icon: '🧠' },
    { label: '魅力', value: stats.charm, color: 'bg-pink-500', icon: '✨' },
    { label: '体质', value: stats.stamina, color: 'bg-green-500', icon: '💪' },
    { label: '家境', value: stats.money, color: 'bg-amber-600', icon: '🏠' },
    { label: '气运', value: stats.luck, color: 'bg-purple-500', icon: '🍀' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {statItems.map((item) => (
        <div key={item.label} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{item.icon}</span>
            <span className="text-xs font-bold text-slate-500">{item.label}</span>
          </div>
          <div className="text-lg font-bold text-slate-800">{item.value}</div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full ${item.color} transition-all duration-500`} 
              style={{ width: `${Math.min(100, (item.value / 30) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatBar;
