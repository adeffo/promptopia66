import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { PromptCard } from "@/components/PromptCard";
import { PromptDetailDialog } from "@/components/PromptDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface UserProfile {
  display_name: string | null;
}

const UserPrompts = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profileData);

      // Fetch user's prompts
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select(`
          *,
          profiles:creator_id (display_name)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (promptsError) throw promptsError;
      setPrompts(promptsData || []);
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
    }
  };

  const handlePromptClick = (promptId: string) => {
    setSelectedPromptId(promptId);
    setDialogOpen(true);
  };

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        
        <h1 className="text-3xl font-bold">
          Prompts von {userProfile?.display_name || "Unbekannt"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {prompts.length} {prompts.length === 1 ? "Prompt" : "Prompts"}
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Lädt Prompts...</p>
        </div>
      ) : prompts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="animate-fade-in">
              <PromptCard
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
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            Dieser User hat noch keine Prompts hochgeladen.
          </p>
        </div>
      )}

      <PromptDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        promptId={selectedPromptId}
        userId={session?.user?.id}
      />
    </Layout>
  );
};

export default UserPrompts;
