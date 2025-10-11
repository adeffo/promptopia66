import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UploadPrompt from "./pages/UploadPrompt";
import PromptCreator from "./pages/PromptCreator";
import PromptExtractor from "./pages/PromptExtractor";
import MyPrompts from "./pages/MyPrompts";
import Contests from "./pages/Contests";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import UserPrompts from "./pages/UserPrompts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/upload" element={<UploadPrompt />} />
          <Route path="/prompt-creator" element={<PromptCreator />} />
          <Route path="/prompt-extractor" element={<PromptExtractor />} />
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
