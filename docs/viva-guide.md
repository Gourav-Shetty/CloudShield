# 🎓 CloudShield AI — Viva Preparation & Examiner Guide

This document is compiled to prepare students for the final project viva evaluation. It contains detailed architectural descriptions, justifications for design choices, 30 highly anticipated examiner questions with complete answers, and a structured script for a 15-minute live demonstration.

---

## 🏗️ System Architecture & Data Flow

CloudShield AI is a distributed cloud security monitoring and response platform divided into four main layers:

```
+------------------------------------------+
|          1. ATTACK / AUDIT CLIENT        |
|             (Kali Linux / VM)            |
|             (Web Browser Host)           |
+------------------------------------------+
                     | HTTP Requests
                     v
+------------------------------------------+
|         2. APPLICATION BAIT LAYER        |
|     Employee Portal API (Node.js/Port 3000)|
|    Employee Portal UI (React/Vite/Port 5173|
+------------------------------------------+
                     | Forward Logs (HTTP POST)
                     v
+------------------------------------------+
|         3. MONITORING & RESPONSE         |
|     SIEM Platform API (Node.js/Port 5000)  |
|       Rule Engine -> Alerts Database     |
|   Incident Response -> SSH Command UFW   |
|   SOC Dashboard (React/Socket.IO/Port 5174)
+------------------------------------------+
          |                        ^
          | HTTP POST /analyze     | JSON Response
          v                        |
+------------------------------------------+
|           4. AI MICROSERVICE             |
|        Flask Service (Python/Port 8000)  |
|      1. Isolation Forest (Unsupervised)  |
|      2. Random Forest (Supervised)       |
+------------------------------------------+
```

### Log Lifecycle Flow:
1. An incoming HTTP request hits the **Employee Portal** backend.
2. The `requestLogger` middleware intercepts the request data and response status code.
3. The Portal sends the log via an asynchronous, fire-and-forget HTTP POST to `/logs` on the **Monitoring Platform**.
4. The Monitoring Platform runs the log through:
   - **The Rule Engine:** Scans against regex signatures for known exploits (SQLi, XSS, Path Traversal, Brute Force, Flood).
   - **The AI Service:** Proxies a 7-dimensional feature vector of the IP's recent activity window to the **Flask ML Service**.
5. The Flask service evaluates the vector in parallel:
   - **Isolation Forest (Unsupervised Model):** Detects zero-day anomalies and unknown traffic profiles, outputting a Threat Score (0–100) mapped to a granular classification band (`Safe`, `Normal`, `Suspicious`, `Warning`, `Malicious`).
   - **Random Forest Classifier (Supervised Model):** Predicts the specific threat category (`Normal`, `BruteForce`, `SQLInjection`, `XSS`, `DDoS`) along with a confidence probability (e.g. `98% DDoS`).
6. Based on the predicted threat class, the system enforces **Progressive Containment**:
   - **RateLimit (DDoS / Flood):** Limits the IP to `2 RPS` (Requests-Per-Second). Requests exceeding this return a `429 Too Many Requests` quarantine block.
   - **Captcha (BruteForce / Scan):** Challenges state-modifying requests (POST, PUT, DELETE) with a Slide-to-Unlock widget. Legitimate users can unlock access; the account remains unlocked.
   - **Block (SQLInjection / XSS / Escalations):** Deploys a hard firewall block (`sudo ufw deny`) at the OS-level via SSH and locks the targeted user account database-wide.
7. Real-time updates (logs, alerts, blocks, and system resource metrics) are broadcast to the dark-themed **SOC Dashboard** via **Socket.IO**.

---

## 🛠️ Technology Choices Justification

Examiners frequently ask **"Why did you use X instead of Y?"**. Use these bulletproof responses:

* **Why MongoDB?**
  * *Response:* Security logs are semi-structured JSON payloads with varying metadata (e.g., payload objects for SQLi might differ from auth payloads). MongoDB's document-based, schemaless nature is ideal for capturing nested JSON records compared to rigid relational SQL schemas. We split the architecture into separate database contexts (`cloudshield_portal` and `cloudshield_monitor`) to mimic a decoupled production environment.
* **Why Isolation Forest for Anomaly Detection?**
  * *Response:* Security logs contain mostly normal traffic with rare attack patterns. Supervised algorithms (like Random Forests or SVMs) require heavily labeled datasets and struggle with zero-day attacks. Isolation Forest is an unsupervised algorithm that isolates anomalies by randomly partitioning feature paths. Since anomalies require fewer splits to isolate, they appear closer to the root of the trees (shorter path lengths). This allows us to detect brand-new, unseen attack patterns without needing prior labels.
