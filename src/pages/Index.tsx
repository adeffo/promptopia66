import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PromptCard } from "@/components/PromptCard";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Fehler beim Abmelden",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Erfolgreich abgemeldet",
        description: "Bis bald!",
      });
    }
  };

  // Mock data für Demonstration
  const mockPrompts = [
    {
      id: "1",
      title: "Futuristic Cyberpunk Cityscape",
      imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
      creator: "MaxMustermann",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      favoritesCount: 42,
      commentsCount: 8,
      tags: ["Cyberpunk", "Neon", "City"],
      isFavorited: true,
    },
    {
      id: "2",
      title: "Mystical Forest with Glowing Creatures",
      imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
      creator: "AnnaKreativ",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      favoritesCount: 38,
      commentsCount: 12,
      tags: ["Fantasy", "Nature", "Magic"],
      isFavorited: false,
    },
    {
      id: "3",
      title: "Abstract Digital Art Composition",
      imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
      creator: "TechArtist",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      favoritesCount: 56,
      commentsCount: 15,
      tags: ["Abstract", "Digital", "Colorful"],
      isFavorited: true,
    },
    {
      id: "4",
      title: "Retro Vaporwave Aesthetics",
      imageUrl: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
      creator: "RetroWave",
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      favoritesCount: 73,
      commentsCount: 21,
      tags: ["Vaporwave", "80s", "Retro"],
      isFavorited: false,
    },
  ];

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <div className="mb-6 inline-flex items-center gap-3">
          <div className="rounded-xl bg-gradient-primary p-3 shadow-glow animate-glow">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="mb-4 bg-gradient-hero bg-clip-text text-5xl font-bold text-transparent">
          Entdecke KI-Prompts
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Die beste Community-Plattform für kreative KI-Prompts. Teile deine Kreationen,
          entdecke Inspiration und nimm an Contests teil.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative mx-auto max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Suche nach Prompts, Tags oder Creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 pr-4 border-border/40 bg-card/50 backdrop-blur"
          />
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockPrompts.map((prompt) => (
          <div key={prompt.id} className="animate-fade-in">
            <PromptCard
              {...prompt}
              onClick={() => {
                toast({
                  title: "Prompt Details",
                  description: "Detail-Ansicht wird bald verfügbar sein!",
                });
              }}
            />
          </div>
        ))}
      </div>

      {/* Empty State für keine Prompts */}
      {mockPrompts.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Keine Prompts gefunden.</p>
        </div>
      )}
    </Layout>
  );
};

export default Index;
