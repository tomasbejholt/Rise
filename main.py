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
    title="Rise – Väderprognos",
    description="SMHI Vinga A. Gruppens /predict + historikdiagram i webben.",
)

if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class TemperatureResponse(BaseModel):
    date: str
    predicted_temp: float
    lower_bound: float
    upper_bound: float


@app.get("/")
def index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Frontend saknas i app/static/"}


@app.get("/health")
def health():
    return {"status": "ok", "station": data_service.STATION}


@app.get("/predict", response_model=TemperatureResponse)
def predict(date: str = Query(..., description="YYYY-MM-DD")):
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=422, detail="Invalid date format. Use YYYY-MM-DD."
        )

    result = predict_temperature(date)
    return TemperatureResponse(**result)


@app.get("/api/historical")
def historical():
    annual = data_service.annual_means()
    return {
        "station": data_service.STATION,
        "data": annual.to_dict(orient="records"),
    }


@app.get("/api/trends")
def trends():
    return data_service.compute_trend()
