import { supabase } from "../supabase.js";

export async function initAdminAddSeries(params = new URLSearchParams()) {
  const form = document.getElementById("add-series-form");
  const saveButton = document.getElementById("save-series");
  const errorMessage = document.getElementById("series-error");

  const seriesId = params.get("id");
  const isEditing = seriesId !== null;

  if (isEditing) {
    document.querySelector(".page-heading h1").textContent = "Edit Game Series";
    saveButton.textContent = "Update Series";

    try {
      const { data: series, error } = await supabase
        .from("series")
        .select("*")
        .eq("id", seriesId)
        .single();

      if (error) throw error;

      document.getElementById("series-name").value = series.name;
      document.getElementById("series-description").value =
        series.description ?? "";
    } catch (error) {
      console.error("Failed to load series:", error);
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

    const name = document.getElementById("series-name").value.trim();
    const description = document
      .getElementById("series-description")
      .value.trim();

    try {
      if (!name) {
        throw new Error("Series name is required.");
      }

      const seriesData = {
        name,
        description: description || null,
      };

      let result;

      if (isEditing) {
        result = await supabase
          .from("series")
          .update(seriesData)
          .eq("id", seriesId)
          .select("id")
          .single();
      } else {
        result = await supabase
          .from("series")
          .insert(seriesData)
          .select("id")
          .single();
      }

      if (result.error) throw result.error;

      window.location.hash = "#/admin/series";
    } catch (error) {
      console.error("Failed to save series:", error);
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = isEditing ? "Update Series" : "Save Series";
    }
  });
}
