# Rise – Statistisk analys & prognos av väderdata

Projekt för att analysera historisk väderdata och bygga underlag för temperaturprognoser. Data kommer från **SMHI:s öppna data** för stationen **Vinga A** (stationsnummer 71380) vid Göteborgs kust.

## Syfte

- Samla in och rensa daglig lufttemperatur (min, max, medel) över många år
- Förstå hur vädret förändrats över tid
- Skapa ett rent dataset (`data_clean.csv`) som kan användas för vidare analys och modellering (trend, prognos, ML)

## Datakälla

| Fil | Ungefärlig period |
|-----|-------------------|
| `smhi-opendata_19_71380_199604_200603.csv` | 1996-04 → 1997-11 |
| `smhi-opendata_19_71380_200603_201602.csv` | 2007-06 → 2016-03 |
| `smhi-opendata_19_71380_201602_202601.csv` | 2016-02 → 2026-01 |

Parametern är **lufttemperatur** (daglig minimum och maximum), hämtad från [SMHI Öppna data](https://www.smhi.se/data/sok/).

> **Obs:** Stationen hade driftstopp cirka **1998–2007**, så det finns ett **glapp** i tidsserien. Det ska tas med i trend- och prognosanalys.

## Projektstruktur

```
Rise/
├── prepare_data.py              # Läser SMHI-filer, rensar och slår ihop data
├── data_clean.csv               # Rensat dataset (genereras av skriptet)
├── smhi-opendata_19_71380_*.csv # Rådata från SMHI
└── README.md
```

## Krav

- Python 3.10+
- [pandas](https://pandas.pydata.org/)

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install pandas
```

## Användning

1. Klona repot och gå till projektmappen:

```bash
git clone <repo-url>
cd Rise
```

2. Kontrollera att alla tre SMHI-CSV-filer ligger i rotmappen (samma namn som i `prepare_data.py`).

3. Kör datarberedningen:

```bash
python prepare_data.py
```

4. Utdata skrivs till `data_clean.csv` med kolumnerna:

| Kolumn | Beskrivning |
|--------|-------------|
| `date` | Datum (representativt dygn) |
| `temp_min` | Dagens lägsta temperatur (°C) |
| `temp_max` | Dagens högsta temperatur (°C) |
| `temp_mean` | Medel av min och max (°C) |

Exempel på utskrift:

```
Antal rader: 7428
Datumspann: 1996-04-02 → 2026-01-31
Saknade värden: 0
```

## Hur `prepare_data.py` fungerar

1. Läser varje SMHI-export (hoppar över metadata-rader, semikolon som avgränsare)
2. Plockar ut datum, min- och maxtemperatur
3. Slår ihop filerna, tar bort dubbletter och sorterar på datum
4. Beräknar `temp_mean` och sparar till `data_clean.csv`

## Nästa steg (idé)

- Trendanalys (linjär regression på årsmedel)
- Säsongsdiagram (månadsmönster)
- Train/test-uppdelning på sammanhängande år (t.ex. träna på 2007–2019, testa på 2020–2025)
- Enkel prognosmodell för kommande år

## Grupp

Projektet utförs i grupp om 4 personer. Fördela gärna: data & rensning, analys, visualisering, presentation.

## Licens & data

Väderdata © [SMHI](https://www.smhi.se/) (öppna data enligt SMHI:s villkor). Ange SMHI som källa vid presentation och rapport.
