import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { profileSchema } from "@/lib/validations";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Profile = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [gender, setGender] = useState<string>("");
  const [photoUrl1, setPhotoUrl1] = useState("");
  const [photoUrl2, setPhotoUrl2] = useState("");
  const [photoUrl3, setPhotoUrl3] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        fetchProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, instagram_url, facebook_url, gender, photo_url_1, photo_url_2, photo_url_3")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      // If profile exists, populate the fields
      if (data) {
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.instagram_url) setInstagramUrl(data.instagram_url);
        if (data?.facebook_url) setFacebookUrl(data.facebook_url);
        if (data?.gender) setGender(data.gender);
        if (data?.photo_url_1) setPhotoUrl1(data.photo_url_1);
        if (data?.photo_url_2) setPhotoUrl2(data.photo_url_2);
        if (data?.photo_url_3) setPhotoUrl3(data.photo_url_3);
      }
    } catch (error: any) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const handlePhotoUpload = async (file: File, photoNumber: number) => {
    if (!session?.user?.id) return;

    setUploadingPhoto(photoNumber);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/photo_${photoNumber}.${fileExt}`;

      // Delete old photo if exists
      const oldPhotoUrl = photoNumber === 1 ? photoUrl1 : photoNumber === 2 ? photoUrl2 : photoUrl3;
      if (oldPhotoUrl) {
        const oldFileName = oldPhotoUrl.split("/").pop();
        if (oldFileName) {
          await supabase.storage.from("profile-photos").remove([`${session.user.id}/${oldFileName}`]);
        }
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

      // Update profile with new photo URL
      const updateField = `photo_url_${photoNumber}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [updateField]: publicUrl })
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      // Update local state
      if (photoNumber === 1) setPhotoUrl1(publicUrl);
      else if (photoNumber === 2) setPhotoUrl2(publicUrl);
      else if (photoNumber === 3) setPhotoUrl3(publicUrl);

      toast({
        title: "Foto hochgeladen",
        description: `Foto ${photoNumber} wurde erfolgreich hochgeladen.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handlePhotoDelete = async (photoNumber: number) => {
    if (!session?.user?.id) return;

    try {
      const photoUrl = photoNumber === 1 ? photoUrl1 : photoNumber === 2 ? photoUrl2 : photoUrl3;
      if (!photoUrl) return;

      const fileName = photoUrl.split("/").pop();
      if (!fileName) return;

      // Delete from storage
      await supabase.storage.from("profile-photos").remove([`${session.user.id}/${fileName}`]);

      // Update profile
      const updateField = `photo_url_${photoNumber}`;
      await supabase
        .from("profiles")
        .update({ [updateField]: null })
        .eq("id", session.user.id);

      // Update local state
      if (photoNumber === 1) setPhotoUrl1("");
      else if (photoNumber === 2) setPhotoUrl2("");
      else if (photoNumber === 3) setPhotoUrl3("");

      toast({
        title: "Foto gelöscht",
        description: `Foto ${photoNumber} wurde erfolgreich gelöscht.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const validatedData = profileSchema.parse({
        display_name: displayName,
        instagram_url: instagramUrl || undefined,
        facebook_url: facebookUrl || undefined,
        gender: gender || undefined,
        photo_url_1: photoUrl1 || undefined,
        photo_url_2: photoUrl2 || undefined,
        photo_url_3: photoUrl3 || undefined,
      });

      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();

      let error;
      if (existingProfile) {
        // Update existing profile
        const result = await supabase
          .from("profiles")
          .update({
            display_name: validatedData.display_name,
            instagram_url: validatedData.instagram_url || null,
            facebook_url: validatedData.facebook_url || null,
            gender: validatedData.gender || null,
          })
          .eq("id", session.user.id);
        error = result.error;
      } else {
        // Insert new profile
        const result = await supabase.from("profiles").insert({
          id: session.user.id,
          display_name: validatedData.display_name,
          instagram_url: validatedData.instagram_url || null,
          facebook_url: validatedData.facebook_url || null,
          gender: validatedData.gender || null,
        });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Profil aktualisiert",
        description: "Dein Anzeigename wurde erfolgreich geändert.",
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Abgemeldet",
      description: "Du wurdest erfolgreich abgemeldet.",
    });
    navigate("/prompt-gallery");
  };

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Profil</h1>

        <Card className="border-border/40 bg-gradient-card backdrop-blur">
          <CardHeader>
            <CardTitle>Persönliche Informationen</CardTitle>
            <CardDescription>Verwalte deine Profildaten</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" value={session?.user?.email || ""} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">E-Mail-Adresse kann nicht geändert werden</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Anzeigename *</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Dein Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  maxLength={50}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </Label>
                <Input
                  id="instagramUrl"
                  type="url"
                  placeholder="https://instagram.com/deinprofil"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Label>
                <Input
                  id="facebookUrl"
                  type="url"
                  placeholder="https://facebook.com/deinprofil"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-primary shadow-glow" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  "Änderungen speichern"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-gradient-card backdrop-blur">
          <CardHeader>
            <CardTitle>Private Informationen</CardTitle>
            <CardDescription>Diese Informationen sind nur für dich sichtbar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                🔒 Die sind nur wichtig, falls du die Funktion ("Prompt an mir testen") nutzen willst.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Geschlecht</Label>
              <RadioGroup value={gender} onValueChange={setGender}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="font-normal cursor-pointer">
                    Männlich
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="font-normal cursor-pointer">
                    Weiblich
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="diverse" id="diverse" />
                  <Label htmlFor="diverse" className="font-normal cursor-pointer">
                    Divers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prefer_not_to_say" id="prefer_not_to_say" />
                  <Label htmlFor="prefer_not_to_say" className="font-normal cursor-pointer">
                    Nicht sagen
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
