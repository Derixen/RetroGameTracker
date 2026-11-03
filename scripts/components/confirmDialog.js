let dialog = null;

export function confirmDialog({
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  alertOnly = false,
  passwordInput = false,
} = {}) {
  return new Promise((resolve) => {
    // Create the dialog once and reuse it
    if (!dialog || !dialog.isConnected) {
      dialog = document.createElement("dialog");

      dialog.className =
        "w-full max-w-sm rounded-xl border border-slate-700 " +
        "bg-slate-900 p-6 text-white shadow-2xl backdrop:bg-black/70";

      dialog.innerHTML = `
        <h2 class="mb-3 text-xl font-bold text-white"></h2>
        <p class="mb-6 whitespace-pre-line text-sm text-slate-400"></p>
        
        <input
          type="password"
          data-password
          placeholder="Enter your password"
          autocomplete="current-password"
          class="mb-6 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-pink-500"
          hidden
        />


        <div class="flex justify-end gap-3">
          <button
            type="button"
            data-cancel
            class="rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            data-confirm
            class="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      `;

      document.body.append(dialog);
    }

    const heading = dialog.querySelector("h2");
    const description = dialog.querySelector("p");
    const cancelButton = dialog.querySelector("[data-cancel]");
    const confirmButton = dialog.querySelector("[data-confirm]");
    const passwordField = dialog.querySelector("[data-password]");
    passwordField.hidden = !passwordInput;
    passwordField.value = "";

    heading.textContent = title;
    description.textContent = message;
    cancelButton.textContent = cancelText;
    confirmButton.textContent = confirmText;
    cancelButton.hidden = alertOnly;
    confirmButton.textContent = alertOnly ? "OK" : confirmText;

    confirmButton.classList.toggle("bg-red-500", !alertOnly);
    confirmButton.classList.toggle("hover:bg-red-600", !alertOnly);
    confirmButton.classList.toggle("bg-pink-500", alertOnly);
    confirmButton.classList.toggle("hover:bg-pink-600", alertOnly);

    const finish = (confirmed) => {
      dialog.removeEventListener("cancel", onEscape);
      cancelButton.removeEventListener("click", onCancel);
      confirmButton.removeEventListener("click", onConfirm);

      dialog.close();
      resolve(
        passwordInput ? (confirmed ? passwordField.value : null) : confirmed,
      );
    };

    const onCancel = () => finish(false);
    const onConfirm = () => finish(true);

    const onEscape = (event) => {
      event.preventDefault();
      finish(false);
    };

    dialog.addEventListener("cancel", onEscape);

    cancelButton.addEventListener("click", onCancel);
    confirmButton.addEventListener("click", onConfirm);

    if (passwordInput) {
      confirmButton.disabled = true;

      passwordField.oninput = () => {
        confirmButton.disabled = !passwordField.value.trim();
      };
    } else {
      confirmButton.disabled = false;
      passwordField.oninput = null;
    }

    dialog.showModal();
  });
}
