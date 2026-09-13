const state = {
  imageBase64: "",
  vehicle: null,
  partName: "car-part",
  meshText: "",
  normalizedMesh: "",
  cad: "",
};

export function fittedFrameSize(width, height, maximum = 1800) {
  if (!(width > 0 && height > 0 && maximum > 0)) throw new Error("Invalid camera frame size.");
  const scale = Math.min(1, maximum / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}


export function normalizeObjToMillimeters(text, unit = "m", correction = 1) {
  const unitScale = { m: 1000, cm: 10, mm: 1 }[unit];
  if (!unitScale || !Number.isFinite(correction) || correction <= 0) throw new Error("Invalid mesh scale.");
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  let vertices = 0;
  const lines = text.split(/\r?\n/).map((line) => {
    if (!/^v\s/.test(line)) return line;
    const values = line.trim().split(/\s+/).slice(1, 4).map(Number);
    if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) throw new Error("The OBJ contains an invalid vertex.");
    const scaled = values.map((value) => value * unitScale * correction);
    scaled.forEach((value, index) => {
      bounds.min[index] = Math.min(bounds.min[index], value);
      bounds.max[index] = Math.max(bounds.max[index], value);
    });
    vertices += 1;
    return `v ${scaled.map(formatNumber).join(" ")}`;
  });
  if (!vertices) throw new Error("The OBJ does not contain vertices.");
  const size = bounds.max.map((value, index) => value - bounds.min[index]);
  return { text: `# normalized by CarPart CAD; units are millimetres\n${lines.join("\n")}`, size, vertices, correction };
}

function formatNumber(value) {
  return Number(value.toFixed(6)).toString();
}

export async function detectDepthCapability(nav = navigator, scope = globalThis) {
  const isIPhone = /iPhone/i.test(nav.userAgent || "");
  const hasDepthInterface = "XRCPUDepthInformation" in scope || "XRWebGLDepthInformation" in scope;
  let immersiveAR = false;
  try {
    immersiveAR = Boolean(nav.xr && await nav.xr.isSessionSupported("immersive-ar"));
  } catch (_) {
    immersiveAR = false;
  }
  return { isIPhone, immersiveAR, directMeshAccess: immersiveAR && hasDepthInterface };
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
    element("mesh-button").disabled = !state.normalizedMesh;
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

async function renderCapability() {
  const capability = await detectDepthCapability();
  const box = element("device-check");
  if (capability.directMeshAccess) {
    box.classList.add("supported");
    element("device-title").textContent = "Depth-capable browser detected";
    element("device-detail").textContent = "This browser reports immersive AR and a depth interface. OBJ import remains the validated demo path.";
  } else if (capability.isIPhone) {
    element("device-title").textContent = "iPhone detected; web LiDAR is not exposed";
    element("device-detail").textContent = "Safari does not identify the iPhone model or provide its raw ARKit mesh. Import a LiDAR OBJ below.";
  } else {
    element("device-title").textContent = "No browser LiDAR interface detected";
    element("device-detail").textContent = "Open this page on the iPhone for capture guidance, then import a measured OBJ.";
  }
}

function renderResult(result) {
  if (result.outcome === "needs_lidar") {
    element("scan-instruction").textContent = result.userMessage;
    element("measure-panel").hidden = false;
    element("cad-panel").hidden = true;
    setProgress(3);
    renderCapability();
    element("measure-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (result.outcome === "cad_ready" && result.cadPayload) {
    state.cad = result.cadPayload;
    state.partName = result.partName || state.partName;
    element("measure-panel").hidden = true;
    element("cad-panel").hidden = false;
    setProgress(4);
    element("cad-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  throw new Error("Astra returned an unsupported result.");
}

function calibrationCorrection() {
  const known = Number(element("known-length").value);
  const observed = Number(element("mesh-length").value);
  if (!known && !observed) return 1;
  if (!(known > 0 && observed > 0)) throw new Error("Enter both reference lengths, or leave both blank.");
  return known / observed;
}

function updateMeshMeasurement() {
  if (!state.meshText) return;
  try {
    clearError();
    const result = normalizeObjToMillimeters(state.meshText, element("mesh-unit").value, calibrationCorrection());
    state.normalizedMesh = result.text;
    ["x", "y", "z"].forEach((axis, index) => { element(`size-${axis}`).textContent = `${result.size[index].toFixed(1)} mm`; });
    element("mesh-summary").textContent = `${result.vertices.toLocaleString()} vertices. Scale correction: ${result.correction.toFixed(4)}×. Verify fit-critical features with a caliper.`;
    element("mesh-button").disabled = false;
  } catch (error) {
    state.normalizedMesh = "";
    element("mesh-button").disabled = true;
    showError(error);
  }
}

function init() {
  element("part-photo").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      clearError();
      state.imageBase64 = await imageAsJpegBase64(file);
      element("photo-preview").src = URL.createObjectURL(file);
      element("photo-preview").hidden = false;
      element("capture-prompt").hidden = true;
      element("identify-button").disabled = false;
    } catch (error) { showError(error); }
  });

  element("identify-button").addEventListener("click", async () => {
    setWorking("Astra is identifying the vehicle and part");
    try {
      const result = await postAstra({ phase: "identify", image_base64: state.imageBase64, scan_captured: false });
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
    setWorking("Astra is checking official dimensions");
    try {
      const result = await postAstra({ phase: "research_and_generate", image_base64: state.imageBase64, confirmed_vehicle: vehicle, scan_captured: false });
      state.vehicle = vehicle;
      renderResult(result);
    } catch (error) { showError(error); }
    finally { setWorking(); }
  });

  element("mesh-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10_000_000) { showError("Use an OBJ file smaller than 10 MB."); return; }
    state.meshText = await file.text();
    element("mesh-tools").hidden = false;
    updateMeshMeasurement();
  });
  for (const id of ["mesh-unit", "known-length", "mesh-length"]) element(id).addEventListener("input", updateMeshMeasurement);

  element("mesh-button").addEventListener("click", async () => {
    setWorking("Astra is applying measured constraints to the CAD model");
    try {
      const mesh = bytesToBase64(new TextEncoder().encode(state.normalizedMesh));
      const result = await postAstra({ phase: "scan_and_generate", image_base64: state.imageBase64, confirmed_vehicle: state.vehicle, scan_captured: true, scan_obj_base64: mesh });
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
  element("restart-button").addEventListener("click", () => location.reload());
}

if (typeof document !== "undefined") init();
