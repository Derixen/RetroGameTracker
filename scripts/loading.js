export function showLoadingOverlay() {
  document.getElementById("app-loading-overlay")?.classList.remove("fade-out");
}

export function hideLoadingOverlay() {
  requestAnimationFrame(() => {
    document.getElementById("app-loading-overlay")?.classList.add("fade-out");
  });
}
