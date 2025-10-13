import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Session } from "@supabase/supabase-js";

interface Prompt {
  id: string;
  title: string;
  image_url: string;
  creator_id: string;
}

const RepairImages = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [brokenPrompts, setBrokenPrompts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        fetchUserPrompts(session.user.id);
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

  const fetchUserPrompts = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prompts')
        .select('id, title, image_url, creator_id')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
      
      // Check which images are broken
      const broken = new Set<string>();
      for (const prompt of (data || [])) {
        const isBroken = await checkImageBroken(prompt.image_url);
        if (isBroken) {
          broken.add(prompt.id);
        }
      }
      setBrokenPrompts(broken);
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

  const checkImageBroken = async (imageUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return !response.ok;
    } catch {
      return true;
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Komprimierung fehlgeschlagen'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (promptId: string, file: File) => {
    if (!session?.user?.id) return;

    setUploadingId(promptId);
    try {
      // Compress image
      const compressedFile = await compressImage(file);
      
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('prompt-images')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('prompt-images')
        .getPublicUrl(fileName);

      // Update prompt in database
      const { error: updateError } = await supabase
        .from('prompts')
        .update({ image_url: publicUrl })
        .eq('id', promptId);

      if (updateError) throw updateError;

      // Update local state
      setPrompts(prompts.map(p => 
        p.id === promptId ? { ...p, image_url: publicUrl } : p
      ));
      setBrokenPrompts(prev => {
        const newSet = new Set(prev);
        newSet.delete(promptId);
        return newSet;
      });

      toast({
        title: "Bild repariert!",
        description: "Das Bild wurde erfolgreich aktualisiert.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler beim Upload",
        description: error.message,
      });
    } finally {
      setUploadingId(null);
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

  const brokenCount = brokenPrompts.size;
  const totalCount = prompts.length;

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      <div className="mx-auto max-w-4xl">
        <Card className="border-border/40 bg-gradient-card backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Bild-Reparatur</CardTitle>
            <CardDescription>
              Lade neue Bilder für defekte Prompts hoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Gefundene Prompts</p>
                      <p className="text-2xl font-bold">{totalCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Defekte Bilder</p>
                      <p className="text-2xl font-bold text-destructive">{brokenCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="text-2xl font-bold text-green-500">
                        {totalCount - brokenCount}
                      </p>
                    </div>
                  </div>
                </div>

                {brokenCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-lg font-medium">Alle Bilder funktionieren!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Keine defekten Bilder gefunden.
                    </p>
                    <Button
                      onClick={() => navigate("/?view=gallery")}
                      className="mt-6"
                    >
                      Zur Galerie
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        Bitte lade für jeden defekten Prompt ein neues Bild hoch
                      </span>
                    </div>
                    
                    {prompts.filter(p => brokenPrompts.has(p.id)).map((prompt) => (
                      <Card key={prompt.id} className="border-border/40">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{prompt.title}</h3>
                              <p className="text-xs text-muted-foreground truncate">
                                {prompt.image_url}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleImageUpload(prompt.id, file);
                                  }
                                }}
                                className="hidden"
                                id={`upload-${prompt.id}`}
                                disabled={uploadingId === prompt.id}
                              />
                              <label htmlFor={`upload-${prompt.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadingId === prompt.id}
                                  asChild
                                >
                                  <span className="cursor-pointer">
                                    {uploadingId === prompt.id ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Lädt...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Neues Bild
                                      </>
                                    )}
                                  </span>
                                </Button>
                              </label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RepairImages;
