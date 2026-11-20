"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import type { PlaceSuggestion } from "@/lib/place-types";
import styles from "@/components/place-autocomplete.module.css";

type PlaceAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  hint?: string;
  error?: string;
  action?: ReactNode;
};

type ApiResponse = {
  results?: PlaceSuggestion[];
};

export default function PlaceAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  placeholder = "Search a place or street…",
  name,
  required = false,
  disabled = false,
  maxLength,
  hint,
  error,
  action,
}: PlaceAutocompleteProps) {
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef(new Map<string, PlaceSuggestion[]>());
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = value.trim();
  const showList = open && query.length >= 2;

  useEffect(() => {
    if (!open || query.length < 2) return;

    const cached = cacheRef.current.get(query.toLowerCase());
    if (cached) {
      setResults(cached);
      setActiveIndex(-1);
      setLoading(false);
      setRequestError("");
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setRequestError("");

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/trips/places?q=${encodeURIComponent(query)}&limit=8`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );
        if (!response.ok) {
          throw new Error("Could not load place suggestions.");
        }
        const payload = (await response.json()) as ApiResponse;
        const next = Array.isArray(payload.results) ? payload.results : [];
        cacheRef.current.set(query.toLowerCase(), next);
        if (active) {
          setResults(next);
          setActiveIndex(-1);
          setRequestError("");
        }
      } catch (cause) {
        if (!active) return;
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setResults([]);
        setActiveIndex(-1);
        setRequestError(
          "Suggestions are unavailable. You can still type your location.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  function select(place: PlaceSuggestion) {
    onSelect(place);
    setOpen(false);
    setActiveIndex(-1);
    setResults([]);
  }

  function clear() {
    onChange("");
    setResults([]);
    setRequestError("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((current) =>
        results.length === 0 ? -1 : Math.min(current + 1, results.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((current) =>
        results.length === 0 ? -1 : Math.max(current - 1, 0),
      );
      return;
    }

    if (event.key === "Enter") {
      if (showList && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        select(results[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      <div className={styles.inputRow}>
        <div className={styles.inputWrap}>
          <Search className={styles.inputIcon} size={16} aria-hidden="true" />
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
            className={`${styles.input} ${error ? styles.inputError : ""}`}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
          />
          {value ? (
            <button
              type="button"
              className={styles.clearButton}
              onClick={clear}
              aria-label={`Clear ${label.toLowerCase()}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}

          {showList ? (
            <div
              id={listboxId}
              role="listbox"
              aria-label={`${label} suggestions`}
              aria-busy={loading}
              className={styles.popover}
            >
              {loading ? (
                <div className={styles.state} role="status">
                  <Loader2 className={styles.spinner} size={15} aria-hidden="true" />
                  Searching Zanzibar places…
                </div>
              ) : null}

              {!loading && requestError ? (
                <div className={styles.state} role="status">
                  {requestError}
                </div>
              ) : null}

              {!loading && !requestError && results.length === 0 ? (
                <div className={styles.state} role="status">
                  No matches. You can still type your location.
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
                        <MapPin size={16} />
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
