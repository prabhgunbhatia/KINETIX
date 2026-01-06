# 🧪 KINETIX Testing Checklist

Use this checklist to verify all refactored features work correctly.

## ✅ Pre-Testing Setup

- [ ] Backend is running (`docker compose ps`)
- [ ] Frontend is running (`npm run dev` in frontend/)
- [ ] Database is healthy
- [ ] No errors in logs

---

## 🔐 Authentication Testing

### Registration

- [ ] Can register with email and password
- [ ] Password is hashed (check database)
- [ ] JWT token is returned
- [ ] User is redirected to dashboard
- [ ] Duplicate email shows error

### Login

- [ ] Can login with correct credentials
- [ ] JWT token is returned
- [ ] Token expires after 7 days
- [ ] Invalid credentials show error
- [ ] Protected routes require authentication

### Token Management

- [ ] Token stored in localStorage
- [ ] Token sent in Authorization header
- [ ] `/auth/me` endpoint works
- [ ] Logout clears token

---

## 📊 Analytics Testing (Pandas Refactoring)

### ACWR Calculation

- [ ] Dashboard shows ACWR ratio
- [ ] Acute load displays correctly
- [ ] Chronic load displays correctly
- [ ] Injury risk category is accurate
- [ ] Calculation is fast (< 10ms for 100 activities)

### Historical Data

- [ ] Chart shows 28 days of data
- [ ] Data points are accurate
- [ ] Chart updates when new activities added
- [ ] Rest days are handled correctly (0 TRIMP)

### Performance

- [ ] Dashboard loads quickly
- [ ] No Python loops in backend logs
- [ ] Pandas operations visible in logs
- [ ] Large datasets handled efficiently

---

## 🌤️ Weather Normalization Testing

### Pace Calculation

- [ ] Activities have `adjusted_pace` values
- [ ] Base pace is calculated correctly
- [ ] Weather data is fetched (if API key set)
- [ ] Dew point is calculated using Magnus Formula

### Correction Factors

- [ ] Dew point < 10°C: 0.98x factor applied
- [ ] Dew point 10-15°C: 1.02x factor applied
- [ ] Dew point 15-20°C: 1.05x factor applied
- [ ] Dew point > 20°C: 1.10x factor applied

### Edge Cases

- [ ] Works without weather API key
- [ ] Handles missing weather data
- [ ] Works with missing temperature/humidity

---

## 🔄 Strava Integration Testing

### Token Management

- [ ] Can connect Strava account
- [ ] OAuth flow completes successfully
- [ ] Token stored in database
- [ ] Refresh token is saved

### Token Refresh

- [ ] `get_valid_token()` function works
- [ ] Expired tokens refresh automatically
- [ ] New token is saved to database
- [ ] Timezone-aware expiration checks

### Activity Sync

- [ ] Can sync activities from Strava
- [ ] Activities are saved to database
- [ ] Duplicate activities are handled
- [ ] Activities linked to correct user

---

## 🗄️ Database Testing (PostgreSQL)

### Connection

- [ ] Database connects successfully
- [ ] Connection pooling works
- [ ] Health checks pass

### Tables

- [ ] `users` table exists
- [ ] `activities` table exists
- [ ] `oauth_tokens` table exists
- [ ] All tables have correct schema

### UUID Types

- [ ] User IDs are UUIDs (not strings)
- [ ] Activity IDs are UUIDs
- [ ] Foreign keys work correctly
- [ ] Queries handle UUIDs properly

### Timezone

- [ ] All timestamps are timezone-aware
- [ ] No naive datetime objects
- [ ] UTC timezone used consistently
- [ ] No sync offset issues

---

## 🐳 Docker Testing

### Containers

- [ ] PostgreSQL container is healthy
- [ ] Backend container is running
- [ ] Containers can communicate
- [ ] Volumes persist data

### Networking

- [ ] Backend accessible on port 8000
- [ ] PostgreSQL accessible on port 5432
- [ ] Frontend can connect to backend
- [ ] CORS configured correctly

### Logs

- [ ] Can view backend logs
- [ ] Can view PostgreSQL logs
- [ ] Logs show startup messages
- [ ] No error messages in logs

---

## 🎨 Frontend Testing

### Pages

- [ ] Login page loads
- [ ] Sign up page loads
- [ ] Dashboard loads
- [ ] Protected routes redirect if not authenticated

### API Integration

- [ ] Frontend calls backend API
- [ ] CORS allows requests
- [ ] Error handling works
- [ ] Loading states display

### User Flow

- [ ] Can register → login → dashboard
- [ ] Can sync activities
- [ ] Can view metrics
- [ ] Can logout

---

## ⚡ Performance Testing

### Backend

- [ ] API responses < 200ms
- [ ] ACWR calculation < 10ms
- [ ] Database queries optimized
- [ ] No N+1 query problems

### Frontend

- [ ] Page loads < 1s
- [ ] Dashboard renders quickly
- [ ] Charts load smoothly
- [ ] No memory leaks

### Database

- [ ] Connection pool works
- [ ] Queries are fast
- [ ] Indexes are used
- [ ] No slow queries

---

## 🐛 Error Handling Testing

### Backend Errors

- [ ] Invalid requests return 400
- [ ] Unauthorized returns 401
- [ ] Not found returns 404
- [ ] Server errors return 500
- [ ] Error messages are clear

### Frontend Errors

- [ ] Network errors handled
- [ ] Validation errors displayed
- [ ] User-friendly error messages
- [ ] Errors don't crash app

---

## 🔒 Security Testing

### Authentication

- [ ] Passwords are hashed (bcrypt)
- [ ] JWT tokens are secure
- [ ] Tokens expire correctly
- [ ] Protected routes work

### Data

- [ ] User data is isolated
- [ ] SQL injection prevented
- [ ] XSS protection enabled
- [ ] CORS configured correctly

---

## 📝 Data Validation Testing

### Input Validation

- [ ] Email format validated
- [ ] Password strength checked
- [ ] Required fields validated
- [ ] Data types checked

### Database Constraints

- [ ] Unique constraints work
- [ ] Foreign keys enforced
- [ ] Not null constraints work
- [ ] Data integrity maintained

---

## ✅ Final Verification

### End-to-End Test

1. [ ] Register new user
2. [ ] Login
3. [ ] Sync activities
4. [ ] View dashboard
5. [ ] Check ACWR calculation
6. [ ] Verify weather-adjusted pace
7. [ ] Test Strava connection (if available)
8. [ ] Logout

### Success Criteria

- [ ] All features work
- [ ] No errors in logs
- [ ] Performance is good
- [ ] Data is accurate
- [ ] User experience is smooth

---

## 🎯 Test Results

**Date:** ******\_\_\_******

**Tester:** ******\_\_\_******

**Results:**

- ✅ Passed: **\_** tests
- ❌ Failed: **\_** tests
- ⚠️ Warnings: **\_** tests

**Notes:**

---

---

---

---

## 🚀 Ready for Production?

- [ ] All tests passed
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Error handling complete
- [ ] Documentation updated
- [ ] Monitoring set up

**Status:** ⬜ Ready / ⬜ Needs Work
