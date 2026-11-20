import { supabase } from "../supabase.js";

export async function initPlatformDetails(params = new URLSearchParams()) {
  const id = params.get("id");
  const loading = document.getElementById("platform-details-loading");
  const content = document.getElementById("platform-details-content");
  const errorBox = document.getElementById("platform-details-error");
  if (!id || !/^\\d+$/.test(id)) {
    loading.hidden = true;
    errorBox.textContent = "Invalid platform ID.";
    errorBox.hidden = false;
    return;
  }

  try {
    const [{ data: platform, error }, { data: { user }, error: authError }] =
      await Promise.all([
        supabase.from("platforms").select("id,name,manufacturer,release_year,image_url").eq("id", id).single(),
        supabase.auth.getUser()
      ]);
    if (error) throw error;
    if (authError) throw authError;
    if (!user) throw new Error("Sign in to view your console models.");

    document.getElementById("platform-detail-name").textContent = platform.name;
    document.getElementById("platform-detail-manufacturer").textContent = platform.manufacturer || "Unknown manufacturer";
    document.getElementById("platform-detail-maker").textContent = platform.manufacturer || "Unknown";
    document.getElementById("platform-detail-year").textContent = platform.release_year ?? "Unknown";
    document.getElementById("platform-detail-games").href = `#/games?platform=${encodeURIComponent(platform.name)}`;
    const image = document.getElementById("platform-detail-image");
    if (platform.image_url) {
      image.src = platform.image_url;
      image.hidden = false;
      document.getElementById("platform-detail-placeholder").hidden = true;
    }

    const list = document.getElementById("console-model-list");
    const empty = document.getElementById("console-model-empty");
    const listError = document.getElementById("console-model-error");
    const dialog = document.getElementById("console-model-dialog");
    const form = document.getElementById("console-model-form");
    const formError = document.getElementById("console-model-form-error");
    const save = document.getElementById("console-model-save");
    let models = [];
    let editingId = null;

    const field = (name) => document.getElementById(`console-model-${name}`);
    function clearForm() {
      editingId = null;
      form.reset();
      formError.hidden = true;
      field("dialog-title").textContent = "Add Console Model";
      save.textContent = "Save Console";
    }

    async function loadModels() {
      const { data, error } = await supabase.from("console_models")
        .select("id,model_name,model_number,condition,ownership_status,image_url,image_path,notes")
        .eq("platform_id", platform.id).eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      models = data || [];
      await renderModels();
    }

    async function renderModels() {
      list.replaceChildren();
      empty.hidden = models.length > 0;
      for (const model of models) {
        const card = document.createElement("div");
        card.className = "rounded-xl border border-slate-500/30 p-4 flex flex-wrap items-center gap-4";
        const img = document.createElement("img");
        img.className = "h-24 w-24 rounded-lg object-contain";
        img.alt = model.model_name;
        let url = model.image_url;
        if (model.image_path) {
          const { data, error } = await supabase.storage.from("console-images").createSignedUrl(model.image_path, 3600);
          if (!error) url = data?.signedUrl;
        }
        if (url) {
          img.src = url;
          img.onerror = () => { img.hidden = true; };
          card.append(img);
        }
        const info = document.createElement("div");
        info.className = "min-w-0 flex-1";
        const name = document.createElement("h3");
        name.className = "font-bold text-lg";
        name.textContent = model.model_name;
        const meta = document.createElement("p");
        meta.className = "text-sm text-slate-400";
        meta.textContent = [model.model_number, model.condition, model.ownership_status.replaceAll("_", " ")].filter(Boolean).join(" · ");
        info.append(name, meta);
        if (model.notes) {
          const notes = document.createElement("p");
          notes.className = "mt-2 text-sm whitespace-pre-line";
          notes.textContent = model.notes;
          info.append(notes);
        }
        card.append(info);
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "btn-secondary px-3 py-2 text-sm";
        edit.textContent = "Edit";
        edit.onclick = () => {
          clearForm();
          editingId = model.id;
          field("name").value = model.model_name;
          field("number").value = model.model_number || "";
          field("condition").value = model.condition || "";
          field("status").value = model.ownership_status;
          field("image-url").value = model.image_url || "";
          field("notes").value = model.notes || "";
          field("dialog-title").textContent = "Edit Console Model";
          save.textContent = "Update Console";
          dialog.showModal();
        };
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn-secondary px-3 py-2 text-sm";
        remove.textContent = "Delete";
        remove.onclick = async () => {
          if (!window.confirm(`Delete "${model.model_name}"?`)) return;
          try {
            const { error } = await supabase.from("console_models").delete().eq("id", model.id).eq("user_id", user.id);
            if (error) throw error;
            if (model.image_path) {
              const { error: storageError } = await supabase.storage.from("console-images").remove([model.image_path]);
              if (storageError) console.warn("Image cleanup failed", storageError);
            }
            await loadModels();
          } catch (e) {
            listError.textContent = e.message;
            listError.hidden = false;
          }
        };
        card.append(edit, remove);
        list.append(card);
      }
    }

    document.getElementById("console-model-add").onclick = () => {
      clearForm();
      dialog.showModal();
    };
    document.getElementById("console-model-cancel").onclick = () => dialog.close();
    form.onsubmit = async (event) => {
      event.preventDefault();
      save.disabled = true;
      formError.hidden = true;
      let newImagePath = null;
      try {
        const name = field("name").value.trim();
        if (!name) throw new Error("Model name is required.");
        const file = field("image-file").files[0];
        const imageUrl = field("image-url").value.trim();
        if (file && imageUrl) throw new Error("Choose either an image URL or a file, not both.");
        if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error("Image URL must use HTTPS.");
        const previous = models.find((model) => model.id === editingId);
        let imagePath = previous?.image_path ?? null;
        let finalImageUrl = imageUrl || (previous?.image_url ?? null);
        if (file) {
          const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
          if (!extensions[file.type] || file.size > 5 * 1024 * 1024) throw new Error("Use JPG, PNG or WebP under 5 MB.");
          newImagePath = `${user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
          const { error } = await supabase.storage.from("console-images").upload(newImagePath, file, { contentType: file.type });
          if (error) throw error;
          imagePath = newImagePath;
          finalImageUrl = null;
        } else if (imageUrl) {
          imagePath = null;
        }
        const record = {
          platform_id: platform.id, user_id: user.id, model_name: name,
          model_number: field("number").value.trim() || null,
          condition: field("condition").value || null,
          ownership_status: field("status").value,
          image_url: finalImageUrl, image_path: imagePath,
          notes: field("notes").value.trim() || null
        };
        const query = editingId
          ? supabase.from("console_models").update(record).eq("id", editingId).eq("user_id", user.id)
          : supabase.from("console_models").insert(record);
        const { error } = await query.select("id").single();
        if (error) throw error;
        if (previous?.image_path && previous.image_path !== imagePath) {
          const { error: cleanupError } = await supabase.storage.from("console-images").remove([previous.image_path]);
          if (cleanupError) console.warn("Image cleanup failed", cleanupError);
        }
        dialog.close();
        await loadModels();
      } catch (e) {
        if (newImagePath) {
          const { error: cleanupError } = await supabase.storage.from("console-images").remove([newImagePath]);
          if (cleanupError) console.warn("Upload cleanup failed", cleanupError);
        }
        formError.textContent = e.message;
        formError.hidden = false;
      } finally {
        save.disabled = false;
      }
    };
    await loadModels();
    content.hidden = false;
  } catch (error) {
    console.error("Platform details failed:", error);
    errorBox.textContent = error.message || "Could not load platform.";
    errorBox.hidden = false;
  } finally {
    loading.hidden = true;
  }
}
