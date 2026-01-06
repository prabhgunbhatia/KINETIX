# KINETIX - Athletic Training Analytics Platform

A professional-grade training analytics platform that helps athletes optimize performance, prevent injuries, and achieve peak race performance through data-driven insights.

## 🚀 Features

### Core Analytics
- **ACWR (Acute:Chronic Workload Ratio)**: Real-time injury risk monitoring
- **Training Load Tracking**: TRIMP-based effort points calculation
- **Weather-Adjusted Pace**: Normalized pace calculations accounting for environmental conditions
- **Base Fitness & Recent Fatigue**: 28-day and 7-day rolling averages

### Race Prediction & Tapering
- **Momentum-Based Race Prediction**: Projects finish times based on current training habits
- **Multi-Variate Linear Regression**: Uses fitness and fatigue to predict race pace
- **Smart Taper Recommendations**: ACWR-based guidance for optimal race day performance
- **Confidence Scoring**: R²-based prediction reliability indicators

### Data Integration
- **Strava Sync**: Automatic activity import from Strava
- **Manual Activity Entry**: Add custom training sessions
- **Weather Data Integration**: OpenWeatherMap API for environmental corrections

### Professional UI/UX
- **Coach's Verdict**: Human-first language replacing technical jargon
- **Interactive Dashboards**: Real-time training stress visualization
- **Responsive Design**: Mobile-friendly interface
- **Dark Theme**: Professional athletic software aesthetic

## 🛠️ Tech Stack

### Backend
- **FastAPI** (Python 3.11+)
- **PostgreSQL** (via SQLAlchemy)
- **Pandas** & **NumPy** for analytics
- **Scikit-learn** for machine learning
- **Docker** for containerization

### Frontend
- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** for data visualization
- **Framer Motion** for animations
- **Shadcn UI** components

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ and npm
- Python 3.11+ (for local development)
- PostgreSQL (or use Docker Compose)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**:
```bash
git clone <your-repo-url>
cd project
```

2. **Set up environment variables**:
Create a `.env` file in the root directory:
```env
POSTGRES_USER=kinetix
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=kinetix
DATABASE_URL=postgresql://kinetix:your_secure_password@postgres:5432/kinetix
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
OPENWEATHER_API_KEY=your_openweather_api_key
JWT_SECRET=your_jwt_secret_key
```

3. **Start the services**:
```bash
docker-compose up -d --build
```

4. **Access the application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Local Development

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application & routes
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── database.py          # Database configuration
│   │   ├── auth.py              # Authentication routes
│   │   ├── auth_utils.py        # JWT & password hashing
│   │   ├── analytics_service.py # ACWR, race prediction, TRIMP
│   │   ├── weather_service.py   # Weather data & pace normalization
│   │   ├── strava_service.py    # Strava OAuth & sync
│   │   └── garmin_service.py    # Garmin integration
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Main dashboard
│   │   ├── login/
│   │   └── signup/
│   ├── components/
│   │   ├── ui/                  # Shadcn UI components
│   │   ├── ProtectedRoute.tsx
│   │   └── readiness-gauge.tsx
│   └── contexts/
│       └── AuthContext.tsx
├── docker-compose.yml
└── README.md
```

## 🔑 Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `STRAVA_CLIENT_ID`: Strava OAuth client ID
- `STRAVA_CLIENT_SECRET`: Strava OAuth client secret
- `OPENWEATHER_API_KEY`: OpenWeatherMap API key

### Optional
- `POSTGRES_USER`: PostgreSQL username (default: kinetix)
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_DB`: Database name (default: kinetix)

## 📊 Key Metrics Explained

### ACWR (Readiness Score)
- **< 0.8**: Under-training (Recovery Mode)
- **0.8 - 1.3**: Optimal (Sweet Spot)
- **1.3 - 1.5**: Caution (Ramping up quickly)
- **> 1.5**: High Risk (Overload Warning)

### Base Fitness (Chronic Load)
28-day rolling average of training load. Represents your aerobic foundation.

### Recent Fatigue (Acute Load)
7-day rolling average of training load. Reflects current physical stress.

### Effort Points (TRIMP)
Training Impulse score combining duration and intensity (heart rate).

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📝 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Strava API for activity data
- OpenWeatherMap for weather data
- TrainingPeaks for inspiration on training analytics

## 📧 Support

For issues and questions, please open an issue on GitHub.
