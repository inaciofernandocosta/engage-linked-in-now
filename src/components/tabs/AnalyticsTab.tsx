import React from 'react';

const AnalyticsTab = () => {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-card rounded-xl p-4 shadow-sm border">
        <h3 className="font-semibold text-card-foreground mb-4">📊 Estatísticas</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">12</p>
            <p className="text-sm text-muted-foreground">Posts esta semana</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">94%</p>
            <p className="text-sm text-muted-foreground">Taxa aprovação</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-card-foreground">Engajamento médio</span>
            <span className="font-semibold text-primary">8.5%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-card-foreground">Melhor horário</span>
            <span className="font-semibold text-purple-600">09:00-11:00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-card-foreground">Tom mais eficaz</span>
            <span className="font-semibold text-success">Inspirador</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border">
        <h4 className="font-semibold text-card-foreground mb-3">🏆 Posts populares</h4>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-card-foreground font-medium">5 dicas para crescer no LinkedIn</p>
            <p className="text-xs text-muted-foreground">234 curtidas • 45 comentários</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-card-foreground font-medium">Minha jornada em tech</p>
            <p className="text-xs text-muted-foreground">189 curtidas • 32 comentários</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;