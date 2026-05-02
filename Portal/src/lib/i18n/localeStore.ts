import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { getBrowserLocale, type Locale } from "./detector";

function createLocaleStore() {
  const initialLocale = browser ? getBrowserLocale() : "en";

  const { subscribe, set } = writable<Locale>(initialLocale);

  return {
    subscribe,
    setLocale: (locale: Locale) => {
      set(locale);
      // Persist to localStorage for consistency across sessions
      if (browser) {
        localStorage.setItem("seelefelix-locale", locale);
      }
    },
    initialize: () => {
      if (browser) {
        const stored = localStorage.getItem(
          "seelefelix-locale",
        ) as Locale | null;
        if (stored && ["en", "zh", "ja", "de"].includes(stored)) {
          set(stored);
        } else {
          set(getBrowserLocale());
        }
      }
    },
  };
}

export const localeStore = createLocaleStore();
