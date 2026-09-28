<<<<<<< HEAD
# Authentication Quick Reference

## Endpoints Summary

### Public Endpoints (No Auth Required)
```
POST   /api/auth/signup              Create account
POST   /api/auth/login               Login
GET    /:shortCode                   Redirect to URL
GET    /api/url/analytics/:code      Get analytics
```

### Protected Endpoints (Requires JWT)
```
GET    /api/auth/profile             Get user profile
POST   /api/url                      Create short URL
POST   /api/url/shorten              Create short URL (legacy)
GET    /api/url                      List user's URLs
```

---

## Frontend Pages

### 1. Login Page
- Path: Default page when logged out
- Components: Email input, Password input
- Actions: Login button, "Sign up here" link
- Redirect on success: Create tab

### 2. Signup Page
- Path: Click "Sign up here" on Login
- Components: Email, Password, Confirm Password inputs
- Actions: Sign Up button, "Log in here" link
- Redirect on success: Create tab

### 3. Create Tab (After Login)
- Paste long URL
- Optional: Custom short code, Expiration date
- Click "🔗 Shorten URL"
- Copy button appears
- Click count tracked

### 4. Dashboard Tab (After Login)
- Table view (desktop) or cards (mobile)
- Lists all user's URLs
- Shows: Short URL, Original, Clicks, Created Date, Status
- Copy button for each URL
- Sorted by creation date (newest first)

### 5. Header (After Login)
- User email displayed
- Logout button (red)
- Click to logout and return to login page

---

## API Request/Response Examples

### Signup
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

✅ 201 Response:
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}

❌ 409 (Email exists):
{
  "success": false,
  "message": "Email already registered. Please log in instead."
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

✅ 200 Response:
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}

❌ 401 (Wrong password):
{
  "success": false,
  "message": "Invalid email or password."
}
```

### Create Short URL (Protected)
```bash
POST /api/url
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "longUrl": "https://example.com/very/long/path",
  "expiresAt": "2024-12-31T23:59:59Z",
  "customCode": "my-link"
}

✅ 201 Response:
{
  "success": true,
  "shortUrl": "http://localhost:5000/my-link",
  "shortCode": "my-link",
  "originalUrl": "https://example.com/very/long/path"
}

❌ 401 (No token):
{
  "success": false,
  "message": "No token provided. Please log in."
}

❌ 409 (Code taken):
{
  "success": false,
  "error": "Custom short code already in use"
}
```

### List User URLs (Protected)
```bash
GET /api/url?sort=-createdAt&limit=100
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

✅ 200 Response:
{
  "success": true,
  "data": [
    {
      "shortCode": "abc123",
      "originalUrl": "https://example.com/...",
      "clicks": 42,
      "createdAt": "2024-01-07T10:00:00Z",
      "lastAccessed": "2024-01-07T15:30:00Z",
      "expiresAt": null
    }
  ],
  "count": 1
}

❌ 401 (Invalid token):
{
  "success": false,
  "message": "Invalid or expired token. Please log in again."
}
```

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Not Logged In                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                 [Login / Signup Page]
                            ↓
          ┌─────────────────┴─────────────────┐
          ↓                                    ↓
    [Login Form]                         [Signup Form]
    POST /api/auth/login          POST /api/auth/signup
          ↓                                    ↓
    ✅ Success: Get JWT Token  ✅ Success: Get JWT Token
    Token → localStorage            Token → localStorage
          ↓                                    ↓
          └─────────────────┬─────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  User Logged In - Token in Storage    │
        │  Visible: Create Tab, Dashboard Tab   │
        │  Header: Email + Logout Button        │
        └───────────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────────┐
        │        All Requests Include:          │
        │  Authorization: Bearer {TOKEN}        │
        │                                        │
        │  Axios Interceptor Auto-adds Token   │
        └───────────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────────┐
        │  Protected Endpoints Available:        │
        │  - POST /api/url                      │
        │  - GET /api/url (list user's URLs)   │
        │  - GET /api/auth/profile              │
        └───────────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────────┐
        │         Logout Button Clicked         │
        │    localStorage.removeItem(token)     │
        │  Redirect to Login Page               │
        └───────────────────────────────────────┘
                    ↓
        ┌─────────────────────────────────────────────────────┐
        │                User Not Logged In                    │
        └─────────────────────────────────────────────────────┘
```

