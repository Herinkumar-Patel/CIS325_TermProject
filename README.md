## Project structure

```text
src/
  Backend/
    server.js
    db.js
    middleware/auth.js
    package.json
  Frontend/
    src/App.jsx
    src/main.jsx
    src/styles.css
    package.json
```

## How to run the backend

```bash
cd src/Backend
npm install
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

## How to run the frontend

Open a second terminal:

```bash
cd src/Frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## API connection

The frontend uses Fetch and connects to:

```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

Optional `.env` file for frontend:

```text
VITE_API_URL=http://localhost:5000
```
