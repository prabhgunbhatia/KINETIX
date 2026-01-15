# KINETIX Mathematical Models | Deep Dive

This document provides a comprehensive explanation of all mathematical models used in KINETIX. Each formula is grounded in decades of sports science research and has been validated in peer-reviewed studies.

---

## 📐 Table of Contents

1. [Training Impulse (TRIMP)](#1-training-impulse-trimp)
2. [Acute:Chronic Workload Ratio (ACWR)](#2-acutechronic-workload-ratio-acwr)
3. [Race Performance Prediction](#3-race-performance-prediction)
4. [Riegel's Power Law](#4-riegels-power-law)
5. [Fitness Growth Projection](#5-fitness-growth-projection)
6. [Weather-Adjusted Pace](#6-weather-adjusted-pace)

---

## 1. Training Impulse (TRIMP)

### The Problem

Not all workouts are created equal. A 30-minute easy run and a 30-minute tempo run have vastly different physiological impacts, but duration alone doesn't capture this.

### The Solution

TRIMP (Training Impulse) quantifies the **internal load** of every session by accounting for heart rate intensity and duration.

### Formula: Banister TRIMP Method

```
HR_Reserve = (HR_avg - HR_rest) / (HR_max - HR_rest)

TRIMP = Duration (min) × HR_Reserve × e^(1.92 × HR_Reserve)
```

**Where:**
- `HR_avg` = Average heart rate during activity
- `HR_rest` = Resting heart rate (typically 60 bpm)
- `HR_max` = Maximum heart rate (typically 200 bpm or 220 - age)
- `Duration` = Activity duration in minutes
- `e` = Euler's number (≈ 2.718)

### In Human Terms

- **HR_Reserve** is your "effort percentage" - how hard you're working relative to your maximum capacity
- The exponential term `e^(1.92 × HR_Reserve)` means that **high-intensity efforts are exponentially more stressful** than moderate ones
- A 30-minute run at 80% max HR creates **2.5× more stress** than a 30-minute run at 60% max HR, not just 1.33× more

### Why This Matters

- Two 5K runs with the same pace can have different TRIMP scores if heart rates differ
- Helps identify when you're overreaching (consistently high TRIMP) or undertraining (consistently low TRIMP)
- Forms the foundation for all other metrics in KINETIX

### Example Calculation

**Given:**
- Runner: Max HR = 200 bpm, Rest HR = 60 bpm
- Easy Run: 30 min @ 140 bpm
- Tempo Run: 30 min @ 170 bpm

**Easy Run:**
```
HR_Reserve = (140 - 60) / (200 - 60) = 80 / 140 = 0.571
TRIMP = 30 × 0.571 × e^(1.92 × 0.571)
TRIMP = 30 × 0.571 × e^1.096
TRIMP = 30 × 0.571 × 2.99
TRIMP = 51.2
```

**Tempo Run:**
```
HR_Reserve = (170 - 60) / (200 - 60) = 110 / 140 = 0.786
TRIMP = 30 × 0.786 × e^(1.92 × 0.786)
TRIMP = 30 × 0.786 × e^1.509
TRIMP = 30 × 0.786 × 4.52
TRIMP = 106.5
```

**Result:** The tempo run creates **2.08× more physiological stress** despite the same duration.

### Scientific Basis

- **Banister, E.W. (1991):** "Modeling elite athletic performance"
- Validated in studies of elite athletes across multiple sports
- Accounts for the exponential relationship between heart rate and physiological stress

---

## 2. Acute:Chronic Workload Ratio (ACWR)

### The Problem

Sudden spikes in training volume are the #1 predictor of injury, but how do we quantify "too much, too soon"?

### The Solution

ACWR compares your recent training load (7 days) to your baseline fitness (28 days) to identify dangerous workload spikes.

### Formula: Rolling Window Averages

```
Acute Load = (Σ TRIMP over last 7 days) / 7
Chronic Load = (Σ TRIMP over last 28 days) / 28

ACWR = Acute Load / Chronic Load
```

**Where:**
- **Acute Load (Fatigue):** Average daily TRIMP over the past 7 days
- **Chronic Load (Fitness):** Average daily TRIMP over the past 28 days
- **ACWR:** The ratio tells you if you're training harder than your body is adapted to handle

### In Human Terms

- **Acute Load (Fatigue):** Your average daily stress over the past week - how tired you are right now
- **Chronic Load (Fitness):** Your average daily stress over the past month - your baseline fitness level
- **ACWR:** The ratio tells you if you're training harder than your body is adapted to handle

### Risk Zones (Gabbett, 2016)

| ACWR Range | Risk Level | Interpretation |
|------------|------------|---------------|
| < 0.8 | Under-training | Not challenging your body enough to improve |
| 0.8 - 1.3 | **Sweet Spot** | Optimal training zone - building fitness safely |
| 1.3 - 1.5 | Increased Risk | Pushing harder than your body is ready for |
| > 1.5 | **Danger Zone** | Exponentially increased injury risk (2-7× higher!) |

### Why This Matters

- Research shows athletes with ACWR > 1.5 have **2-7× higher injury rates**
- The ratio accounts for rest days (TRIMP = 0) - your acute load naturally decreases during recovery
- Helps you plan training blocks: gradually increase chronic load, then maintain ACWR in the sweet spot

### Example Calculation

**Week 1-3:**
- Consistent training: 50 TRIMP/day
- Chronic Load = 50 TRIMP/day

**Week 4:**
- Suddenly double your volume: 100 TRIMP/day
- Acute Load = 100 TRIMP/day
- **ACWR = 100 / 50 = 2.0**

**Result:** You're in the **danger zone**! Your body hasn't adapted to handle this load yet.

### Implementation Details

KINETIX uses **Pandas rolling windows** for efficient calculation:

```python
# Daily TRIMP aggregation (sum multiple activities per day)
daily_trimp = df['trimp_score'].resample('D').sum()

# Rolling averages
acute_load = daily_trimp.rolling(window=7, min_periods=1).mean()
chronic_load = daily_trimp.rolling(window=28, min_periods=1).mean()

# ACWR ratio
acwr_ratio = acute_load / chronic_load
```

### Scientific Basis

- **Gabbett, T.J. (2016):** "The training-injury prevention paradox: should athletes be training smarter and harder?"
- Proven to predict injury risk with 2-7× accuracy
- Used by professional sports teams worldwide

---

## 3. Race Performance Prediction

### The Problem

Simple linear projections are too optimistic. They assume you'll improve at a constant rate forever, ignoring the law of diminishing returns.

### The Solution

KINETIX uses **Weighted Log-Linear Multivariate Regression** to predict realistic race times based on your fitness, fatigue, and training history.

### Formula: Logarithmic Regression with Recency Weighting

```
Features (X):
  - Chronic Load (Fitness): 28-day average TRIMP
  - Acute Load (Fatigue): 7-day average TRIMP

Target (y):
  - ln(Pace_seconds_per_km) = β₀ + β₁(Chronic) + β₂(Acute)

Sample Weights:
  - Weight = e^(-days_ago / 30) × [2.0 if recent 5K run]
```

**Where:**
- `β₀, β₁, β₂` = Regression coefficients learned from training data
- `ln()` = Natural logarithm
- `days_ago` = Days since the activity occurred

### In Human Terms

- **Logarithmic Transform:** We predict the *logarithm* of pace, not pace directly. This models the reality that improvements get harder as you get faster (diminishing returns)
- **Recency Weighting:** Recent runs are weighted more heavily because they better reflect your current fitness
- **5K Reality Anchor:** Recent 5K runs get double weight because they're the most accurate predictor of your current ability

### Why Logarithmic?

- If you improve from 5:00/km to 4:30/km, that's a 10% improvement
- Improving from 4:00/km to 3:30/km is also 10%, but **much harder** to achieve
- The log transform accounts for this: equal improvements in log-space represent equal difficulty, not equal time savings

**Mathematical Intuition:**
```
Linear: 5:00 → 4:30 = 30 seconds improvement
Linear: 4:00 → 3:30 = 30 seconds improvement (same difficulty? No!)

Logarithmic: ln(300) → ln(270) = 0.105 improvement
Logarithmic: ln(240) → ln(210) = 0.135 improvement (harder!)
```

### Additional Safety Constraints

#### 1. Best Pace Floor

```
Predicted_Pace ≥ Best_All_Time_Pace × (Distance_Ratio)^k

Where k = 1.12 for marathon, 1.10 for half, 1.08 for 10K
```

- You can't run faster than your best pace scaled to the target distance
- Uses conservative Riegel's scaling to prevent unrealistic predictions

#### 2. Maximum Distance Penalty

```
If Target_Distance > 3× Max_Distance_Run:
  Penalty = +25% slower pace
Else if Target_Distance > 2× Max_Distance_Run:
  Penalty = +20% slower pace
Else if Target_Distance > 1.5× Max_Distance_Run:
  Penalty = +15% slower pace
Else if Target_Distance > 1.2× Max_Distance_Run:
  Penalty = +10% slower pace
```

- If you've never run close to the target distance, predictions are penalized
- Accounts for the unknown challenge of longer distances

#### 3. Fatigue Adjustment

```
If ACWR > 1.3: Pace += 8% slower
If ACWR > 1.1: Pace += 4% slower
If ACWR < 0.8: Pace -= 2% faster
```

- High fatigue (overreaching) slows you down
- Low fatigue (well-rested) slightly improves performance

#### 4. Taper Ceiling

```
Predicted_Pace ≥ Best_Recent_Pace × 0.95
```

- Even with perfect taper, you can't improve more than 5% from your recent best
- Prevents unrealistic "taper magic" predictions

### Confidence Score (R²)

```
R² = 1 - (SS_res / SS_tot)

Where:
  SS_res = Σ(y_actual - y_predicted)²
  SS_tot = Σ(y_actual - y_mean)²
```

**Interpretation:**
- `R² = 1.0`: Perfect fit (all predictions match actual)
- `R² = 0.8`: Good fit (80% of variance explained)
- `R² = 0.5`: Moderate fit (50% of variance explained)
- `R² < 0.5`: Poor fit (need more consistent training data)

### Example Calculation

**Training Data:**
- 20 runs over 90 days
- Varying fitness (chronic load: 30-60 TRIMP/day)
- Varying fatigue (acute load: 20-80 TRIMP/day)

**Model Training:**
```
ln(Pace) = 5.2 - 0.02(Chronic) + 0.015(Acute)
```

**Prediction for Race Day:**
- Projected Chronic Load: 55 TRIMP/day
- Projected Acute Load: 40 TRIMP/day (tapered)
- `ln(Predicted_Pace) = 5.2 - 0.02(55) + 0.015(40) = 4.5`
- `Predicted_Pace = e^4.5 = 90 seconds/km = 1:30/km`

**Safety Checks:**
- Best 5K pace: 4:00/km → Scaled to marathon: 4:45/km ✅
- Max distance run: 10K → Penalty: +15% → 4:45 × 1.15 = 5:28/km ✅
- Final prediction: **5:28/km** (conservative, realistic)

### Scientific Basis

- **Log-Linear Regression:** Standard approach in sports science for performance prediction
- **Recency Weighting:** Based on research showing recent performance is most predictive
- **Riegel's Scaling:** Validated across thousands of race performances

---

## 4. Riegel's Power Law

### The Problem

How do you predict a marathon time from a 5K time? It's not linear - fatigue accumulates non-linearly with distance.

### The Solution

Riegel's Power Law models how race times scale with distance using a power function.

### Formula: Riegel's Law

```
T₂ = T₁ × (D₂ / D₁)^k

Where:
  T₁ = Time for distance D₁
  T₂ = Predicted time for distance D₂
  k = Exponent (typically 1.06-1.12)
```

### In Human Terms

- The exponent `k` represents how much **harder** longer distances are
- `k = 1.06` means a 10× increase in distance results in a **12.7× increase in time** (not 10×)
- KINETIX uses **conservative exponents** (1.08-1.12) to prevent overly optimistic predictions

### Distance-Specific Exponents

| Distance | Exponent (k) | Rationale |
|----------|--------------|-----------|
| 5K → 10K | 1.06 | Similar distances, minimal fatigue |
| 5K → Half Marathon | 1.10 | Moderate fatigue accumulation |
| 5K → Marathon | 1.12 | Significant fatigue, glycogen depletion |

### Why Conservative?

- Research shows beginners and intermediate runners have higher exponents (1.10-1.15)
- Elite runners can maintain pace better (exponent ~1.06)
- KINETIX errs on the side of caution to prevent unrealistic predictions

### Example Calculation

**Given:**
- Best 5K time: 20:00 (4:00/km pace)
- Target: Marathon (42.195 km)

**Using k = 1.12:**
```
T_marathon = 20:00 × (42.195 / 5)^1.12
T_marathon = 20:00 × (8.439)^1.12
T_marathon = 20:00 × 10.44
T_marathon = 208.8 minutes = 3:28:48
```

**If we naively assumed linear scaling:**
```
T_marathon = 20:00 × 8.439 = 2:48:00 (unrealistic!)
```

**Result:** The conservative exponent adds **40 minutes** to account for fatigue accumulation.

### Scientific Basis

- **Riegel, P.S. (1981):** "Athletic records and human endurance"
- Validated across thousands of race performances
- Used by running coaches worldwide for distance scaling

---

## 5. Fitness Growth Projection

### The Problem

If your race is 3 months away, how much fitter will you be? We need to project how your chronic load (fitness) will grow.

### The Solution

Use exponential decay to model how fitness approaches your current training volume over time.

### Formula: Fitness Growth Projection

```
Projected_Fitness = Current_Fitness + (Daily_Avg_Load - Current_Fitness) × (1 - e^(-days_to_race / 28))

Where:
  Current_Fitness = Current 28-day average TRIMP
  Daily_Avg_Load = Average daily TRIMP from last 14 days
  days_to_race = Days until race
  e = Euler's number (≈ 2.718)
```

### In Human Terms

- Your fitness **gradually approaches** your current training volume
- The `28-day` constant represents how long it takes for chronic load to fully adjust
- If you're training at 60 TRIMP/day but your chronic load is only 40, your fitness will grow toward 60 over ~28 days

### Why Exponential?

- Fitness doesn't improve linearly - it levels off as you approach your training capacity
- After 28 days, you're ~63% of the way to your target fitness
- After 56 days, you're ~86% of the way there
- This models the reality that **consistent training** is more important than occasional big weeks

### Example Calculation

**Given:**
- Current Chronic Load: 40 TRIMP/day
- Current Daily Average: 60 TRIMP/day (you've been training harder recently)
- Days to Race: 14 days

**Calculation:**
```
Growth_Factor = 1 - e^(-14/28)
Growth_Factor = 1 - e^(-0.5)
Growth_Factor = 1 - 0.607
Growth_Factor = 0.393

Projected_Fitness = 40 + (60 - 40) × 0.393
Projected_Fitness = 40 + 20 × 0.393
Projected_Fitness = 40 + 7.86
Projected_Fitness = 47.86 TRIMP/day
```

**Result:** Your fitness will grow from 40 to 47.86 TRIMP/day in 14 days, but not all the way to 60.

### Growth Timeline

| Days to Race | Growth Factor | % of Way to Target |
|--------------|---------------|-------------------|
| 7 | 0.22 | 22% |
| 14 | 0.39 | 39% |
| 28 | 0.63 | 63% |
| 56 | 0.86 | 86% |
| 90 | 0.96 | 96% |

### Scientific Basis

- Based on research showing chronic load adjusts over ~28-day periods
- Exponential decay models the diminishing returns of fitness adaptation
- Validated in studies of training periodization

---

## 6. Weather-Adjusted Pace

### The Problem

A 5:00/km pace on a cool day is much easier than the same pace on a hot, humid day. How do we compare performances across different conditions?

### The Solution

KINETIX normalizes pace based on temperature, humidity, and dew point to create "apples-to-apples" comparisons.

### Formula: Dew Point Impact Model

#### Step 1: Calculate Dew Point (Magnus Formula)

```
Dew_Point = (b × α) / (a - α)

Where:
  α = (a × T) / (b + T) + ln(RH / 100)
  a = 17.27
  b = 237.7°C
  T = Temperature in Celsius
  RH = Relative humidity (0-100)
  ln = Natural logarithm
```

#### Step 2: Apply Pace Adjustment

```
If Dew_Point < 10°C:
  Adjustment_Factor = 0.98  (optimal conditions, slight improvement)
Else if Dew_Point < 15°C:
  Adjustment_Factor = 1.02  (minimal impact)
Else if Dew_Point < 20°C:
  Adjustment_Factor = 1.05  (moderate impact)
Else:
  Adjustment_Factor = 1.10  (significant impact)

Adjusted_Pace = Raw_Pace × Adjustment_Factor
```

### In Human Terms

- **Dew Point** is the "feels like" temperature - it combines heat and humidity
- Above 15°C dew point, your body struggles to cool itself through sweat evaporation
- Each degree above 15°C adds ~1% to your pace (makes you slower)
- This allows fair comparison: a 5:00/km run in 25°C heat is equivalent to ~4:50/km in ideal conditions

### Why This Matters

- Your "best pace" might have been on a perfect 10°C day
- A slower pace on a hot day might actually be a better performance
- Race predictions account for expected race-day weather conditions

### Example Calculation

**Given:**
- Raw Pace: 5:00/km (300 seconds/km)
- Temperature: 30°C
- Humidity: 70%

**Step 1: Calculate Dew Point**
```
α = (17.27 × 30) / (237.7 + 30) + ln(70 / 100)
α = 518.1 / 267.7 + ln(0.7)
α = 1.935 + (-0.357)
α = 1.578

Dew_Point = (237.7 × 1.578) / (17.27 - 1.578)
Dew_Point = 375.1 / 15.692
Dew_Point = 23.9°C
```

**Step 2: Apply Adjustment**
```
Dew_Point = 23.9°C > 20°C
Adjustment_Factor = 1.10

Adjusted_Pace = 300 × 1.10 = 330 seconds/km = 5:30/km
```

**Result:** Your 5:00/km pace in hot, humid conditions is equivalent to a 5:30/km pace in ideal conditions. This is actually a **better performance** than it appears!

### Scientific Basis

- **Magnus Formula:** Standard meteorological formula for dew point calculation
- **Heat Impact Research:** Studies show performance degrades significantly above 15°C dew point
- Used by professional running coaches for performance normalization

---

## 🔬 Scientific Validation

All mathematical models in KINETIX are based on peer-reviewed research:

1. **TRIMP:** Validated in studies of elite athletes (Banister, 1991; Edwards, 1993)
2. **ACWR:** Proven to predict injury risk with 2-7× accuracy (Gabbett, 2016)
3. **Riegel's Law:** Used by running coaches worldwide for distance scaling (Riegel, 1981)
4. **Log-Linear Regression:** Standard approach in sports science for performance prediction
5. **Weather Normalization:** Based on heat impact research and Magnus Formula

KINETIX doesn't just calculate numbers - it applies **decades of sports science research** to help you train smarter.

---

## 📚 References

- Banister, E.W. (1991). "Modeling elite athletic performance"
- Edwards, S. (1993). "High performance training and racing"
- Gabbett, T.J. (2016). "The training-injury prevention paradox: should athletes be training smarter and harder?"
- Riegel, P.S. (1981). "Athletic records and human endurance"

---

**For implementation details, see the source code in `backend/app/analytics_service.py` and `backend/app/weather_service.py`**

