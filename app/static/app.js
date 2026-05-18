let chart;
let latestTrends = null;
let stationName = "Vinga A";
let widgetPrimary = null;
let widgetCompare = null;

/* --- API & diagram --- */

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${path} → ${res.status}`);
  }
  return res.json();
}

function buildChart(records) {
  const ctx = document.getElementById("chart");
  const years = records.map((d) => d.year);
  const temps = records.map((d) => d.temp_mean);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Årsmedel °C",
          data: temps,
          borderColor: "hsl(223, 90%, 55%)",
          backgroundColor: "hsla(223, 90%, 55%, 0.2)",
          tension: 0.2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "rgba(255,255,255,0.9)" } } },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
        y: {
          title: { display: true, text: "°C", color: "rgba(255,255,255,0.65)" },
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
      },
    },
  });
}

async function loadHistoricalAndTrend() {
  const [historical, trends] = await Promise.all([
    fetchJson("/api/historical"),
    fetchJson("/api/trends"),
  ]);

  stationName = historical.station;
  latestTrends = trends;
  document.getElementById("station").textContent = stationName;
  buildChart(historical.data);
}

/* --- Expanderbar väderwidget (weather-widgets / CodePen) --- */

class WeatherWidget {
  constructor(el, data) {
    this.isCollapsing = false;
    this.isExpanding = false;
    this.animParams = {
      duration: 400,
      easing: "cubic-bezier(0.33,1,0.67,1)",
    };
    this.lang = "sv-SE";
    this.el = document.querySelector(el);
    this.weather = data;
    this.displayWeather();
    this.summary = this.el?.querySelector("summary");
    this.summary?.addEventListener("click", (e) => this.toggle(e));
    this.content = this.summary?.nextElementSibling;
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
          hour: "numeric",
          minute: "2-digit",
        }).format(d);
      }

      if (unit) value = `${value} ${unit}`;
      propEl.textContent = `${value}`;
    });
  }

  toggle(e) {
    e?.preventDefault();
    this.el?.classList.remove("collapsing", "expanding");
    if (this.isCollapsing || !this.el?.open) {
      this.open();
    } else if (this.isExpanding || this.el?.open) {
      this.collapse();
    }
  }

  open() {
    if (!this.el) return;
    this.el.style.height = `${this.el.offsetHeight}px`;
    this.el.open = true;
    this.expand();
  }

  expand() {
    this.el?.classList.add("expanding");
    this.isExpanding = true;
    const startHeight = this.el?.offsetHeight || 0;
    const endHeight =
      (this.summary?.offsetHeight || 0) + (this.content?.offsetHeight || 0);
    this.animation?.cancel();
    this.animation = this.el?.animate(
      { height: [`${startHeight}px`, `${endHeight}px`] },
      this.animParams
    );
    if (this.animation) {
      this.animation.onfinish = () => this.onAnimationFinish(true);
      this.animation.oncancel = () => {
        this.isExpanding = false;
      };
    }
  }

  collapse() {
    this.el?.classList.add("collapsing");
    this.isCollapsing = true;
    const startHeight = this.el?.offsetHeight || 0;
    const endHeight = this.summary?.offsetHeight || 0;
    this.animation?.cancel();
    this.animation = this.el?.animate(
      { height: [`${startHeight}px`, `${endHeight}px`] },
      this.animParams
    );
    if (this.animation) {
      this.animation.onfinish = () => this.onAnimationFinish(false);
      this.animation.oncancel = () => {
        this.isCollapsing = false;
      };
    }
  }

  onAnimationFinish(open) {
    if (!this.el) return;
    this.el.open = open;
    this.animation = null;
    this.isCollapsing = false;
    this.isExpanding = false;
    this.el.style.height = "";
    this.el.classList.remove("collapsing", "expanding");
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
    const [primary, compare] = await Promise.all([
      fetchJson(`/predict?date=${date}`),
      fetchJson(`/predict?date=${compareDate}`),
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
    });
  });
}

async function init() {
  initWeatherWidgets();
  initHeroMoods();
  initTabs();

  const dateInput = document.getElementById("date-input");
  dateInput.addEventListener("change", syncCompareDateFromPrimary);

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
