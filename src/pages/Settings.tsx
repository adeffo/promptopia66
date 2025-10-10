import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Loader2 } from "lucide-react";

interface NotificationPreferences {
  comments_on_own_prompts: boolean;
  new_contests: boolean;
  new_prompts: boolean;
  leaderboard_updates: boolean;
}

const Settings = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    comments_on_own_prompts: true,
    new_contests: true,
    new_prompts: false,
    leaderboard_updates: false,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        fetchPreferences(session.user.id);
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

  const fetchPreferences = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching preferences:", error);
        return;
      }

      if (!data) {
        // Create default preferences if they don't exist
        const { error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: userId });

        if (insertError) {
          console.error("Error creating preferences:", insertError);
        }
      } else {
        setPreferences({
          comments_on_own_prompts: data.comments_on_own_prompts,
          new_contests: data.new_contests,
          new_prompts: data.new_prompts,
          leaderboard_updates: data.leaderboard_updates,
        });
      }
    } catch (error) {
      console.error("Error in fetchPreferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .update({ [key]: value })
        .eq("user_id", session.user.id);

      if (error) throw error;

      setPreferences(prev => ({ ...prev, [key]: value }));
      
      toast({
        title: "Einstellungen gespeichert",
        description: "Deine Benachrichtigungseinstellungen wurden aktualisiert.",
      });
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Konnte Einstellungen nicht speichern.",
      });
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-bold">Einstellungen</h1>

        <Card className="border-border/40 bg-gradient-card backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Benachrichtigungseinstellungen
            </CardTitle>
            <CardDescription>
              Verwalte deine Benachrichtigungspräferenzen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="comments" className="text-base">
                      Kommentare auf eigene Prompts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Benachrichtigungen bei neuen Kommentaren auf deine Prompts
                    </p>
                  </div>
                  <Switch
                    id="comments"
                    checked={preferences.comments_on_own_prompts}
                    onCheckedChange={(checked) => updatePreference('comments_on_own_prompts', checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="contests" className="text-base">
                      Neue Contests
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Benachrichtigungen bei neuen Wettbewerben
                    </p>
                  </div>
                  <Switch
                    id="contests"
                    checked={preferences.new_contests}
                    onCheckedChange={(checked) => updatePreference('new_contests', checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="prompts" className="text-base">
                      Neue Prompts im Marketplace
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Benachrichtigungen bei neuen Prompts im Marketplace
                    </p>
                  </div>
                  <Switch
                    id="prompts"
                    checked={preferences.new_prompts}
                    onCheckedChange={(checked) => updatePreference('new_prompts', checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="leaderboard" className="text-base">
                      Leaderboard-Updates
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Benachrichtigungen bei Änderungen im Leaderboard
                    </p>
                  </div>
                  <Switch
                    id="leaderboard"
                    checked={preferences.leaderboard_updates}
                    onCheckedChange={(checked) => updatePreference('leaderboard_updates', checked)}
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
