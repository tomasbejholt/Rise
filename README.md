# Tempprognos – Statistisk analys & prognos av väderdata

Projekt för att analysera historisk väderdata och bygga underlag för temperaturprognoser. Data kommer från **SMHI:s öppna data** för stationen **Vinga A** (stationsnummer 71380) vid Göteborgs kust.

## Syfte

- Samla in och rensa daglig lufttemperatur (min, max, medel) över många år
- Förstå hur vädret förändrats över tid
- Exponera prognos via API och webbgränssnitt

## Datakälla

| Fil | Ungefärlig period |
|-----|-------------------|
| `smhi-opendata_19_71380_199604_200603.csv` | 1996-04 → 1997-11 |
| `smhi-opendata_19_71380_200603_201602.csv` | 2007-06 → 2016-03 |
| `smhi-opendata_19_71380_201602_202601.csv` | 2016-02 → 2026-01 |

> **Obs:** Stationen hade driftstopp cirka **1998–2007** (glapp i tidsserien).

## Projektstruktur

```
Rise/
├── prepare_data.py          # SMHI → data_clean.csv
├── data_clean.csv
├── main.py                  # FastAPI: /predict, /health, webb-UI
├── model/                   # predict_temperature() + model.pkl (senare)
├── api/data_service.py      # Historik & trend för diagram
├── app/static/              # Frontend (HTML, CSS, JS)
├── Dockerfile               # Hugging Face Docker Space
├── requirements.txt
└── README.md
```

## Krav

- Python 3.10+
- Se `requirements.txt` (inkl. `xgboost` för ML-prognos på Vinga A, Stockholm och Malmö)
- **macOS:** `brew install libomp` om XGBoost inte startar

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Data

```bash
python prepare_data.py
```

## Köra lokalt

```bash
uvicorn main:app --reload --port 7860
```

Öppna **http://localhost:7860**

### Docker

```bash
docker build -t rise .
docker run -p 7860:7860 rise
```

Hugging Face: **Docker Space**, port **7860**.

## API

| Endpoint | Beskrivning |
|----------|-------------|
| `GET /` | Webb-UI |
| `GET /health` | Status |
| `GET /predict?date=YYYY-MM-DD` | Temperaturprognos (gruppens endpoint) |
| `GET /api/historical` | Årsmedel för diagram |
| `GET /api/trends` | Linjär trend (diagram) |

Exempel:

```http
GET /predict?date=2028-06-14
```

```json
{
  "date": "2028-06-14",
  "predicted_temp": 17.3,
  "lower_bound": 14.8,
  "upper_bound": 19.8
}
```

**Modell:** Lägg tränad modell som `model/model.pkl` – då används den automatiskt. Annars placeholder baserad på `data_clean.csv`.

## Grupp

| Roll | Mapp |
|------|------|
| Data | `prepare_data.py` |
| Modell | `model/` |
| API | `main.py` |
| Design | `app/static/` |
| Deploy | `Dockerfile` |

## Licens & data

Väderdata © [SMHI](https://www.smhi.se/). Ange SMHI som källa i presentation och rapport.
