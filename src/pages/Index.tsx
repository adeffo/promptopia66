import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PromptCard } from "@/components/PromptCard";
import { PromptDetailDialog } from "@/components/PromptDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, Sparkles, Plus, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Prompt {
  id: string;
  title: string;
  image_url: string;
  creator_id: string;
  created_at: string;
  favorites_count: number;
  comments_count: number;
  tags: string[];
  average_rating: number;
  profiles: {
    display_name: string | null;
  } | null;
}

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMarketplace, setShowMarketplace] = useState(searchParams.get('view') === 'gallery');
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Reset to landing page when navigating back to home without query params
  useEffect(() => {
    if (searchParams.get('view') !== 'gallery') {
      setShowMarketplace(false);
    }
  }, [searchParams]);

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
        .eq('visibility', 'public')
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
        title: t('toast.error'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('toast.logoutSuccess'),
        description: t('toast.logoutSuccessDesc'),
      });
    }
  };

  const filteredPrompts = prompts
    .filter(prompt => 
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "comments_desc":
          return b.comments_count - a.comments_count;
        case "comments_asc":
          return a.comments_count - b.comments_count;
        case "rating_desc":
          return b.average_rating - a.average_rating;
        case "rating_asc":
          return a.average_rating - b.average_rating;
        case "favorites_desc":
          return b.favorites_count - a.favorites_count;
        case "favorites_asc":
          return a.favorites_count - b.favorites_count;
        case "created_at_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_at_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

  const handlePromptClick = (promptId: string) => {
    setSelectedPromptId(promptId);
    setDialogOpen(true);
  };

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      {!showMarketplace ? (
        /* Hero Section - Landing View */
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div className="mb-8 inline-flex items-center gap-3">
            <div className="rounded-xl bg-gradient-primary p-4 shadow-glow animate-glow">
              <Sparkles className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mb-4 bg-gradient-hero bg-clip-text text-5xl font-bold text-transparent md:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mb-2 text-xl font-semibold text-foreground md:text-2xl">
            {t('hero.subtitle')}
          </p>
          <p className="mx-auto mb-4 max-w-2xl text-lg text-muted-foreground">
            {t('hero.description')}
          </p>
          <p className="mx-auto mb-12 max-w-2xl text-base font-bold bg-gradient-primary bg-clip-text text-transparent">
            Melde dich an, um eigene Prompts zu <span className="text-accent">speichern</span> und die besten Ideen anderer zu <span className="text-accent">favorisieren</span>.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-4 w-full max-w-md px-4">
            <Button
              onClick={() => {
                setShowMarketplace(true);
                setSearchParams({ view: 'gallery' });
              }}
              size="lg"
              className="bg-gradient-primary shadow-glow w-full h-14 text-base"
            >
              <Search className="mr-2 h-5 w-5" />
              {t('btn.discoverPrompts')}
            </Button>
            <Button
              onClick={() => navigate("/prompt-creator")}
              size="lg"
              variant="outline"
              className="w-full h-14 text-base"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {t('btn.generatePrompt')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Gallery View */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-hero bg-clip-text text-4xl font-bold text-transparent">
              {t('nav.gallery')}
            </h1>
          </div>

          {/* Search Bar, Filter & Upload Button */}
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-12 pr-4 border-border/40 bg-card/50 backdrop-blur w-full"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[240px] h-12">
                  <SelectValue placeholder="Sortieren nach..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at_desc">{t('sort.latest')}</SelectItem>
                  <SelectItem value="created_at_asc">{t('sort.oldest')}</SelectItem>
                  <SelectItem value="rating_desc">{t('sort.ratingDesc')}</SelectItem>
                  <SelectItem value="rating_asc">{t('sort.ratingAsc')}</SelectItem>
                  <SelectItem value="favorites_desc">{t('sort.favoritesDesc')}</SelectItem>
                  <SelectItem value="favorites_asc">{t('sort.favoritesAsc')}</SelectItem>
                  <SelectItem value="comments_desc">{t('sort.commentsDesc')}</SelectItem>
                  <SelectItem value="comments_asc">{t('sort.commentsAsc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
              <Button
                onClick={() => {
                  if (!session) {
                    toast({
                      variant: "destructive",
                      title: t('toast.loginRequired'),
                      description: t('toast.loginRequiredDesc'),
                    });
                    navigate("/auth");
                    return;
                  }
                  navigate("/upload");
                }}
                className="bg-gradient-primary shadow-glow w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('btn.uploadPrompt')}
              </Button>
              <Button
                onClick={() => {
                  if (!session) {
                    toast({
                      variant: "destructive",
                      title: t('toast.loginRequired'),
                      description: t('toast.loginRequiredDesc'),
                    });
                    navigate("/auth");
                    return;
                  }
                  navigate("/prompt-creator");
                }}
                variant="outline"
                className="gap-2 w-full"
              >
                <Sparkles className="h-4 w-4" />
                {t('btn.generatePrompt')}
              </Button>
            </div>
          </div>

          {/* Prompts Grid */}
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('loading.prompts')}</p>
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
                    creatorId={prompt.creator_id}
                    createdAt={prompt.created_at}
                    favoritesCount={prompt.favorites_count}
                    commentsCount={prompt.comments_count}
                    tags={prompt.tags}
                    averageRating={prompt.average_rating}
                    onClick={() => handlePromptClick(prompt.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? t('empty.noResults') : t('empty.noPrompts')}
              </p>
            </div>
          )}
        </>
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

export default Index;