---

## Token Management

### Token Storage
```javascript
// After successful login/signup
localStorage.setItem('authToken', token)

// Axios automatically reads and adds to requests
Authorization: Bearer {token}

// On logout
localStorage.removeItem('authToken')
```

### Token Structure
```javascript
// JWT Token (3 parts separated by dots)
Header.Payload.Signature

// Payload contains:
{
  "id": "507f1f77bcf86cd799439011",  // userId
  "iat": 1704619200,                  // issued at
  "exp": 1705224000                   // expiration (7 days)
}

// Use https://jwt.io to decode (for testing only)
```

### Token Expiration
- **Duration:** 7 days from login
- **After expiration:** Requests return 401
- **Solution:** Log out and log in again to get new token

---

## Database Indexes

### User Collection
```javascript
db.users.getIndexes()
// {
//   _id: unique
//   email: unique, sparse
// }
```

### URL Collection
```javascript
db.urls.getIndexes()
// {
//   _id: unique
//   userId: indexed (for fast user filtering)
//   shortCode: unique (no duplicates)
//   createdAt: indexed (for sorting)
//   expiresAt: indexed (for cleanup)
// }
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Backend unreachable" | Server not running | Start: `npm run dev` |
| "No token provided" | Not logged in | Sign up or log in |
| "Invalid or expired token" | Token expired (7 days) | Log out and log in again |
| "Email already registered" | Email exists in DB | Use different email |
| "Invalid email or password" | Wrong password | Check email/password |
| "Custom code already in use" | Code taken by another user | Use unique code |
| Blank login page | Auth state not ready | Wait for "Loading..." to finish |
| URLs not showing in Dashboard | Logged in as different user | Check user email in header |

---

## Environment Setup

### .env File
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/urlshortener
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
```

### Production .env
```
PORT=443
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
JWT_SECRET=<generate-strong-random-key>
```

---

## Development Helpers

### Check If User Logged In (Browser Console)
```javascript
localStorage.getItem('authToken')  // Returns token or null
```

### Manually Clear Auth (Browser Console)
```javascript
localStorage.removeItem('authToken')
location.reload()  // Refresh page
```

### View JWT Payload (Browser Console)
```javascript
const token = localStorage.getItem('authToken')
const payload = JSON.parse(atob(token.split('.')[1]))
console.log(payload)  // { id: "...", iat: ..., exp: ... }
```

### MongoDB User Query
```javascript
db.users.find()  // See all users
db.users.findOne({email: "user@example.com"})  // Find specific user
```

---

## Testing Checklist

- [ ] Signup with new email
- [ ] Password hashed in MongoDB
- [ ] Login with correct password
- [ ] Login fails with wrong password
- [ ] Token stored in localStorage
- [ ] Create URL (requires login)
- [ ] View Dashboard (only user's URLs)
- [ ] Copy URL button works
- [ ] Logout clears token
- [ ] Closed tab, token persists (refresh page)
- [ ] Multiple users have isolated data
- [ ] Custom short codes work
- [ ] Expired URLs return 410

---

## Performance Tips

1. **Reduce JWT Size** - Store minimal data (userId only)
2. **Cache User Profile** - Store in React state to avoid repeated /profile requests
3. **Lazy Load Dashboard** - Load only when user clicks tab
4. **Implement Pagination** - For users with many URLs
5. **Use Redis Cache** - Short code lookups (already implemented)

---

## Security Checklist

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens used for auth
- ✅ CORS configured for frontend domain
- ✅ Protected routes require auth middleware
- ✅ Data filtered by userId
- ✅ Rate limiting on URL creation
- ✅ Generic error messages (no user enumeration)
- ✅ Token stored in localStorage (not exposed)
- ✅ HTTPS recommended for production

---

**Quick Links:**
- Full API Docs: See `AUTHENTICATION.md`
- Testing Guide: See `AUTH_TESTING.md`
- Implementation Details: See `AUTH_IMPLEMENTATION.md`

---

**Last Updated:** January 7, 2026
=======
# Authentication Quick Reference

## Endpoints Summary

### Public Endpoints (No Auth Required)
```
POST   /api/auth/signup              Create account
POST   /api/auth/login               Login
GET    /:shortCode                   Redirect to URL
GET    /api/url/analytics/:code      Get analytics
```

### Protected Endpoints (Requires JWT)
```
GET    /api/auth/profile             Get user profile
POST   /api/url                      Create short URL
POST   /api/url/shorten              Create short URL (legacy)
GET    /api/url                      List user's URLs
```

---

## Frontend Pages

### 1. Login Page
- Path: Default page when logged out
- Components: Email input, Password input
- Actions: Login button, "Sign up here" link
- Redirect on success: Create tab

### 2. Signup Page
- Path: Click "Sign up here" on Login
- Components: Email, Password, Confirm Password inputs
- Actions: Sign Up button, "Log in here" link
- Redirect on success: Create tab

### 3. Create Tab (After Login)
- Paste long URL
- Optional: Custom short code, Expiration date
- Click "🔗 Shorten URL"
- Copy button appears
- Click count tracked

### 4. Dashboard Tab (After Login)
- Table view (desktop) or cards (mobile)
- Lists all user's URLs
- Shows: Short URL, Original, Clicks, Created Date, Status
- Copy button for each URL
- Sorted by creation date (newest first)

### 5. Header (After Login)
- User email displayed
- Logout button (red)
- Click to logout and return to login page

---

## API Request/Response Examples

### Signup
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

✅ 201 Response:
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}

