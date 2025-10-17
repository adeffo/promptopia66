import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to prompt gallery
    navigate("/prompt-gallery");
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-6 inline-flex items-center gap-3">
          <div className="rounded-xl bg-gradient-primary p-4 shadow-glow animate-glow">
            <Sparkles className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        <p className="text-muted-foreground">Weiterleitung...</p>
      </div>
    </div>
  );
};

export default Index;
