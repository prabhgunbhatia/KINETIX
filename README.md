# KINETIX | High-Performance Athletic Training Analytics

**KINETIX** is a professional-grade training analytics platform that helps athletes optimize performance, prevent injuries, and achieve peak race performance through data-driven insights. It transforms raw activity data into actionable coaching intelligence using peer-reviewed sports science models.

---

## 🧠 The Scientific Engine

KINETIX implements advanced mathematical models to quantify human performance and cardiovascular stress. Each formula is grounded in decades of sports science research and has been validated in peer-reviewed studies.

---

## 📐 Mathematical Models Explained

### 1. Training Impulse (TRIMP) - Quantifying Workout Stress

**The Problem:** Not all workouts are created equal. A 30-minute easy run and a 30-minute tempo run have vastly different physiological impacts, but duration alone doesn't capture this.

**The Solution:** TRIMP (Training Impulse) quantifies the **internal load** of every session by accounting for heart rate intensity and duration.

#### Formula: Banister TRIMP Method

```
HR_Reserve = (HR_avg - HR_rest) / (HR_max - HR_rest)

TRIMP = Duration (min) × HR_Reserve × e^(1.92 × HR_Reserve)
```

**In Human Terms:**
- **HR_Reserve** is your "effort percentage" - how hard you're working relative to your maximum capacity
- The exponential term `e^(1.92 × HR_Reserve)` means that **high-intensity efforts are exponentially more stressful** than moderate ones
- A 30-minute run at 80% max HR creates **2.5× more stress** than a 30-minute run at 60% max HR, not just 1.33× more

**Why This Matters:**
- Two 5K runs with the same pace can have different TRIMP scores if heart rates differ
- Helps identify when you're overreaching (consistently high TRIMP) or undertraining (consistently low TRIMP)
- Forms the foundation for all other metrics in KINETIX

**Example:**
- Runner: Max HR = 200 bpm, Rest HR = 60 bpm
- Easy Run: 30 min @ 140 bpm → HR_Reserve = 0.57 → **TRIMP = 45**
- Tempo Run: 30 min @ 170 bpm → HR_Reserve = 0.79 → **TRIMP = 98**
- The tempo run creates **2.2× more physiological stress** despite the same duration

---

### 2. Acute:Chronic Workload Ratio (ACWR) - The Injury Risk Predictor

**The Problem:** Sudden spikes in training volume are the #1 predictor of injury, but how do we quantify "too much, too soon"?

**The Solution:** ACWR compares your recent training load (7 days) to your baseline fitness (28 days) to identify dangerous workload spikes.

#### Formula: Rolling Window Averages

```
Acute Load = (Σ TRIMP over last 7 days) / 7
Chronic Load = (Σ TRIMP over last 28 days) / 28

ACWR = Acute Load / Chronic Load
```

**In Human Terms:**
- **Acute Load (Fatigue):** Your average daily stress over the past week - how tired you are right now
- **Chronic Load (Fitness):** Your average daily stress over the past month - your baseline fitness level
- **ACWR:** The ratio tells you if you're training harder than your body is adapted to handle

**Risk Zones (Gabbett, 2016):**
- **ACWR < 0.8:** Under-training zone - you're not challenging your body enough to improve
- **ACWR 0.8 - 1.3:** **Sweet Spot** - optimal training zone where you build fitness safely
- **ACWR 1.3 - 1.5:** Increased risk - you're pushing harder than your body is ready for
- **ACWR > 1.5:** **Danger Zone** - exponentially increased injury risk (up to 7× higher!)

**Why This Matters:**
- Research shows athletes with ACWR > 1.5 have **2-7× higher injury rates**
- The ratio accounts for rest days (TRIMP = 0) - your acute load naturally decreases during recovery
- Helps you plan training blocks: gradually increase chronic load, then maintain ACWR in the sweet spot

**Example:**
- Week 1-3: Consistent training → Chronic Load = 50 TRIMP/day
- Week 4: Suddenly double your volume → Acute Load = 100 TRIMP/day
- **ACWR = 2.0** → You're in the danger zone! Your body hasn't adapted to handle this load yet.

---

### 3. Race Performance Prediction - The Hybrid Regression Model

**The Problem:** Simple linear projections are too optimistic. They assume you'll improve at a constant rate forever, ignoring the law of diminishing returns.

**The Solution:** KINETIX uses **Weighted Log-Linear Multivariate Regression** to predict realistic race times based on your fitness, fatigue, and training history.

#### Formula: Logarithmic Regression with Recency Weighting

