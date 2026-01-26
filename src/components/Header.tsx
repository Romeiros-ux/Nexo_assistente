import { FileText, LogOut, Moon, Shield, Sun, User, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import logoImage from "@/assets/logo.png";
 
 const ROLE_LABELS: Record<string, string> = {
   secretaria: "Secretaria",
   ti: "TI",
   coordenacao: "Coordenação",
   diretor: "Diretor",
 };

export function Header({ showSidebarTrigger = false }: { showSidebarTrigger?: boolean }) {
   const { userContext, signOut } = useAuth();
   const navigate = useNavigate();
   const { theme, setTheme } = useTheme();
 
   const handleSignOut = async () => {
     await signOut();
     navigate("/auth");
   };
 
   const initials = userContext?.fullName
     ?.split(" ")
     .map((n) => n[0])
     .join("")
     .toUpperCase()
     .slice(0, 2) || "U";
 
  return (
    <header className="institutional-header sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            {showSidebarTrigger ? <SidebarTrigger className="text-white hover:bg-white/10" /> : null}
            <Button
              type="button"
              variant="ghost"
              className="flex items-center gap-3 p-0 h-auto text-left text-white hover:bg-white/10"
              onClick={() => navigate("/")}
              aria-label="Voltar ao chat"
              title="Voltar ao chat"
            >
              <img 
                src={logoImage} 
                alt="Nexo - Assistente Educacional" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-lg font-serif font-semibold text-white">Nexo</h1>
                <p className="text-xs text-white/70">Assistente Educacional</p>
              </div>
            </Button>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              aria-label="Alternar tema"
              title="Alternar tema"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{userContext?.fullName || "Usuário"}</p>
                    <p className="text-xs text-white/70">
                      {userContext?.role ? ROLE_LABELS[userContext.role] : "Sem perfil"}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
               <DropdownMenuLabel>
                 <div className="flex flex-col space-y-1">
                   <p className="text-sm font-medium">{userContext?.fullName}</p>
                   <p className="text-xs text-muted-foreground">{userContext?.email}</p>
                 </div>
               </DropdownMenuLabel>
               <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                 <Shield className="w-4 h-4" />
                 <span className="flex-1">Perfil</span>
                 <Badge variant={userContext?.isActive ? "default" : "destructive"} className="text-xs">
                   {userContext?.role ? ROLE_LABELS[userContext.role] : "N/A"}
                 </Badge>
              </DropdownMenuItem>
               {userContext?.unitName && (
                 <DropdownMenuItem className="gap-2">
                   <User className="w-4 h-4" />
                   <span className="flex-1">Unidade</span>
                   <span className="text-xs text-muted-foreground">{userContext.unitName}</span>
                 </DropdownMenuItem>
               )}
               {userContext?.role === "ti" && (
                 <>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem className="gap-2" onClick={() => navigate("/usuarios")}>
                     <Users className="w-4 h-4" />
                     Usuários
                   </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => navigate("/documentos")}>
                      <FileText className="w-4 h-4" />
                      Documentos
                    </DropdownMenuItem>
                 </>
               )}
              <DropdownMenuSeparator />
               <DropdownMenuItem className="gap-2 text-destructive" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                Sair
              </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
