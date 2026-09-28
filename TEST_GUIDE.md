<<<<<<< HEAD
# URL Shortener - Complete Test Guide

This guide walks through testing all implemented features end-to-end.

## Prerequisites

Ensure both backend and frontend are running:

### Terminal 1: Start Backend
```powershell
cd C:\Users\BHAVANA\url_shortner
npm install
npm run dev
```

Wait for logs:
- ✅ Connected to MongoDB successfully
- ✅ Scheduler initialized
- Server is running on port 5000

### Terminal 2: Start Frontend (Vite Dev Server)
```powershell
cd C:\Users\BHAVANA\url_shortner\frontend
npm install
npm run dev
```

Wait for logs showing dev server at `http://localhost:5173`

---

## Feature Tests

### 1. Backend Health Check
**Endpoint:** `GET http://localhost:5000/`

**Command:**
```powershell
Invoke-RestMethod http://localhost:5000/ | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "message": "Backend is running"
}
```

---

### 2. Create Short URL (Auto-Generated Code)
**Endpoint:** `POST http://localhost:5000/api/url`

**Command:**
```powershell
$body = @{ longUrl = 'https://www.example.com/very/long/url/path?query=value' } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url -ContentType 'application/json' -Body $body -TimeoutSec 10
$res | ConvertTo-Json -Depth 5
$shortCode = $res.shortCode
Write-Output "Short Code: $shortCode"
```

**Expected Response:**
```json
{
  "success": true,
  "shortUrl": "http://localhost:5000/abc123",
  "shortCode": "abc123",
  "originalUrl": "https://www.example.com/very/long/url/path?query=value"
}
```

**Save the `$shortCode` for next tests.**

---

### 3. Fetch Analytics (Before Redirect)
**Endpoint:** `GET http://localhost:5000/api/url/analytics/:shortCode`

**Command (using saved shortCode):**
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/url/analytics/$shortCode" -TimeoutSec 10 | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://www.example.com/very/long/url/path?query=value",
    "createdAt": "2026-01-07T12:30:45.123Z",
    "clicks": 0,
    "lastAccessed": null,
    "expiresAt": null
  }
}
```

**Note:** `clicks` should be 0, `lastAccessed` should be null.

---

### 4. Test Redirect (Increment Clicks)
**Endpoint:** `GET http://localhost:5000/:shortCode`

**Command:**
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/$shortCode" -MaximumRedirection 0 -ErrorAction SilentlyContinue
```

**Expected:** HTTP 302 redirect to the original URL.

---

### 5. Fetch Analytics (After Redirect)
**Command (same as step 3):**
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/url/analytics/$shortCode" -TimeoutSec 10 | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://www.example.com/very/long/url/path?query=value",
    "createdAt": "2026-01-07T12:30:45.123Z",
    "clicks": 1,
    "lastAccessed": "2026-01-07T12:31:10.456Z",
    "expiresAt": null
  }
}
```

**Note:** `clicks` should be 1, `lastAccessed` should be set.

---

### 6. Create Short URL with Custom Code
**Endpoint:** `POST http://localhost:5000/api/url`

**Command:**
```powershell
$body = @{ longUrl = 'https://google.com'; customCode = 'mysearch' } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url -ContentType 'application/json' -Body $body -TimeoutSec 10
$res | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "shortUrl": "http://localhost:5000/mysearch",
  "shortCode": "mysearch",
  "originalUrl": "https://google.com"
}
```

---

### 7. Try Duplicate Custom Code (Should Fail)
**Command (use same custom code as step 6):**
```powershell
$body = @{ longUrl = 'https://bing.com'; customCode = 'mysearch' } | ConvertTo-Json
try {
  $res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url -ContentType 'application/json' -Body $body -TimeoutSec 10
} catch {
  Write-Output "Status Code: $($_.Exception.Response.StatusCode.Value__)"
  Write-Output "Response:"
  ($_.Exception.Response | ConvertFrom-Json) | ConvertTo-Json -Depth 5
}
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "error": "Custom short code already in use"
}
```

---

### 8. Create Short URL with Expiration
**Endpoint:** `POST http://localhost:5000/api/url`

