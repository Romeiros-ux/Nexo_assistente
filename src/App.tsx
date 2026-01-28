import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import UsersProfiles from "./pages/admin/UsersProfiles";
import KnowledgeBase from "./pages/admin/KnowledgeBase";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ConversationsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/admin/users" element={<UsersProfiles />} />
              <Route path="/admin/knowledge" element={<KnowledgeBase />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ConversationsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
