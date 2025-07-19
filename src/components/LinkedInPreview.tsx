import React from 'react';

interface LinkedInPreviewProps {
  postContent: string;
  images: Array<{ id: number; url: string; name: string }>;
}

const LinkedInPreview = ({ postContent, images }: LinkedInPreviewProps) => {
  return (
    <div className="bg-card rounded-lg border shadow-sm w-full" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div className="px-4 pt-3 pb-0">
        <div className="flex items-start space-x-2">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiMwQTY2QzIiLz4KPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VTwvdGV4dD4KPHN2Zz4=" 
              alt="Usuário" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <h3 className="text-sm font-semibold text-card-foreground hover:text-primary cursor-pointer hover:underline">
                Seu Nome
              </h3>
              <span className="text-muted-foreground mx-1">•</span>
              <span className="text-xs text-muted-foreground">1º</span>
            </div>
            
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
              Desenvolvedor Full Stack | Especialista em React e Node.js
            </p>
            
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span>Agora</span>
              <span className="mx-1">•</span>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          </div>
          
          <button className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-muted rounded">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="px-4 py-3">
        <div className="text-sm text-card-foreground leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.4' }}>
          {postContent || (
            <span className="text-muted-foreground italic">
              Seu conteúdo aparecerá aqui exatamente como no LinkedIn...
            </span>
          )}
        </div>
        
        {images.length > 0 && (
          <div className="mt-3 -mx-4">
            {images.length === 1 && (
              <img 
                src={images[0].url} 
                alt="Post" 
                className="w-full max-h-96 object-cover"
              />
            )}
            {images.length === 2 && (
              <div className="grid grid-cols-2 gap-0.5">
                {images.map(img => (
                  <img 
                    key={img.id} 
                    src={img.url} 
                    alt="Post" 
                    className="w-full h-48 object-cover"
                  />
                ))}
              </div>
            )}
            {images.length >= 3 && (
              <div className="grid grid-cols-2 gap-0.5">
                <img 
                  src={images[0].url} 
                  alt="Post" 
                  className="w-full h-48 object-cover"
                />
                <div className="grid grid-rows-2 gap-0.5">
                  <img 
                    src={images[1].url} 
                    alt="Post" 
                    className="w-full h-24 object-cover"
                  />
                  {images.length === 3 ? (
                    <img 
                      src={images[2].url} 
                      alt="Post" 
                      className="w-full h-24 object-cover"
                    />
                  ) : (
                    <div className="relative">
                      <img 
                        src={images[2].url} 
                        alt="Post" 
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          +{images.length - 2}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <div className="flex -space-x-0.5">
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center border border-card">
                <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
                </svg>
              </div>
              <div className="w-4 h-4 bg-destructive rounded-full flex items-center justify-center border border-card">
                <svg className="w-2.5 h-2.5 text-destructive-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="w-4 h-4 bg-warning rounded-full flex items-center justify-center border border-card">
                <svg className="w-2.5 h-2.5 text-warning-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
            <span className="ml-2">34</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>8 comentários</span>
            <span>2 compartilhamentos</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border mx-4"></div>
      
      <div className="px-4 py-2">
        <div className="flex justify-around">
          <button className="flex-1 flex items-center justify-center space-x-2 py-3 px-2 text-muted-foreground hover:bg-muted rounded text-sm font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
            </svg>
            <span>Gostei</span>
          </button>
          
          <button className="flex-1 flex items-center justify-center space-x-2 py-3 px-2 text-muted-foreground hover:bg-muted rounded text-sm font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd"/>
            </svg>
            <span>Comentar</span>
          </button>
          
          <button className="flex-1 flex items-center justify-center space-x-2 py-3 px-2 text-muted-foreground hover:bg-muted rounded text-sm font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>
            </svg>
            <span>Compartilhar</span>
          </button>
          
          <button className="flex-1 flex items-center justify-center space-x-2 py-3 px-2 text-muted-foreground hover:bg-muted rounded text-sm font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
            </svg>
            <span>Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedInPreview;