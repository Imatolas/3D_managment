const STORAGE_KEY_PRINTERS = "pm_printers";
const PRINTERS_STORAGE_KEY = "moonrakerPrinters";

const defaultPrinters = [
  { name: "Bambu X1", type: "CoreXY", status: "Printing", job: "Drone Arm", progress: 62, url: "" },
  { name: "Voron 2.4", type: "CoreXY", status: "Online", job: "-", progress: 30, url: "" },
  { name: "Prusa MK4", type: "Bedslinger", status: "Idle", job: "Spool Bracket", progress: 48, url: "" },
  { name: "Form 3", type: "SLA", status: "Paused", job: "Dental Model", progress: 52, url: "" },
  { name: "Anycubic Kobra", type: "Bedslinger", status: "Offline", job: "-", progress: 0, url: "" },
  { name: "Bambu P1P", type: "CoreXY", status: "Printing", job: "Case Raspberry", progress: 74, url: "" },
];

let printers = [];

const jobs = [
  { code: "A1", name: "Case Raspberry", printer: "Bambu X1", material: "PETG", status: "Printing", remaining: "01h 25m" },
  { code: "B2", name: "Gear Housing", printer: "Voron 2.4", material: "ABS", status: "Completed", remaining: "-" },
  { code: "C3", name: "Spool Bracket", printer: "Prusa MK4", material: "PLA", status: "Queued", remaining: "02h 10m" },
  { code: "D4", name: "Dental Model", printer: "Form 3", material: "Resin", status: "Error", remaining: "-" },
  { code: "E5", name: "Camera Bracket", printer: "Bambu P1P", material: "PLA", status: "Printing", remaining: "00h 52m" },
];

const materials = [
  { name: "PLA", color: "#2563eb", type: "PLA", qty: 7.2, unit: "kg", last: "Hoje" },
  { name: "PETG", color: "#10b981", type: "PETG", qty: 4.1, unit: "kg", last: "Ontem" },
  { name: "ABS", color: "#f59e0b", type: "ABS", qty: 3.4, unit: "kg", last: "Há 3 dias" },
  { name: "Nylon", color: "#6b7280", type: "Nylon", qty: 1.8, unit: "kg", last: "Há 5 dias" },
];

const stats = {
  jobsThisMonth: 74,
  totalHours: 312,
  failRate: 6,
  hoursByPrinter: [
    { label: "Bambu X1", hours: 72 },
    { label: "Voron 2.4", hours: 64 },
    { label: "Prusa MK4", hours: 54 },
    { label: "Form 3", hours: 44 },
  ],
};

const statusToClass = {
  Printing: "info",
  printing: "info",
  Completed: "success",
  complete: "success",
  Queued: "queue",
  Error: "danger",
  error: "danger",
  Online: "success",
  Offline: "danger",
  Idle: "queue",
  idle: "queue",
  Paused: "warning",
  paused: "warning",
  standby: "queue",
  Desconhecido: "queue",
};

const badgeByStatus = {
  Printing: "badge--info",
  Online: "badge--info",
  Paused: "badge--muted",
  Idle: "badge--muted",
  Completed: "badge--completed",
  Offline: "badge--error",
};

