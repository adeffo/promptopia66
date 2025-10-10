import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Award } from "lucide-react";

const Leaderboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Abgemeldet",
      description: "Du wurdest erfolgreich abgemeldet.",
    });
  };

  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl bg-gradient-primary p-6 shadow-glow mb-6">
          <Award className="h-16 w-16 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Leaderboard</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Das Leaderboard wird bald verfügbar sein! Hier siehst du die besten Creator
          und aktivsten Community-Mitglieder.
        </p>
      </div>
    </Layout>
  );
};

export default Leaderboard;
