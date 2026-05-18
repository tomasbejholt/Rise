let chart;
let latestTrends = null;
let stationName = "Vinga A";
let selectedStation = "vinga";
let widgetPrimary = null;
let widgetCompare = null;

/* --- API & diagram --- */

function stationQuery() {
  return `station=${encodeURIComponent(selectedStation)}`;
}

function getSelectedStation() {
  const el = document.getElementById("station-select");
  return el?.value || "vinga";
}

function updateChartNote(gapNote) {
  const noteEl = document.getElementById("chart-note");
  if (!noteEl) return;
  if (gapNote) {
    noteEl.textContent = gapNote;
    noteEl.hidden = false;
    noteEl.classList.add("data-card__note--warn");
  } else {
    noteEl.hidden = true;
    noteEl.classList.remove("data-card__note--warn");
  }
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${path} → ${res.status}`);
  }
  return res.json();
}

const CHART_LINE = "hsl(223, 92%, 62%)";
const CHART_TREND = "hsla(32, 95%, 62%, 0.9)";
const VINGA_GAP = { from: 1998, to: 2007 };

function makeChartGradient(chart) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return "hsla(223, 90%, 55%, 0.15)";
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, "hsla(223, 92%, 62%, 0.45)");
  g.addColorStop(0.5, "hsla(223, 85%, 50%, 0.1)");
  g.addColorStop(1, "hsla(223, 70%, 40%, 0)");
  return g;
}

const chartGapPlugin = {
  id: "riseGapRegion",
  beforeDatasetsDraw(chart) {
    const gap = chart.$riseGap;
    if (!gap) return;
    const { ctx, chartArea, scales } = chart;
    const x = scales.x;
    if (!x || !chartArea) return;
    const x1 = x.getPixelForValue(gap.from);
    const x2 = x.getPixelForValue(gap.to);
    const left = Math.min(x1, x2);
    const width = Math.abs(x2 - x1);
    ctx.save();
    ctx.fillStyle = "rgba(255, 140, 90, 0.14)";
    ctx.fillRect(left, chartArea.top, width, chartArea.bottom - chartArea.top);
    ctx.strokeStyle = "rgba(255, 140, 90, 0.35)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeRect(left, chartArea.top, width, chartArea.bottom - chartArea.top);
    ctx.restore();
  },
};

function updateChartHeader() {
  const title = document.getElementById("chart-title");
  const subtitle = document.getElementById("chart-subtitle");
  const badges = document.getElementById("chart-badges");
  if (title) title.textContent = stationName || "Historik";
  if (subtitle) {
    subtitle.textContent = `Årsmedel temperatur · ${stationName || "SMHI"}`;
  }
  if (!badges) return;
  if (!latestTrends) {
    badges.innerHTML = "";
    return;
  }
  const s = latestTrends.slope_per_year;
  const sign = s >= 0 ? "+" : "";
  badges.innerHTML = `<span class="data-card__pill">${sign}${s} °C/år</span>
    <span class="data-card__pill data-card__pill--muted">R² ${latestTrends.r_squared}</span>`;
}

function buildChart(records, label, trends) {
  const ctx = document.getElementById("chart");
  const years = records.map((d) => d.year);
  const temps = records.map((d) => d.temp_mean);
  const chartLabel = label ? `Mätvärden · ${label}` : "Årsmedel °C";

  if (chart) {
    chart.destroy();
    chart = null;
  }

  const datasets = [
    {
      label: chartLabel,
      data: temps,
      borderColor: CHART_LINE,
      borderWidth: 2.5,
      backgroundColor: (c) => makeChartGradient(c.chart),
      tension: 0.35,
      fill: true,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: "#fff",
      pointBorderColor: CHART_LINE,
      pointBorderWidth: 2,
      pointHoverBorderWidth: 2,
    },
  ];

  if (trends?.slope_per_year != null && trends?.intercept != null) {
    datasets.push({
      label: "Linjär trend",
      data: years.map((y) => trends.intercept + trends.slope_per_year * y),
      borderColor: CHART_TREND,
      backgroundColor: "transparent",
      borderWidth: 2,
      borderDash: [7, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
    });
  }

  chart = new Chart(ctx, {
    type: "line",
    data: { labels: years, datasets },
    plugins: [chartGapPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: { duration: 700, easing: "easeOutQuart" },
      plugins: {
        legend: {
          position: "bottom",
          align: "start",
          labels: {
            color: "rgba(255,255,255,0.85)",
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 14,
            font: { size: 11, weight: "500" },
          },
        },
        tooltip: {
          backgroundColor: "hsla(223, 45%, 10%, 0.94)",
          titleColor: "#fff",
          bodyColor: "rgba(255,255,255,0.92)",
          borderColor: "rgba(255,255,255,0.14)",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          titleFont: { size: 12, weight: "600" },
          bodyFont: { size: 11 },
          displayColors: true,
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y;
              const unit = "°C";
              return `${ctx.dataset.label}: ${v != null ? v.toFixed(1) : "–"} ${unit}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "rgba(255,255,255,0.55)",
            maxTicksLimit: 9,
            font: { size: 10 },
          },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          title: {
            display: true,
            text: "Temperatur (°C)",
            color: "rgba(255,255,255,0.5)",
            font: { size: 10, weight: "500" },
          },
          ticks: {
            color: "rgba(255,255,255,0.55)",
            padding: 6,
            font: { size: 10 },
            callback: (v) => `${v}°`,
          },
          grid: { color: "rgba(255,255,255,0.06)" },
          border: { display: false },
        },
      },
    },
  });

  chart.$riseGap = selectedStation === "vinga" ? VINGA_GAP : null;
}