function createBadge(status) {
  const cls = statusToClass[status] || "info";
  return `<span class="badge ${cls}">${status}</span>`;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function formatHour(timestamp) {
  const d = new Date(timestamp * 1000);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getLayerLabel(displayStatus = {}) {
  const current = displayStatus.current_layer;
  const total = displayStatus.total_layer;
  if (Number.isFinite(current) && Number.isFinite(total)) return `${current} / ${total}`;
  if (Number.isFinite(current)) return `${current}`;
  return "N/A";
}

function computeLayerInfo(currentZ, layerHeight, objectHeight, fallbackLabel = "N/A") {
  const validLayerHeight = Number.isFinite(layerHeight) && layerHeight > 0;
  const validObjectHeight = Number.isFinite(objectHeight) && objectHeight > 0;
  const totalLayers = validLayerHeight && validObjectHeight ? Math.round(objectHeight / layerHeight) : null;
  const currentLayer =
    validLayerHeight && Number.isFinite(currentZ) ? Math.max(1, Math.round(currentZ / layerHeight)) : null;

  if (Number.isFinite(currentLayer) && Number.isFinite(totalLayers)) {
    return `${currentLayer} / ${totalLayers}`;
  }

  return fallbackLabel || "N/A";
}

function estimateRemaining(printDuration, progress) {
  if (!Number.isFinite(printDuration) || !Number.isFinite(progress) || progress <= 0) return null;
  const remaining = printDuration * (1 / progress - 1);
  return remaining >= 0 ? remaining : null;
}

function loadPrinters() {
  const parseList = (raw) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.error("Erro ao ler impressoras salvas", error);
      return null;
    }
  };

  const stored = parseList(localStorage.getItem(STORAGE_KEY_PRINTERS));
  if (stored) return stored;

  const legacy = parseList(localStorage.getItem(PRINTERS_STORAGE_KEY));
  if (legacy) {
    savePrinters(legacy);
    return legacy;
  }

  savePrinters(defaultPrinters);
  return [...defaultPrinters];
}

function savePrinters(list) {
  localStorage.setItem(STORAGE_KEY_PRINTERS, JSON.stringify(list));
  localStorage.setItem(PRINTERS_STORAGE_KEY, JSON.stringify(list));
}

function normalizeUrl(url) {
  return url.trim().replace(/\/$/, "");
}

async function coletarJobsDasImpressoras() {
  const storedPrinters = loadPrinters();
  const jobs = [];
  const nowSecs = Date.now() / 1000;
  const startDayHour = 8;
  const endDayHour = 24;

  for (const [index, printer] of storedPrinters.entries()) {
    const baseUrl = normalizeUrl(printer.url || "");
    if (!baseUrl) continue;

    try {
      const resp = await fetch(
        `${baseUrl}/printer/objects/query?print_stats&display_status`
      );
      if (!resp.ok) continue;
      const data = await resp.json();
      const status = data.result?.status || {};

      const printStats = status.print_stats || {};
      const displayStatus = status.display_status || {};

      const state = printStats.state;
      const filename = printStats.filename;
      const elapsed = Number(printStats.print_duration) || 0;

      let totalTime = null;
      let slicerTime = null;
      let material = null;

      if (filename) {
        const metaResp = await fetch(
          `${baseUrl}/server/files/metadata?filename=${encodeURIComponent(filename)}`
        );
        if (metaResp.ok) {
          const meta = (await metaResp.json()).result || {};
          totalTime = meta.total_duration ?? meta.total_time ?? meta.print_duration ?? null;
          slicerTime = meta.slicer_time ?? meta.estimated_time ?? meta.slicer_estimated_time ?? null;
          material = meta.filament_name ?? meta.material ?? null;

          totalTime = Number.isFinite(Number(totalTime)) ? Number(totalTime) : null;
          slicerTime = Number.isFinite(Number(slicerTime)) ? Number(slicerTime) : null;
        }
      }

      const progressFromStats =
        typeof printStats.progress === "number" ? printStats.progress : null;
      const displayProgress =
        typeof displayStatus.progress === "number"
          ? displayStatus.progress
          : Number(displayStatus.progress);

      let progress = null;
      if (Number.isFinite(progressFromStats)) {
        progress = progressFromStats;
      } else if (Number.isFinite(displayProgress)) {
        progress = displayProgress;
      } else if (totalTime && elapsed >= 0) {
        progress = Math.min(elapsed / totalTime, 1);
      }

      const startTimestamp = elapsed > 0 ? nowSecs - elapsed : null;
      const duration = totalTime || slicerTime || null;
      const endTimestamp = startTimestamp && duration ? startTimestamp + duration : null;

      jobs.push({
        printerId: printer.id || printer.url || printer.name || String(index),
        printerName: printer.name,
        state,
        filename,
        material,
        elapsed,
        totalTime,
        slicerTime,
        startTimestamp,
        endTimestamp,
        progress: Number.isFinite(progress) ? progress : null,
      });
    } catch (error) {
      console.error("Erro ao coletar job da impressora", printer.name, error);
    }
  }

  return jobs;
}

