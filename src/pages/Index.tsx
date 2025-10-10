import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PromptCard } from "@/components/PromptCard";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Search, Sparkles, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Prompt {
  id: string;
  title: string;
  image_url: string;
  creator_id: string;
  created_at: string;
  favorites_count: number;
  comments_count: number;
  tags: string[];
  profiles: {
    display_name: string | null;
  } | null;
}

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          *,
          profiles:creator_id (display_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPrompts(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

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

  const filteredPrompts = prompts.filter(prompt => 
    prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

      {/* Search Bar & Upload Button */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Suche nach Prompts, Tags oder Creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 pr-4 border-border/40 bg-card/50 backdrop-blur"
          />
        </div>
        {session && (
          <Button
            onClick={() => navigate("/upload")}
            className="bg-gradient-primary shadow-glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            Prompt hochladen
          </Button>
        )}
      </div>

      {/* Prompts Grid */}
      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Lädt Prompts...</p>
        </div>
      ) : filteredPrompts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPrompts.map((prompt) => (
            <div key={prompt.id} className="animate-fade-in">
              <PromptCard
                id={prompt.id}
                title={prompt.title}
                imageUrl={prompt.image_url}
                creator={prompt.profiles?.display_name || "Unbekannt"}
                createdAt={prompt.created_at}
                favoritesCount={prompt.favorites_count}
                commentsCount={prompt.comments_count}
                tags={prompt.tags}
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
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? "Keine Prompts gefunden." : "Noch keine Prompts vorhanden. Sei der Erste!"}
          </p>
        </div>
      )}
    </Layout>
  );
};

export default Index;