**Command:**
```powershell
# Expires in 5 seconds
$expirationTime = (Get-Date).AddSeconds(5).ToString('o')
$body = @{ longUrl = 'https://example.com/temporary'; expiresAt = $expirationTime } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url -ContentType 'application/json' -Body $body -TimeoutSec 10
$res | ConvertTo-Json -Depth 5
$tempShortCode = $res.shortCode
Write-Output "Temp Short Code: $tempShortCode"
```

**Expected Response:**
```json
{
  "success": true,
  "shortUrl": "http://localhost:5000/temp1234",
  "shortCode": "temp1234",
  "originalUrl": "https://example.com/temporary"
}
```

**Save the `$tempShortCode` for next test.**

---

### 9. Test Expired URL (Before Expiration)
**Command:**
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/$tempShortCode" -MaximumRedirection 0 -ErrorAction SilentlyContinue
```

**Expected:** HTTP 302 redirect (URL not yet expired).

---

### 10. Test Expired URL (After Expiration)
**Command (wait 6+ seconds, then):**
```powershell
Start-Sleep -Seconds 6

try {
  Invoke-WebRequest -Uri "http://localhost:5000/$tempShortCode" -MaximumRedirection 0 -ErrorAction Stop
} catch {
  Write-Output "Status Code: $($_.Exception.Response.StatusCode.Value__)"
  Write-Output "Response:"
  ($_.Exception.Response | ConvertFrom-Json) | ConvertTo-Json -Depth 5
}
```

**Expected Response (410 Gone):**
```json
{
  "success": false,
  "error": "URL has expired"
}
```

---

### 11. Frontend Test - Create URL via UI

1. Open browser and navigate to `http://localhost:5173`
2. Enter a long URL in the input field (e.g., `https://github.com/search?q=url-shortener`)
3. Click "Shorten URL" button
4. Verify:
   - ✅ Short URL appears below
   - ✅ Clicks counter shows "0" or "—"
   - ✅ "Refresh" button is visible

5. Click the short URL (opens in new tab) — you should be redirected to the original URL
6. Return to frontend and click "Refresh" button
7. Verify:
   - ✅ Clicks counter increments to "1"

---

### 12. Frontend Test - Error Handling

**Test 1: Stop Backend, Try Create URL**
1. Stop the backend server (Ctrl+C in Terminal 1)
2. In frontend, try to shorten a URL
3. Verify:
   - ✅ Error message appears: "Could not reach backend at http://localhost:5000"

**Test 2: Invalid URL Format**
1. Start backend again
2. In frontend, enter: `not-a-url`
3. Click "Shorten URL"
4. Verify:
   - ✅ Error message: "Please enter a valid http(s) URL (include https://)"

---

## Summary Checklist

- [ ] Backend health check returns message
- [ ] Auto-generated short code works
- [ ] Analytics show correct initial values (0 clicks, null lastAccessed)
- [ ] Redirect increments clicks
- [ ] Analytics show updated values after redirect
- [ ] Custom code creation works
- [ ] Duplicate custom code returns 409 error
- [ ] Expiring URL created successfully
- [ ] Non-expired URL redirects (302)
- [ ] Expired URL returns 410 error
- [ ] Frontend creates URLs via UI
- [ ] Frontend displays clicks with refresh button
- [ ] Frontend shows error when backend unreachable
- [ ] Frontend validates URL format

---

## Troubleshooting

### Backend won't start (port 5000 already in use)
```powershell
$pid = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }
```

### Frontend won't start (port 5173 already in use)
```powershell
$pid = (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }
```

### MongoDB not connected
Ensure MongoDB is running locally or check `.env` for correct `MONGODB_URI`.

### CORS errors in browser console
- Confirm backend has CORS enabled for `http://localhost:5173`
- Check `src/app.js` line with `cors()` configuration

---

## Next Steps (Optional Features)

After verifying all features work:
1. Add rate limiting on URL creation (prevent abuse)
2. Add Swagger/OpenAPI documentation
3. Add Winston logging for production
4. Deploy to cloud (Heroku, Railway, etc.)
=======
# URL Shortener - Complete Test Guide

