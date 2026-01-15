# KINETIX | High-Performance Athletic Training Analytics

**KINETIX** is a professional-grade training analytics platform that helps athletes optimize performance, prevent injuries, and achieve peak race performance through data-driven insights. It transforms raw activity data into actionable coaching intelligence using peer-reviewed sports science models.

---

## 🧠 The Scientific Engine

KINETIX implements advanced mathematical models to quantify human performance and cardiovascular stress:

- **TRIMP (Training Impulse):** Quantifies workout stress using heart rate intensity and duration
- **ACWR (Acute:Chronic Workload Ratio):** Predicts injury risk by comparing recent load to baseline fitness
- **Race Performance Prediction:** Multi-variate regression model with distance scaling and fatigue adjustments
- **Weather Normalization:** Dew point calculations for fair performance comparisons

📖 **For detailed mathematical explanations, see [MATH.md](MATH.md)**

---

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python 3.11+), PostgreSQL, Scikit-learn, Pandas, NumPy
- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, Framer Motion, Shadcn UI, Recharts
- **Infrastructure:** Docker & Docker Compose
- **APIs:** Strava OAuth 2.0, OpenWeatherMap

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ and Python 3.11+ (for local development)

### 1. Clone the Repository

```bash
git clone https://github.com/prabhgunbhatia/KINETIX.git
cd KINETIX
```

### 2. Environment Setup

Copy `docker-compose.example.yml` to `docker-compose.yml` and configure:

```yaml
environment:
  DATABASE_URL: postgresql://user:password@db:5432/kinetix
  JWT_SECRET: your-secret-key-here
  STRAVA_CLIENT_ID: your-strava-client-id
  STRAVA_CLIENT_SECRET: your-strava-client-secret
  OPENWEATHER_API_KEY: your-openweather-api-key
  FRONTEND_URL: http://localhost:3000
  ALLOWED_ORIGINS: http://localhost:3000
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Launch

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 📊 Key Features

### ⚡ Real-Time Training Load Monitoring
- Automatic TRIMP calculation for every workout
- Historical load trends with 28-day rolling averages
- Color-coded intensity zones

### 🎯 Injury Risk Detection
- ACWR-based readiness scoring with visual gauge
- Real-time warnings when approaching danger zones (ACWR > 1.5)
- "What-if" scenarios for proposed workouts

### 🏁 Race Performance Predictions
- Multi-distance predictions (5K, 10K, Half Marathon, Marathon)
- Confidence scores based on training consistency
- Accounts for fitness growth, fatigue, and distance scaling

### 🌦️ Environmental Adjustments
- Automatic pace normalization for temperature and humidity
- Fair comparison of performances across different conditions

---

## 📁 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── analytics_service.py # ACWR, Race Prediction, TRIMP
│   │   ├── weather_service.py   # Environmental normalization
│   │   └── ...
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── dashboard/           # Main visualization hub
│   │   └── ...
│   └── components/
└── docker-compose.yml
```

---

## 📖 API Documentation

Interactive API docs available at `/docs`:

- **Authentication:** JWT-based with refresh tokens
- **Endpoints:** `/dashboard`, `/analytics/predict`, `/analytics/predict-race`, `/sync`
- **OAuth:** Strava and Garmin integration

---

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Quick Deploy:**
1. **Backend (Railway):** Connect repo, set root to `backend/`, configure env vars
2. **Frontend (Vercel):** Connect repo, set root to `frontend/`, set `NEXT_PUBLIC_API_URL`
3. **Database:** Use Railway PostgreSQL or external instance

---

## 🧪 Testing

```bash
# Backend
cd backend && pytest tests/ -v --cov=app

# Frontend
cd frontend && npm run test
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Banister TRIMP Model:** Banister, E.W. (1991)
- **ACWR Research:** Gabbett, T.J. (2016)
- **Riegel's Law:** Riegel, P.S. (1981)

---

## 📧 Contact

- **GitHub Issues:** [Open an issue](https://github.com/prabhgunbhatia/KINETIX/issues)
- **Email:** [bhatiaprabhgun06@gmail.com](mailto:bhatiaprabhgun06@gmail.com)

---

**Built with ❤️ by athletes, for athletes.**

*"The goal is not to train harder, but to train smarter. Data shows the way."*
