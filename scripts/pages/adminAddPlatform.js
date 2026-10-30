import { supabase } from "../supabase.js";

export async function initAdminAddPlatform(params = new URLSearchParams()) {
  const form = document.getElementById("add-platform-form");
  const saveButton = document.getElementById("save-platform");
  const errorMessage = document.getElementById("platform-error");
  const platformId = params.get("id");
  const isEditing = platformId !== null;

  if (isEditing) {
    document.querySelector(".page-heading h1").textContent = "Edit Platform";
    saveButton.textContent = "Update Platform";
  }

  if (isEditing) {
    try {
      const { data: platform, error } = await supabase
        .from("platforms")
        .select("*")
        .eq("id", platformId)
        .single();

      if (error) throw error;

      document.getElementById("platform-name").value = platform.name;

      document.getElementById("platform-manufacturer").value =
        platform.manufacturer ?? "";

      document.getElementById("platform-year").value =
        platform.release_year ?? "";
    } catch (error) {
      console.error("Failed to load platform:", error);

      errorMessage.textContent = error.message;
      errorMessage.hidden = false;

      saveButton.disabled = true;
      return;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorMessage.hidden = true;
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const name = document.getElementById("platform-name").value.trim();
    const manufacturer = document
      .getElementById("platform-manufacturer")
      .value.trim();
    const year = document.getElementById("platform-year").value;

    try {
      if (!name) {
        throw new Error("Platform name is required.");
      }

      const platformData = {
        name,
        manufacturer: manufacturer || null,
        release_year: year ? Number(year) : null,
      };

      let result;

      if (isEditing) {
        // Update the existing platform
        result = await supabase
          .from("platforms")
          .update(platformData)
          .eq("id", platformId)
          .select("id")
          .single();
      } else {
        // Create a new platform
        result = await supabase
          .from("platforms")
          .insert(platformData)
          .select("id")
          .single();
      }

      if (result.error) throw result.error;

      window.location.hash = "#/admin/platforms";
    } catch (error) {
      console.error("Failed to save platform:", error);

      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = isEditing ? "Update Platform" : "Save Platform";
    }
  });
}
