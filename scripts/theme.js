const THEME_STORAGE_KEY = "retrotrack-theme";

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme) {
  const selectedTheme = theme === "light" ? "light" : "dark";

  document.documentElement.dataset.theme = selectedTheme;

  document.querySelectorAll('input[name="profile-theme"]').forEach((input) => {
    input.checked = input.value === selectedTheme;
  });
}

function saveTheme(theme) {
  const selectedTheme = theme === "light" ? "light" : "dark";

  try {
    localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
  } catch {
    // Theme still works for the current page.
  }

  applyTheme(selectedTheme);
}

export function initTheme() {
  applyTheme(getSavedTheme());

  // Event delegation works with dynamically loaded profile pages.
  if (document.documentElement.dataset.themeListenerReady === "true") {
    return;
  }

  document.documentElement.dataset.themeListenerReady = "true";

  document.addEventListener("change", (event) => {
    const input = event.target;

    if (input instanceof HTMLInputElement && input.name === "profile-theme") {
      saveTheme(input.value);
    }
  });
}

export function syncThemeControls() {
  applyTheme(getSavedTheme());
}
