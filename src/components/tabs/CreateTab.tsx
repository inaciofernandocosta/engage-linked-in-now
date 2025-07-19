import React, { useRef } from 'react';
import { Bot, Upload, X, Send, Sparkles, Zap, Check, PenTool } from 'lucide-react';
import LinkedInPreview from '../LinkedInPreview';

interface CreateTabProps {
  postContent: string;
  setPostContent: (content: string) => void;
  images: Array<{ id: number; url: string; name: string }>;
  setImages: React.Dispatch<React.SetStateAction<Array<{ id: number; url: string; name: string }>>>;
  useEmojis: boolean;
  setUseEmojis: (value: boolean) => void;
  aiParams: {
    size: string;
    tone: string;
    objective: string;
  };
  setAiParams: React.Dispatch<React.SetStateAction<{
    size: string;
    tone: string;
    objective: string;
  }>>;
  isGenerating: boolean;
  isCorrecting: boolean;
  currentStep: string;
  generateAIContent: () => void;
  correctContent: () => void;
  sendToWebhook: () => void;
  approvePost: () => void;
  setCurrentStep: (step: string) => void;
}

const CreateTab = ({
  postContent,
  setPostContent,
  images,
  setImages,
  useEmojis,
  setUseEmojis,
  aiParams,
  setAiParams,
  isGenerating,
  isCorrecting,
  currentStep,
  generateAIContent,
  correctContent,
  sendToWebhook,
  approvePost,
  setCurrentStep,
}: CreateTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const characterLimit = 3000;
  const characterCount = postContent.length;

  const aiSizeOptions = [
    { value: 'short', label: 'Curto', desc: '300-500' },
    { value: 'medium', label: 'Médio', desc: '500-1000' },
    { value: 'long', label: 'Longo', desc: '1000+' }
  ];

  const aiToneOptions = [
    { value: 'professional', label: 'Profissional', emoji: '💼' },
    { value: 'inspirational', label: 'Inspirador', emoji: '✨' },
    { value: 'provocative', label: 'Provocativo', emoji: '🔥' },
    { value: 'personal', label: 'Pessoal', emoji: '❤️' },
  ];

  const aiObjectiveOptions = [
    { value: 'engagement', label: 'Engajamento', emoji: '💬' },
    { value: 'authority', label: 'Autoridade', emoji: '👑' },
    { value: 'hiring', label: 'Contratação', emoji: '🚀' },
    { value: 'leads', label: 'Leads', emoji: '🎯' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          url: e.target?.result as string,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: number) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  if (currentStep === 'webhook') {
    return (
      <div className="p-4">
        <div className="bg-card rounded-xl p-8 shadow-sm border text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground mb-2">Processando</h3>
          <p className="text-muted-foreground mb-4">Enviando para o Pipedream...</p>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (currentStep === 'approval') {
    return (
      <div className="p-4">
        <div className="bg-card rounded-xl p-8 shadow-sm border text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground mb-2">Pronto!</h3>
          <p className="text-muted-foreground mb-6">Post processado e aguardando aprovação.</p>
          
          <div className="space-y-3">
            <button 
              onClick={approvePost}
              className="w-full bg-success text-success-foreground py-3 px-4 rounded-xl font-medium hover:bg-success/90 flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Aprovar e Publicar</span>
            </button>
            <button 
              onClick={() => setCurrentStep('create')}
              className="w-full border border-border text-card-foreground py-3 px-4 rounded-xl font-medium hover:bg-muted"
            >
              Editar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Geração de IA */}
      <div className="bg-card rounded-xl p-4 shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-card-foreground">Geração por IA</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Tamanho</label>
            <div className="grid grid-cols-3 gap-2">
              {aiSizeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setAiParams({...aiParams, size: option.value})}
                  className={`p-3 rounded-lg text-sm font-medium border transition-colors ${
                    aiParams.size === option.value 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-card border-border text-card-foreground hover:bg-muted'
                  }`}
                >
                  <div>{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Tom</label>
            <div className="grid grid-cols-2 gap-2">
              {aiToneOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setAiParams({...aiParams, tone: option.value})}
                  className={`p-3 rounded-lg text-sm font-medium border flex items-center space-x-2 transition-colors ${
                    aiParams.tone === option.value 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-card border-border text-card-foreground hover:bg-muted'
                  }`}
                >
                  <span>{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Objetivo</label>
            <div className="grid grid-cols-2 gap-2">
              {aiObjectiveOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setAiParams({...aiParams, objective: option.value})}
                  className={`p-3 rounded-lg text-sm font-medium border flex items-center space-x-2 transition-colors ${
                    aiParams.objective === option.value 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-card border-border text-card-foreground hover:bg-muted'
                  }`}
                >
                  <span>{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={generateAIContent}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                <span>Gerar Conteúdo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-card rounded-xl p-4 shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-card-foreground">Editor</h3>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={useEmojis}
                onChange={(e) => setUseEmojis(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">😊</span>
            </label>
            <span className={`text-xs ${characterCount > characterLimit * 0.9 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {characterCount}/{characterLimit}
            </span>
          </div>
        </div>

        <textarea
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          maxLength={characterLimit}
          placeholder="Digite seu post aqui ou use a IA para gerar conteúdo..."
          className="w-full h-40 p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background text-foreground"
        />

        {/* Upload de Imagens */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-card-foreground text-sm">Imagens</h4>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 text-primary hover:text-primary/80 text-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map(img => (
                <div key={img.id} className="relative group">
                  <img 
                    src={img.url} 
                    alt="Upload" 
                    className="w-full h-20 object-cover rounded-lg border border-border"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Correção por IA */}
      {postContent && (
        <div className="bg-card rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-card-foreground">Correção IA</h3>
          </div>
          <button 
            onClick={correctContent}
            disabled={isCorrecting}
            className="w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-xl font-medium hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isCorrecting ? (
              <>
                <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin"></div>
                <span>Corrigindo...</span>
              </>
            ) : (
              <>
                <PenTool className="w-4 h-4" />
                <span>Corrigir Conteúdo</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Preview */}
      {postContent && (
        <div className="bg-card rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-card-foreground mb-3">Preview LinkedIn</h3>
          <LinkedInPreview postContent={postContent} images={images} />
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex space-x-3">
        <button 
          onClick={sendToWebhook}
          disabled={!postContent.trim()}
          className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Send className="w-4 h-4" />
          <span>Enviar</span>
        </button>
      </div>
    </div>
  );
};

export default CreateTab;