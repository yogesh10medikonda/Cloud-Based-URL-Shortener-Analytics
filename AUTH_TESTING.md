<<<<<<< HEAD
# Authentication Implementation - Testing Guide

## Overview
This guide walks you through testing the new authentication system in the URL shortener project.

## Servers Status
- ✅ **Backend**: Running on `http://localhost:5000`
- ✅ **Frontend**: Running on `http://localhost:5173`

## Test Scenarios

### Scenario 1: User Registration

**Steps:**
1. Open `http://localhost:5173` in your browser
2. You should see the **Login** page (default view)
3. Click "Sign up here" link
4. Fill in the form:
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
5. Click "Sign Up" button

**Expected Results:**
- ✅ Form submits successfully
- ✅ User is logged in automatically
- ✅ Redirected to "Create" tab (URL creation form)
- ✅ User email (`test@example.com`) displayed in header
- ✅ "Logout" button visible in header
- ✅ Token stored in browser localStorage

**Backend Verification:**
- Check MongoDB: User document created with hashed password
- Check JWT: Token returned in response with user info

---

### Scenario 2: User Login

**Steps:**
1. Click "Logout" button to log out
2. You should return to Login page
3. Fill in the form:
   - Email: `test@example.com`
   - Password: `password123`
4. Click "Login" button

**Expected Results:**
- ✅ Form submits successfully
- ✅ User is logged in
- ✅ Redirected to "Create" tab
- ✅ User email displayed in header
- ✅ Token stored in localStorage

**Error Cases to Test:**
- ❌ Wrong email: "Invalid email or password"
- ❌ Wrong password: "Invalid email or password"
- ❌ Missing fields: "Email and password are required"

---

### Scenario 3: Create Short URL (Protected Route)

**Steps:**
1. Make sure you're logged in
2. You should be on the "Create" tab (or click it)
3. Paste a long URL:
   ```
   https://github.com/microsoft/vscode/blob/main/README.md
   ```
4. Click "🔗 Shorten URL" button

**Expected Results:**
- ✅ Short URL generated
- ✅ Original URL stored with your userId
- ✅ Copy button works (copy to clipboard)
- ✅ Clicks counter shows "0"
- ✅ Can click "🔄 Refresh" to update clicks

**Without Authentication:**
- ❌ If logged out, try pasting URL and clicking create
- ❌ Should get error: "Please log in to create shortened URLs"
- ❌ Should redirect to login page

---

### Scenario 4: Custom Short Code

**Steps:**
1. While logged in, go to Create tab
2. Paste a long URL
3. Before clicking "Shorten URL", add a custom code:
   - In the form, you can add `customCode` in request (or we can add UI for this)
4. Create the URL with custom code `my-awesome-link`

**Expected Results:**
- ✅ Short URL created with custom code: `http://localhost:5000/my-awesome-link`
- ✅ Original URL shows in analytics with custom code
- ✅ Can click the short URL to redirect

**Error Cases:**
- ❌ Duplicate custom code: "Custom short code already in use"
- ❌ Invalid format (only 2 chars): "Invalid custom short code format"
- ❌ Special characters: "Invalid custom short code format"

---

### Scenario 5: Dashboard (User's URLs)

**Steps:**
1. Make sure you're logged in (have created at least 1 URL)
2. Click "📊 Dashboard" tab
3. You should see a table (desktop) or cards (mobile) with your URLs

