"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, Compass, Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import type { PlaceSuggestion } from "@/lib/place-types";
import styles from "@/components/place-autocomplete.module.css";

type PlaceAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
  onCustomConfirm?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  hint?: string;
  error?: string;
  action?: ReactNode;
  variant?: "origin" | "destination";
  pinned?: boolean;
  pinnedLabel?: string;
};

type ApiResponse = {
  results?: PlaceSuggestion[];
  mode?: "popular" | "search";
};

type FetchState = {
  queryKey: string;
  results: PlaceSuggestion[];
  mode: "popular" | "search";
  error: string;
};

const MAX_CACHE_ENTRIES = 100;
const placeSuggestionCache = new Map<string, PlaceSuggestion[]>();

function cacheSuggestions(key: string, items: PlaceSuggestion[]) {
  if (placeSuggestionCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = placeSuggestionCache.keys().next().value;
    if (oldestKey !== undefined) placeSuggestionCache.delete(oldestKey);
  }
  placeSuggestionCache.set(key, items);
}

export default function PlaceAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  onCustomConfirm,
  onBlur,
  placeholder = "Search a place, hotel, beach, or street…",
  name,
  required = false,
  disabled = false,
  maxLength,
  hint,
  error,
  action,
  variant,
  pinned = false,
  pinnedLabel,
}: PlaceAutocompleteProps) {
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetchState, setFetchState] = useState<FetchState | null>(null);

  const query = value.trim();
  const queryKey = query.toLowerCase();
  const cachedResults = placeSuggestionCache.get(queryKey);
  const stateMatches = fetchState?.queryKey === queryKey;

  const results = cachedResults ?? (stateMatches ? fetchState.results : []);
  const requestError = cachedResults ? "" : stateMatches ? fetchState.error : "";
  const mode: "popular" | "search" = query ? "search" : "popular";
  const loading = open && !cachedResults && !stateMatches;
  const showList = open && !disabled;

  const hasExactMatch =
    query.length >= 2 &&
    results.some((place) => place.name.trim().toLowerCase() === queryKey);
  const showCustomOption =
    Boolean(onCustomConfirm) && query.length >= 2 && !loading && !hasExactMatch;
  const totalOptions = results.length + (showCustomOption ? 1 : 0);

  useEffect(() => {
    if (!open || disabled) return;
    if (placeSuggestionCache.has(queryKey)) return;

    const controller = new AbortController();
    let active = true;
    const delayMs = queryKey.length === 0 ? 0 : 120;

    const timer = window.setTimeout(async () => {
      try {
        const searchUrl = query
          ? `/api/trips/places?q=${encodeURIComponent(query)}&limit=8`
          : "/api/trips/places?limit=8";
        const response = await fetch(searchUrl, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error("Could not load place suggestions.");
        }
        const payload = (await response.json()) as ApiResponse;
        const next = Array.isArray(payload.results) ? payload.results : [];
        cacheSuggestions(queryKey, next);
        if (active) {
          setFetchState({
            queryKey,
            results: next,
            mode: payload.mode === "popular" ? "popular" : query ? "search" : "popular",
            error: "",
          });
        }
      } catch (cause) {
        if (!active) return;
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setFetchState({
          queryKey,
          results: [],
          mode: query ? "search" : "popular",
          error: "Suggestions are unavailable right now. You can still use your typed location.",
        });
      }
    }, delayMs);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, open, query, queryKey]);

  function select(place: PlaceSuggestion) {
    onSelect(place);
    setOpen(false);
    setActiveIndex(-1);
  }

  function confirmCustom() {
    if (!onCustomConfirm || query.length < 2) return;
    onCustomConfirm(query);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clear() {
    onChange("");
    setActiveIndex(-1);
    setOpen(true);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((current) =>
        totalOptions === 0 ? -1 : Math.min(current + 1, totalOptions - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((current) =>
        totalOptions === 0 ? -1 : Math.max(current - 1, 0),
      );
      return;
    }

    if (event.key === "Enter") {
      if (showList && activeIndex >= 0) {
        event.preventDefault();
        if (activeIndex < results.length && results[activeIndex]) {
          select(results[activeIndex]);
        } else if (showCustomOption && activeIndex === results.length) {
          confirmCustom();
        }
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const inputClassNames = [
    styles.input,
    error ? styles.inputError : "",
    pinned && value ? styles.inputPinned : "",
    value ? styles.inputHasValue : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      <div className={styles.inputRow}>
        <div className={styles.inputWrap}>
          {variant === "origin" ? (
            <span className={styles.originMarker} aria-hidden="true" />
          ) : variant === "destination" ? (
            <MapPin className={styles.destIcon} size={16} aria-hidden="true" />
          ) : (
            <Search className={styles.inputIcon} size={16} aria-hidden="true" />
          )}

          <input
            ref={inputRef}
            id={inputId}
            name={name}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={showList ? listboxId : undefined}
            aria-activedescendant={
              showList && activeIndex >= 0
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            placeholder={placeholder}
            className={inputClassNames}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              setOpen(true);
              setActiveIndex(-1);
            }}
            onBlur={() => {
              setOpen(false);
              setActiveIndex(-1);
              onBlur?.();
            }}
            onKeyDown={handleKeyDown}
          />

          <div className={styles.trailingControls}>
            {pinned && value ? (
              <span className={styles.pinnedTag} aria-label="Location selected">
                <Check size={11} aria-hidden="true" />
                {pinnedLabel || "Pinned"}
              </span>
            ) : null}

            {value ? (
              <button
                type="button"
                className={styles.clearButton}
                onMouseDown={(event) => event.preventDefault()}
                onClick={clear}
                aria-label={`Clear ${label.toLowerCase()}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {showList ? (
            <div
              id={listboxId}
              role="listbox"
              aria-label={`${label} suggestions`}
              aria-busy={loading}
              className={styles.popover}
            >
              <div className={styles.popoverHead}>
                <Compass size={12} aria-hidden="true" />
                <span>
                  {mode === "popular"
                    ? "Popular Zanzibar locations"
                    : "Suggested Zanzibar locations"}
                </span>
              </div>

              {loading ? (
                <div className={styles.state} role="status">
                  <Loader2 className={styles.spinner} size={15} aria-hidden="true" />
                  Finding Zanzibar locations…
                </div>
              ) : null}

              {!loading && requestError ? (
                <div className={styles.state} role="status">
                  {requestError}
                </div>
              ) : null}

              {!loading && !requestError && results.length === 0 && !showCustomOption ? (
                <div className={styles.state} role="status">
                  No matching places found. Keep typing to enter a custom address.
                </div>
              ) : null}

              {!loading && !requestError
                ? results.map((place, index) => (
                    <div
                      key={place.id}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`${styles.option} ${
                        index === activeIndex ? styles.optionActive : ""
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => select(place)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className={styles.optionIcon} aria-hidden="true">
                        <MapPin size={15} />
                      </span>
                      <span className={styles.optionText}>
                        <span className={styles.optionName}>{place.name}</span>
                        <span className={styles.optionMeta}>
                          {[place.category, place.area, place.district]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </div>
                  ))
                : null}

              {showCustomOption ? (
                <div
                  id={`${listboxId}-option-${results.length}`}
                  role="option"
                  aria-selected={activeIndex === results.length}
                  className={`${styles.option} ${styles.customOption} ${
                    activeIndex === results.length ? styles.optionActive : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={confirmCustom}
                  onMouseEnter={() => setActiveIndex(results.length)}
                >
                  <span className={styles.customOptionIcon} aria-hidden="true">
                    <Navigation size={14} />
                  </span>
                  <span className={styles.optionText}>
                    <span className={styles.optionName}>Use “{query}”</span>
                    <span className={styles.optionMeta}>
                      Use this custom location for your trip
                    </span>
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {action ? <div className={styles.actionSlot}>{action}</div> : null}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
