# KINETIX | High-Performance Athletic Training Analytics

**KINETIX** is a professional-grade training analytics platform that helps athletes optimize performance, prevent injuries, and achieve peak race performance through data-driven insights. It transforms raw activity data into actionable coaching intelligence using peer-reviewed sports science models.

---

## 🧠 The Scientific Engine

KINETIX implements advanced mathematical models to quantify human performance and cardiovascular stress:

### 1. Training Impulse (TRIMP)

We quantify the internal load of every session using the **Edwards TRIMP Method**, which accounts for the exponential physiological stress of high-heart-rate zones.

```
TRIMP = Duration (min) × Avg HR × Intensity Factor
```

### 2. Acute:Chronic Workload Ratio (ACWR)

The core of our **Readiness Gauge**. We compare a 7-day "Acute" window (Fatigue) against a 28-day "Chronic" window (Fitness) to monitor injury risk.

```
ACWR = Rolling 7-day Avg Load / Rolling 28-day Avg Load
```

- **Optimal Zone (0.8 - 1.3):** The "Sweet Spot" for building fitness safely.
- **Danger Zone (> 1.5):** Exponentially increased injury risk due to rapid workload spikes.

### 3. Predictive Hybrid Model

KINETIX avoids "optimistic" linear projections by using a **Weighted Log-Linear Regression** to account for the law of diminishing returns in athletic gains.

```
ln(Pace_pred) = β₀ + β₁(Fitness) + β₂(Fatigue)
```

- **Recency Weighting:** Most recent performances are weighted 3× higher to "anchor" the model to current reality.
- **Riegel's Law Scaling:** We scale predictions across distances using the power law: `T₂ = T₁ × (D₂/D₁)^1.06`.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** FastAPI (Python 3.11+), PostgreSQL (SQLAlchemy), Scikit-learn, Pandas
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion, Shadcn UI
- **Infrastructure:** Docker & Docker Compose for microservice orchestration
- **APIs:** Strava OAuth 2.0 for activity sync, OpenWeatherMap for pace normalization

---

## 📁 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application & entry point
│   │   ├── models.py            # SQLAlchemy ORM database schemas
│   │   ├── database.py          # PostgreSQL session management
│   │   ├── auth.py              # JWT authentication & User security
│   │   ├── analytics_service.py # CORE: ACWR, Race Prediction, & TRIMP math
│   │   ├── weather_service.py   # Environmental normalization (Dew point/Temp)
│   │   ├── strava_service.py    # OAuth 2.0 & Activity Ingestion
│   │   └── garmin_service.py    # Garmin Connect API integration
│   ├── Dockerfile               # Multi-stage production build
│   └── requirements.txt         # Science & API dependencies
├── frontend/
│   ├── app/
│   │   ├── dashboard/           # Main data visualization hub
│   │   └── page.tsx             # Interactive landing page
│   ├── components/
│   │   ├── readiness-gauge.tsx  # Custom SVG gauge for ACWR
│   │   └── ui/                  # Shadcn UI design system
│   └── contexts/
│       └── AuthContext.tsx      # Global state for secure user sessions
├── docker-compose.yml           # Full-stack orchestration (DB, API, Web)
└── README.md                    # You are here
```

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/kinetix.git
cd kinetix
```

### 2. Environment Setup

Create `.env` files for both frontend and backend:

**`backend/.env`**
```env
DATABASE_URL=postgresql://user:password@db:5432/kinetix
SECRET_KEY=your-secret-key-here
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
OPENWEATHER_API_KEY=your-openweather-api-key
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Launch with Docker

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
- Color-coded intensity zones based on heart rate distribution
- Historical load trends with 28-day rolling averages

### 🎯 Injury Risk Detection
- ACWR-based readiness scoring
- Visual warnings when approaching danger zones (ACWR > 1.5)
- Personalized recommendations for load management

### 🏁 Race Performance Predictions
- Multi-distance predictions (5K, 10K, Half Marathon, Marathon)
- Confidence intervals based on training consistency
- Regression-to-mean adjustments for realistic forecasts

### 🌦️ Environmental Adjustments
- Automatic pace normalization for temperature and humidity
- Dew point impact calculations
- Historical weather data integration

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 📖 API Documentation

Interactive API documentation is available at `/docs` when running the backend:

- **Authentication:** JWT-based with refresh tokens
- **Endpoints:** `/activities`, `/analytics`, `/predictions`, `/user`
- **Rate Limiting:** 100 requests per minute per user

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Edwards TRIMP Model:** Edwards, S. (1993). High performance training and racing.
- **ACWR Research:** Gabbett, T.J. (2016). The training-injury prevention paradox.
- **Riegel's Law:** Riegel, P.S. (1981). Athletic records and human endurance.

---

## 📧 Contact

For questions or support, please open an issue or contact [your-email@example.com](mailto:your-email@example.com).

---

**Built with ❤️ by athletes, for athletes.**