function setPreviewVisibility(imgEl, placeholderEl, previewUrl) {
  if (!imgEl || !placeholderEl) return;
  if (previewUrl) {
    imgEl.onload = () => {
      imgEl.style.display = "block";
      placeholderEl.style.display = "none";
    };
    imgEl.onerror = () => {
      imgEl.style.display = "none";
      placeholderEl.style.display = "block";
    };
    imgEl.src = previewUrl;
  } else {
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    placeholderEl.style.display = "block";
  }
}

function addPrinter(name, url) {
  const trimmedName = name.trim();
  const trimmedUrl = normalizeUrl(url);

  if (!trimmedName || !trimmedUrl) return;

  printers.push({
    name: trimmedName,
    url: trimmedUrl,
    status: "Desconhecido",
    type: "Moonraker",
    job: "-",
    progress: 0,
  });
  savePrinters(printers);
  renderPrintersCards();
  renderPrinters();
}

function removePrinter(index) {
  printers.splice(index, 1);
  savePrinters(printers);
  renderPrintersCards();
  renderPrinters();
}

async function fetchMoonrakerStatus(printer) {
  const url = normalizeUrl(printer.url || "");
  if (!url) throw new Error("URL inválida");

  const response = await fetch(`${url}/printer/objects/query?print_stats&display_status&gcode_move`);
  if (!response.ok) throw new Error("Falha ao consultar Moonraker");

  const payload = await response.json();
  const status = payload?.result?.status || {};
  const printStats = status.print_stats || {};
  const displayStatus = status.display_status || {};
  const gcodeMove = status.gcode_move || {};

  const currentZ = gcodeMove?.position?.z;

  const state = printStats.state || "Desconhecido";
  const filename = printStats.filename || "N/A";
  const progress = Number(displayStatus.progress);
  const printDuration = Number(printStats.print_duration);
  const remaining = estimateRemaining(printDuration, progress);
  const layerLabel = getLayerLabel(displayStatus);

  return {
    state,
    filename,
    printDuration,
    remaining,
    progress: Number.isFinite(progress) ? Math.round(progress * 100) : null,
    layerLabel,
    displayStatus,
    currentZ: Number.isFinite(currentZ) ? currentZ : null,
  };
}

async function fetchMoonrakerMetadata(printer, filename) {
  const baseUrl = normalizeUrl(printer.url || "");
  if (!baseUrl || !filename || filename === "N/A") return {};

  try {
    const response = await fetch(
      `${baseUrl}/server/files/metadata?filename=${encodeURIComponent(filename)}`
    );
    if (!response.ok) throw new Error("Falha ao buscar metadata");

    const metadata = await response.json();
    console.log("Metadata result:", metadata.result);
    const meta = metadata?.result || {};
    const thumbs = meta.thumbnails;
    console.log("Thumbnails:", thumbs);

    let previewUrl = null;
    if (Array.isArray(thumbs) && thumbs.length > 0) {
      const baseUrlTrimmed = baseUrl.replace(/\/$/, "");
      const thumbPath = thumbs[0].relative_path;
      const fileDir = filename.includes("/") ? filename.substring(0, filename.lastIndexOf("/")) : "";
      const fullPath = fileDir ? `${fileDir}/${thumbPath}` : thumbPath;
      previewUrl = `${baseUrlTrimmed}/server/files/${encodeURIComponent(fullPath)}`;
    }

    const slicerTimeRaw = meta.slicer_time ?? meta.estimated_time ?? meta.slicer_estimated_time ?? null;
    const totalTimeRaw = meta.total_duration ?? meta.total_time ?? meta.print_duration ?? null;
    const layerHeight = Number(meta.layer_height);
    const objectHeight = Number(meta.object_height);

    const slicerTime = Number.isFinite(Number(slicerTimeRaw)) ? Number(slicerTimeRaw) : null;
    const totalTime = Number.isFinite(Number(totalTimeRaw)) ? Number(totalTimeRaw) : null;

    return { meta, previewUrl, slicerTime, totalTime, layerHeight, objectHeight };
  } catch (error) {
    console.error("Erro ao buscar metadata do Moonraker", error);
    return {};
  }
}

