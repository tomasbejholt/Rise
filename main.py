from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from model import predict_temperature
from pydantic import BaseModel

from api import data_service

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "app" / "static"

app = FastAPI(
    title="Tempprognos – Väderprognos",
    description="SMHI-data för Vinga A, Stockholm och Malmö.",
)

if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class TemperatureResponse(BaseModel):
    date: str
    predicted_temp: float
    lower_bound: float
    upper_bound: float
    station_id: str | None = None
    model: str | None = None


def _resolve_station_id(station: str | None) -> str:
    try:
        key, _ = data_service.resolve_station(station)
        return key
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.get("/")
def index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Frontend saknas i app/static/"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "stations": data_service.list_stations(),
        "default_station": data_service.DEFAULT_STATION,
    }


@app.get("/api/stations")
def stations():
    return {"stations": data_service.list_stations()}


@app.get("/predict", response_model=TemperatureResponse)
def predict(
    date: str = Query(..., description="YYYY-MM-DD"),
    station: str | None = Query(None, description="vinga | stockholm | malmo"),
):
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=422, detail="Invalid date format. Use YYYY-MM-DD."
        )

    station_id = _resolve_station_id(station)
    try:
        result = predict_temperature(date, station_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    return TemperatureResponse(**result)


@app.get("/api/historical")
def historical(station: str | None = Query(None)):
    station_id = _resolve_station_id(station)
    try:
        annual = data_service.annual_means(station_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    return {
        "station": data_service.station_name(station_id),
        "station_id": station_id,
        "data": annual.to_dict(orient="records"),
        "gap_note": data_service.station_gap_note(station_id),
    }


@app.get("/api/trends")
def trends(station: str | None = Query(None)):
    station_id = _resolve_station_id(station)
    try:
        return data_service.compute_trend(station_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
