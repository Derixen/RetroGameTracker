import { t } from "../i18n.js";

// Translation keys use v026 for version 0.2.6, v100 for 1.0.0, etc.
// New versions require only translation entries in en.json and hu.json.
function getChangelogVersions() {
  const versions = [];

  for (let number = 0; number <= 999; number++) {
    const key = `v${String(number).padStart(3, "0")}`;
    const titleKey = `changelog.${key}.title`;
    const title = t(titleKey);

    // Our i18n helper returns the key when a translation is missing.
    if (typeof title !== "string" || !title.trim() || title === titleKey) {
      continue;
    }

    const items = [];
    for (let index = 1; index <= 100; index++) {
      const itemKey = `changelog.${key}.item${index}`;
      const value = t(itemKey);
      if (typeof value !== "string" || !value.trim() || value === itemKey) {
        break;
      }
      items.push(value);
    }

    versions.push({ number, title, items });
  }

  return versions.sort((a, b) => b.number - a.number);
}

function createVersion(version, isLatest) {
  const wrapper = document.createElement("div");
  wrapper.className = isLatest ? "space-y-4" : "border-l-2 border-sky-500 pl-5";

  const label = document.createElement("span");
  label.className = isLatest
    ? "rounded-full bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-400"
    : "rounded-md bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-400";
  label.textContent = `v${Math.floor(version.number / 100)}.${Math.floor(version.number / 10) % 10}.${version.number % 10}`;

  const heading = document.createElement(isLatest ? "h2" : "h3");
  heading.className = isLatest ? "text-xl font-bold" : "mt-3 text-lg font-bold";
  heading.textContent = version.title;

  if (isLatest) {
    const header = document.createElement("div");
    header.className = "flex flex-wrap items-center gap-3";
    header.append(label, heading);
    wrapper.append(header);
  } else {
    wrapper.append(label, heading);
  }

  const list = document.createElement("ul");
  list.className = isLatest
    ? "list-disc space-y-2 pl-5"
    : "mt-3 list-disc space-y-2 pl-5 text-sm";

  for (const item of version.items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }

  wrapper.append(list);
  return wrapper;
}

export function initChangelog() {
  const container = document.getElementById("changelog-versions");
  if (!container) return;

  const versions = getChangelogVersions();
  container.replaceChildren();

  if (!versions.length) {
    const empty = document.createElement("p");
    empty.className = "text-sm";
    empty.textContent = "No changelog entries available.";
    container.append(empty);
    return;
  }

  versions.forEach((version, index) => {
    container.append(createVersion(version, index === 0));
  });
}
