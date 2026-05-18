"""Laddar data och beräknar trend/prognos (ersätts av tränad modell senare)."""

from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data_clean.csv"
STATION = "Vinga A"


def load_daily() -> pd.DataFrame:
    df = pd.read_csv(DATA_FILE, parse_dates=["date"])
    return df.sort_values("date").set_index("date")


def annual_means() -> pd.DataFrame:
    daily = load_daily()
    return (
        daily.assign(year=daily.index.year)
        .groupby("year", as_index=False)["temp_mean"]
        .mean()
    )


def compute_trend() -> dict:
    annual = annual_means()
    years = annual["year"].astype(float).values
    temps = annual["temp_mean"].values
    slope, intercept, r, p, _ = stats.linregress(years, temps)
    return {
        "station": STATION,
        "slope_per_year": round(float(slope), 4),
        "intercept": round(float(intercept), 4),
        "r_squared": round(float(r**2), 4),
        "p_value": round(float(p), 4),
        "unit": "°C/år",
        "note": "Enkel linjär trend på årsmedel (placeholder tills ML-modell finns).",
    }


def compute_forecast(years_ahead: int = 10) -> dict:
    annual = annual_means()
    years = annual["year"].astype(float).values
    temps = annual["temp_mean"].values
    slope, intercept, _, _, _ = stats.linregress(years, temps)

    last_year = int(annual["year"].max())
    forecast = []
    for y in range(last_year + 1, last_year + 1 + years_ahead):
        forecast.append(
            {"year": y, "temp_mean": round(intercept + slope * y, 2)}
        )

    historical = [
        {"year": int(row["year"]), "temp_mean": round(row["temp_mean"], 2)}
        for _, row in annual.iterrows()
    ]

    return {
        "station": STATION,
        "historical": historical,
        "forecast": forecast,
        "unit": "°C",
        "source": "linear_trend",
    }
