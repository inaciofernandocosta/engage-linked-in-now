
import React, { useState, useEffect } from 'react';
import { Bot, Bell } from 'lucide-react';
import BottomNavigation from './BottomNavigation';
import HomeTab from './tabs/HomeTab';
import CreateTab from './tabs/CreateTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import Publications from '../pages/Publications';
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

  const generateAIContent = async (instructions: string) => {
    if (!instructions.trim()) {
      toast({
        title: "Erro",
        description: "Digite suas instruções ou rascunho para gerar o conteúdo",
        variant: "destructive",
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Erro de conectividade",
        description: "Você precisa estar online para usar a geração por IA",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('Iniciando geração de conteúdo...');
      console.log('Instruções originais:', instructions.substring(0, 100) + '...');
      console.log('Parâmetros AI:', aiParams);
      console.log('Usar emojis:', useEmojis);
      
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: { 
          content: instructions,
          useEmojis: useEmojis,
          size: aiParams.size,
          tone: aiParams.tone,
          objective: aiParams.objective
        }
      });

      console.log('Resposta da função:', { data, error });

      if (error) {
        console.error('Erro da função Supabase:', error);
        toast({
          title: "Erro na geração",
          description: error.message || "Erro ao gerar conteúdo com IA",
          variant: "destructive",
        });
        return;
      }

      if (data?.generatedContent) {
        console.log('Conteúdo gerado com sucesso, length:', data.generatedContent.length);
        setPostContent(data.generatedContent);
        toast({
          title: "Sucesso!",
          description: "Conteúdo gerado com IA aplicado!",
        });
      } else {
        console.error('Nenhum conteúdo gerado recebido');
        toast({
          title: "Erro",
          description: "Nenhum conteúdo foi gerado",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao gerar conteúdo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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
    console.log('=== SALVANDO POST COMO PENDENTE ===');
    
    if (!postContent.trim()) {
      toast({
        title: "Erro",
        description: "Conteúdo do post é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep('webhook');
    
    try {
      const imageUrl = images.length > 0 ? images[0].url : null;
      const webhookUrl = "https://n8n-n8n-start.43ir9u.easypanel.host/webhook/instagran";

      console.log('=== DADOS PARA SALVAR ===');
      console.log('- Content length:', postContent.length);
      console.log('- Images array:', images);
      console.log('- ImageUrl (primeiro 50 chars):', imageUrl ? imageUrl.substring(0, 50) + '...' : 'null');
      console.log('- WebhookUrl:', webhookUrl);

      // Determinar dados da imagem para envio
      let imageDataToSend = null;
      let imageUrlToSend = null;
      
      if (imageUrl) {
        if (imageUrl.startsWith('data:')) {
          // Imagem já em base64 (upload manual) - enviar como base64
          imageDataToSend = imageUrl;
          console.log('- Imagem manual (base64) detectada');
        } else if (imageUrl.startsWith('http')) {
          // URL externa (gerada por IA) - enviar URL para backend processar
          imageUrlToSend = imageUrl;
          console.log('- URL externa (IA) detectada, backend irá processar');
        }
      }

      console.log('- ImageBase64 preparado:', imageDataToSend ? 'SIM' : 'NÃO');
      console.log('- ImageUrl externa preparada:', imageUrlToSend ? 'SIM' : 'NÃO');
      console.log('Salvando post como pendente...');
      
      const { data, error } = await supabase.functions.invoke('publish-post', {
        body: {
          content: postContent,
          imageUrl: imageUrlToSend, // URL externa (IA) para backend processar
          imageBase64: imageDataToSend, // Base64 direto (upload manual)
          webhookUrl: webhookUrl,
          status: 'pending' // Salvar como pendente
        }
      });

      console.log('=== RESPOSTA SUPABASE FUNCTIONS ===');
      console.log('Raw data:', data);
      console.log('Raw error:', error);
      console.log('Error details:', error ? {
        message: error.message,
        name: error.name,
        status: error.status,
        statusText: error.statusText,
        details: error.details
      } : 'No error');

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Edge Function Error: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        console.error('❌ No data returned');
        throw new Error('Nenhum dado retornado da função');
      }

      if (data.success) {
        console.log('✅ Sucesso!');
        
        // Detalhes da publicação para o toast
        const postDetails = data.post;
        const hasImage = postDetails.image_url ? 'com imagem' : 'sem imagem';
        
        toast({
          title: "Post Salvo como Pendente!",
          description: `Post ${hasImage} salvo e aguardando aprovação ou agendamento`,
        });
        
        console.log('📝 Post salvo como pendente:', {
          id: postDetails.id,
          hasImage: !!postDetails.image_url,
          imageUrl: postDetails.image_url,
          status: 'pending'
        });
        
        setCurrentStep('approval');
      } else {
        console.error('❌ Success = false:', data);
        throw new Error(data.error || data.details || 'Erro desconhecido na publicação');
      }
      
    } catch (error) {
      console.error('=== ERRO CATCH GERAL ===');
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      toast({
        title: "Erro na Publicação",
        description: error?.message || "Erro desconhecido ao publicar post",
        variant: "destructive",
      });
      setCurrentStep('create');
    }
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
      case 'publications':
        return <Publications />;
      default:
        return <HomeTab setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 pb-20">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation PWA */}
      <BottomNavigation currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
};

export default LinkedInPostAdmin;
