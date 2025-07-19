import React from 'react';
import { Home, Plus, BarChart3, FileText } from 'lucide-react';

interface BottomNavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const BottomNavigation = ({ currentTab, setCurrentTab }: BottomNavigationProps) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'create', icon: Plus, label: 'Criar' },
    { id: 'analytics', icon: BarChart3, label: 'Dados' },
    { id: 'templates', icon: FileText, label: 'Templates' },
  ];

  return (
    <nav className="bg-card border-t border fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm">
      <div className="flex justify-around px-4 py-2">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              currentTab === id ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs mt-1">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;