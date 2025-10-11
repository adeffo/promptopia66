import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, User, LogOut, Settings, Menu, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
  user?: { email?: string; id: string } | null;
  onLogout?: () => void;
}

export const Layout = ({ children, user, onLogout }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleProtectedNavigation = (path: string, requiresAuth: boolean = false) => {
    if (requiresAuth && !user) {
      toast({
        variant: "destructive",
        title: t('toast.loginRequired'),
        description: t('toast.loginRequiredDesc'),
      });
      navigate("/auth");
      return;
    }
    navigate(path);
  };

  const navItems = [
    { label: t('nav.marketplace'), path: "/" },
    { label: t('nav.contests'), path: "/contests" },
    { label: t('nav.leaderboard'), path: "/leaderboard" },
    { label: t('nav.myPrompts'), path: "/my-prompts", requiresAuth: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container relative flex h-16 items-center justify-between px-4">
          {/* Left: Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {navItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleProtectedNavigation(item.path, item.requiresAuth)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
                        isActive(item.path)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div className="my-2 border-t border-border" />
                  <button
                    onClick={() => handleProtectedNavigation("/prompt-extractor", true)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-2 text-left"
                  >
                    <Upload className="h-4 w-4" />
                    {t('btn.extractPrompt')}
                  </button>
                  <button
                    onClick={() => handleProtectedNavigation("/prompt-creator", true)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-2 text-left"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('btn.giveInspiration')}
                  </button>
                  <button
                    onClick={() => handleProtectedNavigation("/profile", true)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2 text-left"
                  >
                    <User className="h-4 w-4" />
                    {t('nav.profile')}
                  </button>
                  <button
                    onClick={() => handleProtectedNavigation("/settings", true)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2 text-left"
                  >
                    <Settings className="h-4 w-4" />
                    {t('nav.settings')}
                  </button>
                  {user && (
                    <>
                      <div className="my-2 border-t border-border" />
                      <Button
                        variant="ghost"
                        onClick={onLogout}
                        className="justify-start text-destructive hover:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('nav.logout')}
                      </Button>
                    </>
                  )}
                  {!user && (
                    <>
                      <div className="my-2 border-t border-border" />
                      <Button asChild className="bg-gradient-primary shadow-glow">
                        <Link to="/auth">{t('nav.login')}</Link>
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Left: Logo & Desktop Navigation */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
              <div className="rounded-lg bg-gradient-primary p-2 shadow-glow">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="bg-gradient-primary bg-clip-text text-lg font-bold text-transparent">
                PromptHub
              </span>
            </Link>
            
            <nav className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleProtectedNavigation(item.path, item.requiresAuth)}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive(item.path) ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Language Switcher, Notifications & User Menu / Auth Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            <LanguageSwitcher />
            {user && (
              <>
                <NotificationBell userId={user.id} />
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                        <Avatar className="h-9 w-9 border-2 border-primary/20">
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                            {user.email?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5 text-sm">
                        <p className="font-medium">{user.email || "Benutzer"}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          {t('nav.profile')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          {t('nav.settings')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/prompt-creator" className="cursor-pointer text-primary">
                          <Sparkles className="mr-2 h-4 w-4" />
                          {t('btn.giveInspiration')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('nav.logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
            {!user && (
              <Button asChild variant="default" size="sm" className="hidden md:flex bg-gradient-primary shadow-glow">
                <Link to="/auth">{t('nav.login')}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8 flex-1">{children}</main>
      <Footer />
    </div>
  );
};
