import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Target, StickyNote, LogOut, Shield, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roles);
    } catch (error) {
      // User is not admin
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out");
    } else {
      toast.success("Logged out successfully");
      navigate("/");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-card shadow-book sticky top-0 z-50">
      <div className="container mx-auto px-3">
        <div className="flex items-center justify-between h-14">
          <Link to="/home" className="flex items-center gap-2 font-bold text-lg text-primary">
            <BookOpen className="h-5 w-5" />
            <span className="hidden sm:inline">Quietly</span>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3">
                <User className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline text-xs">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              <DropdownMenuItem asChild>
                <Link 
                  to="/goals" 
                  className={`flex items-center gap-2 cursor-pointer ${isActive('/goals') ? 'bg-accent' : ''}`}
                >
                  <Target className="h-4 w-4" />
                  Goals
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link 
                  to="/notes" 
                  className={`flex items-center gap-2 cursor-pointer ${isActive('/notes') ? 'bg-accent' : ''}`}
                >
                  <StickyNote className="h-4 w-4" />
                  Notes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link 
                  to="/setup" 
                  className={`flex items-center gap-2 cursor-pointer ${isActive('/setup') ? 'bg-accent' : ''}`}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/admin" 
                      className={`flex items-center gap-2 cursor-pointer ${isActive('/admin') ? 'bg-accent' : ''}`}
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};
