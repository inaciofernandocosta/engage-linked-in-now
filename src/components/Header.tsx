import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, Key, LogOut, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

const Header = () => {
  const { user, signOut } = useAuth();
  const { getFullName, getUserInitials, getAvatarUrl } = useProfile();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="h-14 bg-card border-b border-border sticky top-0 z-50 px-4 shadow-linkedin">
      <div className="h-full flex items-center justify-between max-w-6xl mx-auto">
        {/* Logo e Status - Clicável para Home */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-150">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">in</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">LinkedIn</span>
            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">AI</span>
          </div>
          <div className="w-2 h-2 bg-success rounded-full"></div>
          <span className="text-xs text-muted-foreground hidden sm:block">{user?.email?.split('@')[0]}</span>
        </Link>

        {/* User Dropdown */}
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 h-auto"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={getAvatarUrl() || undefined} />
                <AvatarFallback className="text-xs bg-blue-600 text-white">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">Eu</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-72 bg-card border border-border shadow-linkedin-hover">
            {/* User Info */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 ring-2 ring-border">
                  <AvatarImage src={getAvatarUrl() || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-base text-foreground">{getFullName()}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-primary mt-1">Ver perfil</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-muted rounded-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Ver perfil</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-muted rounded-none">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Configurações</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link to="/change-password" className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-muted rounded-none">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Trocar senha</span>
                </Link>
              </DropdownMenuItem>
              
              <div className="border-t border-border my-1"></div>
              
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sair</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;