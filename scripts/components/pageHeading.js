import { t } from "../i18n.js";

export function createPageHeading({
  eyebrow,
  title,
  subtitle,
  countId,
  countLabel,
  actionText,
  actionHref,

  // Optional localization keys
  eyebrowKey,
  titleKey,
  subtitleKey,
  countLabelKey,
  actionTextKey,
}) {
  const heading = document.createElement("div");
  heading.className = "page-heading";

  const content = document.createElement("div");
  content.className = "page-heading-content";

  const eyebrowElement = document.createElement("p");
  eyebrowElement.className = "eyebrow";
  eyebrowElement.textContent = eyebrowKey ? t(eyebrowKey) : (eyebrow ?? "");

  const titleElement = document.createElement("h1");
  titleElement.id = "page-title";
  titleElement.textContent = titleKey ? t(titleKey) : (title ?? "");

  const subtitleElement = document.createElement("p");
  subtitleElement.id = "page-subtitle";
  subtitleElement.className = "page-subtitle";
  subtitleElement.textContent = subtitleKey ? t(subtitleKey) : (subtitle ?? "");

  content.append(eyebrowElement, titleElement, subtitleElement);

  // Keep translated headings in sync with language changes
  if (eyebrowKey) {
    eyebrowElement.dataset.i18n = eyebrowKey;
  }

  if (titleKey) {
    titleElement.dataset.i18n = titleKey;
  }

  if (subtitleKey) {
    subtitleElement.dataset.i18n = subtitleKey;
  }

  if (countId) {
    const count = document.createElement("div");
    count.id = countId;
    count.className = "count-chip";

    // Initial count
    count.textContent = `0 ${
      countLabelKey ? t(countLabelKey) : (countLabel ?? "")
    }`;

    const counterRow = document.createElement("div");
    counterRow.className = "flex flex-wrap items-center gap-3";

    counterRow.append(count);

    if (actionText || actionTextKey) {
      if (actionHref) {
        const action = document.createElement("a");
        action.href = actionHref;
        action.className = "btn-primary px-4 py-2 text-sm whitespace-nowrap";

        action.textContent = actionTextKey ? t(actionTextKey) : actionText;

        if (actionTextKey) {
          action.dataset.i18n = actionTextKey;
        }

        counterRow.append(action);
      }
    }

    content.append(counterRow);
  }

  heading.append(content);

  return heading;
}
