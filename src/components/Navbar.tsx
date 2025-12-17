import { Link, useLocation } from "react-router-dom";
import { BookOpen, Home, Library, Target, StickyNote, Bell, LogOut, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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
      navigate("/auth");
    }
  };

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/library", icon: Library, label: "Library" },
    { to: "/goals", icon: Target, label: "Goals" },
    { to: "/notes", icon: StickyNote, label: "Notes" },
    { to: "/setup", icon: Settings, label: "Setup" },
  ];

  return (
    <nav className="border-b bg-card shadow-book sticky top-0 z-50">
      <div className="container mx-auto px-3">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <BookOpen className="h-5 w-5" />
            <span className="hidden sm:inline">PagePace</span>
          </Link>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Button
                  key={item.to}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className="transition-smooth h-9 px-2 sm:px-3"
                >
                  <Link to={item.to}>
                    <Icon className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline text-xs">{item.label}</span>
                  </Link>
                </Button>
              );
            })}
            {isAdmin && (
              <Button
                variant={location.pathname === "/admin" ? "secondary" : "ghost"}
                size="sm"
                asChild
                className="transition-smooth h-9 px-2 sm:px-3"
              >
                <Link to="/admin">
                  <Shield className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline text-xs">Admin</span>
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="ml-1 h-9 px-2 sm:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline text-xs">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
