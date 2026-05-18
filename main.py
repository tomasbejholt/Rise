from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from model import predict_temperature
from pydantic import BaseModel

app = FastAPI()


class TemperatureResponse(BaseModel):
    date: str
    predicted_temp: float
    lower_bound: float
    upper_bound: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/predict", response_model=TemperatureResponse)
def predict(date: str = Query(..., description="YYYY-MM-DD")):
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=422, detail="Invalid date format. Use YYYY-MM-DD."
        )

    result = predict_temperature(date)

    return TemperatureResponse(
        date=result["date"],
        predicted_temp=result["predicted_temp"],
        lower_bound=result["lower_bound"],
        upper_bound=result["upper_bound"],
    )
