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
    <header className="h-16 bg-background border-b border-border sticky top-0 z-50 px-4">
      <div className="h-full flex items-center justify-between max-w-sm mx-auto">
        {/* Logo e Status - Clicável para Home */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">in</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">LinkedIn</span>
            <span className="text-sm font-medium text-blue-600">AI</span>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">{user?.email?.split('@')[0]}</span>
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
          
          <DropdownMenuContent align="end" className="w-64 bg-background border border-border/40">
            {/* User Info */}
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getAvatarUrl() || undefined} />
                  <AvatarFallback>
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{getFullName()}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">
                  <User className="h-4 w-4" />
                  Ver perfil
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link to="/change-password" className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer">
                  <Key className="h-4 w-4" />
                  Trocar senha
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;