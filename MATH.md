# KINETIX Mathematical Models

All formulas are grounded in peer-reviewed sports science research. For implementation details, see `backend/app/analytics_service.py` and `backend/app/weather_service.py`.

---

## 1. Training Impulse (TRIMP)

Quantifies workout stress using heart rate intensity and duration.

**Formula:**
```
HR_Reserve = (HR_avg - HR_rest) / (HR_max - HR_rest)
TRIMP = Duration (min) × HR_Reserve × e^(1.92 × HR_Reserve)
```

**Example:** 30 min @ 140 bpm (max 200, rest 60)
- HR_Reserve = (140-60)/(200-60) = 0.571
- TRIMP = 30 × 0.571 × e^(1.92×0.571) = 30 × 0.571 × 2.99 = **51.2**

**Why exponential?** High-intensity efforts are exponentially more stressful. A 30-min run at 80% max HR creates 2.5× more stress than at 60% max HR.

**Reference:** Banister, E.W. (1991). "Modeling elite athletic performance"

---

## 2. Acute:Chronic Workload Ratio (ACWR)

Predicts injury risk by comparing recent load (7 days) to baseline fitness (28 days).

**Formula:**
```
Acute Load = (Σ TRIMP last 7 days) / 7
Chronic Load = (Σ TRIMP last 28 days) / 28
ACWR = Acute Load / Chronic Load
```

**Risk Zones:**
- < 0.8: Under-training
- 0.8-1.3: **Sweet Spot** (optimal)
- 1.3-1.5: Increased risk
- > 1.5: **Danger Zone** (2-7× higher injury risk)

**Example:** Chronic = 50 TRIMP/day, suddenly train at 100 TRIMP/day → ACWR = 2.0 (danger zone)

**Reference:** Gabbett, T.J. (2016). "The training-injury prevention paradox"

---

## 3. Race Performance Prediction

Uses weighted log-linear regression to predict realistic race times.

**Formula:**
```
Features: [Chronic Load, Acute Load]
Target: ln(Pace_seconds_per_km) = β₀ + β₁(Chronic) + β₂(Acute)
Weights: e^(-days_ago / 30) × [2.0 if recent 5K run]
```

**Why logarithmic?** Improvements get harder as you get faster. Equal improvements in log-space represent equal difficulty, not equal time savings.

**Safety Constraints:**

1. **Best Pace Floor:**
   ```
   Predicted_Pace ≥ Best_Pace × (Distance_Ratio)^k
   k = 1.12 (marathon), 1.10 (half), 1.08 (10K)
   ```

2. **Distance Penalty:**
   - > 3× max distance: +25% slower
   - > 2× max distance: +20% slower
   - > 1.5× max distance: +15% slower
   - > 1.2× max distance: +10% slower

3. **Fatigue Adjustment:**
   - ACWR > 1.3: +8% slower
   - ACWR > 1.1: +4% slower
   - ACWR < 0.8: -2% faster

4. **Taper Ceiling:**
   ```
   Predicted_Pace ≥ Best_Recent_Pace × 0.95
   ```
   (Max 5% improvement from recent best)

**Confidence (R²):**
```
R² = 1 - (SS_res / SS_tot)
```
- R² = 1.0: Perfect fit
- R² = 0.8: Good fit
- R² < 0.5: Need more data

---

## 4. Riegel's Power Law

Scales race times across distances using a power function.

**Formula:**
```
T₂ = T₁ × (D₂ / D₁)^k
```

**Exponents:**
- 5K → 10K: k = 1.06
- 5K → Half: k = 1.10
- 5K → Marathon: k = 1.12

**Example:** 5K in 20:00 → Marathon
- T_marathon = 20:00 × (42.195/5)^1.12 = 20:00 × 10.44 = **3:28:48**
- (Linear would give 2:48:00 - unrealistic!)

**Why conservative?** Beginners/intermediates have higher exponents (1.10-1.15). KINETIX errs on caution.

**Reference:** Riegel, P.S. (1981). "Athletic records and human endurance"

---

## 5. Fitness Growth Projection

Models how chronic load approaches current training volume over time.

**Formula:**
```
Projected_Fitness = Current_Fitness + (Daily_Avg_Load - Current_Fitness) × (1 - e^(-days_to_race / 28))
```

**Example:** Current = 40 TRIMP/day, Daily Avg = 60 TRIMP/day, Days = 14
- Growth Factor = 1 - e^(-14/28) = 1 - 0.607 = 0.393
- Projected = 40 + (60-40) × 0.393 = **47.86 TRIMP/day**

**Timeline:**
- 7 days: 22% of way to target
- 14 days: 39%
- 28 days: 63%
- 56 days: 86%

**Why exponential?** Fitness levels off as it approaches training capacity. Consistent training matters more than occasional big weeks.

---

## 6. Weather-Adjusted Pace

Normalizes pace for temperature and humidity using dew point.

**Step 1: Calculate Dew Point (Magnus Formula)**
```
α = (17.27 × T) / (237.7 + T) + ln(RH / 100)
Dew_Point = (237.7 × α) / (17.27 - α)
```

**Step 2: Apply Adjustment**
```
If Dew_Point < 10°C:  Factor = 0.98
If Dew_Point < 15°C:  Factor = 1.02
If Dew_Point < 20°C:  Factor = 1.05
Else:                 Factor = 1.10

Adjusted_Pace = Raw_Pace × Factor
```

**Example:** 5:00/km @ 30°C, 70% humidity
- α = (17.27×30)/(237.7+30) + ln(0.7) = 1.578
- Dew Point = (237.7×1.578)/(17.27-1.578) = **23.9°C**
- Factor = 1.10 → Adjusted = 5:00 × 1.10 = **5:30/km**

**Why this matters:** A slower pace on a hot day might be a better performance than it appears.

**Reference:** Magnus Formula (standard meteorological calculation)

---

## Scientific Validation

All models are based on peer-reviewed research:

- **TRIMP:** Validated in elite athlete studies (Banister, 1991; Edwards, 1993)
- **ACWR:** Predicts injury risk with 2-7× accuracy (Gabbett, 2016)
- **Riegel's Law:** Used by coaches worldwide (Riegel, 1981)
- **Log-Linear Regression:** Standard in sports science
- **Weather Normalization:** Based on heat impact research

---

## References

- Banister, E.W. (1991). "Modeling elite athletic performance"
- Edwards, S. (1993). "High performance training and racing"
- Gabbett, T.J. (2016). "The training-injury prevention paradox: should athletes be training smarter and harder?"
- Riegel, P.S. (1981). "Athletic records and human endurance"
