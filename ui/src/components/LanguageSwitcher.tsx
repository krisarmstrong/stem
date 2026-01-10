/**
 * LanguageSwitcher Component
 *
 * Allows users to switch between supported languages.
 * Persists the selection to localStorage.
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

interface LanguageSwitcherProps {
  /** Show native language names instead of English names */
  showNative?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function LanguageSwitcher({
  showNative = true,
  className = '',
}: LanguageSwitcherProps): ReactElement {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    void i18n.changeLanguage(e.target.value);
  };

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      className={`language-switcher ${className}`}
      aria-label="Select language"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {showNative ? lang.nativeName : lang.name}
        </option>
      ))}
    </select>
  );
}

export default LanguageSwitcher;
