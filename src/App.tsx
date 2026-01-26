import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
 import { AuthProvider } from "@/contexts/AuthContext";
 import { useAuth } from "@/contexts/AuthContext";
 import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
 import Auth from "./pages/Auth";
import UsersAdmin from "./pages/UsersAdmin";
import DocumentsAdmin from "./pages/DocumentsAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
 
 function AppRoutes() {
    const { user, userContext, loading } = useAuth();
 
   if (loading) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
         <p className="text-muted-foreground">Carregando...</p>
       </div>
     );
   }
 
   return (
     <Routes>
       <Route path="/" element={user ? <Index /> : <Navigate to="/auth" replace />} />
       <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" replace />} />
        <Route
          path="/usuarios"
          element={
            user && userContext?.role === "ti" ? (
              <UsersAdmin />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
         <Route
           path="/documentos"
           element={
             user && userContext?.role === "ti" ? (
               <DocumentsAdmin />
             ) : (
               <Navigate to="/" replace />
             )
           }
         />
       {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
       <Route path="*" element={<NotFound />} />
     </Routes>
   );
 }

export default App;
