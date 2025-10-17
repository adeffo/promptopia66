import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, Star, MessageCircle, Copy, Check, Edit2, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { commentSchema, promptSchema } from "@/lib/validations";
import { z } from "zod";
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
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userProfileDialogOpen, setUserProfileDialogOpen] = useState(false);
  const [translatingComments, setTranslatingComments] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPromptText, setEditPromptText] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [personalizedPrompt, setPersonalizedPrompt] = useState<string | null>(null);
  const [personalizing, setPersonalizing] = useState(false);
  const [extractedCharacteristics, setExtractedCharacteristics] = useState<any>(null);
  const [showCharacteristics, setShowCharacteristics] = useState(false);
  const [editableCharacteristics, setEditableCharacteristics] = useState<any>({});
  const { toast } = useToast();
  const { language, t } = useLanguage();

  useEffect(() => {
    if (promptId && open) {
      fetchPromptDetails();
      fetchComments();
      if (userId) {
        checkIfLiked();
        checkIfFavorited();
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

  const checkIfLiked = async () => {
    if (!promptId || !userId) return;

    try {
      const { data, error } = await supabase
        .from("likes")
        .select("id")
        .eq("prompt_id", promptId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setIsLiked(!!data);
    } catch (error: any) {
      console.error("Error checking like:", error);
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

  const toggleLike = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an, um Prompts zu liken.",
      });
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("prompt_id", promptId)
          .eq("user_id", userId);

        if (error) throw error;
        setIsLiked(false);
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ prompt_id: promptId, user_id: userId });

        if (error) throw error;
        setIsLiked(true);
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

  const copyPromptText = (text?: string) => {
    const textToCopy = text || prompt?.prompt_text;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Kopiert!",
        description: "Prompt-Text wurde in die Zwischenablage kopiert.",
      });
    }
  };

  const handleExtractCharacteristics = async () => {
    if (!prompt || !userId) return;

    setPersonalizing(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gender, photo_url_1, photo_url_2, photo_url_3')
        .eq('id', userId)
        .single();

      const hasPhotos = !!(profile?.photo_url_1 || profile?.photo_url_2 || profile?.photo_url_3);

      const { data, error } = await supabase.functions.invoke('personalize-prompt', {
        body: {
          action: 'extract',
          promptText: prompt.prompt_text,
          gender: profile?.gender || 'prefer_not_to_say',
          hasPhotos
        }
      });

      if (error) throw error;

      let characteristics = {};
      try {
        const cleanedContent = data.characteristics.replace(/```json\n?|\n?```/g, '').trim();
        characteristics = JSON.parse(cleanedContent);
      } catch (e) {
        characteristics = {};
      }

      setExtractedCharacteristics(characteristics);
      setEditableCharacteristics(characteristics);
      setShowCharacteristics(true);
      
      toast({
        title: "Merkmale erkannt",
        description: "Bitte überprüfe und passe die erkannten Merkmale an.",
      });
    } catch (error: any) {
      console.error('Error extracting characteristics:', error);
      toast({
        title: "Fehler",
        description: "Die Merkmale konnten nicht extrahiert werden.",
        variant: "destructive",
      });
    } finally {
      setPersonalizing(false);
    }
  };

  const handlePersonalizeWithCharacteristics = async () => {
    if (!prompt || !userId) return;

    setPersonalizing(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gender, photo_url_1, photo_url_2, photo_url_3')
        .eq('id', userId)
        .single();

      const hasPhotos = !!(profile?.photo_url_1 || profile?.photo_url_2 || profile?.photo_url_3);

      const { data, error } = await supabase.functions.invoke('personalize-prompt', {
        body: {
          action: 'personalize',
          promptText: prompt.prompt_text,
          gender: profile?.gender || 'prefer_not_to_say',
          hasPhotos,
          characteristics: editableCharacteristics
        }
      });

      if (error) throw error;

      setPersonalizedPrompt(data.personalizedPrompt);
      setShowCharacteristics(false);
      
      toast({
        title: "Prompt personalisiert",
        description: "Der Prompt wurde erfolgreich an deine Merkmale angepasst.",
      });
    } catch (error: any) {
      console.error('Error personalizing prompt:', error);
      toast({
        title: "Fehler",
        description: "Der Prompt konnte nicht personalisiert werden.",
        variant: "destructive",
      });
    } finally {
      setPersonalizing(false);
    }
  };

  const handleCharacteristicChange = (key: string, value: string) => {
    setEditableCharacteristics(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditTitle(prompt?.title || "");
      setEditPromptText(prompt?.prompt_text || "");
      setEditImagePreview(prompt?.image_url || "");
      setEditImageFile(null);
    }
    setIsEditing(!isEditing);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Datei zu groß",
          description: "Bitte wähle ein Bild unter 10MB.",
        });
        return;
      }
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePrompt = async () => {
    if (!userId || !promptId) return;

    setLoading(true);
    try {
      const validatedData = promptSchema.parse({
        title: editTitle,
        prompt_text: editPromptText,
        tags: prompt?.tags || [],
        model_used: prompt?.model_used || undefined,
        difficulty: prompt?.difficulty || undefined,
      });

      let imageUrl = prompt?.image_url;

      // Upload new image if selected
      if (editImageFile) {
        const fileExt = editImageFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('prompt-images')
          .upload(fileName, editImageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('prompt-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('prompts')
        .update({
          title: validatedData.title,
          prompt_text: validatedData.prompt_text,
          image_url: imageUrl,
        })
        .eq('id', promptId)
        .eq('creator_id', userId);

      if (error) throw error;

      await fetchPromptDetails();
      setIsEditing(false);
      
      toast({
        title: "Prompt aktualisiert",
        description: "Deine Änderungen wurden gespeichert.",
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

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{prompt.title}</DialogTitle>
            {userId && prompt.creator_id === userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditToggle}
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Abbrechen
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            <>
              {/* Edit Mode */}
              <div className="space-y-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Bild</Label>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-border/40">
                    <img
                      src={editImagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Titel</Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={100}
                    disabled={loading}
                  />
                </div>

                {/* Prompt Text */}
                <div className="space-y-2">
                  <Label htmlFor="edit-prompt">Prompt Text</Label>
                  <Textarea
                    id="edit-prompt"
                    value={editPromptText}
                    onChange={(e) => setEditPromptText(e.target.value)}
                    maxLength={5000}
                    disabled={loading}
                    rows={8}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdatePrompt}
                    disabled={loading}
                    className="bg-gradient-primary"
                  >
                    Änderungen speichern
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEditToggle}
                    disabled={loading}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
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
                onClick={toggleLike}
                disabled={loading}
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${
                    isLiked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                {prompt.likes_count}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFavorite}
                disabled={loading}
              >
                <Star
                  className={`mr-2 h-4 w-4 ${
                    isFavorited ? "fill-yellow-400 text-yellow-400" : ""
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
              <div className="flex gap-2">
                {userId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtractCharacteristics}
                    disabled={personalizing}
                  >
                    {personalizing ? "Wird analysiert..." : "An mir testen"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyPromptText()}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="whitespace-pre-wrap text-sm">{prompt.prompt_text}</p>
            </div>
          </div>

          {/* Extracted Characteristics Form */}
          {showCharacteristics && extractedCharacteristics && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-primary">Erkannte persönliche Merkmale</h3>
                <Button
                  onClick={handlePersonalizeWithCharacteristics}
                  disabled={personalizing}
                  size="sm"
                >
                  {personalizing ? "Wird angepasst..." : "Prompt personalisieren"}
                </Button>
              </div>
              <div className="rounded-lg bg-primary/10 p-4 border border-primary/20 space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Bitte überprüfe die erkannten Merkmale und passe sie bei Bedarf an:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(editableCharacteristics).map(([key, value]) => {
                    const labels: { [key: string]: string } = {
                      gender: 'Geschlecht',
                      hairColor: 'Haarfarbe',
                      hairLength: 'Haarlänge',
                      eyeColor: 'Augenfarbe',
                      age: 'Alter',
                      bodyType: 'Körperbau',
                      skinTone: 'Hautfarbe',
                      other: 'Weitere Merkmale'
                    };
                    return (
                      <div key={key} className="space-y-1">
                        <label className="text-sm font-medium">{labels[key] || key}</label>
                        <Input
                          value={value as string}
                          onChange={(e) => handleCharacteristicChange(key, e.target.value)}
                          className="bg-background"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

            {/* Personalized Prompt */}
            {personalizedPrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-primary">Personalisierter Prompt (für dich)</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPromptText(personalizedPrompt)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
                  <p className="whitespace-pre-wrap text-sm">{personalizedPrompt}</p>
                </div>
              </div>
            )}

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
            </>
          )}
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