This guide walks through testing all implemented features end-to-end.

## Prerequisites

Ensure both backend and frontend are running:

### Terminal 1: Start Backend
```powershell
cd C:\Users\BHAVANA\url_shortner
npm install
npm run dev
```

Wait for logs:
- ✅ Connected to MongoDB successfully
- ✅ Scheduler initialized
- Server is running on port 5000

### Terminal 2: Start Frontend (Vite Dev Server)
```powershell
cd C:\Users\BHAVANA\url_shortner\frontend
npm install
npm run dev
```

Wait for logs showing dev server at `http://localhost:5173`

---

## Feature Tests

### 1. Backend Health Check
**Endpoint:** `GET http://localhost:5000/`

**Command:**
```powershell
Invoke-RestMethod http://localhost:5000/ | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "message": "Backend is running"
}
```

---

### 2. Create Short URL (Auto-Generated Code)
**Endpoint:** `POST http://localhost:5000/api/url`

**Command:**
```powershell
$body = @{ longUrl = 'https://www.example.com/very/long/url/path?query=value' } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url -ContentType 'application/json' -Body $body -TimeoutSec 10
$res | ConvertTo-Json -Depth 5
$shortCode = $res.shortCode
Write-Output "Short Code: $shortCode"
```

**Expected Response:**
```json
{
  "success": true,
  "shortUrl": "http://localhost:5000/abc123",
  "shortCode": "abc123",
  "originalUrl": "https://www.example.com/very/long/url/path?query=value"
}
```

**Save the `$shortCode` for next tests.**

---

### 3. Fetch Analytics (Before Redirect)
**Endpoint:** `GET http://localhost:5000/api/url/analytics/:shortCode`

**Command (using saved shortCode):**
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/url/analytics/$shortCode" -TimeoutSec 10 | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://www.example.com/very/long/url/path?query=value",
    "createdAt": "2026-01-07T12:30:45.123Z",
    "clicks": 0,
    "lastAccessed": null,
    "expiresAt": null
  }
}
```

**Note:** `clicks` should be 0, `lastAccessed` should be null.

---

### 4. Test Redirect (Increment Clicks)
**Endpoint:** `GET http://localhost:5000/:shortCode`

**Command:**
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/$shortCode" -MaximumRedirection 0 -ErrorAction SilentlyContinue
```

**Expected:** HTTP 302 redirect to the original URL.

---

### 5. Fetch Analytics (After Redirect)
**Command (same as step 3):**
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/url/analytics/$shortCode" -TimeoutSec 10 | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://www.example.com/very/long/url/path?query=value",
    "createdAt": "2026-01-07T12:30:45.123Z",
    "clicks": 1,
    "lastAccessed": "2026-01-07T12:31:10.456Z",
    "expiresAt": null
  }
}
```

**Note:** `clicks` should be 1, `lastAccessed` should be set.

---

### 6. Create Short URL with Custom Code
**Endpoint:** `POST http://localhost:5000/api/url`

**Command:**
```powershell
$body = @{ longUrl = 'https://google.com'; customCode = 'mysearch' } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url -ContentType 'application/json' -Body $body -TimeoutSec 10
$res | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "shortUrl": "http://localhost:5000/mysearch",
  "shortCode": "mysearch",
  "originalUrl": "https://google.com"
}
```

---

### 7. Try Duplicate Custom Code (Should Fail)
**Command (use same custom code as step 6):**
```powershell
$body = @{ longUrl = 'https://bing.com'; customCode = 'mysearch' } | ConvertTo-Json
try {
  $res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url -ContentType 'application/json' -Body $body -TimeoutSec 10
} catch {
  Write-Output "Status Code: $($_.Exception.Response.StatusCode.Value__)"
  Write-Output "Response:"
  ($_.Exception.Response | ConvertFrom-Json) | ConvertTo-Json -Depth 5
}
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "error": "Custom short code already in use"
}
```

---

### 8. Create Short URL with Expiration
**Endpoint:** `POST http://localhost:5000/api/url`

