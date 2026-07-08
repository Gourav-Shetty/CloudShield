# CloudShield AI — Adaptive Prevention Testing Guide

This guide details how to verify the new dual-model ML classifiers, progressive rate-limiting, slide CAPTCHA challenges, and progressive escalation rule.

---

## 🚀 Step 1: Start All Services

Make sure all services are running:

### 1. Python AI Service
```powershell
cd "C:\Cloud Project\CloudShield-AI\ai-service"
# Activate virtual environment and run Flask app
venv\Scripts\activate
python app.py
```
You should see:
```text
[AI] Initializing CloudShield AI threat-detection models...
=======================================================
  CloudShield AI - Isolation Forest Training Summary
=======================================================
...
  CloudShield AI - Threat Classifier Training Summary
=======================================================
  Class 0 (Normal      ) : Predicted 1000 / Actual 1000
...
```

### 2. Monitoring Platform Backend
```powershell
cd "C:\Cloud Project\CloudShield-AI\monitoring-platform"
npm run dev
```

### 3. Employee Portal Backend
```powershell
cd "C:\Cloud Project\CloudShield-AI\employee-portal\backend"
npm run dev
```

### 4. Employee Portal Frontend
```powershell
cd "C:\Cloud Project\CloudShield-AI\employee-portal\frontend"
npm run dev
```

### 5. Security Dashboard Frontend
```powershell
cd "C:\Cloud Project\CloudShield-AI\security-dashboard"
npm run dev
```

---

## 🧪 Step 2: Triggering and Verifying Containment

Here is how to test each progressive quarantine policy:

### Challenge 1: Progressive CAPTCHA & Escalation (Brute Force)
1. **Trigger CAPTCHA**: In the **Employee Portal Login Page** (`http://localhost:5173/login`), input a wrong password **6 times** consecutively.
   * *What happens*: Your IP (automatically normalized to `127.0.0.1` locally) is quarantined under a `Captcha` policy. You will immediately see a **glassmorphic Slide-to-Unlock challenge overlay** on the screen. The user account is **not** locked yet.
2. **First Fail under CAPTCHA (Try 1/2)**: Drag the slider all the way to the right to resolve the CAPTCHA. Submit another **wrong password**.
   * *What happens*: The failure is logged by the backend under the active CAPTCHA lease (`Failures: 1/2`). You will be prompted to solve the CAPTCHA again.
3. **Second Fail under CAPTCHA (Try 2/2 - Escalation)**: Resolve the slide CAPTCHA a second time, and submit another **wrong password**.
   * *What happens*: The failure count reaches `2/2`. The rule engine deactivates the CAPTCHA block, triggers a `Critical` escalation alert, initiates a hard firewall VM `Block` policy on the IP, and **locks the targeted user account database-wide**.
4. **Verify Lockout**: Any subsequent login attempt or interaction will immediately receive `403 Forbidden` and force-logout the client, displaying the red error banner:
   `Access Denied: Your IP address has been blocked due to a security violation.`

### Challenge 2: Rate Limiting (DDoS Flood)
1. Simulate a high-frequency request flood using PowerShell:
   ```powershell
   for ($i=1; $i -le 120; $i++) { Invoke-RestMethod -Uri "http://localhost:3000/api/employees" -Method Get }
   ```
2. The monitoring platform will classify the IP under `DDoS` or `HTTPFlood` and deploy a `RateLimit` policy at `2 RPS` (Requests-Per-Second).
3. Continue hitting endpoints on the portal or refresh the dashboard rapidly. You will receive:
   `429 Too Many Requests: Rate limit exceeded under security quarantine. Slow down.`

### Challenge 3: Hard Block (SQL Injection / XSS)
1. Perform a mock SQL injection attempt by sending an injection string in a login or search form, or via PowerShell:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body '{"username":"admin","password":"foo\" OR 1=1 --"}' -ContentType "application/json"
   ```
2. The monitoring platform will identify the `SQLInjection` pattern, flag it as `Critical`, class-predict it, and apply a `Block` policy.
3. Your IP will immediately receive `403 Forbidden` on all requests. 
4. The Employee Portal frontend will capture this status code, force-logout any active session, and redirect you to `/login` displaying the red error banner: 
   `Access Denied: Your IP address has been blocked due to a security violation.`

---

## 🔓 Step 3: Unblocking / Restoring IP Access
To restore access during testing:
- Open the **Security Dashboard** (`http://localhost:5174`).
- Navigate to the **Blocked IPs** tab.
- You will see your IP listed with its specific policy (red for Block, yellow for RateLimit, purple for Captcha) and an active countdown timer.
- Click **Unban** to immediately delete the gateway restriction, or click **Unlock Account** to reactivate the user account.
