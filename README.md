# USSD DEMO 

USSD-based savings cooperative platform. Members register, join fixed-tier savings circles, contribute each cycle, and receive automatic rotating payouts — all through a simulated USSD phone interface.

## Project Structure

```bash
codalbit/
├── ussdbnd/ # Backend, Express + TypeScript + MongoDB (USSD webhook logic)
└── ussdc/ # Frontend, React + Vite + Tailwind (USSD phone simulator)
```

## Prerequisites

- Node.js 18+
- npm
- A MongoDB connection string (local or Atlas)

## Setup

1. **Clone the repository**

```bash
   git clone <repo-url>
   cd codalbit
```

2. **Install dependencies for both projects**

```bash
   npm install
   npm run install all
```

3. **Configure environment variables**

Create `ussdbnd/.env`:

MONGO_URI=your_mongodb_connection_string
PORT=5000

(Check `ussdbnd/.env.example` for the full list if present.)

4. **Run both backend and frontend together from the root terminal(e.g codalbit)**

```bash
   npm run dev
```

   This starts:
   - Backend on `http://localhost:5001`
   - Frontend (USSD simulator) on `http://localhost:5173`

   Or run them separately:

```bash
   npm run dev:backend
   npm run dev:client
```

## Using the Simulator

Open `http://localhost:5173` in your browser. Click **Dial *123#** to start a session, then type responses (menu numbers, name, PIN, etc.) and press Enter or click Send to progress through the flow — just like a real feature-phone USSD session.

### Demo Flow

1. **Register** — full name, national ID, mobile money number, 4-digit PIN → get a Member ID
2. **Login** — with your Member ID and PIN
3. **Join a Circle** — choose from 5 fixed-tier circles (Circle A: MK500 up to Circle E: MK10,000)
4. **Make a Contribution** — pays the circle's fixed amount; once all members in a circle have contributed for the cycle, the pooled amount automatically pays out to the next member in rotation
5. **Check Balance** / **Check Cycle Status** / **Help** — available from the main menu after login

## Notes

- The five savings circles are created automatically on server startup — no manual seeding required.
- Mobile money payment is simulated (no live integration) — contributions and payouts are recorded as ledger entries in MongoDB.
- Sessions are held in-memory on the backend with a short TTL, mimicking real USSD session behavior.

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose, bcrypt
- **Frontend:** React, Vite, TypeScript, Tailwind CSS
