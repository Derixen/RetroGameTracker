export function createPageHeading({
  eyebrow,
  title,
  subtitle,
  countId,
  countLabel,
  actionText,
  actionHref,
}) {
  const heading = document.createElement("div");
  heading.className = "page-heading";

  const content = document.createElement("div");
  content.className = "page-heading-content";

  const eyebrowElement = document.createElement("p");
  eyebrowElement.className = "eyebrow";
  eyebrowElement.textContent = eyebrow;

  const titleElement = document.createElement("h1");
  titleElement.id = "page-title";
  titleElement.textContent = title;

  const subtitleElement = document.createElement("p");
  subtitleElement.id = "page-subtitle";
  subtitleElement.className = "page-subtitle";
  subtitleElement.textContent = subtitle;

  content.append(eyebrowElement, titleElement, subtitleElement);

  if (countId) {
    const count = document.createElement("div");
    count.id = countId;
    count.className = "count-chip";
    count.textContent = `0 ${countLabel}`;

    const counterRow = document.createElement("div");
    counterRow.className = "flex flex-wrap items-center gap-3";

    counterRow.append(count);

    if (actionText && actionHref) {
      const action = document.createElement("a");
      action.href = actionHref;
      action.className = "btn-primary px-4 py-2 text-sm whitespace-nowrap";
      action.textContent = actionText;

      counterRow.append(action);
    }

    content.append(counterRow);
  }

  heading.append(content);

  return heading;
}