**Command:**
```powershell
# Expires in 5 seconds
$expirationTime = (Get-Date).AddSeconds(5).ToString('o')
$body = @{ longUrl = 'https://example.com/temporary'; expiresAt = $expirationTime } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url -ContentType 'application/json' -Body $body -TimeoutSec 10
$res | ConvertTo-Json -Depth 5
$tempShortCode = $res.shortCode
Write-Output "Temp Short Code: $tempShortCode"
```

**Expected Response:**
```json
{
  "success": true,
  "shortUrl": "http://localhost:5000/temp1234",
  "shortCode": "temp1234",
  "originalUrl": "https://example.com/temporary"
}
```

**Save the `$tempShortCode` for next test.**

---

### 9. Test Expired URL (Before Expiration)
**Command:**
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/$tempShortCode" -MaximumRedirection 0 -ErrorAction SilentlyContinue
```

**Expected:** HTTP 302 redirect (URL not yet expired).

---

### 10. Test Expired URL (After Expiration)
**Command (wait 6+ seconds, then):**
```powershell
Start-Sleep -Seconds 6

try {
  Invoke-WebRequest -Uri "http://localhost:5000/$tempShortCode" -MaximumRedirection 0 -ErrorAction Stop
} catch {
  Write-Output "Status Code: $($_.Exception.Response.StatusCode.Value__)"
  Write-Output "Response:"
  ($_.Exception.Response | ConvertFrom-Json) | ConvertTo-Json -Depth 5
}
```

**Expected Response (410 Gone):**
```json
{
  "success": false,
  "error": "URL has expired"
}
```

---

### 11. Frontend Test - Create URL via UI

1. Open browser and navigate to `http://localhost:5173`
2. Enter a long URL in the input field (e.g., `https://github.com/search?q=url-shortener`)
3. Click "Shorten URL" button
4. Verify:
   - ✅ Short URL appears below
   - ✅ Clicks counter shows "0" or "—"
   - ✅ "Refresh" button is visible

5. Click the short URL (opens in new tab) — you should be redirected to the original URL
6. Return to frontend and click "Refresh" button
7. Verify:
   - ✅ Clicks counter increments to "1"

---

### 12. Frontend Test - Error Handling

**Test 1: Stop Backend, Try Create URL**
1. Stop the backend server (Ctrl+C in Terminal 1)
2. In frontend, try to shorten a URL
3. Verify:
   - ✅ Error message appears: "Could not reach backend at http://localhost:5000"

**Test 2: Invalid URL Format**
1. Start backend again
2. In frontend, enter: `not-a-url`
3. Click "Shorten URL"
4. Verify:
   - ✅ Error message: "Please enter a valid http(s) URL (include https://)"

---

## Summary Checklist

- [ ] Backend health check returns message
- [ ] Auto-generated short code works
- [ ] Analytics show correct initial values (0 clicks, null lastAccessed)
- [ ] Redirect increments clicks
- [ ] Analytics show updated values after redirect
- [ ] Custom code creation works
- [ ] Duplicate custom code returns 409 error
- [ ] Expiring URL created successfully
- [ ] Non-expired URL redirects (302)
- [ ] Expired URL returns 410 error
- [ ] Frontend creates URLs via UI
- [ ] Frontend displays clicks with refresh button
- [ ] Frontend shows error when backend unreachable
- [ ] Frontend validates URL format

---

## Troubleshooting

### Backend won't start (port 5000 already in use)
```powershell
$pid = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }
```

### Frontend won't start (port 5173 already in use)
```powershell
$pid = (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }
```

### MongoDB not connected
Ensure MongoDB is running locally or check `.env` for correct `MONGODB_URI`.

### CORS errors in browser console
- Confirm backend has CORS enabled for `http://localhost:5173`
- Check `src/app.js` line with `cors()` configuration

---

## Next Steps (Optional Features)

After verifying all features work:
1. Add rate limiting on URL creation (prevent abuse)
2. Add Swagger/OpenAPI documentation
3. Add Winston logging for production
4. Deploy to cloud (Heroku, Railway, etc.)
>>>>>>> f8a0985c31c00fc45f47ca7de161e97febc64ff6
