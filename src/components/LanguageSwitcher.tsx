import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'de' ? 'en' : 'de');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="h-9 w-12 p-0 hover:bg-accent"
      aria-label={language === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln'}
    >
      <span className="text-2xl" role="img" aria-label={language === 'de' ? 'German flag' : 'British flag'}>
        {language === 'de' ? '🇩🇪' : '🇬🇧'}
      </span>
    </Button>
  );
};