async function loadHistoricalAndTrend() {
  const q = stationQuery();
  const [historical, trends] = await Promise.all([
    fetchJson(`/api/historical?${q}`),
    fetchJson(`/api/trends?${q}`),
  ]);

  stationName = historical.station;
  latestTrends = trends;
  document.getElementById("station").textContent = stationName;
  updateChartNote(historical.gap_note);
  updateChartHeader();
  buildChart(historical.data, stationName, trends);
  updateGalleryPanel();
}

/* --- Leaflet-karta (stationer) --- */

const STATION_LOCATIONS = {
  vinga: {
    name: "Vinga A",
    lat: 57.6322,
    lng: 11.6072,
    zoom: 10,
    hasMl: true,
    blurb:
      "Kuststation i Göteborgs skärgård – temperaturdata från SMHI sedan 1996.",
  },
  stockholm: {
    name: "Stockholm",
    lat: 59.3293,
    lng: 18.0686,
    zoom: 10,
    hasMl: true,
    blurb: "Mätdata från Stockholmsområdet – årsmedel och trend från SMHI.",
  },
  malmo: {
    name: "Malmö",
    lat: 55.605,
    lng: 13.0038,
    zoom: 10,
    hasMl: true,
    blurb: "Skåne – temperaturdata från SMHI för södra Sverige.",
  },
};

let stationMap = null;
const stationMarkers = {};

function updateStationDataStats() {
  const el = document.getElementById("station-data-stats");
  const meta = STATION_LOCATIONS[selectedStation];
  if (!el || !meta) return;

  const rows = [];
  if (latestTrends) {
    const s = latestTrends.slope_per_year;
    const sign = s >= 0 ? "+" : "";
    rows.push(["Trend", `${sign}${s} °C/år`]);
    rows.push(["R²", String(latestTrends.r_squared)]);
  }
  rows.push(["Latitud", `${meta.lat.toFixed(2)}°`]);
  rows.push(["Longitud", `${meta.lng.toFixed(2)}°`]);
  rows.push(["Prognos", meta.hasMl ? "ML-modell" : "Säsongsmedel"]);

  el.innerHTML = rows
    .map(
      ([label, value]) =>
        `<div class="station-data-card__stat"><dt>${label}</dt><dd>${value}</dd></div>`
    )
    .join("");
}

function updateGalleryPanel() {
  const meta = STATION_LOCATIONS[selectedStation];
  const title = document.getElementById("gallery-station-title");
  const intro = document.getElementById("gallery-station-intro");
  const badge = document.getElementById("gallery-station-badge");

  if (meta && title) title.textContent = `Station ${meta.name}`;
  if (meta && intro) intro.textContent = meta.blurb;
  if (meta && badge) {
    badge.textContent = meta.hasMl
      ? `SMHI · ${meta.name} · ML-prognos`
      : `SMHI · ${meta.name}`;
    badge.classList.toggle("data-card__pill--ml", !!meta.hasMl);
  }
  updateStationDataStats();
  syncStationMap();
}