```
Features (X):
  - Chronic Load (Fitness): 28-day average TRIMP
  - Acute Load (Fatigue): 7-day average TRIMP

Target (y):
  - ln(Pace_seconds_per_km) = β₀ + β₁(Chronic) + β₂(Acute)

Sample Weights:
  - Weight = e^(-days_ago / 30) × [2.0 if recent 5K run]
```

**In Human Terms:**
- **Logarithmic Transform:** We predict the *logarithm* of pace, not pace directly. This models the reality that improvements get harder as you get faster (diminishing returns)
- **Recency Weighting:** Recent runs are weighted more heavily because they better reflect your current fitness
- **5K Reality Anchor:** Recent 5K runs get double weight because they're the most accurate predictor of your current ability

**Why Logarithmic?**
- If you improve from 5:00/km to 4:30/km, that's a 10% improvement
- Improving from 4:00/km to 3:30/km is also 10%, but **much harder** to achieve
- The log transform accounts for this: equal improvements in log-space represent equal difficulty, not equal time savings

**Additional Safety Constraints:**

1. **Best Pace Floor:**
   ```
   Predicted_Pace ≥ Best_All_Time_Pace × (Distance_Ratio)^1.12
   ```
   - You can't run faster than your best pace scaled to the target distance
   - Uses conservative Riegel's scaling (exponent 1.12 for marathon) to prevent unrealistic predictions

2. **Maximum Distance Penalty:**
   ```
   If Target_Distance > 3× Max_Distance_Run:
     Penalty = +25% slower pace
   ```
   - If you've never run close to the target distance, predictions are penalized
   - Accounts for the unknown challenge of longer distances

3. **Fatigue Adjustment:**
   ```
   If ACWR > 1.3: Pace += 8% slower
   If ACWR > 1.1: Pace += 4% slower
   If ACWR < 0.8: Pace -= 2% faster
   ```
   - High fatigue (overreaching) slows you down
   - Low fatigue (well-rested) slightly improves performance

4. **Taper Ceiling:**
   ```
   Predicted_Pace ≥ Best_Recent_Pace × 0.95
   ```
   - Even with perfect taper, you can't improve more than 5% from your recent best
   - Prevents unrealistic "taper magic" predictions

**Confidence Score (R²):**
- Measures how well the model fits your training data (0.0 = poor fit, 1.0 = perfect fit)
- Low confidence (< 0.5) means you need more consistent training data
- High confidence (> 0.8) means predictions are reliable

**Example:**
- Training Data: 20 runs over 90 days with varying fitness/fatigue
- Model learns: Higher chronic load → faster pace, Higher acute load → slower pace
- Prediction: Marathon pace = 4:45/km with 75% confidence
- Safety checks ensure this isn't faster than your best 5K pace scaled to marathon distance

---

### 4. Riegel's Power Law - Distance Scaling

**The Problem:** How do you predict a marathon time from a 5K time? It's not linear - fatigue accumulates non-linearly with distance.

**The Solution:** Riegel's Power Law models how race times scale with distance using a power function.

#### Formula: Riegel's Law

```
T₂ = T₁ × (D₂ / D₁)^k

Where:
  T₁ = Time for distance D₁
  T₂ = Predicted time for distance D₂
  k = Exponent (typically 1.06-1.12)
```

**In Human Terms:**
- The exponent `k` represents how much **harder** longer distances are
- `k = 1.06` means a 10× increase in distance results in a **12.7× increase in time** (not 10×)
- KINETIX uses **conservative exponents** (1.08-1.12) to prevent overly optimistic predictions

**Distance-Specific Exponents:**
- **5K → 10K:** `k = 1.06` (similar distances, minimal fatigue)
- **5K → Half Marathon:** `k = 1.10` (moderate fatigue accumulation)
- **5K → Marathon:** `k = 1.12` (significant fatigue, glycogen depletion)

**Why Conservative?**
- Research shows beginners and intermediate runners have higher exponents (1.10-1.15)
- Elite runners can maintain pace better (exponent ~1.06)
- KINETIX errs on the side of caution to prevent unrealistic predictions

**Example:**
- Best 5K time: 20:00 (4:00/km pace)
- Predicted Marathon time using `k = 1.12`:
  - Marathon time = 20:00 × (42.195 / 5)^1.12 = **3:28:45**
- If we naively assumed linear scaling: 20:00 × 8.44 = 2:48:00 (unrealistic!)

---

### 5. Fitness Growth Projection - Exponential Decay Model

**The Problem:** If your race is 3 months away, how much fitter will you be? We need to project how your chronic load (fitness) will grow.

**The Solution:** Use exponential decay to model how fitness approaches your current training volume over time.

