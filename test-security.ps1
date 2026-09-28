<<<<<<< HEAD
# Security Testing Script for URL Shortener
# Tests rate limiting, SSRF prevention, input validation, and error handling

Write-Host "=== URL Shortener Security Testing ===" -ForegroundColor Cyan
Write-Host ""

# Function to make API calls
function Call-API($method, $endpoint, $body = $null, $token = $null) {
    $headers = @{"Content-Type" = "application/json"}
    if ($token) {
        $headers["Authorization"] = "Bearer $token"
    }
    
    $params = @{
        Uri = "http://localhost:5000$endpoint"
        Method = $method
        Headers = $headers
        UseBasicParsing = $true
        ErrorAction = "SilentlyContinue"
    }
    
    if ($body) {
        $params["Body"] = $body | ConvertTo-Json
    }
    
    try {
        $response = Invoke-WebRequest @params
        return @{
            StatusCode = $response.StatusCode
            Content = $response.Content | ConvertFrom-Json
            Success = $true
        }
    }
    catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $stream = $errorResponse.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd()
            return @{
                StatusCode = $errorResponse.StatusCode
                Content = $content | ConvertFrom-Json -ErrorAction SilentlyContinue
                Success = $false
            }
        }
        return @{
            StatusCode = "Error"
            Content = $_.Exception.Message
            Success = $false
        }
    }
}

# 1. SIGNUP TEST
Write-Host "TEST 1: User Signup" -ForegroundColor Green
$signupRes = Call-API "POST" "/api/auth/signup" @{email="security-tester@test.com"; password="TestPass123"}
if ($signupRes.StatusCode -eq "Created" -or ($signupRes.Content.success -eq $true)) {
    Write-Host "✅ Signup successful" -ForegroundColor Green
    $token = $signupRes.Content.token
} else {
    Write-Host "❌ Signup failed: $($signupRes.Content.message)" -ForegroundColor Red
    $token = $null
}
Write-Host ""

