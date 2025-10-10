import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { promptSchema } from "@/lib/validations";
import { z } from "zod";

const UploadPrompt = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [modelUsed, setModelUsed] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags, setTags] = useState("");
  const [genre, setGenre] = useState("");
  const [autoCompleting, setAutoCompleting] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Abgemeldet",
      description: "Du wurdest erfolgreich abgemeldet.",
    });
    navigate("/");
  };

  const validateImageFile = (file: File): boolean => {
    // Check MIME type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return false;
    }
    
    // Check file extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(extension)) {
      return false;
    }
    
    return true;
  };

  const handleAutocomplete = async () => {
    if (!promptText || promptText.length < 10) {
      toast({
        variant: "destructive",
        title: "Prompt-Text zu kurz",
        description: "Bitte gib mindestens 10 Zeichen ein, um Autocomplete zu verwenden.",
      });
      return;
    }

    setAutoCompleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('autocomplete-prompt', {
        body: { promptText, title }
      });

      if (error) throw error;

      if (data?.tags && Array.isArray(data.tags)) {
        setTags(data.tags.join(', '));
      }
      if (data?.genre) {
        setGenre(data.genre);
      }

      toast({
        title: "Autocomplete erfolgreich",
        description: "Tags und Genre wurden generiert!",
      });
    } catch (error: any) {
      console.error('Autocomplete error:', error);
      toast({
        variant: "destructive",
        title: "Autocomplete fehlgeschlagen",
        description: error.message || "Konnte keine Vorschläge generieren.",
      });
    } finally {
      setAutoCompleting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!validateImageFile(file)) {
        toast({
          variant: "destructive",
          title: "Ungültiger Dateityp",
          description: "Bitte lade nur Bilddateien hoch (JPG, PNG, GIF, WebP).",
        });
        e.target.value = '';
        return;
      }

      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Datei zu groß",
          description: "Bitte wähle ein Bild unter 5MB.",
        });
        e.target.value = '';
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Nicht angemeldet",
        description: "Bitte melde dich an, um einen Prompt hochzuladen.",
      });
      return;
    }

    if (!imageFile) {
      toast({
        variant: "destructive",
        title: "Bild fehlt",
        description: "Bitte wähle ein Referenzbild aus.",
      });
      return;
    }

    setLoading(true);

    try {
      // Validate input data
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const validatedData = promptSchema.parse({
        title,
        prompt_text: promptText,
        tags: tagsArray,
        model_used: modelUsed || undefined,
        difficulty: difficulty || undefined,
      });

      // Check if user has a profile, create if not
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileCheckError) {
        console.error('Profile check error:', profileCheckError);
      }

      // If no profile exists, create one
      if (!profileData) {
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert({ 
            id: session.user.id,
            display_name: session.user.email?.split('@')[0] || 'Benutzer'
          });
        
        if (profileCreateError) {
          console.error('Profile creation error:', profileCreateError);
        }
      }

      // Upload image to storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('prompt-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('prompt-images')
        .getPublicUrl(fileName);

      // Insert prompt into database
      const { error: insertError } = await supabase
        .from('prompts')
        .insert({
          title: validatedData.title,
          prompt_text: validatedData.prompt_text,
          image_url: publicUrl,
          creator_id: session.user.id,
          tags: validatedData.tags,
          model_used: validatedData.model_used,
          difficulty: validatedData.difficulty,
          genre: genre || undefined,
        });

      if (insertError) throw insertError;

      toast({
        title: "Prompt hochgeladen!",
        description: "Dein Prompt wurde erfolgreich erstellt.",
      });

      navigate("/");
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
          title: "Fehler beim Upload",
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      <div className="mx-auto max-w-3xl">
        <Card className="border-border/40 bg-gradient-card backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">Neuen Prompt hochladen</CardTitle>
            <CardDescription>
              Teile deinen KI-Prompt mit der Community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image">Referenzbild *</Label>
                <div className="flex flex-col gap-4">
                  {imagePreview ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-border/40">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-border/40 bg-muted/20">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Bild hochladen (max. 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  placeholder="Z.B. Futuristic Cyberpunk City"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                  disabled={loading}
                />
              </div>

              {/* Prompt Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt">Prompt Text *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutocomplete}
                    disabled={loading || autoCompleting || !promptText}
                    className="text-xs"
                  >
                    {autoCompleting ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Generiere...
                      </>
                    ) : (
                      "KI Autocomplete"
                    )}
                  </Button>
                </div>
                <Textarea
                  id="prompt"
                  placeholder="Dein detaillierter KI-Prompt..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  maxLength={5000}
                  required
                  disabled={loading}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Nutze den KI Autocomplete Button, um automatisch Tags und Genre zu generieren
                </p>
              </div>

              {/* Model Used */}
              <div className="space-y-2">
                <Label htmlFor="model">Verwendetes Modell (optional)</Label>
                <Select value={modelUsed} onValueChange={setModelUsed} disabled={loading}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Modell auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="midjourney">Midjourney</SelectItem>
                    <SelectItem value="dall-e">DALL-E</SelectItem>
                    <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                    <SelectItem value="copilot">Copilot</SelectItem>
                    <SelectItem value="grok">Grok</SelectItem>
                    <SelectItem value="other">Andere</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label htmlFor="difficulty">Schwierigkeitsgrad (optional)</Label>
                <Select value={difficulty} onValueChange={setDifficulty} disabled={loading}>
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Schwierigkeit auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Anfänger</SelectItem>
                    <SelectItem value="intermediate">Fortgeschritten</SelectItem>
                    <SelectItem value="advanced">Experte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Genre */}
              <div className="space-y-2">
                <Label htmlFor="genre">Genre (optional)</Label>
                <Input
                  id="genre"
                  placeholder="z.B. Cyberpunk, Fantasy, Sci-Fi..."
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (optional)</Label>
                <Input
                  id="tags"
                  placeholder="Cyberpunk, Neon, City (durch Komma getrennt)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Trenne mehrere Tags mit Kommas (max. 10 Tags)
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-primary shadow-glow"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird hochgeladen...
                  </>
                ) : (
                  "Prompt hochladen"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UploadPrompt;
