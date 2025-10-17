import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PromptGallery from "./pages/PromptGallery";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import UploadPrompt from "./pages/UploadPrompt";
import PromptCreator from "./pages/PromptCreator";

import RepairImages from "./pages/RepairImages";
import ImageEnhancer from "./pages/ImageEnhancer";
import MyPrompts from "./pages/MyPrompts";
import Contests from "./pages/Contests";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import UserPrompts from "./pages/UserPrompts";
import NotFound from "./pages/NotFound";

const AuthSync = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && location.pathname === "/auth") {
        navigate("/prompt-gallery");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && location.pathname === "/auth") {
        navigate("/prompt-gallery");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthSync />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/prompt-gallery" element={<PromptGallery />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/upload" element={<UploadPrompt />} />
          <Route path="/prompt-creator" element={<PromptCreator />} />

          <Route path="/repair-images" element={<RepairImages />} />
          <Route path="/image-enhancer" element={<ImageEnhancer />} />
          <Route path="/my-prompts" element={<MyPrompts />} />
          <Route path="/contests" element={<Contests />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/user/:userId/prompts" element={<UserPrompts />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
