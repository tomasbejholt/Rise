"""Laddar data per station och beräknar trend för diagram."""

from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parent.parent
ML_MODEL_FILE = ROOT / "models" / "temperature_models.pkl"
ML_STATION_IDS = frozenset({"vinga", "stockholm", "malmo"})


def station_has_ml(station_id: str | None = None) -> bool:
    key, _ = resolve_station(station_id)
    return key in ML_STATION_IDS and ML_MODEL_FILE.exists()

STATIONS = {
    "vinga": {
        "file": "data_clean.csv",
        "name": "Vinga A",
        "gap_note": "Data med glapp 1998–2007 p.g.a. stationens driftstopp.",
    },
    "stockholm": {
        "file": "data_clean_stockholm.csv",
        "name": "Stockholm",
        "gap_note": None,
    },
    "malmo": {
        "file": "data_clean_malmo.csv",
        "name": "Malmö",
        "gap_note": None,
    },
}

DEFAULT_STATION = "vinga"


def list_stations() -> list[dict]:
    return [
        {
            "id": key,
            "name": meta["name"],
            "has_ml_model": station_has_ml(key),
        }
        for key, meta in STATIONS.items()
    ]


def resolve_station(station_id: str | None) -> tuple[str, dict]:
    key = (station_id or DEFAULT_STATION).lower().strip()
    if key not in STATIONS:
        raise ValueError(
            f"Okänd station: {station_id}. Välj: {', '.join(STATIONS)}"
        )
    return key, STATIONS[key]


def data_path(station_id: str | None) -> Path:
    _, meta = resolve_station(station_id)
    return ROOT / "data" / meta["file"]


def station_name(station_id: str | None) -> str:
    _, meta = resolve_station(station_id)
    return meta["name"]


def load_daily(station_id: str | None = None) -> pd.DataFrame:
    path = data_path(station_id)
    if not path.exists():
        key, _ = resolve_station(station_id)
        raise FileNotFoundError(f"Saknar datafil för station {key}: {path}")
    df = pd.read_csv(path, parse_dates=["date"])
    return df.sort_values("date").set_index("date")


def annual_means(station_id: str | None = None) -> pd.DataFrame:
    daily = load_daily(station_id)
    return (
        daily.assign(year=daily.index.year)
        .groupby("year", as_index=False)["temp_mean"]
        .mean()
    )


def compute_trend(station_id: str | None = None) -> dict:
    key, meta = resolve_station(station_id)
    annual = annual_means(key)
    years = annual["year"].astype(float).values
    temps = annual["temp_mean"].values
    slope, intercept, r, p, _ = stats.linregress(years, temps)
    note = "Linjär trend på årsmedel."
    if station_has_ml(key):
        note += " ML-prognos tillgänglig för denna station."
    else:
        note += " Prognos baserad på säsongsmedel (ML ej tillgänglig)."
    return {
        "station": meta["name"],
        "station_id": key,
        "slope_per_year": round(float(slope), 4),
        "intercept": round(float(intercept), 4),
        "r_squared": round(float(r**2), 4),
        "p_value": round(float(p), 4),
        "unit": "°C/år",
        "note": note,
    }


def station_gap_note(station_id: str | None = None) -> str | None:
    _, meta = resolve_station(station_id)
    return meta.get("gap_note")
