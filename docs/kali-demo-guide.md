# 🛡️ CloudShield AI — Security Auditing & Verification Manual

This document provides guidelines for security teams and academic evaluators to audit, test, and verify the detection capabilities of the **CloudShield AI** platform. It describes how to simulate standard security events from an external testing system (such as Kali Linux) to verify that the **Rule Engine** and **Python AI Microservice** log, flag, alert, and respond appropriately.

---

## 🎯 Verification Framework Overview

The objective of security auditing in this project is to validate the transition of security incidents across three layers:
1. **Application Layer (Bait Portal):** Simulates insecure handling of queries, inputs, and requests.
2. **Monitoring Layer (SIEM Engine & AI):** Detects signature matches via the Rule Engine and behavioral deviations via the Isolation Forest service.
3. **Firewall Layer (Response Engine):** Automates active response by executing localized blocking rules (`iptables` / `ufw`) on the target machine.

```
+--------------------+      HTTP Traffic      +-----------------------+
|  Auditing System   | ---------------------> |  Vulnerable Portal    |
| (e.g., Kali Linux) |                        | (Port 3000 / Port 80) |
+--------------------+                        +-----------------------+
          |                                               |
          | UFW Firewall Blocks                           | Sends Transaction Logs
          | (Port 22 SSH Triggered)                       v
+--------------------+                        +-----------------------+
|   Target Server    | <--------------------- |  Monitoring Server    |
| (Port 80/443/SSH)  |  SSH firewall rules    | (Port 5000 / Port 80) |
+--------------------+                        +-----------------------+
```

---

## 🔧 Auditing Environment Setup

To conduct these audits, configure a testing system on the same network or with routing access to the target instance:

1. **System Host:** Any standard security verification system (e.g., Kali Linux VM, WSL 2, or standard Linux client).
2. **Network Connection:** Ensure the testing machine can route requests to the public IP of the target AWS EC2 instance.
3. **Audit Tools:** Verify the presence of standard security tools:
   - `curl` (raw HTTP requests verification)
   - `hydra` (authentication auditing tool)
   - `sqlmap` (database query logic testing tool)
   - `ab` / ApacheBench (load and request rate testing)

Install missing verification tools on your Kali / testing system:
```bash
sudo apt update
sudo apt install -y curl hydra sqlmap apache2-utils
```

---

## 📋 Security Audit Scenarios

---

### Audit 1: Authentication Auditing & Login Rate Validation (Brute Force)
* **Goal:** Verify that the system registers multiple authentication failures from a single IP and flags it as a `BruteForce` critical alert.
* **Mechanism:** The Rule Engine checks if there are **> 5 failed logins within 60 seconds** from the same IP address.

#### Execution Procedure:
Run `hydra` to audit the authentication endpoint. This simulates a high-frequency login request flow.
```bash
hydra -l admin -P /usr/share/wordlists/fasttrack.txt http-post-form \
  "/api/auth/login:username=^USER^&password=^PASS^:Invalid" \
  -s 3000 -vV [YOUR_EC2_PUBLIC_IP]
```
*(If running behind the Nginx reverse proxy on port 80, remove `-s 3000`)*.

#### Expected Log Output & Alert:
1. **Application Console Logs:** Shows multiple `Login failed` logs pointing to the auditing IP.
2. **Security Dashboard (SOC):** 
   - A flurry of failed login logs appears on the **Live Logs** feed.
   - An alert transitions from `Low` to `Critical` with the type `BruteForce` in the **Alerts** table.
3. **Response Action:**
   - The monitoring backend connects via SSH to the server and applies: `sudo ufw deny from [AUDITING_IP]`.
   - The testing machine's terminal will hang as connection requests time out.
   - The **Blocked IPs** table shows the auditing IP under active block with a 15-minute countdown.

---

### Audit 2: Database Input Handling & Sanitization Validation (SQL Injection)
* **Goal:** Validate that query parameters containing SQL operators are detected by signature matching.
* **Mechanism:** The Rule Engine screens inputs for characters matching SQL patterns (e.g. `'`, `--`, `UNION`, `SELECT`, `OR 1=1`).

#### Execution Procedure:
Use `sqlmap` to audit the employee search route. This maps database schema queries and tests query string injection points.
```bash
sqlmap -u "http://[YOUR_EC2_PUBLIC_IP]:3000/api/employees/search?search=test" --batch --dbms=mongodb --level=1
```
*(Use port `3000` or port `80` depending on your Nginx configuration)*.

#### Expected Log Output & Alert:
1. **Rule Engine Activation:** The endpoint intercepts request parameters containing symbols like `*` or SQL queries.
2. **Security Dashboard (SOC):**
   - A `SQLInjection` alert of `Critical` severity is created.
3. **Response Action:**
   - The auditing system IP is instantly blocked at the network level (`UFW` rule added).
   - `sqlmap` will report that the connection was closed or host became unreachable.

---

### Audit 3: Cross-Site Scripting (XSS) Input Sanitization Validation
* **Goal:** Verify that storing unsanitized input fields containing HTML/JS triggers a validation warning.
* **Mechanism:** The Rule Engine checks payloads for matching script tokens (`<script>`, `onerror=`, `javascript:`).

#### Execution Procedure:
Send an unescaped script tag using `curl` to the public contact endpoint.
```bash
curl -X POST http://[YOUR_EC2_PUBLIC_IP]:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name": "Audit System", "email": "audit@cloudshield.local", "subject": "Test", "message": "<script>alert(1)</script>"}'
```

