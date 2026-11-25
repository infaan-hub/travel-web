"use client";

import { Globe } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT_LABELS,
  type Locale,
} from "@/i18n/config";

type LanguageSwitcherProps = {
  className?: string;
};

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className={`locale-switcher ${className}`.trim()} data-no-translate>
      <Globe size={16} aria-hidden="true" />
      <span className="locale-switcher__label" aria-hidden="true">
        {t("Language")}
      </span>
      <span className="locale-switcher__value" aria-hidden="true">
        {LOCALE_SHORT_LABELS[locale]}
      </span>
      <span className="locale-switcher__full" aria-hidden="true">
        {LOCALE_LABELS[locale]}
      </span>
      <svg
        className="locale-switcher__chevron"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
      <select
        className="locale-switcher__select"
        aria-label={t("Language")}
        title={t("Language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {LOCALES.map((item) => (
          <option key={item} value={item} lang={item}>
            {LOCALE_LABELS[item]}
          </option>
        ))}
      </select>
    </div>
  );
}
