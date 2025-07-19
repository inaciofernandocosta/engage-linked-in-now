import React from 'react';
import { Plus } from 'lucide-react';

const TemplatesTab = () => {
  const templates = [
    {
      title: 'Dicas de carreira',
      description: 'Template para posts educativos sobre desenvolvimento profissional',
      uses: 8,
    },
    {
      title: 'Conquista pessoal',
      description: 'Para compartilhar marcos e realizações profissionais',
      uses: 5,
    },
    {
      title: 'Reflexão semanal',
      description: 'Template para posts reflexivos sobre aprendizados',
      uses: 12,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="bg-card rounded-xl p-4 shadow-sm border">
        <h3 className="font-semibold text-card-foreground mb-4">📝 Templates Salvos</h3>
        
        <div className="space-y-3">
          {templates.map((template, index) => (
            <div key={index} className="p-4 border border-border rounded-lg hover:bg-muted transition-colors">
              <h4 className="font-medium text-card-foreground">{template.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-muted-foreground">Usado {template.uses} vezes</span>
                <button className="text-primary text-sm font-medium hover:underline">Usar</button>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-4 border-2 border-dashed border-border py-6 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <Plus className="w-6 h-6 mx-auto mb-2" />
          <span>Criar novo template</span>
        </button>
      </div>
    </div>
  );
};

export default TemplatesTab;