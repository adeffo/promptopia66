import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Upload, Download, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

type EnhancementMode = "quality" | "background";

export default function ImageEnhancer() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementMode, setEnhancementMode] = useState<EnhancementMode>("quality");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (!user) {
        toast.error("Bitte melden Sie sich an, um die Bild-Verbesserung zu nutzen");
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wählen Sie eine Bilddatei aus");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setOriginalImage(event.target?.result as string);
      setEnhancedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const enhanceImage = async () => {
    if (!user) {
      toast.error("Bitte melden Sie sich an, um die Bild-Verbesserung zu nutzen");
      navigate("/auth");
      return;
    }

    if (!originalImage) {
      toast.error("Bitte laden Sie zuerst ein Bild hoch");
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-image", {
        body: { 
          imageData: originalImage,
          mode: enhancementMode
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Zu viele Anfragen. Bitte versuchen Sie es später erneut.");
        } else if (data.error.includes("Payment required")) {
          toast.error("Guthaben aufgebraucht. Bitte fügen Sie Credits hinzu.");
        } else {
          toast.error("Fehler beim Verbessern des Bildes");
        }
        return;
      }

      setEnhancedImage(data.enhancedImage);
      toast.success("Bild erfolgreich verbessert!");
    } catch (error) {
      console.error("Error enhancing image:", error);
      toast.error("Fehler beim Verbessern des Bildes");
    } finally {
      setIsEnhancing(false);
    }
  };

  const downloadImage = () => {
    if (!enhancedImage) return;

    const link = document.createElement("a");
    link.href = enhancedImage;
    link.download = `enhanced-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Bild heruntergeladen!");
  };

  return (
    <Layout user={user} onLogout={() => supabase.auth.signOut()}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Bild-Verbesserung
          </h1>
          <p className="text-muted-foreground">
            Verbessern Sie Ihre Bilder mit KI-Technologie
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Bild hochladen
            </CardTitle>
            <CardDescription>
              Laden Sie ein Bild hoch, um es mit KI zu verbessern
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Enhancement-Modus wählen</h3>
              <RadioGroup value={enhancementMode} onValueChange={(value) => setEnhancementMode(value as EnhancementMode)}>
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <RadioGroupItem value="quality" id="quality" />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="quality" className="font-medium cursor-pointer">
                      Low-quality Enhancer
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Von niedriger Qualität zu hoher Auflösung in einem Klick! Transformieren Sie Ihre körnigen, pixeligen Fotos mit fortschrittlicher KI-Technologie.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <RadioGroupItem value="background" id="background" />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="background" className="font-medium cursor-pointer">
                      Background Enhancer
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Verbessern Sie selbst die kleinsten Details in Ihren Fotos. Heben Sie die natürliche Schönheit von Landschaften, Objekten und Details hervor.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button variant="outline" className="gap-2" asChild>
                  <span>
                    <Upload className="h-4 w-4" />
                    Bild auswählen
                  </span>
                </Button>
              </label>
            </div>

            {originalImage && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Original</h3>
                  <div className="border rounded-lg overflow-hidden bg-muted">
                    <img
                      src={originalImage}
                      alt="Original"
                      className="w-full h-auto"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Verbessert</h3>
                  <div className="border rounded-lg overflow-hidden bg-muted min-h-[200px] flex items-center justify-center">
                    {enhancedImage ? (
                      <img
                        src={enhancedImage}
                        alt="Enhanced"
                        className="w-full h-auto"
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Warten auf Verbesserung...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {originalImage && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={enhanceImage}
                  disabled={isEnhancing}
                  className="bg-gradient-primary shadow-glow gap-2"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird verbessert...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Bild verbessern
                    </>
                  )}
                </Button>

                {enhancedImage && (
                  <Button
                    onClick={downloadImage}
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Herunterladen
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}