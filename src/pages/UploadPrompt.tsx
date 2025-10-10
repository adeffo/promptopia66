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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Datei zu groß",
          description: "Bitte wähle ein Bild unter 5MB.",
        });
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
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const { error: insertError } = await supabase
        .from('prompts')
        .insert({
          title,
          prompt_text: promptText,
          image_url: publicUrl,
          creator_id: session.user.id,
          tags: tagsArray,
          model_used: modelUsed || null,
          difficulty: difficulty || null,
        });

      if (insertError) throw insertError;

      toast({
        title: "Prompt hochgeladen!",
        description: "Dein Prompt wurde erfolgreich erstellt.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler beim Upload",
        description: error.message,
      });
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
                  required
                  disabled={loading}
                />
              </div>

              {/* Prompt Text */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt Text *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Dein detaillierter KI-Prompt..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  required
                  disabled={loading}
                  rows={6}
                  className="resize-none"
                />
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
                  Trenne mehrere Tags mit Kommas
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