function applyBadgeClass(badgeEl, status) {
  if (!badgeEl) return;
  const cls = badgeByStatus[status] || "badge--info";
  badgeEl.className = `badge ${cls}`;
  badgeEl.textContent = status;
}

function updatePrinterCardInfo(printer, elements) {
  const { statusEl, jobEl, elapsedEl, remainingEl, totalEl, slicerEl, layerEl, badgeEl } = elements;
  const statusText = printer.status || "Desconhecido";
  if (statusEl) statusEl.textContent = statusText;
  if (jobEl) jobEl.textContent = printer.job || "-";
  if (elapsedEl) elapsedEl.textContent = formatDuration(printer.printDuration);
  if (remainingEl) remainingEl.textContent = formatDuration(printer.remainingDuration);
  if (totalEl) totalEl.textContent = formatDuration(printer.totalTime);
  if (slicerEl) slicerEl.textContent = formatDuration(printer.slicerTime);
  if (layerEl) layerEl.textContent = printer.layerInfo || "N/A";
  applyBadgeClass(badgeEl, statusText);
}

function getCardElements(cardElement) {
  if (!cardElement) return {};
  return {
    statusEl: cardElement.querySelector(".printer-status-value"),
    jobEl: cardElement.querySelector(".printer-job-value"),
    elapsedEl: cardElement.querySelector(".printer-elapsed-value"),
    remainingEl: cardElement.querySelector(".printer-remaining-value"),
    totalEl: cardElement.querySelector(".printer-total-value"),
    slicerEl: cardElement.querySelector(".printer-slicer-value"),
    layerEl: cardElement.querySelector(".printer-layer-value"),
    badgeEl: cardElement.querySelector(".badge"),
    previewImg: cardElement.querySelector(".printer-preview-img"),
    previewPlaceholder: cardElement.querySelector(".printer-preview-placeholder"),
  };
}

async function atualizarPrinterMoonraker(printer, cardElement) {
  const elements = getCardElements(cardElement);
  if (elements.statusEl) elements.statusEl.textContent = "Testando...";

  let previewUrl = printer.previewUrl || null;
  let updatedPrinter = { ...printer };

  try {
    const data = await fetchMoonrakerStatus(printer);
    const metadata = await fetchMoonrakerMetadata(printer, data.filename);
    previewUrl = metadata.previewUrl || null;

    const layerInfo = computeLayerInfo(
      data.currentZ,
      metadata.layerHeight,
      metadata.objectHeight,
      getLayerLabel(data.displayStatus)
    );

    updatedPrinter = {
      ...printer,
      status: data.state,
      job: data.filename,
      printDuration: data.printDuration,
      remainingDuration: data.remaining,
      layerInfo,
      totalTime: metadata.totalTime,
      slicerTime: metadata.slicerTime,
      progress: data.progress ?? printer.progress ?? 0,
      previewUrl,
    };
  } catch (error) {
    console.error("Erro ao atualizar impressora no Moonraker", error);
    updatedPrinter = {
      ...printer,
      status: "Offline",
      previewUrl: null,
    };
    previewUrl = null;
  }

  const printerIndex = Number(cardElement?.dataset?.printerId);
  if (Number.isInteger(printerIndex) && printerIndex >= 0) {
    printers[printerIndex] = updatedPrinter;
  } else {
    const foundIndex = printers.findIndex(
      (stored) => stored.name === printer.name && stored.url === printer.url
    );
    if (foundIndex >= 0) printers[foundIndex] = updatedPrinter;
  }

  updatePrinterCardInfo(updatedPrinter, elements);
  setPreviewVisibility(elements.previewImg, elements.previewPlaceholder, previewUrl);
  savePrinters(printers);
  renderPrinters();
  renderOverview();
  renderStats();
}

