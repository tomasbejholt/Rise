"""Temperaturprognos – ML-modell (low/mid/high) för Vinga A, Stockholm och Malmö."""

from pathlib import Path

import pandas as pd

from api.data_service import resolve_station

ROOT = Path(__file__).resolve().parent.parent
MODEL_FILE = ROOT / "models" / "temperature_models.pkl"

# LabelEncoder-ordning från forecaster.ipynb på data_combined.csv:
# ['Malmö', 'Stockholm', 'Vinga A'] -> 0, 1, 2
CITY_CODE = {
    "malmo": 0,
    "stockholm": 1,
    "vinga": 2,
}

ML_STATIONS = frozenset(CITY_CODE.keys())


def _build_features(date_str: str, station_id: str) -> pd.DataFrame:
    key, _ = resolve_station(station_id)
    if key not in CITY_CODE:
        raise ValueError(f"Ingen ML-kod för station: {key}")

    user_date = pd.to_datetime(date_str)
    return pd.DataFrame(
        {
            "city": [CITY_CODE[key]],
            "day_of_year": [user_date.dayofyear],
            "month": [user_date.month],
            "year": [user_date.year],
        }
    )


def _load_daily(station_id: str) -> pd.DataFrame:
    from api.data_service import data_path

    df = pd.read_csv(data_path(station_id), parse_dates=["date"])
    return df.sort_values("date").set_index("date")


def _predict_from_data(date_str: str, station_id: str) -> dict:
    daily = _load_daily(station_id)
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
    key, _ = resolve_station(station_id)
    return {
        "date": date_str,
        "station_id": key,
        "predicted_temp": round(temp, 1),
        "lower_bound": round(temp - margin, 1),
        "upper_bound": round(temp + margin, 1),
        "model": "seasonal",
    }


def _predict_from_pkl(date_str: str, station_id: str) -> dict:
    import joblib

    models = joblib.load(MODEL_FILE)
    if not isinstance(models, dict) or "mid" not in models:
        raise TypeError(
            "temperature_models.pkl måste vara dict med nycklarna low, mid, high"
        )

    key, _ = resolve_station(station_id)
    features = _build_features(date_str, key)
    low = float(models["low"].predict(features)[0])
    mid = float(models["mid"].predict(features)[0])
    high = float(models["high"].predict(features)[0])

    return {
        "date": date_str,
        "station_id": key,
        "predicted_temp": round(mid, 1),
        "lower_bound": round(low, 1),
        "upper_bound": round(high, 1),
        "model": "ml",
    }


def predict_temperature(date_str: str, station_id: str | None = None) -> dict:
    key, _ = resolve_station(station_id)

    if key in ML_STATIONS and MODEL_FILE.exists():
        try:
            return _predict_from_pkl(date_str, key)
        except Exception:
            pass

    return _predict_from_data(date_str, key)


def station_has_ml(station_id: str | None = None) -> bool:
    key, _ = resolve_station(station_id)
    return key in ML_STATIONS and MODEL_FILE.exists()
