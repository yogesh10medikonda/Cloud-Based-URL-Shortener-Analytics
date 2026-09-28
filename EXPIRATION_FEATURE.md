<<<<<<< HEAD
# URL Expiration Feature - Complete Implementation

## Overview
URL expiration is **fully implemented** across backend, frontend, and automated cleanup.

---

## How It Works

### 1. Backend Model (`src/models/url.model.js`)
- **Field:** `expiresAt` (Date, optional, indexed)
- **Default:** `null` (no expiration)
- **Index:** Yes (enables efficient cleanup queries)

```javascript
expiresAt: {
  type: Date,
  default: null,
  index: true
}
```

---

### 2. Creating URLs with Expiration

#### API Endpoint
**POST** `http://localhost:5000/api/url`

#### Request Body
```json
{
  "longUrl": "https://example.com",
  "expiresAt": "2026-01-07T15:00:00Z"
}
```

#### PowerShell Example
```powershell
# Expires in 1 hour
$expirationTime = (Get-Date).AddHours(1).ToString('o')
$body = @{
  longUrl = 'https://example.com'
  expiresAt = $expirationTime
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url `
  -ContentType 'application/json' -Body $body
```

#### Validation
- Expiration date must be in the **future**
- Invalid date format returns **400 Bad Request**
- Past date returns **400 Bad Request**

---

### 3. Redirect Logic (`src/services/url.service.js`)

When a redirect is requested:

```
1. Check Redis cache
   ├─ If hit and not expired → Return URL
   └─ If hit but expired → Return { expired: true }

2. If cache miss, fetch from MongoDB
   ├─ Check if document exists
   │  └─ If not → Return null (404)
   │
   └─ Check if expired
      ├─ If expiresAt < current time → Return { expired: true }
      └─ If valid → Increment clicks, return { originalUrl }

3. Cache result in Redis (with TTL)
```

---

### 4. Response Handling (`src/controllers/url.controller.js`)

#### Valid URL (Redirect)
- **Status:** 302 (Found)
- **Action:** Redirect to original URL
- **Clicks:** Incremented

#### Expired URL
- **Status:** 410 (Gone)
- **Response:**
  ```json
  {
    "success": false,
    "error": "URL has expired"
  }
  ```

#### Not Found URL
- **Status:** 404 (Not Found)
- **Response:**
  ```json
  {
    "success": false,
    "error": "Short URL not found"
  }
  ```

---

### 5. Automated Cleanup (`src/services/cleanup.service.js` + `src/utils/scheduler.js`)

#### Schedule
- **Frequency:** Daily at **2:00 AM UTC**
- **Configurable:** Edit cron expression in `src/utils/scheduler.js`

#### What It Does
1. Finds all expired URLs (where `expiresAt < now`)
2. Removes from MongoDB
3. Removes from Redis cache
4. Logs cleanup statistics

#### Example Log Output
```
🕐 Starting scheduled cleanup of expired URLs...
📊 Cleanup Statistics:
   Total expired URLs found: 5
   Successfully deleted from MongoDB: 5
   Successfully deleted from Redis: 5
   Cleanup completed in 45ms
✅ Scheduled cleanup completed successfully
```

#### Cron Expression Examples
```
'0 2 * * *'   → Daily at 2:00 AM UTC (default)
'0 * * * *'   → Every hour
'0 */6 * * *' → Every 6 hours
'0 0 * * *'   → Every day at midnight UTC
'0 0 * * 0'   → Every Sunday at midnight UTC
```

---

## Frontend Integration (`frontend/src/App.jsx`)

The frontend **displays error messages** when an expired URL is accessed:

### Error Message
```
"URL has expired"
```

### User Flow
1. User clicks a short URL in browser
2. If expired → Browser receives 410 response
3. Frontend can display error or redirect to a "Expired" page

---

## Testing Expiration

### Create Expiring URL (5 seconds)
```powershell
$expirationTime = (Get-Date).AddSeconds(5).ToString('o')
$body = @{
  longUrl = 'https://example.com/temporary'
  expiresAt = $expirationTime
} | ConvertTo-Json

$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url `
  -ContentType 'application/json' -Body $body

$tempShortCode = $res.shortCode
Write-Output "Temp Short Code: $tempShortCode"
```

### Test Before Expiration
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/$tempShortCode" `
  -MaximumRedirection 0 -ErrorAction SilentlyContinue