# 2. VALID URL TEST
if ($token) {
    Write-Host "TEST 2: Valid URL Shortening" -ForegroundColor Green
    $validRes = Call-API "POST" "/api/url" @{longUrl="https://www.example.com/very/long/path"} $token
    if ($validRes.StatusCode -eq "Created" -or $validRes.StatusCode -eq 201) {
        Write-Host "✅ Valid URL accepted" -ForegroundColor Green
        Write-Host "   Short URL: $($validRes.Content.shortUrl)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Valid URL rejected: $($validRes.Content.error)" -ForegroundColor Red
    }
    Write-Host ""

    # 3. SSRF PREVENTION - LOCALHOST TEST
    Write-Host "TEST 3: SSRF Prevention - Localhost" -ForegroundColor Green
    $localhostRes = Call-API "POST" "/api/url" @{longUrl="http://localhost:3000/admin"} $token
    if ($localhostRes.StatusCode -eq 400) {
        Write-Host "✅ Localhost URL blocked (SSRF prevention)" -ForegroundColor Green
        Write-Host "   Error: $($localhostRes.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Localhost URL NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 4. SSRF PREVENTION - PRIVATE IP TEST
    Write-Host "TEST 4: SSRF Prevention - Private IP (10.x.x.x)" -ForegroundColor Green
    $privateRes = Call-API "POST" "/api/url" @{longUrl="http://10.0.0.1:8080/api"} $token
    if ($privateRes.StatusCode -eq 400) {
        Write-Host "✅ Private IP (10.x.x.x) blocked" -ForegroundColor Green
        Write-Host "   Error: $($privateRes.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Private IP NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 5. SSRF PREVENTION - 192.168.x.x TEST
    Write-Host "TEST 5: SSRF Prevention - Private IP (192.168.x.x)" -ForegroundColor Green
    $privateRes2 = Call-API "POST" "/api/url" @{longUrl="http://192.168.1.1/router/admin"} $token
    if ($privateRes2.StatusCode -eq 400) {
        Write-Host "✅ Private IP (192.168.x.x) blocked" -ForegroundColor Green
        Write-Host "   Error: $($privateRes2.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Private IP NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 6. MALICIOUS URL SCHEME TEST
    Write-Host "TEST 6: Malicious URL Scheme (javascript:)" -ForegroundColor Green
    $jsRes = Call-API "POST" "/api/url" @{longUrl="javascript:alert('xss')"} $token
    if ($jsRes.StatusCode -eq 400) {
        Write-Host "✅ JavaScript URL blocked" -ForegroundColor Green
        Write-Host "   Error: $($jsRes.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ JavaScript URL NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 7. INVALID CUSTOM CODE TEST
    Write-Host "TEST 7: Invalid Custom Code (reserved word)" -ForegroundColor Green
    $invalidCodeRes = Call-API "POST" "/api/url" @{longUrl="https://www.example.com"; customCode="admin"} $token
    if ($invalidCodeRes.StatusCode -eq 400) {
        Write-Host "✅ Reserved custom code blocked" -ForegroundColor Green
        Write-Host "   Error: $($invalidCodeRes.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Reserved custom code NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 8. VALID CUSTOM CODE TEST
    Write-Host "TEST 8: Valid Custom Code" -ForegroundColor Green
    $validCodeRes = Call-API "POST" "/api/url" @{longUrl="https://www.github.com"; customCode="my-code-123"} $token
    if ($validCodeRes.StatusCode -eq "Created" -or $validCodeRes.StatusCode -eq 201) {
        Write-Host "✅ Valid custom code accepted" -ForegroundColor Green
        Write-Host "   Short Code: $($validCodeRes.Content.shortCode)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Valid custom code rejected: $($validCodeRes.Content.error)" -ForegroundColor Red
    }
    Write-Host ""

    # 9. RATE LIMITING TEST
    Write-Host "TEST 9: Rate Limiting (10 requests per minute)" -ForegroundColor Green
    Write-Host "   Sending 12 rapid requests..." -ForegroundColor Cyan
    
    $rateLimitHit = $false
    for ($i = 1; $i -le 12; $i++) {
        $res = Call-API "POST" "/api/url" @{longUrl="https://www.example.com/test-$i"} $token
        if ($res.StatusCode -eq 429) {
            Write-Host "✅ Rate limit hit after $i requests (expected after 10)" -ForegroundColor Green
            Write-Host "   Message: $($res.Content.message)" -ForegroundColor Cyan
            Write-Host "   Retry After: $($res.Content.retryAfter) seconds" -ForegroundColor Cyan
            $rateLimitHit = $true
            break
        }
    }
    
    if (-not $rateLimitHit) {
        Write-Host "⚠️  Rate limit may not be working correctly" -ForegroundColor Yellow
    }
    Write-Host ""

    # 10. OVERSIZED PAYLOAD TEST
    Write-Host "TEST 10: Oversized Payload (>10KB)" -ForegroundColor Green
    $largeUrl = "https://www.example.com/" + ("x" * 9999)
    $oversizedRes = Call-API "POST" "/api/url" @{longUrl=$largeUrl} $token
    if ($oversizedRes.StatusCode -eq 413 -or $oversizedRes.StatusCode -eq 400) {
        Write-Host "✅ Oversized payload rejected" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Oversized payload response: $($oversizedRes.StatusCode)" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "⚠️  Cannot continue tests - signup failed" -ForegroundColor Yellow
}

Write-Host "=== Security Testing Complete ===" -ForegroundColor Cyan
=======
# Security Testing Script for URL Shortener
# Tests rate limiting, SSRF prevention, input validation, and error handling

Write-Host "=== URL Shortener Security Testing ===" -ForegroundColor Cyan
Write-Host ""

# Function to make API calls
function Call-API($method, $endpoint, $body = $null, $token = $null) {
    $headers = @{"Content-Type" = "application/json"}
    if ($token) {
        $headers["Authorization"] = "Bearer $token"
    }
    
    $params = @{
        Uri = "http://localhost:5000$endpoint"
        Method = $method
        Headers = $headers
        UseBasicParsing = $true
        ErrorAction = "SilentlyContinue"
    }
    
    if ($body) {
        $params["Body"] = $body | ConvertTo-Json
    }
    
    try {
        $response = Invoke-WebRequest @params
        return @{
            StatusCode = $response.StatusCode
            Content = $response.Content | ConvertFrom-Json
            Success = $true
        }
    }
    catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $stream = $errorResponse.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd()
            return @{
                StatusCode = $errorResponse.StatusCode
                Content = $content | ConvertFrom-Json -ErrorAction SilentlyContinue
                Success = $false
            }
        }
        return @{
            StatusCode = "Error"
            Content = $_.Exception.Message
            Success = $false
        }
    }
}

# 1. SIGNUP TEST
Write-Host "TEST 1: User Signup" -ForegroundColor Green
$signupRes = Call-API "POST" "/api/auth/signup" @{email="security-tester@test.com"; password="TestPass123"}
if ($signupRes.StatusCode -eq "Created" -or ($signupRes.Content.success -eq $true)) {
    Write-Host "✅ Signup successful" -ForegroundColor Green
    $token = $signupRes.Content.token
} else {
    Write-Host "❌ Signup failed: $($signupRes.Content.message)" -ForegroundColor Red
    $token = $null
}
Write-Host ""

# 2. VALID URL TEST
if ($token) {
    Write-Host "TEST 2: Valid URL Shortening" -ForegroundColor Green
    $validRes = Call-API "POST" "/api/url" @{longUrl="https://www.example.com/very/long/path"} $token
    if ($validRes.StatusCode -eq "Created" -or $validRes.StatusCode -eq 201) {
        Write-Host "✅ Valid URL accepted" -ForegroundColor Green
        Write-Host "   Short URL: $($validRes.Content.shortUrl)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Valid URL rejected: $($validRes.Content.error)" -ForegroundColor Red
    }
    Write-Host ""

    # 3. SSRF PREVENTION - LOCALHOST TEST
    Write-Host "TEST 3: SSRF Prevention - Localhost" -ForegroundColor Green
    $localhostRes = Call-API "POST" "/api/url" @{longUrl="http://localhost:3000/admin"} $token
    if ($localhostRes.StatusCode -eq 400) {
        Write-Host "✅ Localhost URL blocked (SSRF prevention)" -ForegroundColor Green
        Write-Host "   Error: $($localhostRes.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Localhost URL NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 4. SSRF PREVENTION - PRIVATE IP TEST
    Write-Host "TEST 4: SSRF Prevention - Private IP (10.x.x.x)" -ForegroundColor Green
    $privateRes = Call-API "POST" "/api/url" @{longUrl="http://10.0.0.1:8080/api"} $token
    if ($privateRes.StatusCode -eq 400) {
        Write-Host "✅ Private IP (10.x.x.x) blocked" -ForegroundColor Green
        Write-Host "   Error: $($privateRes.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Private IP NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 5. SSRF PREVENTION - 192.168.x.x TEST
    Write-Host "TEST 5: SSRF Prevention - Private IP (192.168.x.x)" -ForegroundColor Green
    $privateRes2 = Call-API "POST" "/api/url" @{longUrl="http://192.168.1.1/router/admin"} $token
    if ($privateRes2.StatusCode -eq 400) {
        Write-Host "✅ Private IP (192.168.x.x) blocked" -ForegroundColor Green
        Write-Host "   Error: $($privateRes2.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Private IP NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 6. MALICIOUS URL SCHEME TEST
    Write-Host "TEST 6: Malicious URL Scheme (javascript:)" -ForegroundColor Green
    $jsRes = Call-API "POST" "/api/url" @{longUrl="javascript:alert('xss')"} $token
    if ($jsRes.StatusCode -eq 400) {
        Write-Host "✅ JavaScript URL blocked" -ForegroundColor Green
        Write-Host "   Error: $($jsRes.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ JavaScript URL NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 7. INVALID CUSTOM CODE TEST
    Write-Host "TEST 7: Invalid Custom Code (reserved word)" -ForegroundColor Green
    $invalidCodeRes = Call-API "POST" "/api/url" @{longUrl="https://www.example.com"; customCode="admin"} $token
    if ($invalidCodeRes.StatusCode -eq 400) {
        Write-Host "✅ Reserved custom code blocked" -ForegroundColor Green
        Write-Host "   Error: $($invalidCodeRes.Content.details)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Reserved custom code NOT blocked!" -ForegroundColor Red
    }
    Write-Host ""

    # 8. VALID CUSTOM CODE TEST
    Write-Host "TEST 8: Valid Custom Code" -ForegroundColor Green
    $validCodeRes = Call-API "POST" "/api/url" @{longUrl="https://www.github.com"; customCode="my-code-123"} $token
    if ($validCodeRes.StatusCode -eq "Created" -or $validCodeRes.StatusCode -eq 201) {
        Write-Host "✅ Valid custom code accepted" -ForegroundColor Green
        Write-Host "   Short Code: $($validCodeRes.Content.shortCode)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Valid custom code rejected: $($validCodeRes.Content.error)" -ForegroundColor Red
    }
    Write-Host ""

    # 9. RATE LIMITING TEST
    Write-Host "TEST 9: Rate Limiting (10 requests per minute)" -ForegroundColor Green
    Write-Host "   Sending 12 rapid requests..." -ForegroundColor Cyan
    
    $rateLimitHit = $false
    for ($i = 1; $i -le 12; $i++) {
        $res = Call-API "POST" "/api/url" @{longUrl="https://www.example.com/test-$i"} $token
        if ($res.StatusCode -eq 429) {
            Write-Host "✅ Rate limit hit after $i requests (expected after 10)" -ForegroundColor Green
            Write-Host "   Message: $($res.Content.message)" -ForegroundColor Cyan
            Write-Host "   Retry After: $($res.Content.retryAfter) seconds" -ForegroundColor Cyan
            $rateLimitHit = $true
            break
        }
    }
    
    if (-not $rateLimitHit) {
        Write-Host "⚠️  Rate limit may not be working correctly" -ForegroundColor Yellow
    }
    Write-Host ""

    # 10. OVERSIZED PAYLOAD TEST
    Write-Host "TEST 10: Oversized Payload (>10KB)" -ForegroundColor Green
    $largeUrl = "https://www.example.com/" + ("x" * 9999)
    $oversizedRes = Call-API "POST" "/api/url" @{longUrl=$largeUrl} $token
    if ($oversizedRes.StatusCode -eq 413 -or $oversizedRes.StatusCode -eq 400) {
        Write-Host "✅ Oversized payload rejected" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Oversized payload response: $($oversizedRes.StatusCode)" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "⚠️  Cannot continue tests - signup failed" -ForegroundColor Yellow
}

Write-Host "=== Security Testing Complete ===" -ForegroundColor Cyan
>>>>>>> f8a0985c31c00fc45f47ca7de161e97febc64ff6
