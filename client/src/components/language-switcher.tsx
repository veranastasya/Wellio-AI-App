import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { supportedLanguages, type SupportedLanguage } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'default' | 'minimal';
  className?: string;
}

export function LanguageSwitcher({ variant = 'default', className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  
  const currentLanguage = supportedLanguages.find(
    (lang) => lang.code === i18n.language
  ) || supportedLanguages[0];

  const changeLanguage = (langCode: SupportedLanguage) => {
    i18n.changeLanguage(langCode);
  };

  if (variant === 'minimal') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className} data-testid="button-language-switcher">
            <Globe className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {supportedLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={i18n.language === lang.code ? 'bg-accent' : ''}
              data-testid={`menu-item-language-${lang.code}`}
            >
              <span className="mr-2">{lang.nativeName}</span>
              <span className="text-muted-foreground text-xs">({lang.name})</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={className}>
      <label className="text-sm font-medium text-foreground mb-2 block">
        {t('settings.language')}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between" data-testid="button-language-selector">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {currentLanguage.nativeName}
            </span>
            <span className="text-muted-foreground text-xs">({currentLanguage.name})</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {supportedLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={i18n.language === lang.code ? 'bg-accent' : ''}
              data-testid={`menu-item-language-${lang.code}`}
            >
              <span className="mr-2">{lang.nativeName}</span>
              <span className="text-muted-foreground text-xs">({lang.name})</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