❌ 409 (Email exists):
{
  "success": false,
  "message": "Email already registered. Please log in instead."
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

✅ 200 Response:
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}

❌ 401 (Wrong password):
{
  "success": false,
  "message": "Invalid email or password."
}
```

### Create Short URL (Protected)
```bash
POST /api/url
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "longUrl": "https://example.com/very/long/path",
  "expiresAt": "2024-12-31T23:59:59Z",
  "customCode": "my-link"
}

✅ 201 Response:
{
  "success": true,
  "shortUrl": "http://localhost:5000/my-link",
  "shortCode": "my-link",
  "originalUrl": "https://example.com/very/long/path"
}

❌ 401 (No token):
{
  "success": false,
  "message": "No token provided. Please log in."
}

❌ 409 (Code taken):
{
  "success": false,
  "error": "Custom short code already in use"
}
```

### List User URLs (Protected)
```bash
GET /api/url?sort=-createdAt&limit=100
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

✅ 200 Response:
{
  "success": true,
  "data": [
    {
      "shortCode": "abc123",
      "originalUrl": "https://example.com/...",
      "clicks": 42,
      "createdAt": "2024-01-07T10:00:00Z",
      "lastAccessed": "2024-01-07T15:30:00Z",
      "expiresAt": null
    }
  ],
  "count": 1
}

❌ 401 (Invalid token):
{
  "success": false,
  "message": "Invalid or expired token. Please log in again."
}
```

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Not Logged In                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                 [Login / Signup Page]
                            ↓
          ┌─────────────────┴─────────────────┐
          ↓                                    ↓
    [Login Form]                         [Signup Form]
    POST /api/auth/login          POST /api/auth/signup
          ↓                                    ↓
    ✅ Success: Get JWT Token  ✅ Success: Get JWT Token
    Token → localStorage            Token → localStorage
          ↓                                    ↓
          └─────────────────┬─────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  User Logged In - Token in Storage    │
        │  Visible: Create Tab, Dashboard Tab   │
        │  Header: Email + Logout Button        │
        └───────────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────────┐
        │        All Requests Include:          │
        │  Authorization: Bearer {TOKEN}        │
        │                                        │
        │  Axios Interceptor Auto-adds Token   │
        └───────────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────────┐
        │  Protected Endpoints Available:        │
        │  - POST /api/url                      │
        │  - GET /api/url (list user's URLs)   │
        │  - GET /api/auth/profile              │
        └───────────────────────────────────────┘
                    ↓
        ┌───────────────────────────────────────┐
        │         Logout Button Clicked         │
        │    localStorage.removeItem(token)     │
        │  Redirect to Login Page               │
        └───────────────────────────────────────┘
                    ↓
        ┌─────────────────────────────────────────────────────┐
        │                User Not Logged In                    │
        └─────────────────────────────────────────────────────┘
```

