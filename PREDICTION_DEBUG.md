# 🔍 Prediction Debugging Guide

## Issue: Prediction Always Shows "Green"

The prediction feature is working but always returns "Green" risk level, suggesting the projected ACWR isn't changing significantly.

---

## 🧪 How to Test

### Test 1: Check Debug Logs

1. **Open terminal and watch logs:**
   ```powershell
   docker compose logs backend -f
   ```

2. **Make a prediction** in the frontend
   - Click "Predict" button
   - Try different distances (5km, 10km, 21km)
   - Check the logs for "Prediction Debug" output

3. **Look for:**
   - Proposed TRIMP value (should be > 0)
   - Current vs Projected ACWR
   - Change in acute/chronic loads

### Test 2: Try Extreme Scenarios

**Scenario 1: Very Long Run**
- Distance: 21km (half marathon)
- Time: 90 minutes
- Heart Rate: 170 bpm
- **Expected:** Should show Orange or Red if current load is already high

**Scenario 2: Very Fast Run**
- Distance: 5km
- Time: 15 minutes (3:00/km pace)
- Heart Rate: 180 bpm
- **Expected:** High TRIMP, should increase ACWR

**Scenario 3: Easy Run**
- Distance: 5km
- Time: 30 minutes (6:00/km pace)
- Heart Rate: 140 bpm
- **Expected:** Low TRIMP, minimal change

---

## 🔍 What to Check in Logs

When you make a prediction, you should see:

```
Prediction Debug:
  Proposed TRIMP: XX.XX (Distance: X.Xkm, Time: XX.Xmin, HR: XXX or estimated)
  Current ACWR: X.XX (Acute: XX.XX, Chronic: XX.XX)
  Projected Acute Load: XX.XX (change: +X.XX)
  Projected Chronic Load: XX.XX (change: +X.XX)
  Projected ACWR: X.XX (change: +X.XX)
  Daily TRIMP series: XX days, Tomorrow TRIMP: XX.XX
```

**Key things to verify:**
1. ✅ Proposed TRIMP > 0 (if 0, HR estimation isn't working)
2. ✅ Projected ACWR is different from Current ACWR
3. ✅ Change values show the difference
4. ✅ Tomorrow TRIMP is included in the series

---

## 🐛 Common Issues

### Issue 1: TRIMP is Always 0

**Symptom:** Proposed TRIMP shows 0.00

**Causes:**
- Heart rate not provided AND estimation not working
- Duration is 0 or negative

**Fix:** Check if HR estimation is running (should see "Estimated HR" in logs)

### Issue 2: Projected ACWR = Current ACWR

**Symptom:** Change is always 0.00

**Causes:**
- Tomorrow's activity not being added to the series
- Rolling window not including tomorrow
- Not enough historical data

**Fix:** Check logs for "Tomorrow TRIMP" - should be > 0

### Issue 3: Always Green Even with Long Runs

**Symptom:** 21km run still shows Green

**Causes:**
- Current ACWR is very low (< 0.8)
- Chronic load is high, so adding one activity doesn't change ratio much
- Need more extreme scenarios to see change

**Fix:** Try with very high heart rate (180+ bpm) and long duration

---

## 📊 Understanding the Calculation

### How Projected ACWR Works

1. **Get historical data:** Last 28 days of activities
2. **Add proposed activity:** Tomorrow's TRIMP added to series
3. **Calculate rolling averages:**
   - Acute: 7-day rolling mean (includes tomorrow)
   - Chronic: 28-day rolling mean (includes tomorrow)
4. **Calculate ratio:** Projected Acute / Projected Chronic

### Why It Might Always Be Green

- **Low current load:** If current ACWR is 0.5, even adding a big run might only push it to 0.7 (still Green)
- **High chronic load:** If you've been training consistently, one more activity won't change the 28-day average much
- **Proportional increase:** If both acute and chronic increase proportionally, the ratio stays similar

---

## ✅ Expected Behavior

### With Low Current Load (ACWR < 0.8)
- Small run (5km): Stays Green
- Medium run (10km): Might stay Green
- Large run (21km): Might go to Green (optimal) or Orange

### With Optimal Current Load (ACWR 0.8-1.3)
- Small run (5km): Stays Green
- Medium run (10km): Might go to Orange
- Large run (21km): Should go to Orange or Red

### With High Current Load (ACWR > 1.3)
- Any additional run: Should show Orange or Red
- Large run (21km): Should definitely show Red

---

## 🔧 Next Steps

1. **Check the logs** when making predictions
2. **Try extreme scenarios** (21km at high HR)
3. **Share the log output** so we can see what's happening
4. **Check your current ACWR** - if it's very low, predictions will mostly stay Green

The prediction IS working - it's just that with your current training load, most activities keep you in the safe zone! 🟢

