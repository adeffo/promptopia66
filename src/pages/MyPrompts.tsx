import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { PromptCard } from "@/components/PromptCard";
import { PromptDetailDialog } from "@/components/PromptDetailDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Upload } from "lucide-react";

interface Prompt {
  id: string;
  title: string;
  image_url: string;
  creator_id: string;
  created_at: string;
  likes_count: number;
  favorites_count: number;
  comments_count: number;
  tags: string[];
  profiles: {
    display_name: string | null;
  } | null;
}

const MyPrompts = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [myPrompts, setMyPrompts] = useState<Prompt[]>([]);
  const [favoritePrompts, setFavoritePrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        fetchMyPrompts(session.user.id);
        fetchFavorites(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchMyPrompts = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prompts")
        .select(`
          *,
          profiles:creator_id (display_name)
        `)
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyPrompts(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          prompt_id,
          prompts (
            *,
            profiles:creator_id (display_name)
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;
      
      const prompts = data?.map((fav: any) => fav.prompts).filter(Boolean) || [];
      setFavoritePrompts(prompts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Abgemeldet",
      description: "Du wurdest erfolgreich abgemeldet.",
    });
    navigate("/");
  };

  const handlePromptClick = (promptId: string) => {
    setSelectedPromptId(promptId);
    setDialogOpen(true);
  };

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Meine Prompts</h1>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/upload">
                <Upload className="h-4 w-4" />
                Prompt hochladen
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/prompt-creator">
                <Sparkles className="h-4 w-4" />
                Selbst Inspiration geben
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="created" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="created">Erstellt ({myPrompts.length})</TabsTrigger>
            <TabsTrigger value="favorites">Favoriten ({favoritePrompts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="created" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Lädt...</p>
            ) : myPrompts.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {myPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    id={prompt.id}
                    title={prompt.title}
                    imageUrl={prompt.image_url}
                    creator={prompt.profiles?.display_name || "Unbekannt"}
                    creatorId={prompt.creator_id}
                    createdAt={prompt.created_at}
                    likesCount={prompt.likes_count}
                    favoritesCount={prompt.favorites_count}
                    commentsCount={prompt.comments_count}
                    tags={prompt.tags}
                    onClick={() => handlePromptClick(prompt.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Du hast noch keine Prompts erstellt.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            {favoritePrompts.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {favoritePrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    id={prompt.id}
                    title={prompt.title}
                    imageUrl={prompt.image_url}
                    creator={prompt.profiles?.display_name || "Unbekannt"}
                    creatorId={prompt.creator_id}
                    createdAt={prompt.created_at}
                    likesCount={prompt.likes_count}
                    favoritesCount={prompt.favorites_count}
                    commentsCount={prompt.comments_count}
                    tags={prompt.tags}
                    isFavorited={true}
                    onClick={() => handlePromptClick(prompt.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Du hast noch keine Favoriten.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <PromptDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        promptId={selectedPromptId}
        userId={session?.user?.id}
      />
    </Layout>
  );
};

export default MyPrompts;
