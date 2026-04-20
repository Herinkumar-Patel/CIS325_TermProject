## Features included
- User registration and login
- Password reset / change if forgotten
- Dashboard summary
- Task CRUD
- Project collaboration with member list
- Notifications and reminders
- Notes
- File uploads
- SQLite persistence so users can close the app and log back in later

## Run the app

### Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs at `http://localhost:5000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

## Suggested test flow
1. Open the frontend.
2. Register a new user.
3. Log out.
4. Close both apps.
5. Relaunch backend and frontend.
6. Log in with the same credentials.
7. Use the dashboard and other features.