* **Why the Supervised Random Forest Classifier?**
  * *Response:* Unsupervised models excel at flagging *when* something is anomalous, but they cannot tell you *what* type of attack it is. We combined the Isolation Forest with a supervised Random Forest Classifier to identify the specific attack type. This enables **Adaptive Prevention**—instead of blocking everything, the system chooses the correct policy matching the exploit (e.g., CAPTCHAs for Brute Force, Rate Limiting for DDoS, and Firewall Bans for Injection attacks).
* **Why Socket.IO instead of polling?**
  * *Response:* In a Security Operations Center (SOC), a delay of a few seconds can allow an attacker to dump a database or pull sensitive files. Traditional HTTP polling creates unnecessary network overhead and introduces latency. Socket.IO establishes a persistent WebSockets connection, pushing security alerts and live console logs to screen dashboards in milliseconds.
* **Why Node.js + Python instead of doing everything in Python?**
  * *Response:* This project implements a microservices architecture. Node.js is excellent for high-throughput, I/O-bound web APIs, asynchronous event processing, and real-time WebSockets connection management. Python is the industry standard for machine learning, providing robust ML library support (`scikit-learn`, `numpy`, `pandas`). Splitting them ensures that heavy ML fitting and prediction operations do not block the real-time event-loop of our primary API gateway.

---

## ❓ 30 Expected Examiner Questions & Answers

### Part 1: Core Architecture & System Flow

#### Q1: What is the main objective of this project?
**A:** The project demonstrates a closed-loop security system that bridges Layer 7 web application vulnerability detection with automated Layer 3/4 network firewall mitigation, utilizing a hybrid approach of signature-based rules and behavior-based machine learning (Isolation Forest + Random Forest).

#### Q2: What are the target interfaces exposed in the Employee Portal for exploit demonstration?
**A:** 
1. `/api/auth/login` (rate limit vulnerability / brute force target)
2. `/api/employees/search` (SQL Injection target)
3. `/api/contact` (Stored XSS target)
4. `/api/download` (Directory Traversal target)

#### Q3: How do the Employee Portal and Monitoring Platform communicate?
**A:** The Employee Portal uses an Axios client to post structured log JSON arrays containing the request metadata to the monitoring server asynchronously, preventing logging logic from slowing down user transactions.

#### Q4: Why is there an SSH connection from the monitoring platform to the EC2 server?
**A:** To automate incident mitigation. When a critical threat is confirmed, the monitoring backend acts as an orchestrator, connecting back to the host operating system via SSH to configure local packet filters (`ufw deny`).

#### Q5: How does the system handle dual-stack local testing IP mismatches (::1 vs 127.0.0.1)?
**A:** Node's Express backend normalizes all loopback IP variants (`::1`, `::ffff:127.0.0.1`, and `127.0.0.1`) to `127.0.0.1` at the middleware layer. This ensures that a brute-force block written for `127.0.0.1` cannot be bypassed by an automated script connecting over IPv6.

---

### Part 2: Security & Progressive Containment Mechanics

#### Q6: How does the system prevent an attacker from being blocked permanently?
**A:** The automated UFW block utilizes a transient database entry. When an IP is blocked, a document is saved with an `unblockAt` timestamp set to 15 minutes in the future. A Node.js timeout triggers an SSH command to execute `sudo ufw delete deny from [IP]` when the duration expires.

#### Q7: What firewall command is executed to block an IP, and how does Nginx behave?
**A:** The server runs `sudo ufw deny from [IP]`. Once this rule is active at the network level, Nginx will never see subsequent requests from that IP; the packets are dropped by the Linux kernel netfilter framework.

#### Q8: What is progressive containment and why is it used?
**A:** Rather than executing destructive blocks for all anomalies, the system adapts its response:
- DDoS triggers **Rate Limiting** (maintains availability while reducing load).
- Brute Force triggers a **CAPTCHA** (keeps portal accessible for legitimate operators who make typing errors).
- Injection attacks trigger a **Hard Firewall Block & Account Lock** (fully locks out high-severity threats).

#### Q9: What happens to a compromised user account during an attack?
**A:** If a hard `Block` restriction type is deployed (such as for SQL Injection or a CAPTCHA escalation), the response engine connects to the `cloudshield_portal` database and locks the targeted user account (`isLocked: true`). This prevents the attacker from successfully logging in even if they rotate their IP address.

