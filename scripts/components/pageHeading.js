export function createPageHeading({
  eyebrow,
  title,
  subtitle,
  countId,
  countLabel,
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
    content.append(count);
  }

  heading.append(content);

  return heading;
}
