const state = {
  imageBase64: "",
  vehicle: null,
  partName: "car-part",
  cad: "",
  explodedCad: "",
};

export function fittedFrameSize(width, height, maximum = 1800) {
  if (!(width > 0 && height > 0 && maximum > 0)) throw new Error("Invalid image size.");
  const scale = Math.min(1, maximum / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function imageFileFromClipboard(clipboardData) {
  for (const item of Array.from(clipboardData?.items || [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return Array.from(clipboardData?.files || []).find((file) => file.type.startsWith("image/")) || null;
}


function element(id) { return document.getElementById(id); }

function setProgress(step) {
  document.querySelectorAll("[data-progress]").forEach((item) => item.classList.toggle("active", Number(item.dataset.progress) <= step));
}

function setWorking(message = "") {
  element("status-bar").hidden = !message;
  element("status-text").textContent = message;
  for (const button of document.querySelectorAll("button")) button.disabled = Boolean(message);
  if (!message) {
    element("identify-button").disabled = !state.imageBase64;
    element("confirm-button").disabled = false;
  }
}

function showError(error) {
  element("error-box").textContent = error instanceof Error ? error.message : String(error);
  element("error-box").hidden = false;
}

function clearError() { element("error-box").hidden = true; }

async function postAstra(body) {
  clearError();
  const response = await fetch("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Astra request failed.");
  return result;
}

async function imageAsJpegBase64(file) {
  const bitmap = await createImageBitmap(file);
  const size = fittedFrameSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .84));
  if (!blob) throw new Error("The browser could not prepare this photo.");
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

async function useImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Select or paste an image file.");
  clearError();
  state.imageBase64 = await imageAsJpegBase64(file);
  element("photo-preview").src = URL.createObjectURL(file);
  element("photo-preview").hidden = false;
  element("upload-prompt").hidden = true;
  element("identify-button").disabled = false;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  return btoa(binary);
}

function confirmedVehicle() {
  return {
    make: element("vehicle-make").value.trim(),
    model: element("vehicle-model").value.trim(),
    year: element("vehicle-year").value.trim(),
  };
}

function renderResult(result) {
  if (result.outcome === "needs_dimensions") {
    const missing = result.missingDimensions.length ? ` Missing: ${result.missingDimensions.join(", ")}.` : "";
    element("missing-instruction").textContent = `${result.userMessage}${missing}`;
    element("measure-panel").hidden = false;
    element("cad-panel").hidden = true;
    setProgress(3);
    element("measure-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (result.outcome === "cad_ready" && result.cadPayload) {
    state.cad = result.cadPayload;
    state.explodedCad = result.explodedCadPayload;
    state.partName = result.partName || state.partName;
    element("measure-panel").hidden = true;
    element("cad-panel").hidden = false;
    setProgress(4);
    element("cad-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  throw new Error("Astra returned an unsupported result.");
}

function init() {
  element("part-photo").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { await useImage(file); }
    catch (error) { showError(error); }
  });

  document.addEventListener("paste", async (event) => {
    const file = imageFileFromClipboard(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    try { await useImage(file); }
    catch (error) { showError(error); }
  });

  element("identify-button").addEventListener("click", async () => {
    setWorking("Astra is identifying the vehicle and part");
    try {
      const result = await postAstra({ phase: "identify", image_base64: state.imageBase64, user_text: element("part-notes").value.trim() });
      state.vehicle = result.vehicle;
      state.partName = result.partName;
      element("vehicle-make").value = result.vehicle.make;
      element("vehicle-model").value = result.vehicle.model;
      element("vehicle-year").value = result.vehicle.year;
      element("part-result").textContent = `Detected part: ${result.partName}`;
      element("confidence").textContent = `Photo confidence: ${Math.round(result.vehicle.confidence * 100)}%. Correct any field before research.`;
      element("vehicle-panel").hidden = false;
      setProgress(2);
      element("vehicle-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) { showError(error); }
    finally { setWorking(); }
  });

  element("confirm-button").addEventListener("click", async () => {
    const vehicle = confirmedVehicle();
    if (!vehicle.make || !vehicle.model || !vehicle.year) { showError("Make, model, and year are required."); return; }
    setWorking("Astra is checking pre-indexed dimensional documents");
    try {
      const result = await postAstra({ phase: "research_and_generate", image_base64: state.imageBase64, user_text: element("part-notes").value.trim(), confirmed_vehicle: vehicle });
      state.vehicle = vehicle;
      renderResult(result);
    } catch (error) { showError(error); }
    finally { setWorking(); }
  });

  element("download-button").addEventListener("click", () => {
    const blob = new Blob([state.cad], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.partName.replace(/[^A-Za-z0-9_-]/g, "-") || "car-part"}.scad`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
  element("exploded-download-button").addEventListener("click", () => {
    const blob = new Blob([state.explodedCad], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.partName.replace(/[^A-Za-z0-9_-]/g, "-") || "car-part"}-exploded.scad`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
  element("missing-restart-button").addEventListener("click", () => location.reload());
  element("restart-button").addEventListener("click", () => location.reload());
}

if (typeof document !== "undefined") init();