**Expected Results - Desktop View:**
- ✅ Table with columns: Short URL | Original URL | Clicks | Created | Status | Actions
- ✅ Your URLs listed (not other users' URLs)
- ✅ Copy button next to each short URL
- ✅ Expiry status badge (✓ Active or ❌ Expired)
- ✅ All URLs show same user count
- ✅ Sorted by creation date (newest first)

**Expected Results - Mobile View:**
- ✅ Cards layout (not table)
- ✅ All same info as desktop, just vertical layout
- ✅ Copy button on each card
- ✅ Responsive design works

**Without Authentication:**
- ❌ If logged out, click Dashboard
- ❌ Should get error: "Please log in to view your URLs"

---

### Scenario 6: Multiple Users - Data Isolation

**Steps:**
1. **User 1** (test1@example.com):
   - Sign up
   - Create 2 short URLs
   - View Dashboard (should show 2 URLs)
   - Note the short codes

2. **User 2** (test2@example.com):
   - Log out
   - Click "Sign up here"
   - Sign up as new user
   - Create 1 short URL
   - View Dashboard (should show ONLY 1 URL, not User 1's)

3. **User 1** - Back:
   - Log out
   - Log in as test1@example.com
   - View Dashboard (should show 2 URLs from earlier)

**Expected Results:**
- ✅ User 1 sees only their 2 URLs
- ✅ User 2 sees only their 1 URL
- ✅ Users' data is isolated (no cross-user data leak)
- ✅ Each user's localStorage token is independent

**Security Verification:**
- Backend uses `userId` from JWT to filter URLs
- GET /api/url returns only authenticated user's URLs
- No way to access other user's URLs (even with direct API calls)

---

### Scenario 7: URL Expiration

**Steps:**
1. Log in
2. Create a short URL with expiration (optional in UI, but backend supports it)
3. Try to access the short URL immediately
4. Wait for expiration time (or set to past date for testing)
5. Try to access again

**Expected Results:**
- ✅ Before expiration: Redirects to original URL (302)
- ✅ After expiration: Returns 410 Gone error
- ✅ In Dashboard: Expired URLs show ❌ Expired badge
- ✅ Expired URLs are grayed out (opacity 0.6)

**Cleanup Verification:**
- Expired URLs automatically deleted daily at 2:00 AM UTC
- Check `/src/utils/scheduler.js` for cleanup job configuration

---

### Scenario 8: Token Expiration

**Steps:**
1. Log in as user
2. Token stored in localStorage (valid for 7 days)
3. Wait for token to expire (or manually delete from localStorage)
4. Try to create a URL
5. Try to view Dashboard

**Expected Results:**
- ❌ Create URL: "No token provided. Please log in."
- ❌ Dashboard: "Please log in to view your URLs."
- ✅ User redirected to login page
- ✅ Must log in again to get new token

**Note:** For testing purposes, you can:
- Modify `JWT_EXPIRE` in `src/config/jwt.js` to short duration (e.g., '5m')
- Or manually delete token: `localStorage.removeItem('authToken')`

---

### Scenario 9: Password Security

**Steps:**
1. Sign up with password: `password123`
2. Check MongoDB: User document password field
3. Password should be hashed (NOT plaintext)
4. Try to log in with:
   - Correct password: ✅ Success
   - Wrong password: ❌ "Invalid email or password"
   - Similar password (e.g., `password12`): ❌ Fails

**Expected Results:**
- ✅ Password is bcrypt hashed (10 rounds)
- ✅ Bcrypt verification works correctly
- ✅ No way to recover original password (one-way hash)

**MongoDB Verification:**
```javascript
db.users.findOne({email: "test@example.com"})
// password field should look like: $2b$10$...long.hash...
```

---

### Scenario 10: Analytics for Shared URLs

**Steps:**
1. Create a short URL as User 1
2. Copy the short URL
3. **Without logging in**, open the short URL in a new tab
4. URL should redirect to original
5. Go back to Dashboard
6. Refresh the page
7. Check clicks counter

**Expected Results:**
- ✅ Shared URL accessible without login (public redirect)
- ✅ Clicks counter incremented
- ✅ `lastAccessed` timestamp updated
- ✅ Analytics endpoint GET /api/url/analytics/:shortCode works without auth
- ✅ Anyone can access analytics (view-only, no edit)

---

## API Testing with curl

### Test 1: Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"testpass123"}'
```

Expected Response:
```json
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGci...",
  "user": {
    "id": "507f...",
    "email": "apitest@example.com"
  }
}
```

### Test 2: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"testpass123"}'
```

### Test 3: Create URL (Protected)
```bash
curl -X POST http://localhost:5000/api/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"longUrl":"https://www.google.com"}'
```

### Test 4: Get User's URLs (Protected)
```bash
curl http://localhost:5000/api/url \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 5: Get Analytics (Public)
```bash
curl http://localhost:5000/api/url/analytics/abc123
```

### Test 6: Without Token (Should Fail)
```bash
curl -X POST http://localhost:5000/api/url \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://www.google.com"}'
```

Expected Response:
```json
{
  "success": false,
  "message": "No token provided. Please log in."
}
```

---

## Verification Checklist

- [ ] User can sign up with email/password
- [ ] User can log in
- [ ] User can create short URLs (logged in only)
- [ ] User's URLs filtered in Dashboard (no other users' URLs)
- [ ] User can logout
- [ ] Multiple users have isolated data
- [ ] Custom short codes work
- [ ] Token stored in localStorage
- [ ] Token sent in Authorization header for protected routes
- [ ] Password hashed in MongoDB
- [ ] Expired URLs return 410
- [ ] Public can access short URLs without login
- [ ] Public can view analytics without login
- [ ] Desktop and mobile responsive layouts work
- [ ] Copy to clipboard works
- [ ] Toast notifications appear
- [ ] Error messages display correctly
- [ ] Scheduler runs for expired URL cleanup
- [ ] CORS allows frontend to communicate with backend

---

## Troubleshooting

### Error: "Backend unreachable"
- Check backend is running: `npm run dev` in url_shortner folder
- Check port 5000 not blocked

### Error: "No token provided"
- Make sure you're logged in
- Check localStorage: `localStorage.getItem('authToken')`
- Token might have expired (log out and log in again)

### Error: "Custom short code already in use"
- Use a unique custom code
- Check existing URLs in Dashboard

### MongoDB not showing user data
- Check MongoDB is running: `mongod` or MongoDB Atlas connection
- Verify MONGO_URI in .env

### Frontend page blank
- Check browser console for errors (F12 → Console)
- Verify Vite running on port 5173

---

## Environment Variables

Make sure `.env` file has:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/urlshortener
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
```

---

## Next Steps

After successful testing:
1. ✅ All scenarios pass
2. Deploy to production server
3. Use strong JWT_SECRET in production
4. Enable HTTPS for secure token transmission
5. Configure proper CORS for production domain
6. Set up email verification for signup
7. Implement refresh token rotation
8. Monitor authentication logs

---

**Happy Testing! 🚀**
=======
# Authentication Implementation - Testing Guide

## Overview
This guide walks you through testing the new authentication system in the URL shortener project.

## Servers Status
- ✅ **Backend**: Running on `http://localhost:5000`
- ✅ **Frontend**: Running on `http://localhost:5173`

## Test Scenarios

### Scenario 1: User Registration

**Steps:**
1. Open `http://localhost:5173` in your browser
2. You should see the **Login** page (default view)
3. Click "Sign up here" link
4. Fill in the form:
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
5. Click "Sign Up" button

**Expected Results:**
- ✅ Form submits successfully
- ✅ User is logged in automatically
- ✅ Redirected to "Create" tab (URL creation form)
- ✅ User email (`test@example.com`) displayed in header
- ✅ "Logout" button visible in header
- ✅ Token stored in browser localStorage

**Backend Verification:**
- Check MongoDB: User document created with hashed password
- Check JWT: Token returned in response with user info

---

### Scenario 2: User Login

**Steps:**
1. Click "Logout" button to log out
2. You should return to Login page
3. Fill in the form:
   - Email: `test@example.com`
   - Password: `password123`
4. Click "Login" button

**Expected Results:**
- ✅ Form submits successfully
- ✅ User is logged in
- ✅ Redirected to "Create" tab
- ✅ User email displayed in header
- ✅ Token stored in localStorage

**Error Cases to Test:**
- ❌ Wrong email: "Invalid email or password"
- ❌ Wrong password: "Invalid email or password"
- ❌ Missing fields: "Email and password are required"

---

### Scenario 3: Create Short URL (Protected Route)

**Steps:**
1. Make sure you're logged in
2. You should be on the "Create" tab (or click it)
3. Paste a long URL:
   ```
   https://github.com/microsoft/vscode/blob/main/README.md
   ```
4. Click "🔗 Shorten URL" button

**Expected Results:**
- ✅ Short URL generated
- ✅ Original URL stored with your userId
- ✅ Copy button works (copy to clipboard)
- ✅ Clicks counter shows "0"
- ✅ Can click "🔄 Refresh" to update clicks

**Without Authentication:**
- ❌ If logged out, try pasting URL and clicking create
- ❌ Should get error: "Please log in to create shortened URLs"
- ❌ Should redirect to login page

---

### Scenario 4: Custom Short Code

**Steps:**
1. While logged in, go to Create tab
2. Paste a long URL
3. Before clicking "Shorten URL", add a custom code:
   - In the form, you can add `customCode` in request (or we can add UI for this)
4. Create the URL with custom code `my-awesome-link`

**Expected Results:**
- ✅ Short URL created with custom code: `http://localhost:5000/my-awesome-link`
- ✅ Original URL shows in analytics with custom code
- ✅ Can click the short URL to redirect

**Error Cases:**
- ❌ Duplicate custom code: "Custom short code already in use"
- ❌ Invalid format (only 2 chars): "Invalid custom short code format"
- ❌ Special characters: "Invalid custom short code format"

---

### Scenario 5: Dashboard (User's URLs)

**Steps:**
1. Make sure you're logged in (have created at least 1 URL)
2. Click "📊 Dashboard" tab
3. You should see a table (desktop) or cards (mobile) with your URLs

**Expected Results - Desktop View:**
- ✅ Table with columns: Short URL | Original URL | Clicks | Created | Status | Actions
- ✅ Your URLs listed (not other users' URLs)
- ✅ Copy button next to each short URL
- ✅ Expiry status badge (✓ Active or ❌ Expired)
- ✅ All URLs show same user count
- ✅ Sorted by creation date (newest first)

**Expected Results - Mobile View:**
- ✅ Cards layout (not table)
- ✅ All same info as desktop, just vertical layout
- ✅ Copy button on each card
- ✅ Responsive design works

**Without Authentication:**
- ❌ If logged out, click Dashboard
- ❌ Should get error: "Please log in to view your URLs"

---

### Scenario 6: Multiple Users - Data Isolation

**Steps:**
1. **User 1** (test1@example.com):
   - Sign up
   - Create 2 short URLs
   - View Dashboard (should show 2 URLs)
   - Note the short codes

2. **User 2** (test2@example.com):
   - Log out
   - Click "Sign up here"
   - Sign up as new user
   - Create 1 short URL
   - View Dashboard (should show ONLY 1 URL, not User 1's)

3. **User 1** - Back:
   - Log out
   - Log in as test1@example.com
   - View Dashboard (should show 2 URLs from earlier)

**Expected Results:**
- ✅ User 1 sees only their 2 URLs
- ✅ User 2 sees only their 1 URL
- ✅ Users' data is isolated (no cross-user data leak)
- ✅ Each user's localStorage token is independent

**Security Verification:**
- Backend uses `userId` from JWT to filter URLs
- GET /api/url returns only authenticated user's URLs
- No way to access other user's URLs (even with direct API calls)

---

### Scenario 7: URL Expiration

**Steps:**
1. Log in
2. Create a short URL with expiration (optional in UI, but backend supports it)
3. Try to access the short URL immediately
4. Wait for expiration time (or set to past date for testing)
5. Try to access again

**Expected Results:**
- ✅ Before expiration: Redirects to original URL (302)
- ✅ After expiration: Returns 410 Gone error
- ✅ In Dashboard: Expired URLs show ❌ Expired badge
- ✅ Expired URLs are grayed out (opacity 0.6)

**Cleanup Verification:**
- Expired URLs automatically deleted daily at 2:00 AM UTC
- Check `/src/utils/scheduler.js` for cleanup job configuration

---

### Scenario 8: Token Expiration

**Steps:**
1. Log in as user
2. Token stored in localStorage (valid for 7 days)
3. Wait for token to expire (or manually delete from localStorage)
4. Try to create a URL
5. Try to view Dashboard

**Expected Results:**
- ❌ Create URL: "No token provided. Please log in."
- ❌ Dashboard: "Please log in to view your URLs."
- ✅ User redirected to login page
- ✅ Must log in again to get new token

**Note:** For testing purposes, you can:
- Modify `JWT_EXPIRE` in `src/config/jwt.js` to short duration (e.g., '5m')
- Or manually delete token: `localStorage.removeItem('authToken')`

---

### Scenario 9: Password Security

**Steps:**
1. Sign up with password: `password123`
2. Check MongoDB: User document password field
3. Password should be hashed (NOT plaintext)
4. Try to log in with:
   - Correct password: ✅ Success
   - Wrong password: ❌ "Invalid email or password"
   - Similar password (e.g., `password12`): ❌ Fails

**Expected Results:**
- ✅ Password is bcrypt hashed (10 rounds)
- ✅ Bcrypt verification works correctly
- ✅ No way to recover original password (one-way hash)

**MongoDB Verification:**
```javascript
db.users.findOne({email: "test@example.com"})
// password field should look like: $2b$10$...long.hash...
```

---

### Scenario 10: Analytics for Shared URLs

**Steps:**
1. Create a short URL as User 1
2. Copy the short URL
3. **Without logging in**, open the short URL in a new tab
4. URL should redirect to original
5. Go back to Dashboard
6. Refresh the page
7. Check clicks counter

**Expected Results:**
- ✅ Shared URL accessible without login (public redirect)
- ✅ Clicks counter incremented
- ✅ `lastAccessed` timestamp updated
- ✅ Analytics endpoint GET /api/url/analytics/:shortCode works without auth
- ✅ Anyone can access analytics (view-only, no edit)

---

## API Testing with curl

### Test 1: Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"testpass123"}'
```

Expected Response:
```json
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGci...",
  "user": {
    "id": "507f...",
    "email": "apitest@example.com"
  }
}
```

### Test 2: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"testpass123"}'
```

### Test 3: Create URL (Protected)
```bash
curl -X POST http://localhost:5000/api/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"longUrl":"https://www.google.com"}'
```

### Test 4: Get User's URLs (Protected)
```bash
curl http://localhost:5000/api/url \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 5: Get Analytics (Public)
```bash
curl http://localhost:5000/api/url/analytics/abc123
```

### Test 6: Without Token (Should Fail)
```bash
curl -X POST http://localhost:5000/api/url \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://www.google.com"}'
```

Expected Response:
```json
{
  "success": false,
  "message": "No token provided. Please log in."
}
```

---

## Verification Checklist

- [ ] User can sign up with email/password
- [ ] User can log in
- [ ] User can create short URLs (logged in only)
- [ ] User's URLs filtered in Dashboard (no other users' URLs)
- [ ] User can logout
- [ ] Multiple users have isolated data
- [ ] Custom short codes work
- [ ] Token stored in localStorage
- [ ] Token sent in Authorization header for protected routes
- [ ] Password hashed in MongoDB
- [ ] Expired URLs return 410
- [ ] Public can access short URLs without login
- [ ] Public can view analytics without login
- [ ] Desktop and mobile responsive layouts work
- [ ] Copy to clipboard works
- [ ] Toast notifications appear
- [ ] Error messages display correctly
- [ ] Scheduler runs for expired URL cleanup
- [ ] CORS allows frontend to communicate with backend

---

## Troubleshooting

### Error: "Backend unreachable"
- Check backend is running: `npm run dev` in url_shortner folder
- Check port 5000 not blocked

### Error: "No token provided"
- Make sure you're logged in
- Check localStorage: `localStorage.getItem('authToken')`
- Token might have expired (log out and log in again)

### Error: "Custom short code already in use"
- Use a unique custom code
- Check existing URLs in Dashboard

### MongoDB not showing user data
- Check MongoDB is running: `mongod` or MongoDB Atlas connection
- Verify MONGO_URI in .env

### Frontend page blank
- Check browser console for errors (F12 → Console)
- Verify Vite running on port 5173

---

## Environment Variables

Make sure `.env` file has:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/urlshortener
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
```

---

## Next Steps

After successful testing:
1. ✅ All scenarios pass
2. Deploy to production server
3. Use strong JWT_SECRET in production
4. Enable HTTPS for secure token transmission
5. Configure proper CORS for production domain
6. Set up email verification for signup
7. Implement refresh token rotation
8. Monitor authentication logs

---

**Happy Testing! 🚀**
>>>>>>> f8a0985c31c00fc45f47ca7de161e97febc64ff6
