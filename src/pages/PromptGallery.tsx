import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PromptCard } from "@/components/PromptCard";
import { PromptDetailDialog } from "@/components/PromptDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, Sparkles, Plus, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

interface UserFavorites {
  [promptId: string]: boolean;
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
  const [showMarketplace, setShowMarketplace] = useState(searchParams.get("view") === "gallery");
  const [currentPage, setCurrentPage] = useState(1);
  const [userFavorites, setUserFavorites] = useState<UserFavorites>({});
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const PROMPTS_PER_PAGE = 10;
  const GUEST_LIMIT = 5;

  // Reset to landing page when navigating back to home without query params
  useEffect(() => {
    if (searchParams.get("view") !== "gallery") {
      setShowMarketplace(false);
    }
  }, [searchParams]);

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserFavorites();
    }
  }, [session?.user?.id, prompts]);

  const fetchUserFavorites = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase.from("favorites").select("prompt_id").eq("user_id", session.user.id);

      if (error) throw error;

      const favoritesMap: UserFavorites = {};
      data?.forEach((fav) => {
        favoritesMap[fav.prompt_id] = true;
      });
      setUserFavorites(favoritesMap);
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
    }
  };

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prompts")
        .select(
          `
          *,
          profiles:creator_id (display_name)
        `,
        )
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

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
        title: t("toast.error"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("toast.logoutSuccess"),
        description: t("toast.logoutSuccessDesc"),
      });
    }
  };

  const filteredPrompts = prompts
    .filter(
      (prompt) =>
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "comments_desc":
          return b.comments_count - a.comments_count;
        case "comments_asc":
          return a.comments_count - b.comments_count;
        case "likes_desc":
          return b.likes_count - a.likes_count;
        case "likes_asc":
          return a.likes_count - b.likes_count;
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

  // Pagination logic
  const isGuest = !session;
  const displayLimit = isGuest ? GUEST_LIMIT : filteredPrompts.length;
  const totalPages = isGuest ? 1 : Math.ceil(filteredPrompts.length / PROMPTS_PER_PAGE);
  const startIndex = isGuest ? 0 : (currentPage - 1) * PROMPTS_PER_PAGE;
  const endIndex = isGuest ? GUEST_LIMIT : startIndex + PROMPTS_PER_PAGE;
  const displayedPrompts = filteredPrompts.slice(startIndex, endIndex);

  const handlePromptClick = (promptId: string) => {
    setSelectedPromptId(promptId);
    setDialogOpen(true);
  };

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      {
        <>
          {/* Gallery View */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-hero bg-clip-text text-4xl font-bold text-transparent">
              {t("nav.gallery")}
            </h1>
          </div>

          {/* Search Bar, Filter & Upload Button */}
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("search.placeholder")}
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
                  <SelectItem value="created_at_desc">{t("sort.latest")}</SelectItem>
                  <SelectItem value="created_at_asc">{t("sort.oldest")}</SelectItem>
                  <SelectItem value="likes_desc">Meiste Likes</SelectItem>
                  <SelectItem value="likes_asc">Wenigste Likes</SelectItem>
                  <SelectItem value="favorites_desc">{t("sort.favoritesDesc")}</SelectItem>
                  <SelectItem value="favorites_asc">{t("sort.favoritesAsc")}</SelectItem>
                  <SelectItem value="comments_desc">{t("sort.commentsDesc")}</SelectItem>
                  <SelectItem value="comments_asc">{t("sort.commentsAsc")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
              <Button
                onClick={() => {
                  if (!session) {
                    toast({
                      variant: "destructive",
                      title: t("toast.loginRequired"),
                      description: t("toast.loginRequiredDesc"),
                    });
                    navigate("/auth");
                    return;
                  }
                  navigate("/upload");
                }}
                className="bg-gradient-primary shadow-glow w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("btn.uploadPrompt")}
              </Button>
              <Button
                onClick={() => {
                  if (!session) {
                    toast({
                      variant: "destructive",
                      title: t("toast.loginRequired"),
                      description: t("toast.loginRequiredDesc"),
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
                {t("btn.generatePrompt")}
              </Button>
            </div>
          </div>

          {/* Prompts Grid */}
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t("loading.prompts")}</p>
            </div>
          ) : filteredPrompts.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedPrompts.map((prompt) => (
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
                      isFavorited={userFavorites[prompt.id]}
                      onClick={() => handlePromptClick(prompt.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Guest Login Prompt */}
              {isGuest && filteredPrompts.length > GUEST_LIMIT && (
                <div className="mt-8 text-center py-8 border-t border-border/40">
                  <p className="text-lg font-semibold text-muted-foreground mb-4">Mehr Prompts nach dem Login</p>
                  <Button onClick={() => navigate("/auth")} className="bg-gradient-primary shadow-glow">
                    Jetzt anmelden
                  </Button>
                </div>
              )}

              {/* Pagination for logged-in users */}
              {!isGuest && totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Zurück
                        </Button>
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="gap-1"
                        >
                          Weiter
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{searchQuery ? t("empty.noResults") : t("empty.noPrompts")}</p>
            </div>
          )}
        </>
      }

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
