import React from 'react';
import { Plus, BarChart3, Check, FileText, Calendar } from 'lucide-react';

interface HomeTabProps {
  setCurrentTab: (tab: string) => void;
}

const HomeTab = ({ setCurrentTab }: HomeTabProps) => {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-6 text-primary-foreground">
        <h2 className="text-xl font-bold mb-2">🚀 Publique com IA</h2>
        <p className="text-primary-foreground/80 mb-4">Crie posts profissionais em segundos</p>
        <button 
          onClick={() => setCurrentTab('create')}
          className="bg-primary-foreground text-primary px-6 py-3 rounded-xl font-semibold flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Criar Post</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-sm border">
          <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 text-success" />
          </div>
          <h3 className="font-semibold text-card-foreground">Posts hoje</h3>
          <p className="text-2xl font-bold text-success">3</p>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm border">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-card-foreground">Aprovados</h3>
          <p className="text-2xl font-bold text-primary">94%</p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border">
        <h3 className="font-semibold text-card-foreground mb-3">Ações Rápidas</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-3 rounded-lg hover:bg-muted flex items-center space-x-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="text-card-foreground">Templates Salvos</span>
          </button>
          <button className="w-full text-left p-3 rounded-lg hover:bg-muted flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-card-foreground">Agendamentos</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeTab;