<<<<<<< HEAD
# URL Shortener with User Authentication

A production-ready URL shortener built with React + Vite (frontend) and Node.js/Express (backend), featuring user authentication, analytics tracking, URL expiration, and custom short codes.

## Features

### Authentication
- **User Registration**: Create accounts with email and password
- **User Login**: Secure JWT-based authentication
- **Protected Routes**: Only authenticated users can create and manage URLs
- **Password Security**: Passwords hashed with bcrypt (10 rounds)
- **JWT Tokens**: 7-day expiration, stored in browser localStorage

### URL Management
- **Create Short URLs**: Generate shortened URLs for long URLs
- **Custom Codes**: Optional custom short codes (3-64 characters, alphanumeric + dash/underscore)
- **URL Expiration**: Set optional expiration dates for temporary URLs
- **Analytics**: Track clicks and last access time per URL
- **Dashboard**: View all your created URLs with filters and sorting

### Advanced Features
- **Rate Limiting**: 100 requests per 15 minutes on URL creation
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Gradient UI**: Modern purple gradient interface
- **Copy to Clipboard**: One-click URL copying
- **Toast Notifications**: User-friendly feedback messages

## Project Structure

```
url_shortner/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   ├── redis.js           # Redis cache setup
│   │   └── jwt.js             # JWT token generation/verification
│   ├── controllers/
│   │   ├── auth.controller.js # Login/signup/profile handlers
│   │   └── url.controller.js  # URL creation/analytics/listing
│   ├── models/
│   │   ├── user.model.js      # User schema (email, password)
│   │   └── url.model.js       # URL schema with userId reference
│   ├── middleware/
│   │   ├── auth.js            # JWT verification middleware
│   │   └── rateLimiter.js     # Rate limiting middleware
│   ├── routes/
│   │   ├── auth.routes.js     # Auth endpoints
│   │   └── url.routes.js      # URL endpoints (protected)
│   ├── services/
│   │   ├── url.service.js     # URL shortening logic
│   │   └── cleanup.service.js # Expired URL cleanup
│   ├── utils/
│   │   ├── base62.js          # Base62 encoding
│   │   └── scheduler.js       # Background job scheduler
│   └── app.js                 # Express app setup
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global auth state
│   │   ├── components/
│   │   │   ├── Login.jsx           # Login form
│   │   │   ├── Signup.jsx          # Registration form
│   │   │   ├── ProtectedRoute.jsx  # Protected route wrapper
│   │   │   └── Dashboard.jsx       # URL listing dashboard
│   │   ├── App.jsx                 # Main app component
│   │   ├── axios.js                # HTTP client with auth interceptor
│   │   ├── App.css                 # Global styles
│   │   └── main.jsx                # React entry point
│   └── package.json
├── package.json                # Backend dependencies
├── .env                        # Environment variables
└── README.md                   # This file
```

## Installation & Setup

### Backend Setup

1. **Install Dependencies**
```bash
cd url_shortner
npm install
```

2. **Configure Environment Variables**
```bash
# .env file
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/urlshortener
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

3. **Start Backend Server**
```bash
npm run dev
```
Backend runs at `http://localhost:5000`

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Start Frontend Dev Server**
```bash
npm run dev
```
Frontend runs at `http://localhost:5173`

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/signup
Create a new user account
```json
Request:
{
  "email": "user@example.com",
  "password": "securepass123"
}

Response (201):
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

#### POST /api/auth/login
Login with email and password
```json
Request:
{
  "email": "user@example.com",
  "password": "securepass123"
}

Response (200):
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

#### GET /api/auth/profile
Get current user profile (requires auth)
```json
Response (200):
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "createdAt": "2024-01-07T10:30:00Z"
  }
}
```

### URL Endpoints

#### POST /api/url
Create a shortened URL (requires authentication)
```json
Request:
{
  "longUrl": "https://example.com/very/long/url/path",
  "expiresAt": "2024-12-31T23:59:59Z",  // optional
  "customCode": "my-short-code"         // optional
}

Response (201):
{
  "success": true,
  "shortUrl": "http://localhost:5000/abc123",
  "shortCode": "abc123",
  "originalUrl": "https://example.com/very/long/url/path"
}
```

#### GET /api/url
List all URLs created by authenticated user
```json
Request:
GET /api/url?sort=-createdAt&limit=100

Response (200):
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
```

#### GET /api/url/analytics/:shortCode
Get analytics for a specific short code (public)
```json
Response (200):
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://example.com/...",
    "createdAt": "2024-01-07T10:00:00Z",
    "clicks": 42,
    "lastAccessed": "2024-01-07T15:30:00Z",
    "expiresAt": null
  }
}
```

#### GET /:shortCode
Redirect to original URL (public)
```
Response: 302 (Found) - Redirects to original URL
Response: 404 (Not Found) - Short code doesn't exist
Response: 410 (Gone) - URL has expired
```

## Authentication Flow

### Request with JWT Token
All protected endpoints require an `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The frontend automatically includes this token in all axios requests via the request interceptor.

### Error Responses

#### 401 Unauthorized
- No token provided
- Invalid or expired token
```json
{
  "success": false,
  "message": "No token provided. Please log in."
}
```

#### 409 Conflict
- Custom short code already in use
```json
{
  "success": false,
  "error": "Custom short code already in use"
}
```

## Frontend Usage

### Login Flow
1. User clicks "Login" tab
2. Enters email and password
3. Submits form → `POST /api/auth/login`
4. Token stored in localStorage
5. Redirected to Create tab
6. User email displayed in header

### Create Short URL
1. User clicks "Create" tab
2. Enters long URL
3. Optionally sets expiration date or custom code
4. Submits form → `POST /api/url` (with JWT token)
5. Short URL displayed with copy button
6. Click count can be refreshed

### View Dashboard
1. User clicks "Dashboard" tab
2. Fetches all user URLs → `GET /api/url` (with JWT token)
3. Desktop: Table view with all columns
4. Mobile: Card-based layout
5. Can copy URLs to clipboard

### Logout
1. User clicks "Logout" button in header
2. Token removed from localStorage
3. Returned to login page

## Database Schemas

### User Schema
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  createdAt: Date
}
```

### URL Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  originalUrl: String,
  shortCode: String (unique, indexed),
  createdAt: Date (indexed),
  expiresAt: Date (optional, indexed),
  clicks: Number,
  lastAccessed: Date (optional, indexed)
}
```

## Security Features

1. **Password Hashing**: Bcrypt with 10 salt rounds
2. **JWT Tokens**: HS256 algorithm, 7-day expiration
3. **CORS**: Restricted to http://localhost:5173
4. **Rate Limiting**: 100 requests per 15 minutes on URL creation
5. **Protected Routes**: Auth middleware validates JWT on protected endpoints
6. **SQL/NoSQL Injection**: Protected via Mongoose/input validation
7. **XSS Protection**: React escapes content automatically

## Cleanup & Maintenance

### Expired URL Cleanup
- Runs daily at 2:00 AM UTC
- Deletes expired URLs from MongoDB and Redis cache
- Uses node-cron scheduler

## Testing the Implementation

### 1. Create New User
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Create Short URL (requires JWT)
```bash
curl -X POST http://localhost:5000/api/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"longUrl":"https://example.com/very/long/path"}'
```

### 4. List User URLs (requires JWT)
```bash
curl http://localhost:5000/api/url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### "Backend unreachable"
- Check if backend is running: `npm run dev` in url_shortner folder
- Verify PORT=5000 in .env

### "No token provided"
- Check localStorage for authToken: `localStorage.getItem('authToken')`
- Log out and log in again

### "Invalid or expired token"
- JWT tokens expire after 7 days
- Log out and log in to get a new token

### "Custom short code already in use"
- Choose a different custom code
- Check Dashboard to see existing URLs

### Database connection error
- Verify MongoDB is running
- Check MONGO_URI in .env

## Future Enhancements

- [ ] Email verification during signup
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] URL preview before redirect
- [ ] Bulk URL import
- [ ] QR code generation
- [ ] URL deletion by user
- [ ] Advanced analytics (graph visualization)
- [ ] API key support for programmatic access
- [ ] Custom domain support

## License

ISC

## Support

For issues or questions, please create a GitHub issue in the project repository.
=======
# URL Shortener with User Authentication

A production-ready URL shortener built with React + Vite (frontend) and Node.js/Express (backend), featuring user authentication, analytics tracking, URL expiration, and custom short codes.

## Features

### Authentication
- **User Registration**: Create accounts with email and password
- **User Login**: Secure JWT-based authentication
- **Protected Routes**: Only authenticated users can create and manage URLs
- **Password Security**: Passwords hashed with bcrypt (10 rounds)
- **JWT Tokens**: 7-day expiration, stored in browser localStorage

### URL Management
- **Create Short URLs**: Generate shortened URLs for long URLs
- **Custom Codes**: Optional custom short codes (3-64 characters, alphanumeric + dash/underscore)
- **URL Expiration**: Set optional expiration dates for temporary URLs
- **Analytics**: Track clicks and last access time per URL
- **Dashboard**: View all your created URLs with filters and sorting

### Advanced Features
- **Rate Limiting**: 100 requests per 15 minutes on URL creation
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Gradient UI**: Modern purple gradient interface
- **Copy to Clipboard**: One-click URL copying
- **Toast Notifications**: User-friendly feedback messages

## Project Structure

```
url_shortner/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   ├── redis.js           # Redis cache setup
│   │   └── jwt.js             # JWT token generation/verification
│   ├── controllers/
│   │   ├── auth.controller.js # Login/signup/profile handlers
│   │   └── url.controller.js  # URL creation/analytics/listing
│   ├── models/
│   │   ├── user.model.js      # User schema (email, password)
│   │   └── url.model.js       # URL schema with userId reference
│   ├── middleware/
│   │   ├── auth.js            # JWT verification middleware
│   │   └── rateLimiter.js     # Rate limiting middleware
│   ├── routes/
│   │   ├── auth.routes.js     # Auth endpoints
│   │   └── url.routes.js      # URL endpoints (protected)
│   ├── services/
│   │   ├── url.service.js     # URL shortening logic
│   │   └── cleanup.service.js # Expired URL cleanup
│   ├── utils/
│   │   ├── base62.js          # Base62 encoding
│   │   └── scheduler.js       # Background job scheduler
│   └── app.js                 # Express app setup
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global auth state
│   │   ├── components/
│   │   │   ├── Login.jsx           # Login form
│   │   │   ├── Signup.jsx          # Registration form
│   │   │   ├── ProtectedRoute.jsx  # Protected route wrapper
│   │   │   └── Dashboard.jsx       # URL listing dashboard
│   │   ├── App.jsx                 # Main app component
│   │   ├── axios.js                # HTTP client with auth interceptor
│   │   ├── App.css                 # Global styles
│   │   └── main.jsx                # React entry point
│   └── package.json
├── package.json                # Backend dependencies
├── .env                        # Environment variables
└── README.md                   # This file
```

## Installation & Setup

### Backend Setup

1. **Install Dependencies**
```bash
cd url_shortner
npm install
```

2. **Configure Environment Variables**
```bash
# .env file
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/urlshortener
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

3. **Start Backend Server**
```bash
npm run dev
```
Backend runs at `http://localhost:5000`

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Start Frontend Dev Server**
```bash
npm run dev
```
Frontend runs at `http://localhost:5173`

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/signup
Create a new user account
```json
Request:
{
  "email": "user@example.com",
  "password": "securepass123"
}

Response (201):
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

#### POST /api/auth/login
Login with email and password
```json
Request:
{
  "email": "user@example.com",
  "password": "securepass123"
}

Response (200):
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

#### GET /api/auth/profile
Get current user profile (requires auth)
```json
Response (200):
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "createdAt": "2024-01-07T10:30:00Z"
  }
}
```

### URL Endpoints

#### POST /api/url
Create a shortened URL (requires authentication)
```json
Request:
{
  "longUrl": "https://example.com/very/long/url/path",
  "expiresAt": "2024-12-31T23:59:59Z",  // optional
  "customCode": "my-short-code"         // optional
}

Response (201):
{
  "success": true,
  "shortUrl": "http://localhost:5000/abc123",
  "shortCode": "abc123",
  "originalUrl": "https://example.com/very/long/url/path"
}
```