#### Q10: How does the progressive CAPTCHA escalation rule work?
**A:** When brute force is first detected (6 failed logins), the system places the IP in a `Captcha` quarantine. The target user account is **not locked** yet. The user has **2 tries** under the CAPTCHA block. If they solve the slider CAPTCHA but fail the password verification **2 consecutive times**, the system deactivates the CAPTCHA block and escalates to a hard firewall `Block` policy, locking the user account database-wide.

---

### Part 3: Signature-Based Rule Engine

#### Q11: How does the Rule Engine detect SQL Injection?
**A:** It evaluates the request endpoint and stringified request body against a regular expression scanning for SQL keywords and operators: `UNION`, `SELECT`, `OR 1=1`, `--`, etc.

#### Q12: How does the Rule Engine detect XSS?
**A:** It runs recursive screening on input payload fields matching HTML elements and script handlers: `<script>`, `javascript:`, `onerror`, `onload`.

#### Q13: What is the rule signature for Directory Traversal?
**A:** It checks the file input parameter for relative navigation patterns: `../`, `..\`, and their URL-encoded equivalents (`%2e%2e%2f`, `%2e%2e%5c`).

#### Q14: How does the engine distinguish between standard load and a brute-force authentication event?
**A:** Brute-force tracking specifically isolates failed authentication attempts (`Login` event, status `>= 400`). Standard traffic spikes are tracked separately under the HTTP Flood rule (>100 total requests per minute).

#### Q15: How did you prevent the CAPTCHA challenge from double-counting as a brute force failure?
**A:** The `requestLogger` middleware was updated to inspect the response body. If the response is a CAPTCHA challenge redirect (`captchaRequired: true` returned by the block middleware), the logger suppresses forwarding the event to the SIEM, ensuring only actual user password attempts affect the try counters.

---

### Part 4: AI & Machine Learning Service

#### Q16: What features are passed to the Isolation Forest model?
**A:** A 7-dimensional vector:
1. `requests_per_minute`
2. `failed_login_count`
3. `unique_endpoints`
4. `avg_request_interval_ms`
5. `session_duration_s`
6. `error_rate`
7. `avg_payload_length`

#### Q17: Why did you choose an unsupervised model over a supervised one?
**A:** In real-world networks, attack vectors change constantly. Supervised models can only detect known attacks present in the training set (high false negatives for zero-days). Unsupervised models detect anomalies simply as deviations from normal traffic baselines.

#### Q18: What is contamination in an Isolation Forest, and what value did you use?
**A:** Contamination represents the expected proportion of outliers (anomalies) in the training dataset. We configured it to `0.15` (15%), which matches our synthetic training data distribution (1000 normal records + 200 anomalies).

#### Q19: How do you map the output of the Isolation Forest to a Threat Score (0–100)?
**A:** The model output `decision_function()` returns values where positive is normal and negative is anomalous. We map these ranges using linear interpolation:
- Positive score (>0.05) → Safe (0-20)
- Marginally positive (0.05 to -0.05) → Suspicious (21-60)
- Negative score (< -0.05) → Malicious (61-100)

#### Q20: How is the model initialized when the server boots?
**A:** The Flask service generates a synthetic dataset containing baseline user traffic and simulated malicious behavior patterns. It fits the Isolation Forest model on startup, ensuring the engine is ready to classify requests immediately without a manual training step.

---

### Part 5: Real-Time Sockets & Frontend

#### Q21: What role does WebSockets (Socket.IO) play in the SOC dashboard?
**A:** Socket.IO pushes live event streams to the browser. When a log is registered, an alert is triggered, or an IP is blocked, the backend emits the event directly to all open dashboards in real-time.

#### Q22: How does the CAPTCHA verify request bypass the security block?
**A:** Since the client IP is blocked under a `Captcha` quarantine, any standard write action (POST) is intercepted and returns `403 captchaRequired`. We explicitly excluded `/api/auth/verify-captcha` from this block in `checkIpBlock.js` to prevent a catch-22, allowing clients to submit and verify their slider offset.

#### Q23: How does the Blocked IPs page maintain the remaining block time?
**A:** The server sends the absolute ISO timestamp for `unblockAt`. The React frontend runs a localized `setInterval` timer (every 1 second) that calculates the difference between `unblockAt` and the local clock.

#### Q24: What charting library did you use, and how are metrics updated?
**A:** We use **Recharts**. The Live Traffic chart pulls the historical 60-minute request rates on mount and listens for the `new-log` socket event, appending the latest timestamp and shifting old elements out in real-time.

#### Q25: How is the security dashboard admin authenticated?
**A:** Via a dedicated login endpoint (`POST /auth/login` on port 5000) that verifies admin credentials against the `cloudshield_monitor` database and issues a signed JSON Web Token (JWT). The token is saved in localStorage and injected into all headers.

---

### Part 6: Systems & Deployment

#### Q26: What is the purpose of Nginx in this project?
**A:** Nginx acts as a reverse proxy and web server. It listens on port 80 and routes incoming traffic to the appropriate backend service based on the path (e.g., `/api` to port 3000, `/monitor` to port 5000, `/dashboard` static files, `/` to portal files).

#### Q27: What is PM2 and why is it used?
**A:** PM2 is a production process manager for Node.js. It runs our backend APIs in the background, logs standard outputs, monitors memory consumption, and automatically restarts services if they crash.

#### Q28: How is the Python Flask microservice managed as a daemon?
**A:** It is configured as a systemd service (`cloudshield-ai.service`). This integrates the script with the host OS, letting it start automatically on boot and log output to `journald`.

#### Q29: What is UFW and how does the backend interact with it?
**A:** UFW controls the kernel firewall. Since our Node.js monitoring backend runs under the `ubuntu` user, we configure the sudoers file on the EC2 instance to allow running `/usr/sbin/ufw` without prompting for a password.

#### Q30: How can we generate post-incident audit reports?
**A:** The platform generates incident reports on-demand. When an incident is resolved, administrators can navigate to the SOC Reports tab and download a structured JSON report containing a compiled timeline of the alerts, AI threat metrics, and firewall responses.

---

## 🎬 Live Demonstration Script (15 Minutes)

Use this step-by-step plan to guide the examiner through a flawless live demo:

### Phase 1: Platform Walkthrough (3 Minutes)
1. **Show the bait:** Open `http://localhost:5173/` in your browser. Show the blue, clean "CloudShield Corp" Employee Portal. Log in using user: `admin`, password: `admin123`.
2. **Expose records:** Navigate to the Employees page, show the database records, search filters, and leave request tabs.
3. **Open the SOC:** Open `http://localhost:5174/` in a split window. Show the dark-themed Security Dashboard. Log in using `admin` / `cloudshield123`.
4. **Point out elements:** Show the live threat gauge (resting at green/Safe), the system status indicator (all services green/running), and the empty Blocked IPs table.