#### Expected Log Output & Alert:
1. **Rule Engine Activation:** Detects the payload contains the forbidden sequence `<script>`.
2. **Security Dashboard (SOC):**
   - A `XSS` alert of `High` severity appears in the system log.
   - The raw comment appears in the Admin messages dashboard, demonstrating the storage mechanism. (The dashboard sanitizes views using React's default escaping to prevent execution).

---

### Audit 4: Path Traversal Validation
* **Goal:** Validate that endpoint file parameters are screened to prevent directory navigation.
* **Mechanism:** The Rule Engine screens route arguments for relative directory escape strings (`../` or `..%2F`).

#### Execution Procedure:
Attempt to read standard configuration files via directory traversal paths using `curl`.
```bash
curl "http://[YOUR_EC2_PUBLIC_IP]:3000/api/download?file=../../../../etc/passwd"
```

#### Expected Log Output & Alert:
1. **Rule Engine Activation:** Intercepts the query containing relative navigation tokens.
2. **Security Dashboard (SOC):**
   - Generates a `DirectoryTraversal` alert of `High` severity.
   - The file payload request is blocked or logged.

---

### Audit 5: HTTP Request Flood & Rate Limiting Validation (DDoS)
* **Goal:** Verify that high-volume request streams are throttled and trigger alerts for traffic anomalies.
* **Mechanism:** The Rule Engine checks if an IP executes **> 100 requests within 60 seconds**.

#### Execution Procedure:
Use ApacheBench (`ab`) to execute a rapid sequence of 500 requests.
```bash
ab -n 500 -c 10 http://[YOUR_EC2_PUBLIC_IP]:3000/api/employees
```

#### Expected Log Output & Alert:
1. **Rule Engine Activation:** Counts request logs per minute.
2. **Security Dashboard (SOC):**
   - Shows a steep curve spike in the **Overview** dashboard request rate graph.
   - Triggers an `HTTPFlood` alert of `High` severity.

---

---

### Audit 5b: Vulnerability Scanner / User-Agent Auditing (Port Scan)
* **Goal:** Verify that vulnerability scanners (or simulated port scanning tools) that broadcast known User-Agent profiles are intercepted and blocked.
* **Mechanism:** The Rule Engine matches the User-Agent header against standard scanner profiles (`nikto`, `sqlmap`, `nmap`, `gobuster`, etc.) and triggers a `Critical` severity alert.

#### Execution Procedure:
Send an HTTP request simulating a scanner User-Agent using `curl`.
```bash
curl -A "Mozilla/5.0 (compatible; Nmap Scripting Engine; http://nmap.org/book/nse.html)" \
  "http://[YOUR_EC2_PUBLIC_IP]:3000/api/employees"
```

#### Expected Log Output & Alert:
1. **Rule Engine Activation:** Matches the `Nmap` string in the User-Agent signature.
2. **Security Dashboard (SOC):**
   - A `PortScan` alert of `Critical` severity triggers.
3. **Response Action:**
   - The firewall automatically drops packets from the client IP (`sudo ufw deny`).

---

### Audit 6: Behavioral Anomaly Analysis & AI Score Verification
* **Goal:** Verify that deviations from a typical user's baseline trigger a threat score elevation from the unsupervised Isolation Forest model.
* **Mechanism:** The Python AI Microservice evaluates requests based on:
  `[requests_per_minute, failed_login_count, unique_endpoints, average_request_interval, session_duration, http_status_ratio, payload_length]`

#### Execution Procedure:
You can test the AI prediction engine by injecting a custom feature vector using `curl` directly to the `/monitor/analyze` proxy endpoint.

```bash
# Test Scenario A: Normal User behavior (10 requests, 0 failed logins, 3 unique pages)
curl -X POST http://[YOUR_EC2_PUBLIC_IP]:5000/monitor/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_ADMIN_JWT_TOKEN]" \
  -d '{
    "features": {
      "requests_per_minute": 10.0,
      "failed_login_count": 0,
      "unique_endpoints": 3,
      "avg_request_interval_ms": 6000.0,
      "session_duration_s": 300.0,
      "error_rate": 0.0,
      "avg_payload_length": 150.0
    }
  }'

# Test Scenario B: Anomalous behavior (300 requests, 15 failed logins, 45 unique endpoints)
curl -X POST http://[YOUR_EC2_PUBLIC_IP]:5000/monitor/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_ADMIN_JWT_TOKEN]" \
  -d '{
    "features": {
      "requests_per_minute": 300.0,
      "failed_login_count": 15,
      "unique_endpoints": 45,
      "avg_request_interval_ms": 100.0,
      "session_duration_s": 45.0,
      "error_rate": 0.8,
      "avg_payload_length": 1200.0
    }
  }'
```

#### Expected Output:
- **Scenario A:** Returns prediction `1` (Normal) with a Threat Score of `< 20` (Safe).
- **Scenario B:** Returns prediction `-1` (Anomaly) with a Threat Score of `> 80` (Malicious), indicating behavioral classification success.

---

## 🛠️ Operational Verification Checklist

To confirm firewall automation on the target instance during audit tests:

1. **Active Rule Verification:**
   Execute on your EC2 host:
   ```bash
   sudo ufw status verbose
   ```
   *Verify that a new block rule matching the auditing machine IP is displayed: `deny from [IP] to any`.*

2. **Automated Cleanup Verification:**
   Wait 15 minutes and execute the command again.
   *Verify that the deny rule is automatically removed and the IP state in the `blocked_ips` database collection updates to `isActive: false`.*

3. **Portal Account Locking Check:**
   Attempt to login using portal admin credentials from a blocked IP space.
   *Verify that the User document updates to `isLocked: true`, and subsequent login attempts return HTTP `403 Account Locked` error codes.*