function initStationMap() {
  if (typeof L === "undefined" || stationMap) return;
  const el = document.getElementById("station-map");
  if (!el) return;

  stationMap = L.map(el, { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(stationMap);

  Object.entries(STATION_LOCATIONS).forEach(([id, meta]) => {
    const marker = L.marker([meta.lat, meta.lng])
      .addTo(stationMap)
      .bindPopup(`<strong>${meta.name}</strong><br>Välj för data och prognos`);
    marker.on("click", () => {
      const select = document.getElementById("station-select");
      if (select && select.value !== id) {
        select.value = id;
        onStationChange();
      } else {
        syncStationMap();
      }
    });
    stationMarkers[id] = marker;
  });

  syncStationMap();
}

function syncStationMap() {
  if (!stationMap) return;
  const meta = STATION_LOCATIONS[selectedStation];
  if (!meta) return;

  Object.entries(stationMarkers).forEach(([id, marker]) => {
    if (id === selectedStation) marker.openPopup();
    else marker.closePopup();
  });
  stationMap.setView([meta.lat, meta.lng], meta.zoom, { animate: true });
}

function onStationMapTabOpen() {
  if (!stationMap) initStationMap();
  requestAnimationFrame(() => {
    stationMap?.invalidateSize();
    syncStationMap();
  });
}

/* --- Expanding flex cards (CodePen z- / OBPJKK) + prognoskort --- */

const STATION_FLEX_META = {
  vinga: {
    bg: "/static/images/hero-lighthouse.png",
    accent: "#5d9cec",
    icon: "⛯",
    sub: "ML-prognos · kust",
  },
  stockholm: {
    bg: "/static/images/station-tower.png",
    accent: "#2ecc71",
    icon: "▲",
    sub: "ML-prognos",
  },
  malmo: {
    bg: "/static/images/station-instruments.png",
    accent: "#ffce54",
    icon: "◎",
    sub: "ML-prognos · Skåne",
  },
};

function buildStationFlexCards() {
  const container = document.getElementById("station-flex-cards");
  if (!container) return;

  container.innerHTML = Object.entries(STATION_LOCATIONS)
    .map(([id, loc]) => {
      const flex = STATION_FLEX_META[id];
      if (!flex) return "";
      const active = id === selectedStation;
      return `<button type="button" class="station-flex-cards__option${
        active ? " is-active" : ""
      }" data-station="${id}" role="option" aria-selected="${active}" style="--option-bg: url('${flex.bg}'); --option-accent: ${
        flex.accent
      }">
      <span class="station-flex-cards__shadow" aria-hidden="true"></span>
      <span class="station-flex-cards__label">
        <span class="station-flex-cards__icon" aria-hidden="true">${flex.icon}</span>
        <span class="station-flex-cards__info">
          <span class="station-flex-cards__main">${loc.name}</span>
          <span class="station-flex-cards__sub">${flex.sub}</span>
        </span>
      </span>
    </button>`;
    })
    .join("");

  container.querySelectorAll(".station-flex-cards__option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.station;
      const select = document.getElementById("station-select");
      if (select && select.value !== id) {
        select.value = id;
        onStationChange();
      } else {
        syncStationFlexCards(id);
      }
    });
  });
}

function syncStationFlexCards(stationId = selectedStation) {
  document.querySelectorAll(".station-flex-cards__option").forEach((btn) => {
    const on = btn.dataset.station === stationId;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", String(on));
  });
}

function initStationFlexCards() {
  buildStationFlexCards();
}

/* Kompakta prognoskort (weather-widgets / CodePen) */

class WeatherWidget {
  constructor(el, data) {
    this.lang = "sv-SE";
    this.el = document.querySelector(el);
    this.weather = data;
    this.displayWeather();
  }

  setData(data) {
    this.weather = data;
    this.displayWeather();
  }