### Phase 2: Simulating Application Exploit Checks (4 Minutes)
1. **Directory Traversal Verification:**
   - In your browser or curl, access: `http://localhost:3000/api/download?file=../../../../etc/passwd`
   - Immediately point to the SOC dashboard.
   - **Result:** A red glow flashes. A `DirectoryTraversal` alert with `High` severity appears in the live feed.
2. **Stored XSS Verification:**
   - In the Employee Portal, submit a contact message containing a script element: `<script>alert("XSS")</script>`.
   - Point to the SOC dashboard.
   - **Result:** An `XSS` alert appears on the dashboard. The raw string is safely rendered as text by the dashboard UI.

### Phase 3: Live Automated Block Demonstration (5 Minutes)
1. **Progressive CAPTCHA and Escalation verification:**
   - On the Employee Portal login screen (`http://localhost:5173/login`), submit a wrong password 6 times consecutively.
   - **Result:** The SIEM flags a BruteForce attack, deploys a `Captcha` quarantine. Try logging in again ➔ **Slide-to-Unlock challenge overlays**.
   - **Solve the CAPTCHA**: Slide to unlock. Enter a wrong password again (Try 1/2) ➔ Slide to unlock displays again.
   - **Escalate the Attack**: Slide to unlock a second time, and enter another wrong password (Try 2/2) ➔ The system escalates, deactivates the CAPTCHA block, and deploys a hard VM `Block` policy, locking the `admin` account database-wide.
   - Try logging in again ➔ Your IP is blocked and redirected displaying: `Access Denied...`.

### Phase 4: AI & Anomaly Vector Checks (3 Minutes)
1. **Radar Vector Inspection:**
   - Open the SOC Dashboard **AI Detection** page.
   - Show the 7-dimensional Radar Chart updating with the latest data features.
2. **Manual Feature Validation:**
   - Use the slider controls to input anomalous features manually (e.g., failed logins = 20, error rate = 85%).
   - Click **Run Anomaly Audit**.
   - **Result:** Show the Threat Score jump into the warning zone, displaying the classification of `Malicious` or `Warning`. Show the descriptive labels like `Suspicious` or `Warning` rendering dynamically in the audit logs.
