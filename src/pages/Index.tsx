import { Link } from "react-router-dom";
import { Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";

const Index = () => {
  return (
    <Layout user={session?.user} onLogout={handleLogout}>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-4xl text-center space-y-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-gradient-primary p-6 shadow-glow animate-glow">
              <Sparkles className="h-16 w-16 text-primary-foreground" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold">
              <span className="text-foreground">Willkommen bei </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">Promptopia</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-2xl md:text-3xl font-semibold text-foreground">Der Ort, an dem Ideen zu Bildern werden.</p>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Entdecke einzigartige Prompts oder lass die KI deine Vision in Worte fassen.
          </p>

          {/* Call to action */}
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Melde dich an, um eigene Prompts zu <span className="text-primary font-medium">speichern</span> und die
            besten Ideen anderer zu <span className="text-primary font-medium">favorisieren</span>.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-primary shadow-glow text-lg px-8 py-6">
              <Link to="/prompt-gallery">
                <Search className="mr-2 h-5 w-5" />
                Prompts entdecken
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
              <Link to="/prompt-creator">
                <Sparkles className="mr-2 h-5 w-5" />
                KI-Prompt erzeugen
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
