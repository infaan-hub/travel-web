import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { buildLookup, translateText } from "@/i18n/translate";

const TRANSLATED_LOCALES = ["sw", "fr", "es", "de"] as const;
type TranslatedLocale = (typeof TRANSLATED_LOCALES)[number];

const DICTIONARIES: Record<TranslatedLocale, Record<string, string>> = {
  sw: JSON.parse(
    readFileSync(path.resolve(__dirname, "../src/i18n/dictionaries/sw.json"), "utf8"),
  ),
  fr: JSON.parse(
    readFileSync(path.resolve(__dirname, "../src/i18n/dictionaries/fr.json"), "utf8"),
  ),
  es: JSON.parse(
    readFileSync(path.resolve(__dirname, "../src/i18n/dictionaries/es.json"), "utf8"),
  ),
  de: JSON.parse(
    readFileSync(path.resolve(__dirname, "../src/i18n/dictionaries/de.json"), "utf8"),
  ),
};

const LOOKUPS: Record<TranslatedLocale, ReturnType<typeof buildLookup>> = {
  sw: buildLookup(DICTIONARIES.sw),
  fr: buildLookup(DICTIONARIES.fr),
  es: buildLookup(DICTIONARIES.es),
  de: buildLookup(DICTIONARIES.de),
};

describe("i18n locale configuration & dictionary completeness", () => {
  it("supports English, Kiswahili, Français, Español, and Deutsch", () => {
    expect([...LOCALES]).toEqual(["en", "sw", "fr", "es", "de"]);
    expect(LOCALE_LABELS).toEqual({
      en: "English",
      sw: "Kiswahili",
      fr: "Français",
      es: "Español",
      de: "Deutsch",
    });
  });

  it("maintains full key parity and non-empty translations across sw, fr, es, and de", () => {
    const swKeys = Object.keys(DICTIONARIES.sw).sort();
    expect(swKeys.length).toBeGreaterThan(3500);

    for (const locale of TRANSLATED_LOCALES) {
      const dict = DICTIONARIES[locale];
      const keys = Object.keys(dict).sort();
      expect(keys).toEqual(swKeys);

      const emptyKeys = keys.filter((k) => !dict[k] || !dict[k].trim());
      expect(emptyKeys).toEqual([]);
    }
  });

  it("translates critical UI copy from all sections including PWA badge, Business card, Onboarding, and Auth", () => {
    const mustTranslate = [
      "Download app",
      "Install Travel. on your device",
      "Got it",
      "Your device",
      "Business card",
      "Edit card",
      "Download as image",
      "Download as PDF",
      "Driver · Private Hire",
      "Boarding Stub",
      "Scan Pass",
      "Driver Pass",
      "Sign in with Google",
      "Customer accounts only.",
      "Register your private hire fleet",
      "Measure trip distance & travel time",
      "Reschedule & leave a verified review",
      "Private Hire",
      "One-way",
      "Wait & return",
      "Full day",
      "Save",
      "Close",
      "Search",
      "Monday",
      "Closed",
    ];

    for (const locale of TRANSLATED_LOCALES) {
      const lookup = LOOKUPS[locale];
      for (const phrase of mustTranslate) {
        const out = translateText(phrase, lookup, locale);
        expect(out, `[${locale}] "${phrase}" should be translated`).not.toBe(phrase);
      }
    }
  });
});