---

## Token Management

### Token Storage
```javascript
// After successful login/signup
localStorage.setItem('authToken', token)

// Axios automatically reads and adds to requests
Authorization: Bearer {token}

// On logout
localStorage.removeItem('authToken')
```

### Token Structure
```javascript
// JWT Token (3 parts separated by dots)
Header.Payload.Signature

// Payload contains:
{
  "id": "507f1f77bcf86cd799439011",  // userId
  "iat": 1704619200,                  // issued at
  "exp": 1705224000                   // expiration (7 days)
}

// Use https://jwt.io to decode (for testing only)
```

### Token Expiration
- **Duration:** 7 days from login
- **After expiration:** Requests return 401
- **Solution:** Log out and log in again to get new token

---

## Database Indexes

### User Collection
```javascript
db.users.getIndexes()
// {
//   _id: unique
//   email: unique, sparse
// }
```

### URL Collection
```javascript
db.urls.getIndexes()
// {
//   _id: unique
//   userId: indexed (for fast user filtering)
//   shortCode: unique (no duplicates)
//   createdAt: indexed (for sorting)
//   expiresAt: indexed (for cleanup)
// }
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Backend unreachable" | Server not running | Start: `npm run dev` |
| "No token provided" | Not logged in | Sign up or log in |
| "Invalid or expired token" | Token expired (7 days) | Log out and log in again |
| "Email already registered" | Email exists in DB | Use different email |
| "Invalid email or password" | Wrong password | Check email/password |
| "Custom code already in use" | Code taken by another user | Use unique code |
| Blank login page | Auth state not ready | Wait for "Loading..." to finish |
| URLs not showing in Dashboard | Logged in as different user | Check user email in header |

---

## Environment Setup

### .env File
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/urlshortener
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
```

### Production .env
```
PORT=443
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
JWT_SECRET=<generate-strong-random-key>
```

---

## Development Helpers

### Check If User Logged In (Browser Console)
```javascript
localStorage.getItem('authToken')  // Returns token or null
```

### Manually Clear Auth (Browser Console)
```javascript
localStorage.removeItem('authToken')
location.reload()  // Refresh page
```

### View JWT Payload (Browser Console)
```javascript
const token = localStorage.getItem('authToken')
const payload = JSON.parse(atob(token.split('.')[1]))
console.log(payload)  // { id: "...", iat: ..., exp: ... }
```

### MongoDB User Query
```javascript
db.users.find()  // See all users
db.users.findOne({email: "user@example.com"})  // Find specific user
```

---

## Testing Checklist

- [ ] Signup with new email
- [ ] Password hashed in MongoDB
- [ ] Login with correct password
- [ ] Login fails with wrong password
- [ ] Token stored in localStorage
- [ ] Create URL (requires login)
- [ ] View Dashboard (only user's URLs)
- [ ] Copy URL button works
- [ ] Logout clears token
- [ ] Closed tab, token persists (refresh page)
- [ ] Multiple users have isolated data
- [ ] Custom short codes work
- [ ] Expired URLs return 410

---

## Performance Tips

1. **Reduce JWT Size** - Store minimal data (userId only)
2. **Cache User Profile** - Store in React state to avoid repeated /profile requests
3. **Lazy Load Dashboard** - Load only when user clicks tab
4. **Implement Pagination** - For users with many URLs
5. **Use Redis Cache** - Short code lookups (already implemented)

---

## Security Checklist

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens used for auth
- ✅ CORS configured for frontend domain
- ✅ Protected routes require auth middleware
- ✅ Data filtered by userId
- ✅ Rate limiting on URL creation
- ✅ Generic error messages (no user enumeration)
- ✅ Token stored in localStorage (not exposed)
- ✅ HTTPS recommended for production

---

**Quick Links:**
- Full API Docs: See `AUTHENTICATION.md`
- Testing Guide: See `AUTH_TESTING.md`
- Implementation Details: See `AUTH_IMPLEMENTATION.md`

---

**Last Updated:** January 7, 2026
>>>>>>> f8a0985c31c00fc45f47ca7de161e97febc64ff6
