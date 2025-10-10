import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Copy, Send } from "lucide-react";

interface PromptData {
  mainScene: string;
  style: string;
  lighting: string;
  cameraType: string;
  lens: string;
  cameraPosition: string;
  composition: string;
  environment: string;
  colorPalette: string;
  details: string;
  negativePrompt: string;
  recommendedModel: string;
  aspectRatio: string;
}

const PromptCreator = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [promptData, setPromptData] = useState<PromptData | null>(null);
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleOptimize = async () => {
    if (!idea.trim()) {
      toast({
        title: "Eingabe erforderlich",
        description: "Bitte geben Sie Ihre Idee ein.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-prompt", {
        body: { idea },
      });

      if (error) throw error;

      setPromptData(data);
      toast({
        title: "Prompt optimiert!",
        description: "Ihr professioneller Prompt wurde erstellt.",
      });
    } catch (error: any) {
      console.error("Error optimizing prompt:", error);
      toast({
        title: "Fehler",
        description: error.message || "Prompt konnte nicht optimiert werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    if (!promptData) return;
    
    const fullPrompt = `${promptData.mainScene}
Style: ${promptData.style}
Lighting: ${promptData.lighting}
Camera: ${promptData.cameraType}, ${promptData.lens}
Position: ${promptData.cameraPosition}
Composition: ${promptData.composition}
Environment: ${promptData.environment}
Colors: ${promptData.colorPalette}
Details: ${promptData.details}

Negative Prompt: ${promptData.negativePrompt}

Empfohlenes Modell: ${promptData.recommendedModel}
Seitenverhältnis: ${promptData.aspectRatio}`;

    navigator.clipboard.writeText(fullPrompt);
    toast({
      title: "Kopiert!",
      description: "Der vollständige Prompt wurde in die Zwischenablage kopiert.",
    });
  };

  const handleUseInUpload = () => {
    if (!promptData) return;
    // TODO: Implement passing data to upload page
    navigate("/upload");
  };

  const sectionDescriptions = {
    mainScene: "Die zentrale Szene oder das Hauptmotiv Ihres Bildes",
    style: "Visueller Stil und Atmosphäre (z.B. cinematic, watercolor, cyberpunk)",
    lighting: "Lichtbedingungen wie golden hour, volumetric light, soft light",
    cameraType: "Kameratyp: DSLR, Mirrorless, Film Camera, etc.",
    lens: "Objektiv und Brennweite (z.B. 85mm f/1.4 – geringe Tiefenschärfe)",
    cameraPosition: "Kameraperspektive: eye level, aerial, macro, low angle",
    composition: "Bildkomposition: Regel der Drittel, leading lines, symmetry",
    environment: "Schauplatz: cityscape, forest, desert, underwater",
    colorPalette: "Farbschema: neon, monochrome, pastel, warm tones",
    details: "Zusätzliche Details: Texturen, Kleidung, Materialien, Bewegung",
    negativePrompt: "Was vermieden werden soll (Fehlerquellen)",
    recommendedModel: "Empfohlenes AI-Modell für beste Ergebnisse",
    aspectRatio: "Seitenverhältnis und Auflösung",
  };

  if (!session) {
    return null;
  }

  return (
    <Layout user={session.user} onLogout={handleLogout}>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <CardTitle>AI Prompt Creator</CardTitle>
            </div>
            <CardDescription>
              Verwandeln Sie Ihre einfache Idee in einen professionellen, strukturierten Bildprompt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Section */}
            <div className="space-y-2">
              <Label htmlFor="idea">Ihre Idee</Label>
              <Textarea
                id="idea"
                placeholder="Beschreiben Sie Ihre Bildidee... (z.B. 'Ein Astronaut sitzt auf einem Berg und schaut auf einen Sonnenuntergang')"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleOptimize}
              disabled={loading || !idea.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Prompt wird optimiert...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Prompt optimieren
                </>
              )}
            </Button>

            {/* Results Section */}
            {promptData && (
              <div className="space-y-4 mt-8 pt-8 border-t">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Optimierter Prompt</h3>
                  <div className="flex gap-2">
                    <Button onClick={handleCopyAll} variant="outline" size="sm">
                      <Copy className="mr-2 h-4 w-4" />
                      Alles kopieren
                    </Button>
                    <Button onClick={handleUseInUpload} size="sm">
                      <Send className="mr-2 h-4 w-4" />
                      Zum Upload verwenden
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="accordion" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="accordion">Bearbeitbare Sektionen</TabsTrigger>
                    <TabsTrigger value="preview">Vorschau</TabsTrigger>
                  </TabsList>

                  <TabsContent value="accordion" className="space-y-2">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="mainScene">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Main Scene / Concept</div>
                            <div className="text-xs text-muted-foreground">{sectionDescriptions.mainScene}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            value={promptData.mainScene}
                            onChange={(e) => setPromptData({ ...promptData, mainScene: e.target.value })}
                            rows={3}
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="style">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Style & Mood</div>
                            <div className="text-xs text-muted-foreground">{sectionDescriptions.style}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            value={promptData.style}
                            onChange={(e) => setPromptData({ ...promptData, style: e.target.value })}
                            rows={2}
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="lighting">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Lighting</div>
                            <div className="text-xs text-muted-foreground">{sectionDescriptions.lighting}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            value={promptData.lighting}
                            onChange={(e) => setPromptData({ ...promptData, lighting: e.target.value })}
                            rows={2}
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="camera">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Camera Setup</div>
                            <div className="text-xs text-muted-foreground">Kameratyp, Objektiv und Perspektive</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          <div>
                            <Label>Kameratyp</Label>
                            <Textarea
                              value={promptData.cameraType}
                              onChange={(e) => setPromptData({ ...promptData, cameraType: e.target.value })}
                              rows={1}
                            />
                          </div>
                          <div>
                            <Label>Objektiv & Brennweite</Label>
                            <Textarea
                              value={promptData.lens}
                              onChange={(e) => setPromptData({ ...promptData, lens: e.target.value })}
                              rows={1}
                            />
                          </div>
                          <div>
                            <Label>Kameraperspektive</Label>
                            <Textarea
                              value={promptData.cameraPosition}
                              onChange={(e) => setPromptData({ ...promptData, cameraPosition: e.target.value })}
                              rows={1}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="composition">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Composition</div>
                            <div className="text-xs text-muted-foreground">{sectionDescriptions.composition}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            value={promptData.composition}
                            onChange={(e) => setPromptData({ ...promptData, composition: e.target.value })}
                            rows={2}
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="environment">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Environment & Background</div>
                            <div className="text-xs text-muted-foreground">{sectionDescriptions.environment}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            value={promptData.environment}
                            onChange={(e) => setPromptData({ ...promptData, environment: e.target.value })}
                            rows={2}
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="colors">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Color Palette</div>
                            <div className="text-xs text-muted-foreground">{sectionDescriptions.colorPalette}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            value={promptData.colorPalette}
                            onChange={(e) => setPromptData({ ...promptData, colorPalette: e.target.value })}
                            rows={2}
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="details">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Details & Enhancements</div>
                            <div className="text-xs text-muted-foreground">{sectionDescriptions.details}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            value={promptData.details}
                            onChange={(e) => setPromptData({ ...promptData, details: e.target.value })}
                            rows={3}
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="negative" className="border-destructive/20">
                        <AccordionTrigger className="text-left text-destructive">
                          <div>
                            <div className="font-semibold">Negative Prompt</div>
                            <div className="text-xs text-muted-foreground">{sectionDescriptions.negativePrompt}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            value={promptData.negativePrompt}
                            onChange={(e) => setPromptData({ ...promptData, negativePrompt: e.target.value })}
                            rows={2}
                            className="border-destructive/50"
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="technical">
                        <AccordionTrigger className="text-left">
                          <div>
                            <div className="font-semibold">Technical Settings</div>
                            <div className="text-xs text-muted-foreground">Modell und Auflösung</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          <div>
                            <Label>Empfohlenes Modell</Label>
                            <Textarea
                              value={promptData.recommendedModel}
                              onChange={(e) => setPromptData({ ...promptData, recommendedModel: e.target.value })}
                              rows={1}
                            />
                          </div>
                          <div>
                            <Label>Seitenverhältnis / Auflösung</Label>
                            <Textarea
                              value={promptData.aspectRatio}
                              onChange={(e) => setPromptData({ ...promptData, aspectRatio: e.target.value })}
                              rows={1}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </TabsContent>

                  <TabsContent value="preview">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4 text-sm">
                          <div>
                            <h4 className="font-semibold text-primary mb-1">Main Scene:</h4>
                            <p className="text-muted-foreground">{promptData.mainScene}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-primary mb-1">Style:</h4>
                              <p className="text-muted-foreground">{promptData.style}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-primary mb-1">Lighting:</h4>
                              <p className="text-muted-foreground">{promptData.lighting}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <h4 className="font-semibold text-primary mb-1">Camera:</h4>
                              <p className="text-muted-foreground">{promptData.cameraType}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-primary mb-1">Lens:</h4>
                              <p className="text-muted-foreground">{promptData.lens}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-primary mb-1">Position:</h4>
                              <p className="text-muted-foreground">{promptData.cameraPosition}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-primary mb-1">Composition:</h4>
                            <p className="text-muted-foreground">{promptData.composition}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-primary mb-1">Environment:</h4>
                            <p className="text-muted-foreground">{promptData.environment}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-primary mb-1">Colors:</h4>
                            <p className="text-muted-foreground">{promptData.colorPalette}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-primary mb-1">Details:</h4>
                            <p className="text-muted-foreground">{promptData.details}</p>
                          </div>
                          <div className="pt-4 border-t border-destructive/20">
                            <h4 className="font-semibold text-destructive mb-1">Negative Prompt:</h4>
                            <p className="text-muted-foreground">{promptData.negativePrompt}</p>
                          </div>
                          <div className="pt-4 border-t">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-primary mb-1">Model:</h4>
                                <p className="text-muted-foreground">{promptData.recommendedModel}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-primary mb-1">Aspect Ratio:</h4>
                                <p className="text-muted-foreground">{promptData.aspectRatio}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PromptCreator;
