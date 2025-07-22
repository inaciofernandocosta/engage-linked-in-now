import React, { useRef, useState, useEffect } from 'react';
import { Bot, Upload, X, Send, Sparkles, Zap, Check, PenTool, ImageIcon } from 'lucide-react';
import LinkedInPreview from '../LinkedInPreview';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  generateAIContent: (instructions: string) => void;
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
  const [instructions, setInstructions] = useState("");
  const instructionCount = instructions.length;
  const { profile, getFullName, getAvatarUrl } = useProfile();
  const { toast } = useToast();
  
  // Estados para geração de imagem
  const [isAnalyzingContent, setIsAnalyzingContent] = useState(false);

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


  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPostContent(e.target.value);
  };

  const generateImageFromContent = async () => {
    if (!postContent.trim()) {
      toast({
        title: "Erro",
        description: "Crie ou cole conteúdo no post primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingContent(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-and-generate-image', {
        body: {
          postContent: postContent
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success && data.image) {
        setImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          url: data.image,
          name: `IA: ${data.prompt.substring(0, 40)}...`
        }]);
        
        toast({
          title: "Imagem Gerada!",
          description: `Baseada no conteúdo: "${data.originalContent}"`,
        });
      } else {
        throw new Error(data.error || 'Erro ao analisar e gerar imagem');
      }
    } catch (error) {
      console.error('Erro ao analisar conteúdo e gerar imagem:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao analisar conteúdo e gerar imagem",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingContent(false);
    }
  };

  if (currentStep === 'webhook') {
    return (
      <div className="p-4">
        <div className="bg-card rounded-xl p-8 shadow-sm border text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground mb-2">Salvando Post</h3>
          <p className="text-muted-foreground mb-4">Salvando como pendente...</p>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Instruções para IA */}
      <div className="linkedin-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-card-foreground">Instruções ou Rascunho</h3>
          <span className={`text-sm font-medium ${instructionCount > 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {instructionCount}/500
          </span>
        </div>
        
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={500}
          placeholder="Ex: Participei nesta sexta feira de uma formação na Statse de conselheiro e foi um evento muito bacana que aprendi muito sobre governança..."
          className="w-full h-32 p-4 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background text-foreground linkedin-input"
        />
        
        <p className="text-sm text-muted-foreground mt-3">
          Digite suas ideias ou rascunho que a IA irá transformar em um post profissional
        </p>
      </div>

      {/* Geração de IA */}
      <div className="linkedin-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-semibold text-lg text-card-foreground">Geração por IA</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">Tamanho do Post</label>
            <div className="grid grid-cols-3 gap-3">
              {aiSizeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setAiParams({...aiParams, size: option.value})}
                  className={`p-4 rounded-lg text-sm font-medium border transition-all duration-150 ${
                    aiParams.size === option.value 
                      ? 'bg-primary text-primary-foreground border-primary shadow-linkedin-focus' 
                      : 'bg-card border-border text-card-foreground hover:bg-muted hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs opacity-70 mt-1">{option.desc} caracteres</div>
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
            onClick={() => generateAIContent(instructions)}
            disabled={isGenerating || !instructions.trim()}
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
          onChange={handleContentChange}
          maxLength={characterLimit}
          placeholder="O conteúdo gerado pela IA aparecerá aqui. Você pode editá-lo antes de usar o botão 'Corrigir'..."
          className="w-full h-40 p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background text-foreground"
        />

        {/* Upload de Imagens */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-card-foreground text-sm">Imagens</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1 text-primary hover:text-primary/80 text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
              {postContent.trim() && (
                <button
                  onClick={generateImageFromContent}
                  disabled={isAnalyzingContent}
                  className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  {isAnalyzingContent ? (
                    <>
                      <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>IA do Post</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Geração de Imagem com IA baseada no conteúdo */}
          {postContent.trim() && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-md flex items-center justify-center">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <h5 className="font-medium text-sm">IA do Post</h5>
                </div>
                <button
                  onClick={generateImageFromContent}
                  disabled={isAnalyzingContent}
                  className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                >
                  {isAnalyzingContent ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      <span>Gerar Imagem</span>
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                A IA irá analisar o conteúdo do seu post e gerar uma imagem contextual automaticamente
              </p>
            </div>
          )}

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

          {/* Botões de Ação */}
          <div className="flex space-x-3 mt-6">
            <button 
              onClick={correctContent}
              disabled={isCorrecting || !postContent.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isCorrecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Corrigindo...</span>
                </>
              ) : (
                <>
                  <PenTool className="w-4 h-4" />
                  <span>Corrigir</span>
                </>
              )}
            </button>
            
            <button 
              onClick={sendToWebhook}
              disabled={!postContent.trim()}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Salvar</span>
            </button>
          </div>
        </div>
      </div>


      {/* Preview */}
      {postContent && (
        <div className="bg-card rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-card-foreground mb-3">Preview LinkedIn</h3>
          <LinkedInPreview 
            postContent={postContent} 
            images={images}
            userAvatar={getAvatarUrl() || ""}
            userName={getFullName()}
            userTitle={profile?.job_title || "Desenvolvedor Full Stack"}
          />
        </div>
      )}

    </div>
  );
};

export default CreateTab;