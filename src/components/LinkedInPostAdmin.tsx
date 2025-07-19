
import React, { useState, useEffect } from 'react';
import { Bot, Bell } from 'lucide-react';
import PWAStatusBar from './PWAStatusBar';
import BottomNavigation from './BottomNavigation';
import HomeTab from './tabs/HomeTab';
import CreateTab from './tabs/CreateTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import TemplatesTab from './tabs/TemplatesTab';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const LinkedInPostAdmin = () => {
  const [postContent, setPostContent] = useState('');
  const [images, setImages] = useState<Array<{ id: number; url: string; name: string }>>([]);
  const [useEmojis, setUseEmojis] = useState(true);
  const [currentTab, setCurrentTab] = useState('home');
  const [aiParams, setAiParams] = useState({
    size: 'medium',
    tone: 'professional',
    objective: 'engagement'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [currentStep, setCurrentStep] = useState('create');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // PWA Status Bar e Network Detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const generateAIContent = async () => {
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sampleContent = `🚀 Como transformar sua carreira em tecnologia em 2025

Nos últimos 5 anos trabalhando com desenvolvimento, aprendi que o mercado tech não para de evoluir. E quem não se adapta, fica para trás.

✅ 3 dicas que mudaram minha trajetória:

1️⃣ Foque em fundamentos: Algoritmos e estruturas de dados nunca saem de moda
2️⃣ Pratique projetos reais: GitHub com código de qualidade vale mais que 10 certificados
3️⃣ Network estratégico: Conecte-se com pessoas que já estão onde você quer chegar

💡 O diferencial não está apenas no que você sabe, mas em como aplica esse conhecimento para resolver problemas reais.

Qual dessas dicas ressoa mais com sua experiência? Compartilhe nos comentários! 👇

#DesenvolvimentoSoftware #CarreiraTech #Programação #LinkedIn`;

    setPostContent(sampleContent);
    setIsGenerating(false);
  };

  const correctContent = async () => {
    if (!postContent.trim()) {
      toast({
        title: "Erro",
        description: "Não há conteúdo para corrigir",
        variant: "destructive",
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Erro de conectividade",
        description: "Você precisa estar online para usar a correção por IA",
        variant: "destructive",
      });
      return;
    }
    
    setIsCorrecting(true);
    
    try {
      console.log('Iniciando correção de conteúdo...');
      console.log('Conteúdo original:', postContent.substring(0, 100) + '...');
      
      const { data, error } = await supabase.functions.invoke('correct-content', {
        body: { content: postContent }
      });

      console.log('Resposta da função:', { data, error });

      if (error) {
        console.error('Erro da função Supabase:', error);
        throw new Error(error.message || 'Falha ao corrigir conteúdo');
      }

      if (data?.error) {
        console.error('Erro retornado pela função:', data.error);
        throw new Error(data.error);
      }

      if (!data?.correctedContent) {
        console.error('Nenhum conteúdo corrigido recebido');
        throw new Error('Nenhum conteúdo corrigido foi recebido');
      }

      console.log('Conteúdo corrigido recebido:', data.correctedContent.substring(0, 100) + '...');
      
      setPostContent(data.correctedContent);
      toast({
        title: "Conteúdo corrigido!",
        description: "O conteúdo foi revisado e corrigido pela IA",
      });
      
    } catch (error) {
      console.error('Erro na correção de conteúdo:', error);
      
      let errorMessage = "Não foi possível corrigir o conteúdo. Tente novamente.";
      
      if (error.message.includes('OpenAI API key')) {
        errorMessage = "Chave da API OpenAI não configurada. Entre em contato com o suporte.";
      } else if (error.message.includes('Failed to correct content')) {
        errorMessage = "Erro na API de correção. Verifique sua conexão e tente novamente.";
      }
      
      toast({
        title: "Erro na correção",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCorrecting(false);
    }
  };

  const sendToWebhook = async () => {
    setCurrentStep('webhook');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setCurrentStep('approval');
  };

  const approvePost = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setPostContent('');
    setImages([]);
    setCurrentStep('create');
    setCurrentTab('home');
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'home':
        return <HomeTab setCurrentTab={setCurrentTab} />;
      case 'create':
        return (
          <CreateTab
            postContent={postContent}
            setPostContent={setPostContent}
            images={images}
            setImages={setImages}
            useEmojis={useEmojis}
            setUseEmojis={setUseEmojis}
            aiParams={aiParams}
            setAiParams={setAiParams}
            isGenerating={isGenerating}
            isCorrecting={isCorrecting}
            currentStep={currentStep}
            generateAIContent={generateAIContent}
            correctContent={correctContent}
            sendToWebhook={sendToWebhook}
            approvePost={approvePost}
            setCurrentStep={setCurrentStep}
          />
        );
      case 'analytics':
        return <AnalyticsTab />;
      case 'templates':
        return <TemplatesTab />;
      default:
        return <HomeTab setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-sm mx-auto relative overflow-hidden shadow-2xl">
      {/* Status Bar PWA */}
      <PWAStatusBar isOnline={isOnline} />

      {/* Header PWA */}
      <header className="bg-card shadow-sm border-b border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-card-foreground">LinkedIn AI</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-destructive'}`}></div>
          <Bell className="w-6 h-6 text-muted-foreground" />
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto pb-20">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation PWA */}
      <BottomNavigation currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
};

export default LinkedInPostAdmin;
