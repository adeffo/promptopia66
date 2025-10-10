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
import { Loader2 } from "lucide-react";
import { profileSchema } from "@/lib/validations";
import { z } from "zod";

const Profile = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState("");
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }
      
      // If no profile exists, create one
      if (!data) {
        const email = session?.user?.email;
        const defaultName = email?.split('@')[0] || 'Benutzer';
        
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ 
            id: userId,
            display_name: defaultName 
          });
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
        } else {
          setDisplayName(defaultName);
        }
      } else if (data?.display_name) {
        setDisplayName(data.display_name);
      }
    } catch (error: any) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const validatedData = profileSchema.parse({ display_name: displayName });

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
          .update({ display_name: validatedData.display_name })
          .eq("id", session.user.id);
        error = result.error;
      } else {
        // Insert new profile
        const result = await supabase
          .from("profiles")
          .insert({ 
            id: session.user.id,
            display_name: validatedData.display_name 
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
    navigate("/");
  };

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Profil</h1>

        <Card className="border-border/40 bg-gradient-card backdrop-blur">
          <CardHeader>
            <CardTitle>Persönliche Informationen</CardTitle>
            <CardDescription>
              Verwalte deine Profildaten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  E-Mail-Adresse kann nicht geändert werden
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Anzeigename</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Dein Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  maxLength={50}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary shadow-glow"
                disabled={loading}
              >
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
      </div>
    </Layout>
  );
};

export default Profile;