#### Formula: Fitness Growth Projection

```
Projected_Fitness = Current_Fitness + (Daily_Avg_Load - Current_Fitness) × (1 - e^(-days_to_race / 28))

Where:
  Current_Fitness = Current 28-day average TRIMP
  Daily_Avg_Load = Average daily TRIMP from last 14 days
  days_to_race = Days until race
```

**In Human Terms:**
- Your fitness **gradually approaches** your current training volume
- The `28-day` constant represents how long it takes for chronic load to fully adjust
- If you're training at 60 TRIMP/day but your chronic load is only 40, your fitness will grow toward 60 over ~28 days

**Why Exponential?**
- Fitness doesn't improve linearly - it levels off as you approach your training capacity
- After 28 days, you're ~63% of the way to your target fitness
- After 56 days, you're ~86% of the way there
- This models the reality that **consistent training** is more important than occasional big weeks

**Example:**
- Current Chronic Load: 40 TRIMP/day
- Current Daily Average: 60 TRIMP/day (you've been training harder recently)
- Days to Race: 14 days
- **Projected Fitness = 40 + (60 - 40) × (1 - e^(-14/28)) = 52.6 TRIMP/day**
- Your fitness will grow, but not all the way to 60 in just 2 weeks

---

### 6. Weather-Adjusted Pace - Environmental Normalization

**The Problem:** A 5:00/km pace on a cool day is much easier than the same pace on a hot, humid day. How do we compare performances across different conditions?

**The Solution:** KINETIX normalizes pace based on temperature, humidity, and dew point to create "apples-to-apples" comparisons.

#### Formula: Dew Point Impact Model

```
Dew_Point = Temp - ((100 - Humidity) / 5)

If Dew_Point > 15°C:
  Pace_Adjustment = 1 + 0.01 × (Dew_Point - 15)
  
Adjusted_Pace = Raw_Pace × Pace_Adjustment
```

**In Human Terms:**
- **Dew Point** is the "feels like" temperature - it combines heat and humidity
- Above 15°C dew point, your body struggles to cool itself through sweat evaporation
- Each degree above 15°C adds ~1% to your pace (makes you slower)
- This allows fair comparison: a 5:00/km run in 25°C heat is equivalent to ~4:50/km in ideal conditions

**Why This Matters:**
- Your "best pace" might have been on a perfect 10°C day
- A slower pace on a hot day might actually be a better performance
- Race predictions account for expected race-day weather conditions

**Example:**
- Raw Pace: 5:00/km
- Conditions: 30°C, 70% humidity → Dew Point = 22°C
- Adjustment: 1 + 0.01 × (22 - 15) = 1.07
- **Adjusted Pace = 5:00 × 1.07 = 5:21/km** (equivalent performance in ideal conditions)

---

## 🛠️ Tech Stack & Architecture

- **Backend:** FastAPI (Python 3.11+), PostgreSQL (SQLAlchemy), Scikit-learn, Pandas, NumPy
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion, Shadcn UI, Recharts
- **Infrastructure:** Docker & Docker Compose for microservice orchestration
- **APIs:** Strava OAuth 2.0 for activity sync, OpenWeatherMap for pace normalization
- **Deployment:** Railway (backend), Vercel (frontend)

---

## 📁 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application & entry point
│   │   ├── models.py            # SQLAlchemy ORM database schemas
│   │   ├── database.py          # PostgreSQL session management
│   │   ├── auth.py              # JWT authentication & OAuth integration
│   │   ├── analytics_service.py # CORE: ACWR, Race Prediction, & TRIMP math
│   │   ├── weather_service.py   # Environmental normalization (Dew point/Temp)
│   │   ├── strava_service.py    # OAuth 2.0 & Activity Ingestion
│   │   └── garmin_service.py    # Garmin Connect API integration
│   ├── Dockerfile               # Multi-stage production build
│   ├── requirements.txt         # Science & API dependencies
│   └── start.sh                 # Railway deployment script
├── frontend/
│   ├── app/
│   │   ├── dashboard/           # Main data visualization hub
│   │   ├── auth/                # OAuth callback handlers
│   │   └── page.tsx             # Interactive landing page
│   ├── components/
│   │   ├── readiness-gauge.tsx  # Custom SVG gauge for ACWR visualization
│   │   ├── injury-risk-bar.tsx  # Visual injury risk indicator
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
- PostgreSQL 14+ (or use Docker)

### 1. Clone the Repository

```bash
git clone https://github.com/prabhgunbhatia/KINETIX.git
cd KINETIX
```

### 2. Environment Setup

Copy `docker-compose.example.yml` to `docker-compose.yml` and fill in your environment variables:

**`docker-compose.yml`**
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

### 3. Launch with Docker

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### 4. Create an Account & Connect Strava

1. Register a new account at http://localhost:3000
2. Click "Connect Strava" to sync your activities
3. View your dashboard with real-time analytics

---

## 📊 Key Features

### ⚡ Real-Time Training Load Monitoring
- Automatic TRIMP calculation for every workout using heart rate data
- Color-coded intensity zones based on heart rate distribution
- Historical load trends with 28-day rolling averages
- Daily, weekly, and monthly training volume summaries

### 🎯 Injury Risk Detection
- ACWR-based readiness scoring with visual gauge
- Real-time warnings when approaching danger zones (ACWR > 1.5)
- Personalized recommendations for load management
- "What-if" scenarios: predict ACWR impact of proposed workouts

### 🏁 Race Performance Predictions
- Multi-distance predictions (5K, 10K, Half Marathon, Marathon)
- Confidence intervals based on training consistency (R² score)
- Accounts for fitness growth, fatigue, and distance scaling
- Conservative predictions that account for best pace, max distance, and fatigue

### 🌦️ Environmental Adjustments
- Automatic pace normalization for temperature and humidity
- Dew point impact calculations for accurate performance comparison
- Historical weather data integration via OpenWeatherMap API
- Fair comparison of performances across different conditions

### 📈 Advanced Analytics
- Training load trends over customizable time periods (7d, 28d, 90d)
- Fitness vs. Fatigue visualization
- Recent activities with weather-adjusted pace
- Manual activity entry for non-synced workouts

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

### Manual Testing
1. Sync activities from Strava
2. Check ACWR calculation in dashboard
3. Test race prediction with various distances
4. Verify weather adjustments are applied correctly

---

## 📖 API Documentation

Interactive API documentation is available at `/docs` when running the backend:

- **Authentication:** JWT-based with refresh tokens
- **Endpoints:**
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User login
  - `GET /auth/status` - Check OAuth connection status
  - `DELETE /auth/strava/disconnect` - Disconnect Strava and remove activities
  - `GET /sync` - Sync activities from Strava/Garmin
  - `GET /dashboard` - Get dashboard analytics
  - `POST /analytics/predict` - Predict ACWR impact of proposed activity
  - `POST /analytics/predict-race` - Predict race performance
- **Rate Limiting:** 100 requests per minute per user

---

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to Railway, Vercel, and Render.

### Quick Deploy

1. **Backend (Railway):**
   - Connect GitHub repository
   - Set root directory to `backend/`
   - Configure environment variables
   - Deploy

2. **Frontend (Vercel):**
   - Connect GitHub repository
   - Set root directory to `frontend/`
   - Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
   - Deploy

3. **Database:**
   - Use Railway PostgreSQL addon or external PostgreSQL instance
   - Update `DATABASE_URL` in backend environment variables

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Backend: Follow PEP 8, use type hints
- Frontend: Follow ESLint rules, use TypeScript strict mode
- Tests: Write tests for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Scientific Research

- **Banister TRIMP Model:** Banister, E.W. (1991). Modeling elite athletic performance.
- **ACWR Research:** Gabbett, T.J. (2016). The training-injury prevention paradox: should athletes be training smarter and harder?
- **Riegel's Law:** Riegel, P.S. (1981). Athletic records and human endurance.
- **Edwards TRIMP:** Edwards, S. (1993). High performance training and racing.

### Technologies

- FastAPI for the blazing-fast async API
- Next.js for the modern React framework
- PostgreSQL for reliable data storage
- Scikit-learn for machine learning
- Recharts for beautiful data visualizations

---

## 📧 Contact & Support

- **GitHub Issues:** [Open an issue](https://github.com/prabhgunbhatia/KINETIX/issues) for bugs or feature requests
- **Email:** [bhatiaprabhgun06@gmail.com](mailto:bhatiaprabhgun06@gmail.com)

---

## 🔬 Scientific Validation

All mathematical models in KINETIX are based on peer-reviewed research:

1. **TRIMP:** Validated in studies of elite athletes (Banister, 1991; Edwards, 1993)
2. **ACWR:** Proven to predict injury risk with 2-7× accuracy (Gabbett, 2016)
3. **Riegel's Law:** Used by running coaches worldwide for distance scaling
4. **Log-Linear Regression:** Standard approach in sports science for performance prediction

KINETIX doesn't just calculate numbers - it applies **decades of sports science research** to help you train smarter.

---

**Built with ❤️ by athletes, for athletes.**

*"The goal is not to train harder, but to train smarter. Data shows the way."*
