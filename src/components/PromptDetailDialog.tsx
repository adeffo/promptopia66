import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, User, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { commentSchema } from "@/lib/validations";
import { z } from "zod";
import { StarRating } from "./StarRating";
import { UserProfileDialog } from "./UserProfileDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  created_at: string;
  profiles: {
    display_name: string | null;
  } | null;
  translatedText?: string;
  isTranslated?: boolean;
}

interface PromptDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string | null;
  userId?: string;
}

export const PromptDetailDialog = ({
  open,
  onOpenChange,
  promptId,
  userId,
}: PromptDetailDialogProps) => {
  const [prompt, setPrompt] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isFavorited, setIsFavorited] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userProfileDialogOpen, setUserProfileDialogOpen] = useState(false);
  const [translatingComments, setTranslatingComments] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { language, t } = useLanguage();

  useEffect(() => {
    if (promptId && open) {
      fetchPromptDetails();
      fetchComments();
      if (userId) {
        checkIfFavorited();
        checkUserRating();
      }
    }
  }, [promptId, open, userId]);

  const fetchPromptDetails = async () => {
    if (!promptId) return;

    try {
      const { data, error } = await supabase
        .from("prompts")
        .select(`
          *,
          profiles:creator_id (display_name)
        `)
        .eq("id", promptId)
        .single();

      if (error) throw error;
      setPrompt(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    }
  };

  const fetchComments = async () => {
    if (!promptId) return;

    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (display_name)
        `)
        .eq("prompt_id", promptId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Kommentare",
        description: error.message,
      });
    }
  };

  const checkIfFavorited = async () => {
    if (!promptId || !userId) return;

    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("prompt_id", promptId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setIsFavorited(!!data);
    } catch (error: any) {
      console.error("Error checking favorite:", error);
    }
  };

  const checkUserRating = async () => {
    if (!promptId || !userId) return;

    try {
      const { data, error } = await supabase
        .from("ratings")
        .select("rating")
        .eq("prompt_id", promptId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setUserRating(data?.rating || 0);
    } catch (error: any) {
      console.error("Error checking rating:", error);
    }
  };

  const handleRating = async (rating: number) => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an, um Prompts zu bewerten.",
      });
      return;
    }

    // Check if user is trying to rate their own prompt
    if (prompt && prompt.creator_id === userId) {
      toast({
        variant: "destructive",
        title: "Nicht erlaubt",
        description: "Du kannst deinen eigenen Prompt nicht bewerten.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("ratings")
        .upsert({
          prompt_id: promptId,
          user_id: userId,
          rating: rating,
        }, {
          onConflict: 'user_id,prompt_id'
        });

      if (error) throw error;

      setUserRating(rating);
      await fetchPromptDetails();

      toast({
        title: "Bewertung gespeichert",
        description: "Deine Bewertung wurde erfolgreich gespeichert.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    }
  };

  const toggleFavorite = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an, um Prompts zu favorisieren.",
      });
      return;
    }

    setLoading(true);
    try {
      if (isFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("prompt_id", promptId)
          .eq("user_id", userId);

        if (error) throw error;
        setIsFavorited(false);
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ prompt_id: promptId, user_id: userId });

        if (error) throw error;
        setIsFavorited(true);
      }
      
      await fetchPromptDetails();
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

  const handleAddComment = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an, um zu kommentieren.",
      });
      return;
    }

    setLoading(true);
    try {
      const validatedData = commentSchema.parse({ text: newComment });

      const { error } = await supabase
        .from("comments")
        .insert({
          prompt_id: promptId,
          user_id: userId,
          text: validatedData.text,
        });

      if (error) throw error;

      // Create notification for prompt creator
      if (prompt && prompt.creator_id !== userId) {
        const { data: commenterProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single();

        await supabase.from("notifications").insert({
          user_id: prompt.creator_id,
          type: "comment",
          payload: {
            prompt_id: promptId,
            commenter_name: commenterProfile?.display_name || "Jemand",
            prompt_title: prompt.title,
          },
        });
      }

      setNewComment("");
      await fetchComments();
      await fetchPromptDetails();
      
      toast({
        title: "Kommentar hinzugefügt",
        description: "Dein Kommentar wurde erfolgreich gepostet.",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validierungsfehler",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyPromptText = () => {
    if (prompt?.prompt_text) {
      navigator.clipboard.writeText(prompt.prompt_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Kopiert!",
        description: "Prompt-Text wurde in die Zwischenablage kopiert.",
      });
    }
  };

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{prompt.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={prompt.image_url}
              alt={`${prompt.title} – Prompt Referenzbild`}
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== '/placeholder.svg') {
                  target.src = '/placeholder.svg';
                }
              }}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Creator & Stats */}
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUserProfileDialogOpen(true);
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {prompt.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-medium hover:underline">{prompt.profiles?.display_name || "Unbekannt"}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(prompt.created_at), {
                    addSuffix: true,
                    locale: de,
                  })}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFavorite}
                disabled={loading}
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${
                    isFavorited ? "fill-accent text-accent" : ""
                  }`}
                />
                {prompt.favorites_count}
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                {prompt.comments_count}
              </div>
            </div>
          </div>

          {/* Rating Section */}
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Durchschnittsbewertung</p>
              <div className="flex items-center gap-2">
                <StarRating rating={prompt.average_rating || 0} size={18} />
                <span className="text-sm text-muted-foreground">
                  ({prompt.ratings_count || 0} {prompt.ratings_count === 1 ? "Bewertung" : "Bewertungen"})
                </span>
              </div>
            </div>
            {userId && prompt.creator_id !== userId && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Deine Bewertung</p>
                <StarRating
                  rating={userRating}
                  size={18}
                  interactive={true}
                  onRatingChange={handleRating}
                />
              </div>
            )}
          </div>

          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prompt.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Model & Difficulty */}
          <div className="flex gap-4 text-sm">
            {prompt.model_used && (
              <div>
                <span className="text-muted-foreground">Modell: </span>
                <span className="font-medium capitalize">{prompt.model_used}</span>
              </div>
            )}
            {prompt.difficulty && (
              <div>
                <span className="text-muted-foreground">Schwierigkeit: </span>
                <span className="font-medium capitalize">{prompt.difficulty}</span>
              </div>
            )}
          </div>

          {/* Prompt Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Prompt Text</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPromptText}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="whitespace-pre-wrap text-sm">{prompt.prompt_text}</p>
            </div>
          </div>

          <Separator />

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              Kommentare ({comments.length})
            </h3>

            {userId && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Schreibe einen Kommentar..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={loading}
                  maxLength={1000}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  className="bg-gradient-primary"
                >
                  Kommentieren
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted">
                      {comment.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {comment.profiles?.display_name || "Unbekannt"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {comments.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Noch keine Kommentare. Sei der Erste!
              </p>
            )}
          </div>
        </div>
      </DialogContent>

      <UserProfileDialog
        userId={prompt?.creator_id || null}
        open={userProfileDialogOpen}
        onOpenChange={setUserProfileDialogOpen}
      />
    </Dialog>
  );
};
