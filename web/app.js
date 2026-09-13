const state = {
  phase: "identify",
  imageBase64: "",
  initialMessage: "",
  candidate: null,
  partName: "car-part-concept",
  cad: "",
  explodedCad: "",
  previewUrl: "",
  damageParts: [],
};

const PART_LABELS = {
  hood: "hood",
  front_bumper_cover: "front bumper cover",
  front_fender: "front fender",
  wheel_arch_trim: "wheel-arch trim",
  side_mirror_housing: "side-mirror housing",
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

export function usableResultOutcome(result) {
  if (!result?.vehicle) return "invalid";
  if (result.outcome === "needs_lidar" && !result.cadPayload && !result.explodedCadPayload && result.userMessage) return "lidar";
  if (result.outcome === "rough_cad_ready" && result.cadPayload && result.explodedCadPayload) return "cad";
  return "invalid";
}

export function isRepairRequest(...messages) {
  return messages.some((message) => /\b(damag(?:e|ed)|repair|fix|replace|collision|dent|crack|scratch)\b/i.test(message || ""));
}

function element(id) { return document.getElementById(id); }

function setProgress(step) {
  document.querySelectorAll("[data-progress]").forEach((item) => item.classList.toggle("active", Number(item.dataset.progress) <= step));
}

function setWorking(message = "") {
  element("status-bar").hidden = !message;
  element("status-text").textContent = message;
  for (const button of document.querySelectorAll("button")) button.disabled = Boolean(message);
  element("part-photo").disabled = Boolean(message);
  if (!message) updateSendButton();
}

function updateSendButton() {
  const hasRequest = Boolean(element("message-input").value.trim());
  element("send-button").disabled = state.phase === "done" || !state.imageBase64 || !hasRequest;
}

function showError(error) {
  element("error-box").textContent = error instanceof Error ? error.message : String(error);
  element("error-box").hidden = false;
}

function clearError() { element("error-box").hidden = true; }

function appendMessage(role, text) {
  const message = document.createElement("article");
  message.className = `message ${role}-message`;
  const label = document.createElement("p");
  label.className = "message-label";
  label.textContent = role === "assistant" ? "Astra" : "You";
  const body = document.createElement("p");
  body.textContent = text;
  message.append(label, body);
  element("chat-log").append(message);
  message.scrollIntoView({ behavior: "smooth", block: "end" });
}

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
  const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  if (!acceptedTypes.has(file.type.toLowerCase())) throw new Error("Select or paste a JPG, PNG, WebP, or HEIC still image.");
  clearError();
  state.imageBase64 = await imageAsJpegBase64(file);
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = URL.createObjectURL(file);
  element("photo-preview").src = state.previewUrl;
  element("photo-preview").hidden = false;
  element("upload-prompt").hidden = true;
  element("cad-panel").hidden = true;
  element("repair-review").hidden = true;
  element("repair-output").hidden = true;
  element("damage-map").hidden = true;
  element("damage-map").replaceChildren();
  element("composer").hidden = false;
  state.phase = "identify";
  state.candidate = null;
  state.cad = "";
  state.explodedCad = "";
  state.damageParts = [];
  setProgress(1);
  element("message-input").placeholder = "Tell Astra what to identify or model. Example: Make a rough CAD model of the damaged left front fender.";
  element("send-button").textContent = "Send to Astra";
  updateSendButton();
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  return btoa(binary);
}

function renderItems(id, items, format, emptyText) {
  const list = element(id);
  list.replaceChildren();
  if (!items.length) {
    const row = document.createElement("li");
    row.textContent = emptyText;
    list.append(row);
    return;
  }
  for (const item of items) {
    const row = document.createElement("li");
    row.textContent = format(item);
    list.append(row);
  }
}