```
**Expected:** HTTP 302 redirect

### Wait for Expiration
```powershell
Start-Sleep -Seconds 6
```

### Test After Expiration
```powershell
try {
  Invoke-WebRequest -Uri "http://localhost:5000/$tempShortCode" `
    -MaximumRedirection 0 -ErrorAction Stop
} catch {
  Write-Output "Status: $($_.Exception.Response.StatusCode.Value__)"
  ($_.Exception.Response | ConvertFrom-Json) | ConvertTo-Json
}
```
**Expected:** HTTP 410 with `{ "error": "URL has expired" }`

---

## Architecture Diagram

```
POST /api/url
  ↓
[Controller] Validates expiresAt
  ↓
[Service] Creates URL with expiresAt date
  ↓
[MongoDB] Stores with indexed expiresAt field
  ↓
═══════════════════════════════════════════════

GET /:shortCode
  ↓
[Service] Checks expiry
  ├─ If expired → Return { expired: true }
  └─ If valid → Increment clicks
  ↓
[Controller]
  ├─ Expired → Return 410 Gone
  ├─ Valid → Redirect 302
  └─ Not Found → Return 404
  
═══════════════════════════════════════════════

Scheduled Cleanup (Daily 2:00 AM UTC)
  ↓
[Cleanup Service] Finds expiresAt < now
  ↓
Delete from MongoDB & Redis cache
  ↓
Log statistics
```

---

## Configuration

### Change Cleanup Schedule

Edit `src/utils/scheduler.js`, line ~16:

```javascript
// Before
cron.schedule('0 2 * * *', async () => {

// After (every hour)
cron.schedule('0 * * * *', async () => {
```

### Change Cleanup Timezone

Edit `src/utils/scheduler.js`, line ~34:

```javascript
// Before
timezone: 'UTC'

// After (use system timezone)
timezone: 'America/New_York'
```

---

## Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| Create with expiration | ✅ Done | POST accepts `expiresAt` |
| Validate future date | ✅ Done | Rejects past dates |
| Check on redirect | ✅ Done | Returns 410 if expired |
| Cache-aware | ✅ Done | Checks expiry on cache hit |
| Analytics aware | ✅ Done | Includes `expiresAt` in response |
| Automated cleanup | ✅ Done | Daily at 2:00 AM UTC |
| Redis cleanup | ✅ Done | Removes expired from cache |
| Logging | ✅ Done | Logs cleanup stats |

---

## Related Features

- **Clicks Tracking:** Increments on every redirect (expired URLs don't increment)
- **Custom Codes:** Works with both auto-generated and custom short codes
- **Analytics:** GET `/api/url/analytics/:shortCode` returns `expiresAt` field
- **Rate Limiting:** Applied to creation (prevents abuse)

---

## Next Steps

1. **Test expiration** using the commands in TEST_GUIDE.md (steps 8-10)
2. **Monitor cleanup logs** in backend console at 2:00 AM UTC
3. **(Optional)** Add notification system (email before expiration, etc.)
4. **(Optional)** Add UI to set expiration when creating URL
=======
# URL Expiration Feature - Complete Implementation

## Overview
URL expiration is **fully implemented** across backend, frontend, and automated cleanup.

---

## How It Works

### 1. Backend Model (`src/models/url.model.js`)
- **Field:** `expiresAt` (Date, optional, indexed)
- **Default:** `null` (no expiration)
- **Index:** Yes (enables efficient cleanup queries)

```javascript
expiresAt: {
  type: Date,
  default: null,
  index: true
}
```

---

### 2. Creating URLs with Expiration

#### API Endpoint
**POST** `http://localhost:5000/api/url`

#### Request Body
```json
{
  "longUrl": "https://example.com",
  "expiresAt": "2026-01-07T15:00:00Z"
}
```

#### PowerShell Example
```powershell
# Expires in 1 hour
$expirationTime = (Get-Date).AddHours(1).ToString('o')
$body = @{
  longUrl = 'https://example.com'
  expiresAt = $expirationTime
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url `
  -ContentType 'application/json' -Body $body
```

#### Validation
- Expiration date must be in the **future**
- Invalid date format returns **400 Bad Request**
- Past date returns **400 Bad Request**

---

### 3. Redirect Logic (`src/services/url.service.js`)

When a redirect is requested:

```
1. Check Redis cache
   ├─ If hit and not expired → Return URL
   └─ If hit but expired → Return { expired: true }

2. If cache miss, fetch from MongoDB
   ├─ Check if document exists
   │  └─ If not → Return null (404)
   │
   └─ Check if expired
      ├─ If expiresAt < current time → Return { expired: true }
      └─ If valid → Increment clicks, return { originalUrl }

3. Cache result in Redis (with TTL)
```

---

### 4. Response Handling (`src/controllers/url.controller.js`)

#### Valid URL (Redirect)
- **Status:** 302 (Found)
- **Action:** Redirect to original URL
- **Clicks:** Incremented

#### Expired URL
- **Status:** 410 (Gone)
- **Response:**
  ```json
  {
    "success": false,
    "error": "URL has expired"
  }
  ```

#### Not Found URL
- **Status:** 404 (Not Found)
- **Response:**
  ```json
  {
    "success": false,
    "error": "Short URL not found"
  }
  ```

---

### 5. Automated Cleanup (`src/services/cleanup.service.js` + `src/utils/scheduler.js`)

#### Schedule
- **Frequency:** Daily at **2:00 AM UTC**
- **Configurable:** Edit cron expression in `src/utils/scheduler.js`

#### What It Does
1. Finds all expired URLs (where `expiresAt < now`)
2. Removes from MongoDB
3. Removes from Redis cache
4. Logs cleanup statistics

#### Example Log Output
```
🕐 Starting scheduled cleanup of expired URLs...
📊 Cleanup Statistics:
   Total expired URLs found: 5
   Successfully deleted from MongoDB: 5
   Successfully deleted from Redis: 5
   Cleanup completed in 45ms
✅ Scheduled cleanup completed successfully
```

#### Cron Expression Examples
```
'0 2 * * *'   → Daily at 2:00 AM UTC (default)
'0 * * * *'   → Every hour
'0 */6 * * *' → Every 6 hours
'0 0 * * *'   → Every day at midnight UTC
'0 0 * * 0'   → Every Sunday at midnight UTC
```

---

## Frontend Integration (`frontend/src/App.jsx`)

The frontend **displays error messages** when an expired URL is accessed:

### Error Message
```
"URL has expired"
```

### User Flow
1. User clicks a short URL in browser
2. If expired → Browser receives 410 response
3. Frontend can display error or redirect to a "Expired" page

---

## Testing Expiration

### Create Expiring URL (5 seconds)
```powershell
$expirationTime = (Get-Date).AddSeconds(5).ToString('o')
$body = @{
  longUrl = 'https://example.com/temporary'
  expiresAt = $expirationTime
} | ConvertTo-Json

$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/url `
  -ContentType 'application/json' -Body $body

$tempShortCode = $res.shortCode
Write-Output "Temp Short Code: $tempShortCode"
```

### Test Before Expiration
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/$tempShortCode" `
  -MaximumRedirection 0 -ErrorAction SilentlyContinue
```
**Expected:** HTTP 302 redirect

### Wait for Expiration
```powershell
Start-Sleep -Seconds 6
```

### Test After Expiration
```powershell
try {
  Invoke-WebRequest -Uri "http://localhost:5000/$tempShortCode" `
    -MaximumRedirection 0 -ErrorAction Stop
} catch {
  Write-Output "Status: $($_.Exception.Response.StatusCode.Value__)"
  ($_.Exception.Response | ConvertFrom-Json) | ConvertTo-Json
}
```
**Expected:** HTTP 410 with `{ "error": "URL has expired" }`

---

## Architecture Diagram

```
POST /api/url
  ↓
[Controller] Validates expiresAt
  ↓
[Service] Creates URL with expiresAt date
  ↓
[MongoDB] Stores with indexed expiresAt field
  ↓
═══════════════════════════════════════════════

GET /:shortCode
  ↓
[Service] Checks expiry
  ├─ If expired → Return { expired: true }
  └─ If valid → Increment clicks
  ↓
[Controller]
  ├─ Expired → Return 410 Gone
  ├─ Valid → Redirect 302
  └─ Not Found → Return 404
  
═══════════════════════════════════════════════

Scheduled Cleanup (Daily 2:00 AM UTC)
  ↓
[Cleanup Service] Finds expiresAt < now
  ↓
Delete from MongoDB & Redis cache
  ↓
Log statistics
```

---

## Configuration

### Change Cleanup Schedule

Edit `src/utils/scheduler.js`, line ~16:

```javascript
// Before
cron.schedule('0 2 * * *', async () => {

// After (every hour)
cron.schedule('0 * * * *', async () => {
```

### Change Cleanup Timezone

Edit `src/utils/scheduler.js`, line ~34:

```javascript
// Before
timezone: 'UTC'

// After (use system timezone)
timezone: 'America/New_York'
```

---

## Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| Create with expiration | ✅ Done | POST accepts `expiresAt` |
| Validate future date | ✅ Done | Rejects past dates |
| Check on redirect | ✅ Done | Returns 410 if expired |
| Cache-aware | ✅ Done | Checks expiry on cache hit |
| Analytics aware | ✅ Done | Includes `expiresAt` in response |
| Automated cleanup | ✅ Done | Daily at 2:00 AM UTC |
| Redis cleanup | ✅ Done | Removes expired from cache |
| Logging | ✅ Done | Logs cleanup stats |

---

## Related Features

- **Clicks Tracking:** Increments on every redirect (expired URLs don't increment)
- **Custom Codes:** Works with both auto-generated and custom short codes
- **Analytics:** GET `/api/url/analytics/:shortCode` returns `expiresAt` field
- **Rate Limiting:** Applied to creation (prevents abuse)

---

## Next Steps

1. **Test expiration** using the commands in TEST_GUIDE.md (steps 8-10)
2. **Monitor cleanup logs** in backend console at 2:00 AM UTC
3. **(Optional)** Add notification system (email before expiration, etc.)
4. **(Optional)** Add UI to set expiration when creating URL
>>>>>>> f8a0985c31c00fc45f47ca7de161e97febc64ff6