#### GET /api/url
List all URLs created by authenticated user
```json
Request:
GET /api/url?sort=-createdAt&limit=100

Response (200):
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
```

#### GET /api/url/analytics/:shortCode
Get analytics for a specific short code (public)
```json
Response (200):
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://example.com/...",
    "createdAt": "2024-01-07T10:00:00Z",
    "clicks": 42,
    "lastAccessed": "2024-01-07T15:30:00Z",
    "expiresAt": null
  }
}
```

#### GET /:shortCode
Redirect to original URL (public)
```
Response: 302 (Found) - Redirects to original URL
Response: 404 (Not Found) - Short code doesn't exist
Response: 410 (Gone) - URL has expired
```

## Authentication Flow

### Request with JWT Token
All protected endpoints require an `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The frontend automatically includes this token in all axios requests via the request interceptor.

### Error Responses

#### 401 Unauthorized
- No token provided
- Invalid or expired token
```json
{
  "success": false,
  "message": "No token provided. Please log in."
}
```

#### 409 Conflict
- Custom short code already in use
```json
{
  "success": false,
  "error": "Custom short code already in use"
}
```

## Frontend Usage

### Login Flow
1. User clicks "Login" tab
2. Enters email and password
3. Submits form → `POST /api/auth/login`
4. Token stored in localStorage
5. Redirected to Create tab
6. User email displayed in header

### Create Short URL
1. User clicks "Create" tab
2. Enters long URL
3. Optionally sets expiration date or custom code
4. Submits form → `POST /api/url` (with JWT token)
5. Short URL displayed with copy button
6. Click count can be refreshed

### View Dashboard
1. User clicks "Dashboard" tab
2. Fetches all user URLs → `GET /api/url` (with JWT token)
3. Desktop: Table view with all columns
4. Mobile: Card-based layout
5. Can copy URLs to clipboard

### Logout
1. User clicks "Logout" button in header
2. Token removed from localStorage
3. Returned to login page

## Database Schemas

### User Schema
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  createdAt: Date
}
```

### URL Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  originalUrl: String,
  shortCode: String (unique, indexed),
  createdAt: Date (indexed),
  expiresAt: Date (optional, indexed),
  clicks: Number,
  lastAccessed: Date (optional, indexed)
}
```

## Security Features

1. **Password Hashing**: Bcrypt with 10 salt rounds
2. **JWT Tokens**: HS256 algorithm, 7-day expiration
3. **CORS**: Restricted to http://localhost:5173
4. **Rate Limiting**: 100 requests per 15 minutes on URL creation
5. **Protected Routes**: Auth middleware validates JWT on protected endpoints
6. **SQL/NoSQL Injection**: Protected via Mongoose/input validation
7. **XSS Protection**: React escapes content automatically

## Cleanup & Maintenance

### Expired URL Cleanup
- Runs daily at 2:00 AM UTC
- Deletes expired URLs from MongoDB and Redis cache
- Uses node-cron scheduler

## Testing the Implementation

### 1. Create New User
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Create Short URL (requires JWT)
```bash
curl -X POST http://localhost:5000/api/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"longUrl":"https://example.com/very/long/path"}'
```

### 4. List User URLs (requires JWT)
```bash
curl http://localhost:5000/api/url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### "Backend unreachable"
- Check if backend is running: `npm run dev` in url_shortner folder
- Verify PORT=5000 in .env

### "No token provided"
- Check localStorage for authToken: `localStorage.getItem('authToken')`
- Log out and log in again

### "Invalid or expired token"
- JWT tokens expire after 7 days
- Log out and log in to get a new token

### "Custom short code already in use"
- Choose a different custom code
- Check Dashboard to see existing URLs

### Database connection error
- Verify MongoDB is running
- Check MONGO_URI in .env

## Future Enhancements

- [ ] Email verification during signup
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] URL preview before redirect
- [ ] Bulk URL import
- [ ] QR code generation
- [ ] URL deletion by user
- [ ] Advanced analytics (graph visualization)
- [ ] API key support for programmatic access
- [ ] Custom domain support

## License

ISC

## Support

For issues or questions, please create a GitHub issue in the project repository.
>>>>>>> f8a0985c31c00fc45f47ca7de161e97febc64ff6
