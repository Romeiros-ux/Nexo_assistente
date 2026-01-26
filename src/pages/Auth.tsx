import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo.png";
 
 export default function Auth() {
  const { signIn } = useAuth();
   const { toast } = useToast();
   const navigate = useNavigate();
   const [loading, setLoading] = useState(false);
 
   const [loginForm, setLoginForm] = useState({ email: "", password: "" });
 
   const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     try {
       await signIn(loginForm.email, loginForm.password);
       toast({ title: "Login realizado com sucesso!" });
       navigate("/");
     } catch (error: any) {
       toast({ title: "Erro ao fazer login", description: error.message, variant: "destructive" });
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
       <Card className="w-full max-w-md shadow-lg">
         <CardHeader className="space-y-1 text-center">
           <div className="flex items-center justify-center mb-2">
             <img 
               src={logoImage} 
               alt="Nexo - Assistente Educacional" 
               className="w-20 h-20 object-contain"
             />
           </div>
           <h1 className="text-2xl font-serif font-semibold text-foreground">
             Nexo
           </h1>
           <p className="text-sm text-muted-foreground">
             Assistente Educacional
           </p>
         </CardHeader>
         <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu.email@educacao.gov.br"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
         </CardContent>
         <CardFooter className="text-xs text-center text-muted-foreground">
            Para solicitar acesso, entre em contato com a TI.
         </CardFooter>
       </Card>
     </div>
   );
 }