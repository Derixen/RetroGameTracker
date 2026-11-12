const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = ["en", "hu"];

let currentLanguage = DEFAULT_LANGUAGE;
const translations = {};

function getTranslation(language, key) {
  return key
    .split(".")
    .reduce((value, part) => value?.[part], translations[language]);
}

export function t(key, params = {}) {
  const translated =
    getTranslation(currentLanguage, key) ??
    getTranslation(DEFAULT_LANGUAGE, key);

  if (typeof translated !== "string") {
    return key;
  }

  return translated.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}

export function translatePage(root = document) {
  // Translate text content

  root.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const key = element.dataset.i18nAlt;
    const translation = t(key);

    if (translation !== key) {
      element.setAttribute("alt", translation);
    }
  });

  root.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const translation = t(key);

    if (translation !== key) {
      element.textContent = translation;
    }
  });

  // Translate input placeholders
  root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    const translation = t(key);

    if (translation !== key) {
      element.setAttribute("placeholder", translation);
    }
  });

  // Translate accessibility labels
  root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    const translation = t(key);

    if (translation !== key) {
      element.setAttribute("aria-label", translation);
    }
  });
}

export function getLanguage() {
  return currentLanguage;
}

export async function setLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    language = DEFAULT_LANGUAGE;
  }

  await loadLanguage(DEFAULT_LANGUAGE);
  await loadLanguage(language);

  currentLanguage = language;
  localStorage.setItem("language", language);

  document.documentElement.lang = language;
  translatePage();
  document.dispatchEvent(
    new CustomEvent("languagechange", {
      detail: { language },
    }),
  );
}

async function loadLanguage(language) {
  if (translations[language]) return;

  const response = await fetch(`/locales/${language}.json`);

  if (!response.ok) {
    throw new Error(`Failed to load language: ${language}`);
  }

  translations[language] = await response.json();
}

export async function initI18n() {
  const savedLanguage = localStorage.getItem("language");
  const language = SUPPORTED_LANGUAGES.includes(savedLanguage)
    ? savedLanguage
    : DEFAULT_LANGUAGE;

  await setLanguage(language);
}
