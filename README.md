# Taskboard: Full Stack Mini Project

A task manager built with **HTML/CSS/JavaScript** (front-end), **Node.js + Express** (back-end) and **MongoDB + Mongoose** (database).

## Features
- Register and log in (passwords hashed with bcrypt, sessions with JWT)
- Create, read, update and delete tasks (CRUD)
- Each user sees only their own tasks
- Dynamic rendering: filter by status, search, mark done, overdue highlighting
- Responsive layout with light and dark mode

## Tech stack
| Layer     | Technology                         |
|-----------|------------------------------------|
| Front-end | HTML, CSS, vanilla JavaScript      |
| Back-end  | Node.js, Express                   |
| Database  | MongoDB with Mongoose              |
| Auth      | JWT (jsonwebtoken) + bcryptjs      |

## Project structure
```
server.js            Express app and MongoDB connection
models/              Mongoose schemas (User, Task)
routes/auth.js       Register, login, current user
routes/tasks.js      Task CRUD endpoints
middleware/auth.js   JWT check for protected routes
public/              Front-end (index.html, style.css, app.js, config.js)
```

## Run locally
1. Install Node.js 18+ and MongoDB (or use a free MongoDB Atlas cluster).
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.
4. Start: `npm start`
5. Open http://localhost:3000

## API
| Method | Endpoint             | Auth | Description          |
|--------|----------------------|------|----------------------|
| POST   | /api/auth/register   | No   | Create account       |
| POST   | /api/auth/login      | No   | Log in, returns JWT  |
| GET    | /api/auth/me         | Yes  | Current user         |
| GET    | /api/tasks           | Yes  | List tasks           |
| POST   | /api/tasks           | Yes  | Create task          |
| PUT    | /api/tasks/:id       | Yes  | Update task          |
| DELETE | /api/tasks/:id       | Yes  | Delete task          |

Protected routes expect the header `Authorization: Bearer <token>`.

## Deployment (Week 15)

### 1. Database: MongoDB Atlas
1. Create a free cluster at mongodb.com/atlas.
2. Database Access: add a user with a password.
3. Network Access: allow `0.0.0.0/0`.
4. Click Connect, then Drivers, and copy the connection string. Replace `<password>` and add a database name:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/taskmanager`

### 2. Back-end (and front-end) on Render
1. Push this project to GitHub.
2. On render.com choose New, then Web Service, and connect the repo.
3. Build command: `npm install`  Start command: `npm start`
4. Add environment variables: `MONGO_URI` (Atlas string) and `JWT_SECRET` (any long random text).
5. Deploy. The app is live at `https://your-app.onrender.com` because Express also serves the front-end.

### 3. Optional: front-end on Vercel or Netlify
1. Deploy only the `public/` folder.
2. In `public/config.js` set `window.API_BASE = 'https://your-app.onrender.com';`
3. On Render set `CLIENT_URL` to your Vercel/Netlify URL.
