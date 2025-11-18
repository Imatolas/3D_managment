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

const timelineBlocks = [
  { printer: "Form 3", title: "Dental Model", operator: "Laura", start: 8, duration: 3 },
  { printer: "Bambu X1", title: "Drone Arm", operator: "Henrique", start: 9.5, duration: 4 },
  { printer: "Prusa MK4", title: "Spool Bracket", operator: "Ana", start: 14, duration: 2.5 },
  { printer: "Voron 2.4", title: "Gear Housing", operator: "Carlos", start: 16, duration: 3.5 },
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
  Completed: "success",
  Queued: "queue",
  Error: "danger",
  Online: "success",
  Offline: "danger",
  Idle: "queue",
  Paused: "warning",
  Desconhecido: "queue",
};

function createBadge(status) {
  const cls = statusToClass[status] || "info";
  return `<span class="badge ${cls}">${status}</span>`;
}

function loadPrinters() {
  const stored = localStorage.getItem(PRINTERS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(PRINTERS_STORAGE_KEY, JSON.stringify(defaultPrinters));
    return [...defaultPrinters];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [...defaultPrinters];
  } catch (error) {
    console.error("Erro ao ler impressoras salvas", error);
    return [...defaultPrinters];
  }
}

function savePrinters(list) {
  localStorage.setItem(PRINTERS_STORAGE_KEY, JSON.stringify(list));
}

function normalizeUrl(url) {
  return url.trim().replace(/\/$/, "");
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
  renderPrintersTable();
  renderPrinters();
}

function removePrinter(index) {
  printers.splice(index, 1);
  savePrinters(printers);
  renderPrintersTable();
  renderPrinters();
}

async function testarConexaoMoonraker(printer, index, statusCell) {
  const url = normalizeUrl(printer.url || "");
  if (!url) {
    statusCell.textContent = "URL inválida";
    return;
  }

  statusCell.textContent = "Testando...";
  try {
    const response = await fetch(`${url}/printer/info`);
    const status = response.ok ? "Online" : "Offline";
    printers[index].status = status;
    statusCell.textContent = status;
  } catch (error) {
    printers[index].status = "Offline";
    statusCell.textContent = "Offline";
  }
  savePrinters(printers);
  renderPrinters();
}

function renderPrintersTable() {
  const tbody = document.getElementById("printer-list");
  if (!tbody) return;
  tbody.innerHTML = "";

  printers.forEach((printer, index) => {
    const row = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = printer.name;

    const urlTd = document.createElement("td");
    urlTd.textContent = printer.url || "-";

    const statusTd = document.createElement("td");
    statusTd.textContent = printer.status || "Desconhecido";

    const actionsTd = document.createElement("td");
    actionsTd.className = "actions";

    const testButton = document.createElement("button");
    testButton.textContent = "Testar";
    testButton.className = "btn ghost";
    testButton.addEventListener("click", () => testarConexaoMoonraker(printer, index, statusTd));

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remover";
    removeButton.className = "btn danger";
    removeButton.addEventListener("click", () => removePrinter(index));

    actionsTd.append(testButton, removeButton);
    row.append(nameTd, urlTd, statusTd, actionsTd);
    tbody.appendChild(row);
  });
}

function renderPrints() {
  const tbody = document.querySelector("[data-print-rows]");
  if (!tbody) return;
  tbody.innerHTML = jobs
    .map(
      (job) => `
      <tr>
        <td><div class="thumbnail">${job.code}</div></td>
        <td>${job.name}</td>
        <td>${job.printer}</td>
        <td>${job.material}</td>
        <td>${createBadge(job.status)}</td>
        <td>${job.remaining}</td>
      </tr>
    `
    )
    .join("");
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

function renderTimeline() {
  const list = document.querySelector("[data-printer-status]");
  if (list) {
    list.innerHTML = printers
      .slice(0, 4)
      .map((p) => `<div class="item"><span>${p.name}</span>${createBadge(p.status || "Desconhecido")}</div>`)
      .join("");
  }

  const tracks = document.querySelectorAll("[data-timeline] .track");
  if (!tracks.length) return;

  const trackMap = new Map();
  tracks.forEach((track) => {
    track.innerHTML = "";
    trackMap.set(track.getAttribute("data-printer"), track);
  });

  timelineBlocks.forEach((block) => {
    const track = trackMap.get(block.printer);
    if (!track) return;
    const left = (block.start / 24) * 100;
    const width = (block.duration / 24) * 100;
    const div = document.createElement("div");
    div.className = "block";
    div.style.left = `${left}%`;
    div.style.width = `${width}%`;
    div.innerHTML = `<strong>${block.title}</strong><span class="meta">${block.operator} • ${block.duration}h</span>`;
    track.appendChild(div);
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
  renderPrintersTable();
  renderOverview();
  renderPrints();
  renderPrinters();
  renderMaterials();
  renderTimeline();
  renderStats();
}

document.addEventListener("DOMContentLoaded", init);
