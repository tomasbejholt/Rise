# app – Frontend

Statiska filer i **`static/`**:

- `index.html` – layout, datumväljare (prognos + jämförelse), diagram, två väderwidgets
- `style.css` – design inkl. expanderbara widgets (CodePen / weather-widgets)
- `app.js` – diagram, `/predict`, `/api/historical`, `/api/trends`, widget-logik
- `images/` – väderbilder (hero, storm, moln)
- `weather-widgets-LICENSE.txt` – licens för widget-designen

Körs via `uvicorn main:app` – se rot-README.