async function testarConexaoMoonraker(printer, cardElement) {
  return atualizarPrinterMoonraker(printer, cardElement);
}

function createPrinterCard(printer, index) {
  const card = document.createElement("article");
  card.className = "printer-card card";
  card.dataset.printerId = String(index);

  const name = document.createElement("h2");
  name.className = "printer-card-name";
  name.textContent = printer.name;

  const badge = document.createElement("span");
  badge.className = "badge badge--info";
  badge.textContent = printer.status || "Desconhecido";

  const imageBox = document.createElement("div");
  imageBox.className = "printer-card-image";
  imageBox.innerHTML = `
    <img class="printer-preview-img" alt="Preview da impressora" />
    <span class="printer-preview-placeholder">Preview da impressora</span>
  `;

  const infoBox = document.createElement("div");
  infoBox.className = "printer-card-info";

  const statusRow = document.createElement("p");
  statusRow.innerHTML = `<strong>Status:</strong> <span class="printer-status-value">-</span>`;

  const jobRow = document.createElement("p");
  jobRow.innerHTML = `<strong>Job:</strong> <span class="printer-job-value">-</span>`;

  const elapsedRow = document.createElement("p");
  elapsedRow.innerHTML = `<strong>Tempo impresso:</strong> <span class="printer-elapsed-value">N/A</span>`;

  const remainingRow = document.createElement("p");
  remainingRow.innerHTML = `<strong>Tempo restante:</strong> <span class="printer-remaining-value">N/A</span>`;

  const totalRow = document.createElement("p");
  totalRow.innerHTML = `<strong>Tempo total:</strong> <span class="printer-total-value">N/A</span>`;

  const slicerRow = document.createElement("p");
  slicerRow.innerHTML = `<strong>Fatiador:</strong> <span class="printer-slicer-value">N/A</span>`;

  const layerRow = document.createElement("p");
  layerRow.innerHTML = `<strong>Layer:</strong> <span class="printer-layer-value">N/A</span>`;

  infoBox.append(statusRow, jobRow, elapsedRow, remainingRow, totalRow, slicerRow, layerRow);

  const footer = document.createElement("div");
  footer.className = "printer-card-footer";

  const testButton = document.createElement("button");
  testButton.className = "btn btn-small";
  testButton.textContent = "Testar conexão";

  const removeButton = document.createElement("button");
  removeButton.className = "btn btn-small btn-danger";
  removeButton.textContent = "Remover";

  footer.append(testButton, removeButton);

  const elements = {
    statusEl: statusRow.querySelector(".printer-status-value"),
    jobEl: jobRow.querySelector(".printer-job-value"),
    elapsedEl: elapsedRow.querySelector(".printer-elapsed-value"),
    remainingEl: remainingRow.querySelector(".printer-remaining-value"),
    totalEl: totalRow.querySelector(".printer-total-value"),
    slicerEl: slicerRow.querySelector(".printer-slicer-value"),
    layerEl: layerRow.querySelector(".printer-layer-value"),
    badgeEl: badge,
    previewImg: imageBox.querySelector(".printer-preview-img"),
    previewPlaceholder: imageBox.querySelector(".printer-preview-placeholder"),
  };

  updatePrinterCardInfo(printer, elements);
  setPreviewVisibility(elements.previewImg, elements.previewPlaceholder, printer.previewUrl);

  testButton.addEventListener("click", () => testarConexaoMoonraker(printer, card));
  removeButton.addEventListener("click", () => removePrinter(index));

  card.append(name, badge, imageBox, infoBox, footer);
  return card;
}

