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
    <nav className="bg-white border-t border-border fixed bottom-0 left-0 right-0 z-40 shadow-linkedin">
      <div className="flex justify-around px-4 py-2 max-w-md mx-auto">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center py-1.5 px-3 rounded-lg transition-all duration-150 ${
              currentTab === id 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs mt-0.5 font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;