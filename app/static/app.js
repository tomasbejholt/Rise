let chart;

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
          borderColor: "#4da3ff",
          backgroundColor: "rgba(77, 163, 255, 0.15)",
          tension: 0.2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#e8eef7" } } },
      scales: {
        x: { ticks: { color: "#8fa3bf" }, grid: { color: "#243049" } },
        y: {
          title: { display: true, text: "°C", color: "#8fa3bf" },
          ticks: { color: "#8fa3bf" },
          grid: { color: "#243049" },
        },
      },
    },
  });
}

function showPrediction(data) {
  document.getElementById("predict-value").textContent =
    `${data.predicted_temp} °C`;
  document.getElementById("predict-meta").textContent =
    `Intervall ${data.lower_bound} – ${data.upper_bound} °C (${data.date})`;
  document.getElementById("predict-error").hidden = true;
}

async function loadHistoricalAndTrend() {
  const [historical, trends] = await Promise.all([
    fetchJson("/api/historical"),
    fetchJson("/api/trends"),
  ]);

  document.getElementById("station").textContent = historical.station;
  buildChart(historical.data);

  const sign = trends.slope_per_year >= 0 ? "+" : "";
  document.getElementById("trend-value").textContent =
    `${sign}${trends.slope_per_year} °C/år`;
  document.getElementById("trend-meta").textContent =
    `R² = ${trends.r_squared} (placeholder)`;
}

async function onPredictSubmit(event) {
  event.preventDefault();
  const date = document.getElementById("date-input").value;
  const errEl = document.getElementById("predict-error");

  try {
    const data = await fetchJson(`/predict?date=${date}`);
    showPrediction(data);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
}

async function init() {
  document.getElementById("predict-form").addEventListener("submit", onPredictSubmit);
  document.getElementById("date-input").value = new Date().toISOString().slice(0, 10);

  try {
    await loadHistoricalAndTrend();
  } catch (err) {
    console.error(err);
    document.querySelector("main").insertAdjacentHTML(
      "afterbegin",
      `<p class="note">Kunde inte hämta data. Kör: uvicorn main:app --reload --port 7860</p>`
    );
  }
}

init();