  displayWeather() {
    if (!this.weather || !this.el) return;

    const props = Object.keys(this.weather).filter((k) => !k.endsWith("_unit"));
    props.forEach((prop) => {
      const propEl = this.el.querySelector(`[data-stat=${prop}]`);
      if (!propEl) return;

      let value = this.weather[prop];
      let unit = this.weather[`${prop}_unit`] || "";

      if (prop === "kind") {
        this.el.querySelector("[data-symbol]")?.setAttribute("href", `#${value}`);
      } else if (prop === "time") {
        const d = value instanceof Date ? value : new Date(value);
        propEl.setAttribute("datetime", d.toISOString().slice(0, 16));
        value = new Intl.DateTimeFormat(this.lang, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(d);
      }

      if (unit) value = `${value} ${unit}`;
      propEl.textContent = `${value}`;
    });
  }
}

function weatherKindFromTemp(celsius) {
  if (celsius >= 18) return "sunny";
  return "cloudy";
}

function buildWidgetData(predict, trends, station, options = {}) {
  const [y, m, d] = predict.date.split("-").map(Number);
  const time = new Date(y, m - 1, d, 12, 0);
  const temp = predict.predicted_temp;
  const slope = trends?.slope_per_year ?? 0;
  const sign = slope >= 0 ? "+" : "";

  let city = station || "Vinga A";
  if (options.compareLabel) {
    city = `${city} · ${options.compareLabel}`;
  }

  let trend = `${sign}${slope}`;
  let trendUnit = "°C/år";
  if (options.primaryTemp != null) {
    const diff = temp - options.primaryTemp;
    const diffSign = diff >= 0 ? "+" : "";
    trend = `${diffSign}${diff.toFixed(1)}`;
    trendUnit = "°C vs prognos";
  }

  return {
    city,
    kind: weatherKindFromTemp(temp),
    time,
    temperature: Math.round(temp),
    temperature_scale: "C",
    interval: `${predict.lower_bound}–${predict.upper_bound}`,
    interval_unit: "°C",
    trend,
    trend_unit: trendUnit,
    min_temp: predict.lower_bound,
    min_temp_unit: "°C",
    max_temp: predict.upper_bound,
    max_temp_unit: "°C",
  };
}

function defaultCompareDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${y - 10}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function initWeatherWidgets() {
  const empty = {
    city: "Vinga A",
    kind: "cloudy",
    time: new Date(),
    temperature: "–",
    temperature_scale: "C",
    interval: "–",
    trend: "–",
    min_temp: "–",
    max_temp: "–",
  };
  widgetPrimary = new WeatherWidget("#widget-primary", { ...empty });
  widgetCompare = new WeatherWidget("#widget-compare", {
    ...empty,
    city: "Vinga A · jämförelse",
  });
}

function updateWidgets(primaryPredict, comparePredict) {
  if (!widgetPrimary) initWeatherWidgets();

  const compareYear = comparePredict.date.slice(0, 4);
  widgetPrimary.setData(
    buildWidgetData(primaryPredict, latestTrends, stationName)
  );
  widgetCompare.setData(
    buildWidgetData(comparePredict, latestTrends, stationName, {
      compareLabel: `jämförelse ${compareYear}`,
      primaryTemp: primaryPredict.predicted_temp,
    })
  );
}

/* --- Formulär --- */

async function onPredictSubmit(event) {
  event.preventDefault();
  const date = document.getElementById("date-input").value;
  const compareDate = document.getElementById("compare-date-input").value;
  const errEl = document.getElementById("predict-error");

  try {
    const q = stationQuery();
    const [primary, compare] = await Promise.all([
      fetchJson(`/predict?date=${date}&${q}`),
      fetchJson(`/predict?date=${compareDate}&${q}`),
    ]);
    updateWidgets(primary, compare);
    errEl.hidden = true;
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
}

function syncCompareDateFromPrimary() {
  const primary = document.getElementById("date-input").value;
  if (primary) {
    document.getElementById("compare-date-input").value =
      defaultCompareDate(primary);
  }
}

const BG_KEYS = ["lighthouse", "storm", "clouds"];

function initHeroMoods() {
  const buttons = document.querySelectorAll(".hero-mood");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.bg;
      if (!BG_KEYS.includes(key)) return;

      document.body.dataset.bg = key;
      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
    });
  });
}

function initTabs() {
  const tabButtons = document.querySelectorAll(".tabs__btn");
  const panels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tab;
      const panel = document.getElementById(`panel-${id}`);
      if (!panel) return;

      tabButtons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });

      panels.forEach((p) => {
        const show = p === panel;
        p.classList.toggle("is-active", show);
        p.hidden = !show;
      });

      if (id === "historik" && chart) {
        requestAnimationFrame(() => chart.resize());
      }
      if (id === "gallery") onStationMapTabOpen();
    });
  });
}

async function loadStationsFromApi() {
  try {
    const { stations } = await fetchJson("/api/stations");
    const select = document.getElementById("station-select");
    if (!select || !stations?.length) return;

    select.innerHTML = stations
      .map(
        (s) =>
          `<option value="${s.id}">${s.name}${s.has_ml_model ? " (ML)" : ""}</option>`
      )
      .join("");
    select.value = selectedStation;
    buildStationFlexCards();
  } catch {
    /* behåll statiska alternativ */
  }
}

async function onStationChange() {
  selectedStation = getSelectedStation();
  syncStationFlexCards(selectedStation);
  const errEl = document.getElementById("predict-error");
  errEl.hidden = true;

  try {
    await loadHistoricalAndTrend();
    document.getElementById("predict-form").requestSubmit();
    if (chart) chart.resize();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
}

async function init() {
  initWeatherWidgets();
  initStationFlexCards();
  initHeroMoods();
  initTabs();

  selectedStation = getSelectedStation();
  await loadStationsFromApi();
  selectedStation = getSelectedStation();
  updateGalleryPanel();

  const dateInput = document.getElementById("date-input");
  dateInput.addEventListener("change", syncCompareDateFromPrimary);

  document.getElementById("station-select").addEventListener("change", onStationChange);
  document.getElementById("predict-form").addEventListener("submit", onPredictSubmit);
  dateInput.value = new Date().toISOString().slice(0, 10);
  syncCompareDateFromPrimary();

  try {
    await loadHistoricalAndTrend();
    document.getElementById("predict-form").requestSubmit();
    if (chart) chart.resize();
  } catch (err) {
    console.error(err);
    document.querySelector("main").insertAdjacentHTML(
      "afterbegin",
      `<p class="note">Kunde inte hämta data. Kör: uvicorn main:app --reload --port 7860</p>`
    );
  }
}

init();