describe("runtime translateText patterns & edge cases", () => {
  const cases: Array<[string, (out: string, locale: Locale) => void]> = [
    [
      "Step 2 of 5",
      (out) => {
        expect(out).toContain("2");
        expect(out).toContain("5");
        expect(out).not.toBe("Step 2 of 5");
      },
    ],
    [
      "All (9)",
      (out) => {
        expect(out.endsWith("(9)")).toBe(true);
        expect(out).not.toBe("All (9)");
      },
    ],
    [
      "Pending (1)",
      (out) => {
        expect(out.endsWith("(1)")).toBe(true);
        expect(out).not.toBe("Pending (1)");
      },
    ],
    [
      "Assigned company services (3)",
      (out) => {
        expect(out.endsWith("(3)")).toBe(true);
        expect(out).not.toBe("Assigned company services (3)");
      },
    ],
    [
      "7 Seats",
      (out) => {
        expect(out.startsWith("7 ")).toBe(true);
        expect(out).not.toBe("7 Seats");
      },
    ],
    [
      "5 Bags",
      (out) => {
        expect(out.startsWith("5 ")).toBe(true);
        expect(out).not.toBe("5 Bags");
      },
    ],
    [
      "From $45",
      (out) => {
        expect(out).toContain("45");
        expect(out).toContain("$");
        expect(out).not.toBe("From $45");
      },
    ],
    [
      "1 / 1 vehicle registered",
      (out) => {
        expect(out).toMatch(/1\s*\/\s*1/);
        expect(out).not.toBe("1 / 1 vehicle registered");
      },
    ],
    [
      "Assigned by Zanzibar Coastal · Updated Nov 24, 2026",
      (out) => {
        expect(out).toContain("Zanzibar Coastal");
        expect(out).toContain("Nov 24, 2026");
        expect(out).not.toContain("Assigned by");
        expect(out).not.toContain("Updated");
      },
    ],
    [
      "View only — managed by Zanzibar Coastal.",
      (out) => {
        expect(out).toContain("Zanzibar Coastal.");
        expect(out).not.toContain("View only");
      },
    ],
    [
      "Status: Pending",
      (out) => {
        expect(out).not.toContain("Pending");
      },
    ],
    [
      "Route prices →",
      (out) => {
        expect(out.endsWith("→")).toBe(true);
        expect(out).not.toBe("Route prices →");
      },
    ],
    [
      "+ Add Vehicle",
      (out) => {
        expect(out.startsWith("+ ")).toBe(true);
        expect(out).not.toBe("+ Add Vehicle");
      },
    ],
    [
      "  Private Hire  ",
      (out) => {
        expect(out.startsWith("  ")).toBe(true);
        expect(out.endsWith("  ")).toBe(true);
        expect(out.trim()).not.toBe("Private Hire");
      },
    ],
    [
      "FRONT",
      (out) => {
        expect(out).toBe(out.toUpperCase());
        expect(out).not.toBe("FRONT");
      },
    ],
  ];

  it("translates dynamic counters, affixes, separators, and case variants across sw, fr, es, and de", () => {
    for (const locale of TRANSLATED_LOCALES) {
      const lookup = LOOKUPS[locale];
      for (const [input, check] of cases) {
        const out = translateText(input, lookup, locale);
        check(out, locale);
      }
      // Brand stays invariant in every locale
      expect(translateText("Travel.", lookup, locale)).toBe("Travel.");
    }
  });
});

describe("language switcher placement", () => {
  it("removes LanguageSwitcher from TopHeader and places it above account profile in Sidebar", () => {
    const topHeaderSource = readFileSync(
      path.resolve(__dirname, "../src/components/TopHeader.tsx"),
      "utf8",
    );
    const sidebarSource = readFileSync(
      path.resolve(__dirname, "../src/components/Sidebar.tsx"),
      "utf8",
    );

    expect(topHeaderSource).not.toContain("LanguageSwitcher");

    const footerIdx = sidebarSource.indexOf("className={styles.footer}");
    const languageIdx = sidebarSource.indexOf("<LanguageSwitcher");
    const userCardIdx = sidebarSource.indexOf("className={styles.userCard}");
    const accessActionsIdx = sidebarSource.indexOf("className={styles.accessActions}");

    expect(footerIdx).toBeGreaterThan(-1);
    expect(languageIdx).toBeGreaterThan(footerIdx);
    expect(userCardIdx).toBeGreaterThan(languageIdx);
    expect(accessActionsIdx).toBeGreaterThan(languageIdx);
  });
});