function renderSources(sources) {
  const list = element("sources-list");
  list.replaceChildren();
  if (!sources.length) {
    const row = document.createElement("li");
    row.textContent = "No usable OEM document or public scan was found.";
    list.append(row);
    return;
  }
  for (const source of sources) {
    const row = document.createElement("li");
    const link = document.createElement("a");
    let safeUrl = "";
    try {
      const url = new URL(source.url);
      if (["http:", "https:"].includes(url.protocol)) safeUrl = url.href;
    } catch {}
    link.textContent = source.title || "Untitled source";
    if (safeUrl) {
      link.href = safeUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    const tag = document.createElement("span");
    tag.className = "source-tag";
    const sourceType = source.sourceType || source.type || (source.official ? "official_document" : "other_reference");
    tag.textContent = ({ official_document: "OEM", public_scan: "public scan", other_reference: "web" })[sourceType] || sourceType.replaceAll("_", " ");
    row.append(link, tag);
    list.append(row);
  }
}

function renderEvidence(result) {
  renderItems("dimensions-list", result.dimensionEvidence || [], (item) => `${item.name}: ${item.value} ${item.unit} · ${item.method.replaceAll("_", " ")} · ${item.tolerance}`, "No dimensions are available yet.");
  renderItems("assumptions-list", result.assumptions || [], (item) => item, "No model assumptions are available yet.");
  renderSources(result.sources || []);
}

function renderResult(result) {
  const outcome = usableResultOutcome(result);
  if (outcome === "invalid") throw new Error("Astra returned an unsupported result.");
  state.phase = "done";
  state.partName = result.partName || state.partName;
  const vehicle = `${result.vehicle.year} ${result.vehicle.make} ${result.vehicle.model}`.trim();
  const part = PART_LABELS[result.partType] || result.partName;
  element("cad-summary").textContent = `${vehicle} · ${part}`;
  renderEvidence(result);

  if (outcome === "lidar") {
    state.cad = "";
    state.explodedCad = "";
    appendMessage("assistant", `${result.userMessage} A LiDAR scan is the next input before I create the CAD concept.`);
    element("output-title").textContent = "LiDAR scan needed before CAD";
    element("warning-detail").textContent = "No CAD file was generated. Capture the requested dimensions with a LiDAR-capable device before modelling continues.";
    element("download-actions").hidden = true;
  } else {
    state.cad = result.cadPayload;
    state.explodedCad = result.explodedCadPayload;
    appendMessage("assistant", `${result.summary} I created fitted and exploded rough CAD concepts.`);
    element("output-title").textContent = "Rough CAD concept ready";
    element("warning-detail").textContent = "This concept does not guarantee fit or safe vehicle installation.";
    element("download-actions").hidden = false;
  }

  element("composer").hidden = true;
  element("cad-panel").hidden = false;
  setProgress(4);
  element("cad-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDamageMap(parts) {
  const map = element("damage-map");
  map.replaceChildren();
  parts.forEach((part, index) => {
    const x = part.imageAnchor.x * 100;
    const y = part.imageAnchor.y * 100;
    const labelX = Math.min(76, x + 12);
    const labelY = Math.min(84, Math.max(3, y - 8 + index * 5));
    const pin = document.createElement("span");
    pin.className = "damage-pin";
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;
    const arrow = document.createElement("span");
    arrow.className = "damage-arrow";
    const dx = labelX - x;
    const dy = labelY - y;
    arrow.style.left = `${x}%`;
    arrow.style.top = `${y}%`;
    arrow.style.width = `${Math.hypot(dx, dy)}%`;
    arrow.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
    const label = document.createElement("span");
    label.className = "damage-label";
    label.style.left = `${labelX}%`;
    label.style.top = `${labelY}%`;
    label.textContent = `CAD: ${part.partName}`;
    map.append(pin, arrow, label);
  });
  map.hidden = parts.length === 0;
}

function renderDamageReview(result) {
  state.damageParts = result.damageParts || [];
  const carousel = element("damage-carousel");
  carousel.replaceChildren();
  renderDamageMap(state.damageParts);
  element("repair-summary").textContent = result.userMessage || "Confirm each damaged CAD part before generation.";
  const reference = element("reference-model");
  reference.replaceChildren();
  if (result.referenceAsset) {
    const link = document.createElement("a");
    link.href = result.referenceAsset.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = result.referenceAsset.title;
    reference.append("Reference 3D model: ", link, ` · ${result.referenceAsset.license} · ${result.referenceAsset.creator}`);
    reference.hidden = false;
  } else {
    reference.hidden = true;
  }
  for (const part of state.damageParts) {
    const card = document.createElement("article");
    card.className = "damage-card";
    const label = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = true;
    check.dataset.damageId = part.id;
    const text = document.createElement("span");
    const name = document.createElement("b");
    name.textContent = part.partName;
    const description = document.createElement("span");
    description.textContent = `${part.damageDescription} (${Math.round(part.confidence * 100)}% confidence)`;
    text.append(name, description);
    label.append(check, text);
    card.append(label);
    carousel.append(card);
  }
  const hasParts = state.damageParts.length > 0;
  element("generate-repair-button").hidden = !hasParts;
  element("repair-review").hidden = false;
  element("composer").hidden = true;
  appendMessage("assistant", hasParts ? "Damage detected on these parts. Confirm the parts you want to repair." : "No supported exterior damage is visible in this image.");
  element("repair-review").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRepairCad(result) {
  const downloads = element("repair-downloads");
  downloads.replaceChildren();
  for (const part of result.repairCad) {
    const card = document.createElement("section");
    card.className = "repair-download";
    const heading = document.createElement("h3");
    heading.textContent = part.partName;
    const actions = document.createElement("div");
    actions.className = "download-actions";
    for (const [label, content, suffix] of [["Download fitted OpenSCAD", part.cadPayload, ""], ["Download exploded OpenSCAD", part.explodedCadPayload, "-exploded"]]) {
      const button = document.createElement("button");
      button.className = label.startsWith("Download fitted") ? "primary" : "secondary";
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => downloadCad(content, suffix, part.partName));
      actions.append(button);
    }
    card.append(heading, actions);
    downloads.append(card);
  }
  element("repair-review").hidden = true;
  element("repair-output").hidden = false;
  state.phase = "done";
  setProgress(4);
}

async function identifyPhoto() {
  const input = element("message-input");
  state.initialMessage = input.value.trim();
  appendMessage("user", state.initialMessage || "I uploaded this car photo. Identify the vehicle and visible exterior part.");
  input.value = "";
  setWorking("Astra is identifying the vehicle and exterior part");
  try {
    const result = await postAstra({ phase: "identify", image_base64: state.imageBase64, user_text: state.initialMessage });
    state.candidate = result;
    appendMessage("assistant", result.userMessage);
    state.phase = "confirm";
    input.placeholder = "Reply naturally. Example: yes, but it is a 2021 model.";
    element("send-button").textContent = "Continue with Astra";
    setProgress(2);
  } catch (error) {
    showError(error);
    element("send-button").textContent = "Retry identification";
  } finally {
    setWorking();
  }
}

async function sendMessage() {
  const input = element("message-input");
  const reply = input.value.trim();
  if (state.phase === "identify") {
    if (!state.imageBase64) return showError("Upload or paste a car photo first.");
    if (!reply) return showError("Type what you want Astra to do before sending.");
    await identifyPhoto();
    return;
  }

  if (state.phase === "confirm") {
    if (!reply) return showError("Send a short reply so Astra knows how to continue.");
    appendMessage("user", reply);
    input.value = "";
    setProgress(3);
    const repair = isRepairRequest(state.initialMessage, reply);
    setWorking(repair ? "Astra is mapping visible damage to CAD parts" : "Astra is checking OEM sources, public scans, and CAD options");
    try {
      const analysisPhase = repair ? { phase: "damage_assessment" } : { phase: "research_and_generate" };
      const result = await postAstra({
        ...analysisPhase,
        image_base64: state.imageBase64,
        user_text: state.initialMessage,
        candidate_vehicle: state.candidate.vehicle,
        candidate_part: state.candidate.partType,
        previous_reply: state.candidate.userMessage,
        confirmation_text: reply,
      });
      if (repair) {
        state.candidate = {...state.candidate, vehicle: result.vehicle};
        renderDamageReview(result);
        state.phase = "repair_confirm";
        setProgress(3);
        return;
      }
      if (result.outcome === "vehicle_candidate") {
        state.candidate = result;
        appendMessage("assistant", result.userMessage);
        input.placeholder = "Reply naturally with any detail Astra asks for.";
        element("send-button").textContent = "Continue with Astra";
        setProgress(2);
        return;
      }
      renderResult(result);
    } catch (error) { showError(error); }
    finally { setWorking(); }
  }
}

function downloadCad(content, suffix = "", partName = state.partName) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${partName.replace(/[^A-Za-z0-9_-]/g, "-") || "car-part-concept"}${suffix}.scad`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function init() {
  element("part-photo").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { await useImage(file); }
    catch (error) { showError(error); }
    finally { event.target.value = ""; }
  });

  document.addEventListener("paste", async (event) => {
    const file = imageFileFromClipboard(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    try { await useImage(file); }
    catch (error) { showError(error); }
  });

  element("send-button").addEventListener("click", sendMessage);
  element("message-input").addEventListener("input", updateSendButton);
  element("message-input").addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });
  element("download-button").addEventListener("click", () => downloadCad(state.cad));
  element("exploded-download-button").addEventListener("click", () => downloadCad(state.explodedCad, "-exploded"));
  element("restart-button").addEventListener("click", () => location.reload());
  element("generate-repair-button").addEventListener("click", async () => {
    const selected = state.damageParts.filter((part) => document.querySelector(`[data-damage-id="${CSS.escape(part.id)}"]`)?.checked);
    if (!selected.length) return showError("Confirm at least one damaged part before CAD generation.");
    setWorking("Astra is creating repair CAD concepts");
    try {
      const result = await postAstra({ phase: "repair_generate", image_base64: state.imageBase64, candidate_vehicle: state.candidate.vehicle, selected_damage_parts: selected });
      renderRepairCad(result);
    } catch (error) { showError(error); }
    finally { setWorking(); }
  });
}

if (typeof document !== "undefined") init();
