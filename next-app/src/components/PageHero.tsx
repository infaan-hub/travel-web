"use client";

import { Search } from "lucide-react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  chips?: string[];
  onChipClick?: (chip: string) => void;
  children?: React.ReactNode;
};

/**
 * Aqua rounded hero header used across the public pages: the title or greeting,
 * an optional search field and quick category chips. Content cards overlap the
 * hero slightly (see `.page > .page-hero + *` in travel-theme.css).
 */
export function PageHero({
  eyebrow = "Travel.",
  title,
  subtitle,
  search,
  chips,
  onChipClick,
  children,
}: PageHeroProps) {
  return (
    <header className="page-hero">
      <div className="page-hero-inner">
        <p className="page-hero-eyebrow">{eyebrow}</p>
        <h1 className="page-hero-title">{title}</h1>
        {subtitle ? <p className="page-hero-subtitle">{subtitle}</p> : null}

        {search ? (
          <div className="page-hero-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder ?? "Search"}
              aria-label={search.placeholder ?? "Search"}
            />
          </div>
        ) : null}

        {chips && chips.length > 0 ? (
          <div className="page-hero-chips">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="page-hero-chip"
                onClick={onChipClick ? () => onChipClick(chip) : undefined}
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </header>
  );
}