function renderPrintersCards() {
  const grid = document.getElementById("printers-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!printers.length) {
    const empty = document.createElement("p");
    empty.className = "text-muted";
    empty.textContent = "Nenhuma impressora cadastrada.";
    grid.appendChild(empty);
    return;
  }

  printers.forEach((printer, index) => {
    const card = createPrinterCard(printer, index);
    grid.appendChild(card);
  });
}

function iniciarAtualizacaoAutomatica(intervalMs = 10000) {
  const grid = document.getElementById("printers-grid");
  if (!grid) return;

  const atualizarTodas = () => {
    printers = loadPrinters();
    printers.forEach((printer, index) => {
      const card = document.querySelector(
        `.printer-card[data-printer-id="${index}"]`
      );
      if (card) {
        atualizarPrinterMoonraker(printer, card);
      }
    });
  };

  atualizarTodas();
  return setInterval(atualizarTodas, intervalMs);
}

function renderPrints(jobs = []) {
  const tbody = document.getElementById("prints-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  let index = 0;
  jobs.forEach((job) => {
    if (!job.state || job.state === "standby" || job.state === "idle") {
      return;
    }

    const tr = document.createElement("tr");
    const stateClass = (job.state || "unknown").toLowerCase();

    const thumbCell = document.createElement("td");
    index += 1;
    thumbCell.innerHTML = `<div class="thumb-badge">J${index}</div>`;

    const nameCell = document.createElement("td");
    nameCell.textContent = job.filename || "Job atual";

    const printerCell = document.createElement("td");
    printerCell.textContent = job.printerName || "-";

    const materialCell = document.createElement("td");
    materialCell.textContent = job.material || "-";

    const statusCell = document.createElement("td");
    statusCell.innerHTML = `
      <span class="status-pill status-pill--${stateClass}">
        ${job.state || "unknown"}
      </span>
    `;

    const remainingCell = document.createElement("td");
    let remainingText = "N/A";
    if (job.totalTime && job.elapsed >= 0) {
      const remainingSeconds = Math.max(job.totalTime - job.elapsed, 0);
      remainingText = formatDuration(remainingSeconds);
    }
    remainingCell.textContent = remainingText;

    tr.appendChild(thumbCell);
    tr.appendChild(nameCell);
    tr.appendChild(printerCell);
    tr.appendChild(materialCell);
    tr.appendChild(statusCell);
    tr.appendChild(remainingCell);

    tbody.appendChild(tr);
  });
}

function renderPrinters() {
  const container = document.querySelector("[data-printer-cards]");
  if (!container) return;
  container.innerHTML = printers
    .slice(0, 4)
    .map((p) => {
      const progress = Number.isFinite(p.progress) ? p.progress : 0;
      const type = p.type || "N/A";
      const job = p.job || "-";
      const status = p.status || "Desconhecido";
      return `
      <article class="printer-card">
        <header>
          <h3>${p.name}</h3>
          ${createBadge(status)}
        </header>
        <p>Tipo: ${type}</p>
        <p>Job atual: ${job}</p>
        <div class="meter"><span style="width:${progress}%"></span></div>
        <div class="flex-row">
          <button class="btn">View</button>
          <button class="btn ghost">Open in Klipper</button>
        </div>
      </article>
    `;
    })
    .join("");
}

function renderMaterials() {
  const tbody = document.querySelector("[data-material-rows]");
  if (tbody) {
    tbody.innerHTML = materials
      .map(
        (m) => `
        <tr>
          <td>${m.name}</td>
          <td>${m.type}</td>
          <td>${m.qty.toFixed(1)} ${m.unit}</td>
          <td>${m.last}</td>
          <td><button class="btn ghost">Buy More</button></td>
        </tr>
      `
      )
      .join("");
  }

  const legend = document.querySelector("[data-material-legend]");
  if (legend) {
    legend.innerHTML = materials
      .map((m) => `<span><i style="background:${m.color}"></i>${m.name}</span>`)
      .join("");
  }

  const donut = document.querySelector("[data-donut]");
  if (donut) {
    const total = materials.reduce((sum, m) => sum + m.qty, 0);
    let current = 0;
    const segments = materials
      .map((m) => {
        const start = (current / total) * 360;
        const end = ((current + m.qty) / total) * 360;
        current += m.qty;
        return `${m.color} ${start}deg ${end}deg`;
      })
      .join(", ");
    donut.style.background = `conic-gradient(${segments})`;
  }
}

function renderTimeline(jobs = []) {
  const printersContainer = document.getElementById("timeline-printer-list");
  const tracksContainer = document.getElementById("timeline-tracks");
  if (!printersContainer || !tracksContainer) return;

  printersContainer.innerHTML = "";
  tracksContainer.innerHTML = "";

  const jobsByPrinter = {};
  jobs.forEach((job) => {
    if (!jobsByPrinter[job.printerId]) {
      jobsByPrinter[job.printerId] = [];
    }
    jobsByPrinter[job.printerId].push(job);
  });

  const printerIds = Object.keys(jobsByPrinter);
  const startDayHour = 8;
  const endDayHour = 24;
  const secondsRange = (endDayHour - startDayHour) * 3600;

  const nowElement = document.querySelector(".timeline-now");
  if (nowElement) {
    const now = new Date();
    let nowSeconds =
      (now.getHours() - startDayHour) * 3600 +
      now.getMinutes() * 60 +
      now.getSeconds();

    nowSeconds = Math.max(0, Math.min(nowSeconds, secondsRange));
    const nowPercent = (nowSeconds / secondsRange) * 100;
    nowElement.style.left = `${nowPercent}%`;
    nowElement.style.transform = "translateX(-50%)";
  }

  printerIds.forEach((printerId) => {
    const printerJobs = jobsByPrinter[printerId];
    const sampleJob = printerJobs[0];
    const stateClass = (sampleJob.state || "unknown").toLowerCase();

    const printerItem = document.createElement("div");
    printerItem.className = "timeline-printer-item";
    printerItem.innerHTML = `
      <div class="timeline-printer-name">${sampleJob.printerName}</div>
      <span class="status-pill status-pill--${stateClass}">
        ${sampleJob.state || "unknown"}
      </span>
    `;
    printersContainer.appendChild(printerItem);

    const track = document.createElement("div");
    track.className = "timeline-track";

    printerJobs.forEach((job) => {
      if (!job.startTimestamp || !job.endTimestamp) return;

      const startDate = new Date(job.startTimestamp * 1000);
      const startSeconds =
        (startDate.getHours() - startDayHour) * 3600 + startDate.getMinutes() * 60;

      if (startSeconds < 0 || startSeconds > secondsRange) return;

      const durationSeconds = job.endTimestamp - job.startTimestamp;
      const leftPercent = (startSeconds / secondsRange) * 100;
      const widthPercent = Math.max((durationSeconds / secondsRange) * 100, 5);

      const jobBlock = document.createElement("div");
      jobBlock.className = "timeline-job-block";
      jobBlock.style.left = leftPercent + "%";
      jobBlock.style.width = widthPercent + "%";

      const progressFill = document.createElement("div");
      progressFill.className = "timeline-job-fill";

      let fillPercent = 0;
      if (job.state && job.state.toLowerCase() === "printing") {
        if (typeof job.progress === "number") {
          fillPercent = Math.max(0, Math.min(job.progress, 1)) * 100;
        } else if (job.totalTime && job.elapsed >= 0) {
          fillPercent = Math.max(0, Math.min(job.elapsed / job.totalTime, 1)) * 100;
        }
      } else if (
        job.state &&
        ["complete", "completed"].includes(job.state.toLowerCase())
      ) {
        fillPercent = 100;
      }

      progressFill.style.width = fillPercent.toFixed(1) + "%";

      const content = document.createElement("div");
      content.className = "timeline-job-content";
      content.innerHTML = `
        <div class="timeline-job-title">
          ${job.filename || "Job atual"}
        </div>
        <div class="timeline-job-subtitle">
          ${(job.material || "Material desconhecido")} · ${
            job.startTimestamp && job.endTimestamp
              ? formatHour(job.startTimestamp) + " - " + formatHour(job.endTimestamp)
              : "Horário não definido"
          }
        </div>
      `;

      jobBlock.appendChild(progressFill);
      jobBlock.appendChild(content);
      track.appendChild(jobBlock);
    });

    tracksContainer.appendChild(track);
  });
}

function renderOverview() {
  const activePrinters = printers.filter((p) => p.status !== "Offline");
  const overviewActive = document.querySelector("[data-overview-active]");
  if (overviewActive) overviewActive.textContent = `${activePrinters.length} / ${printers.length}`;

  const printingJobs = jobs.filter((j) => j.status === "Printing");
  const queueJobs = jobs.filter((j) => j.status === "Queued");
  const overviewJobs = document.querySelector("[data-overview-jobs]");
  if (overviewJobs) overviewJobs.textContent = `${printingJobs.length} / ${queueJobs.length + printingJobs.length}`;

  const overviewHours = document.querySelector("[data-overview-hours]");
  if (overviewHours) overviewHours.textContent = `${stats.totalHours} h`;

  const successes = jobs.filter((j) => j.status === "Completed").length;
  const successRate = Math.round((successes / jobs.length) * 100);
  const overviewSuccess = document.querySelector("[data-overview-success]");
  if (overviewSuccess) overviewSuccess.textContent = `${successRate}%`;

  const latestList = document.querySelector("[data-latest-jobs]");
  if (latestList) {
    latestList.innerHTML = jobs
      .slice(0, 5)
      .map((job) => `<li><span>${job.name}</span>${createBadge(job.status)}</li>`)
      .join("");
  }
}

function renderStats() {
  const jobsEl = document.querySelector("[data-stat-jobs]");
  const hoursEl = document.querySelector("[data-stat-hours]");
  const failEl = document.querySelector("[data-stat-fails]");
  if (jobsEl) jobsEl.textContent = stats.jobsThisMonth;
  if (hoursEl) hoursEl.textContent = `${stats.totalHours} h`;
  if (failEl) failEl.textContent = `${stats.failRate}%`;

  const chart = document.querySelector("[data-chart]");
  if (chart) {
    chart.innerHTML = stats.hoursByPrinter
      .map(
        (entry) => `
        <div class="chart-row">
          <span style="width:110px;">${entry.label}</span>
          <div class="bar" style="width:${entry.hours / 1.2}%"></div>
          <span>${entry.hours} h</span>
        </div>
      `
      )
      .join("");
  }
}

function iniciarAtualizacaoTimelineEPrints() {
  async function atualizar() {
    const jobs = await coletarJobsDasImpressoras();
    renderTimeline(jobs);
    renderPrints(jobs);
  }

  atualizar();
  setInterval(atualizar, 10000);
}

function bindForm() {
  const form = document.getElementById("printer-form");
  if (!form) return;
  const nameInput = document.getElementById("printer-name");
  const urlInput = document.getElementById("printer-url");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    addPrinter(nameInput.value, urlInput.value);
    form.reset();
    nameInput.focus();
  });
}

function init() {
  printers = loadPrinters();
  bindForm();
  renderPrintersCards();
  renderOverview();
  renderPrinters();
  renderMaterials();
  renderStats();

  if (document.getElementById("printers-grid")) {
    iniciarAtualizacaoAutomatica();
  }

  const timelineTracks = document.getElementById("timeline-tracks");
  const printsTable = document.getElementById("prints-table-body");
  if (timelineTracks || printsTable) {
    iniciarAtualizacaoTimelineEPrints();
  }
}

document.addEventListener("DOMContentLoaded", init);
