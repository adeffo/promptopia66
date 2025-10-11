import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Copy, Sparkles, Loader2 } from "lucide-react";

export default function PromptExtractor() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [extractedPrompt, setExtractedPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [detailLevel, setDetailLevel] = useState([50]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Ungültiges Dateiformat",
        description: "Bitte nur .jpg, .png oder .webp Dateien hochladen.",
      });
      return;
    }

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Datei zu groß",
        description: "Die Datei darf maximal 10 MB groß sein.",
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractPrompt = async () => {
    if (!selectedImage) return;

    setLoading(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const { data, error } = await supabase.functions.invoke("extract-prompt", {
          body: {
            image: base64Image,
            language,
            detailLevel: detailLevel[0],
          },
        });

        if (error) throw error;

        setExtractedPrompt(data.prompt);
        toast({
          title: "Prompt erfolgreich extrahiert",
          description: "Der Prompt wurde aus dem Bild generiert.",
        });
      };
    } catch (error) {
      console.error("Error extracting prompt:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Analyse nicht möglich. Bitte versuche es erneut.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(extractedPrompt);
    toast({
      title: "Kopiert",
      description: "Der Prompt wurde in die Zwischenablage kopiert.",
    });
  };

  const handleOpenInCreator = () => {
    // Store prompt in sessionStorage to pass to PromptCreator
    sessionStorage.setItem("extractedPrompt", extractedPrompt);
    navigate("/prompt-creator");
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Prompt Extrahieren
          </h1>
          <p className="text-muted-foreground">
            Lade ein Bild hoch und erhalte einen detaillierten Prompt, der das Bild beschreibt
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image-upload">Bild hochladen</Label>
              <div className="flex items-center gap-4">
                <input
                  id="image-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("image-upload")?.click()}
                  className="w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Bild auswählen
                </Button>
                {selectedImage && (
                  <span className="text-sm text-muted-foreground truncate">
                    {selectedImage.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Max. 10 MB • .jpg, .png oder .webp
              </p>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            )}

            {/* Settings */}
            {selectedImage && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sprache</Label>
                    <Select value={language} onValueChange={(val) => setLanguage(val as "de" | "en")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="en">Englisch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prompt-Länge</Label>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">Kompakt</span>
                      <Slider
                        value={detailLevel}
                        onValueChange={setDetailLevel}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">Detailliert</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleExtractPrompt}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analysiere Bild...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Prompt bitte
                    </>
                  )}
                </Button>

                {loading && (
                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Dein Bild wird analysiert... Dies kann bis zu 30 Sekunden dauern.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Extracted Prompt */}
            {extractedPrompt && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Extrahierter Prompt</Label>
                  <Textarea
                    value={extractedPrompt}
                    onChange={(e) => setExtractedPrompt(e.target.value)}
                    className="min-h-32"
                    placeholder="Der generierte Prompt erscheint hier..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={handleCopyPrompt} className="flex-1">
                    <Copy className="h-4 w-4 mr-2" />
                    Kopieren
                  </Button>
                  <Button variant="outline" onClick={handleOpenInCreator} className="flex-1">
                    Im Creator öffnen
                  </Button>
                  <Button
                    onClick={() => {
                      sessionStorage.setItem("uploadPromptText", extractedPrompt);
                      sessionStorage.setItem("uploadPromptImage", imagePreview);
                      navigate("/upload");
                    }}
                    className="flex-1"
                  >
                    Als Prompt speichern
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
