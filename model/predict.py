"""Temperaturprognos – ersätt med tränad modell när model.pkl finns."""

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data_clean.csv"
MODEL_FILE = ROOT / "models" / "temperature_models.pkl"


def _load_daily() -> pd.DataFrame:
    df = pd.read_csv(DATA_FILE, parse_dates=["date"])
    return df.sort_values("date").set_index("date")


def _predict_from_data(date_str: str) -> dict:
    """Placeholder: säsongsmedel för månad-dag + enkel osäkerhet."""
    daily = _load_daily()
    target = pd.Timestamp(date_str)

    exact = daily[daily.index.normalize() == target.normalize()]
    if not exact.empty:
        temp = float(exact["temp_mean"].iloc[0])
    else:
        subset = daily[daily.index.month == target.month]
        if subset.empty:
            temp = float(daily["temp_mean"].mean())
        else:
            temp = float(subset["temp_mean"].mean())

    margin = 2.5
    return {
        "date": date_str,
        "predicted_temp": round(temp, 1),
        "lower_bound": round(temp - margin, 1),
        "upper_bound": round(temp + margin, 1),
    }


def _predict_from_pkl(date_str: str) -> dict:
    import joblib

    artifact = joblib.load(MODEL_FILE)
    if hasattr(artifact, "predict"):
        temp = float(artifact.predict([[date_str]])[0])
    elif callable(artifact):
        temp = float(artifact(date_str))
    else:
        raise TypeError("Okänt modellformat i model.pkl")

    margin = 2.0
    return {
        "date": date_str,
        "predicted_temp": round(temp, 1),
        "lower_bound": round(temp - margin, 1),
        "upper_bound": round(temp + margin, 1),
    }


def predict_temperature(date_str: str) -> dict:
    if MODEL_FILE.exists():
        try:
            return _predict_from_pkl(date_str)
        except Exception:
            pass
    return _predict_from_data(date_str)
