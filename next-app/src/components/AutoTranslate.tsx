"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

/**
 * The application ships with English copy written directly in JSX. Rather than
 * wrapping every sentence in a translation component (and risking layout
 * changes from extra wrapper elements), this client component walks the
 * rendered DOM and replaces known English strings with the active language.
 *
 * Only strings that exist in the generated dictionaries (or match safe UI
 * patterns) are touched, so user content, names, prices and free-form text are
 * left alone. A MutationObserver + pathname rescan keeps dynamically loaded
 * content, portals, toasts, and route transitions translated.
 */
const SKIP_TEXT_TAGS = new Set([
  "CANVAS",
  "CODE",
  "EMBED",
  "IFRAME",
  "MATH",
  "NOSCRIPT",
  "OBJECT",
  "PRE",
  "SCRIPT",
  "STYLE",
  "SVG",
  "TEMPLATE",
  "TEXTAREA",
]);

const TRANSLATED_ATTRIBUTES = [
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "placeholder",
  "title",
];

const BUTTON_INPUT_TYPES = new Set(["button", "reset", "submit"]);

function isNoTranslateElement(element: Element): boolean {
  let node: Element | null = element;
  while (node) {
    if (node.hasAttribute("data-no-translate")) return true;
    if (node.classList?.contains("no-translate")) return true;
    if ((node as HTMLElement).isContentEditable) return true;
    node = node.parentElement;
  }
  return false;
}

function isSkippedTextContainer(element: Element): boolean {
  let node: Element | null = element;
  while (node) {
    if (SKIP_TEXT_TAGS.has(node.tagName)) return true;
    if (node.hasAttribute("data-no-translate")) return true;
    if (node.classList?.contains("no-translate")) return true;
    if ((node as HTMLElement).isContentEditable) return true;
    node = node.parentElement;
  }
  return false;
}

type StoredText = { source: string; translated: string };
type StoredAttribute = { source: string; translated: string };

export default function AutoTranslate() {
  const { ready, t } = useLanguage();
  const pathname = usePathname();
  const textSources = useRef(new WeakMap<Text, StoredText>());
  const attributeSources = useRef(new WeakMap<Element, Map<string, StoredAttribute>>());
  const titleState = useRef<{ source: string; translated: string } | null>(null);

  useEffect(() => {
    if (!ready || typeof document === "undefined" || !document.body) return;

    const translate = t;
    const textStore = textSources.current;
    const attributeStore = attributeSources.current;

    const translateTextNode = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || isSkippedTextContainer(parent)) return;

      const raw = node.data;
      if (!raw || !raw.trim()) return;

      const stored = textStore.get(node);
      if (!stored) {
        textStore.set(node, { source: raw, translated: raw });
      } else if (raw !== stored.source && raw !== stored.translated) {
        // React (or another script) replaced the text with new content.
        textStore.set(node, { source: raw, translated: raw });
      }

      const current = textStore.get(node);
      if (!current) return;

      const next = translate(current.source);
      if (node.data !== next) node.data = next;
      if (current.translated !== next) {
        textStore.set(node, { source: current.source, translated: next });
      }
    };

    const translateAttribute = (element: Element, attribute: string) => {
      if (isNoTranslateElement(element)) return;
      if (attribute === "value") {
        if (element.tagName !== "INPUT") return;
        const inputType = (element.getAttribute("type") || "text").toLowerCase();
        if (!BUTTON_INPUT_TYPES.has(inputType)) return;
      }
      const raw = element.getAttribute(attribute);
      if (raw == null || !raw.trim()) return;

      let map = attributeStore.get(element);
      if (!map) {
        map = new Map();
        attributeStore.set(element, map);
      }

      const stored = map.get(attribute);
      if (!stored) {
        map.set(attribute, { source: raw, translated: raw });
      } else if (raw !== stored.source && raw !== stored.translated) {
        map.set(attribute, { source: raw, translated: raw });
      }

      const current = map.get(attribute);
      if (!current) return;

      const next = translate(current.source);
      if (raw !== next) element.setAttribute(attribute, next);
      if (current.translated !== next) {
        map.set(attribute, { source: current.source, translated: next });
      }
    };

    const translateElementAttributes = (element: Element) => {
      if (isNoTranslateElement(element)) return;
      for (const attribute of TRANSLATED_ATTRIBUTES) {
        if (element.hasAttribute(attribute)) translateAttribute(element, attribute);
      }
      if (element.tagName === "INPUT") {
        const inputType = (element.getAttribute("type") || "text").toLowerCase();
        if (BUTTON_INPUT_TYPES.has(inputType) && element.hasAttribute("value")) {
          translateAttribute(element, "value");
        }
      }
    };

    const translateSubtree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
        return;
      }

      if (root.nodeType === Node.ELEMENT_NODE) {
        const element = root as Element;
        if (isNoTranslateElement(element)) return;
        translateElementAttributes(element);
        if (SKIP_TEXT_TAGS.has(element.tagName)) return;
      }

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element;
              if (isNoTranslateElement(el)) return NodeFilter.FILTER_REJECT;
              if (SKIP_TEXT_TAGS.has(el.tagName)) {
                translateElementAttributes(el);
                return NodeFilter.FILTER_REJECT;
              }
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        },
      );

      let node = walker.nextNode();
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          translateTextNode(node as Text);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          translateElementAttributes(node as Element);
        }
        node = walker.nextNode();
      }
    };

    const runSweep = () => {
      if (document.body) translateSubtree(document.body);
    };

    runSweep();

    // Follow-up sweeps catch Suspense streams, dynamic chunks, and route paints.
    const rafId = window.requestAnimationFrame(runSweep);
    const timer1 = window.setTimeout(runSweep, 140);
    const timer2 = window.setTimeout(runSweep, 480);

    // Keep the browser tab title in the selected language as routes change.
    const savedTitle = titleState.current;
    const currentTitle = document.title;
    let titleSource =
      savedTitle && (currentTitle === savedTitle.translated || currentTitle === savedTitle.source)
        ? savedTitle.source
        : currentTitle;
    let titleTranslated = translate(titleSource);
    if (currentTitle !== titleTranslated) {
      document.title = titleTranslated;
    }
    titleState.current = { source: titleSource, translated: titleTranslated };

    const titleObserver = new MutationObserver(() => {
      const current = document.title;
      if (current !== titleSource && current !== titleTranslated) {
        titleSource = current;
      }
      const next = translate(titleSource);
      if (current !== next) document.title = next;
      titleTranslated = next;
      titleState.current = { source: titleSource, translated: next };
    });
    if (document.head) {
      titleObserver.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text);
        } else if (mutation.type === "childList") {
          mutation.addedNodes.forEach((added) => translateSubtree(added));
        } else if (mutation.type === "attributes" && mutation.attributeName) {
          translateAttribute(mutation.target as Element, mutation.attributeName);
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATED_ATTRIBUTES, "value"],
    });

    // Native dialogs bypass the React tree, so translate their messages while
    // the non-English language is active.
    const originalConfirm = window.confirm;
    const originalAlert = window.alert;
    const originalPrompt = window.prompt;
    window.confirm = (message?: string) => originalConfirm(translate(String(message ?? "")));
    window.alert = (message?: string) => originalAlert(translate(String(message ?? "")));
    window.prompt = (message?: string, defaultValue?: string) =>
      originalPrompt(translate(String(message ?? "")), defaultValue);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      observer.disconnect();
      titleObserver.disconnect();
      window.confirm = originalConfirm;
      window.alert = originalAlert;
      window.prompt = originalPrompt;
    };
  }, [pathname, ready, t]);

  return null;
}
