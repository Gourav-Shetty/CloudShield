# 🎓 CloudShield AI — Viva Preparation & Examiner Guide

This document is compiled to prepare students for the final project viva evaluation. It contains detailed architectural descriptions, justifications for design choices, 30 highly anticipated examiner questions with complete answers, and a structured script for a 15-minute live demonstration.

---

## 🏗️ System Architecture & Data Flow

CloudShield AI is a distributed cloud security monitoring and response platform divided into four main layers:

```
+------------------------------------------+
|          1. ATTACK / AUDIT CLIENT        |
|             (Kali Linux / VM)            |
+------------------------------------------+
                     | HTTP Requests
                     v
+------------------------------------------+
|         2. APPLICATION BAIT LAYER        |
|     Employee Portal API (Node.js/Port 3000)|
|    Employee Portal UI (React/Vite/Port 80) |
+------------------------------------------+
                     | Forward Logs (HTTP POST)
                     v
+------------------------------------------+
|         3. MONITORING & RESPONSE         |
|     SIEM Platform API (Node.js/Port 5000)  |
|       Rule Engine -> Alerts Database     |
|   Incident Response -> SSH Command UFW   |
|   SOC Dashboard (React/Socket.IO/Port 80)|
+------------------------------------------+
          |                        ^
          | HTTP POST /analyze     | JSON Response
          v                        |
+------------------------------------------+
|           4. AI MICROSERVICE             |
|        Flask Service (Python/Port 8000)  |
|      Isolation Forest Anomaly Classifier |
+------------------------------------------+
```

### Log Lifecycle Flow:
1. An incoming HTTP request hits the **Employee Portal** backend.
2. The `requestLogger` middleware intercepts the request data and response status code.
3. The Portal sends the log via a fire-and-forget HTTP POST to `/logs` on the **Monitoring Platform**.
4. The Monitoring Platform runs the log through:
   - **The Rule Engine:** Scans against regex signatures for known exploits (SQLi, XSS, Path Traversal, Brute Force, Flood).
   - **The AI Service:** Proxies a 7-dimensional feature vector of the IP's recent activity window to the **Flask ML Service**.
5. The Flask service runs the vector through an unsupervised **Isolation Forest** model, generating a Threat Score (0–100).
6. If the Rule Engine finds a `Critical` threat OR the AI threat score is `> 80`:
   - An active **Incident** report is initialized.
   - The backend establishes an SSH tunnel to the host VM and executes UFW firewall blocking rules: `sudo ufw deny from [ATTACKER_IP]`.
   - The user account associated with the attacking IP is locked in the portal database.
7. Real-time updates (logs, alerts, blocks, and system resource metrics) are broadcast to the dark-themed **SOC Dashboard** via **Socket.IO**.

---

## 🛠️ Technology Choices Justification

Examiners frequently ask **"Why did you use X instead of Y?"**. Use these bulletproof responses:

* **Why MongoDB?**
  * *Response:* Security logs are semi-structured JSON payloads with varying metadata (e.g., payload objects for SQLi might differ from auth payloads). MongoDB's document-based, schemaless nature is ideal for capturing nested JSON records compared to rigid relational SQL schemas. We split the architecture into separate database contexts (`cloudshield_portal` and `cloudshield_monitor`) to mimic a decoupled production environment.
* **Why Isolation Forest for Anomaly Detection?**
  * *Response:* Security logs contain mostly normal traffic with rare attack patterns. Supervised algorithms (like Random Forests or SVMs) require heavily labeled datasets and struggle with zero-day attacks. Isolation Forest is an unsupervised algorithm that isolates anomalies by randomly partitioning feature paths. Since anomalies require fewer splits to isolate, they appear closer to the root of the trees (shorter path lengths). This allows us to detect brand-new, unseen attack patterns without needing prior labels.
* **Why Socket.IO instead of polling?**
  * *Response:* In a Security Operations Center (SOC), a delay of a few seconds can allow an attacker to dump a database or pull sensitive files. Traditional HTTP polling creates unnecessary network overhead and introduces latency. Socket.IO establishes a persistent WebSockets connection, pushing security alerts and live console logs to screen dashboards in milliseconds.
* **Why Node.js + Python instead of doing everything in Python?**
  * *Response:* This project implements a microservices architecture. Node.js is excellent for high-throughput, I/O-bound web APIs, asynchronous event processing, and real-time WebSockets connection management. Python is the industry standard for machine learning, providing robust ML library support (`scikit-learn`, `numpy`, `pandas`). Splitting them ensures that heavy ML fitting and prediction operations do not block the real-time event-loop of our primary API gateway.

---

## ❓ 30 Expected Examiner Questions & Answers

### Part 1: Core Architecture & System Flow

#### Q1: What is the main objective of this project?
**A:** The project demonstrates a closed-loop security system that bridges Layer 7 web application vulnerability detection with automated Layer 3/4 network firewall mitigation, utilizing a hybrid approach of signature-based rules and behavior-based unsupervised machine learning (Isolation Forest).

#### Q2: What are the target interfaces exposed in the Employee Portal for exploit demonstration?
**A:** 
1. `/api/auth/login` (rate limit vulnerability / brute force target)
2. `/api/employees/search` (SQL Injection target)
3. `/api/contact` (Stored XSS target)
4. `/api/download` (Directory Traversal target)
5. `/api/admin/users` (Hidden route / admin enumeration target)

#### Q3: How do the Employee Portal and Monitoring Platform communicate?
**A:** The Employee Portal uses an Axios client to post structured log JSON arrays containing the request metadata to the monitoring server asynchronously, preventing logging logic from slowing down user transactions.

#### Q4: Why is there an SSH connection from the monitoring platform to the EC2 server?
**A:** To automate incident mitigation. When a critical threat is confirmed, the monitoring backend acts as an orchestrator, connecting back to the host operating system via SSH to configure local packet filters (`ufw deny`).

#### Q5: Is the Employee Portal safe to host on the public internet?
**A:** Only in controlled environments. Since it exposes intentional security vulnerabilities (SQLi, Directory Traversal, stored scripts), it should be protected by source IP access controls (security groups) or run in isolated evaluation environments.

---

### Part 2: Security & Firewall Mechanics

#### Q6: How does the system prevent an attacker from being blocked permanently?
**A:** The automated UFW block utilizes a transient database entry. When an IP is blocked, a document is saved with an `unblockAt` timestamp set to 15 minutes in the future. A Node.js timeout triggers an SSH command to execute `sudo ufw delete deny from [IP]` when the duration expires.

#### Q7: What firewall command is executed to block an IP, and how does Nginx behave?
**A:** The server runs `sudo ufw deny from [IP]`. Once this rule is active at the network level, Nginx will never see subsequent requests from that IP; the packets are dropped by the Linux kernel netfilter framework.

#### Q8: How does UFW differ from standard iptables in your project?
**A:** UFW (Uncomplicated Firewall) is a user-friendly frontend wrapper for `iptables`. We call UFW commands because they are easier to parse programmatically and update cleanly without breaking system routing tables.

#### Q9: What happens to a compromised user account during an attack?
**A:** If a critical authentication alert is triggered, the response engine connects to the `cloudshield_portal` database and locks the targeted user account (`isLocked: true`). This stops the attacker even if they subsequently rotate IPs.

#### Q10: How does the system prevent the SSH key from being exposed?
**A:** The SSH private key (`cloudshield-key.pem`) is stored locally on the server filesystem with restricted permissions (`chmod 400`) and the path/contents are managed strictly via system environment variables (`.env`). It is never pushed to public Git repositories.

---

### Part 3: Signature-Based Rule Engine

#### Q11: How does the Rule Engine detect SQL Injection?
**A:** It evaluates the request endpoint and stringified request body against a regular expression scanning for SQL SQL keywords and operators: `UNION`, `SELECT`, `OR 1=1`, `--`, etc.

#### Q12: How does the Rule Engine detect XSS?
**A:** It runs recursive screening on input payload fields matching HTML elements and script handlers: `<script>`, `javascript:`, `onerror`, `onload`.

#### Q13: What is the rule signature for Directory Traversal?
**A:** It checks the file input parameter for relative navigation patterns: `../`, `..\`, and their URL-encoded equivalents (`%2e%2e%2f`, `%2e%2e%5c`).

#### Q14: How does the engine distinguish between standard load and a brute-force authentication event?
**A:** Brute-force tracking specifically isolates failed authentication attempts (`Login` event, status `>= 400`). Standard traffic spikes are tracked separately under the HTTP Flood rule (>100 total requests per minute).

#### Q15: How are temporary counters cleared in the Rule Engine?
**A:** The engine runs a cleanup cycle every 30 seconds (`setInterval`) that iterates over in-memory logs and filters out records older than 60 seconds to prevent memory leaks.

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

#### Q22: What happens if the Socket.IO server goes offline?
**A:** The dashboard uses Socket.IO client-side auto-reconnection logic. It displays a "Disconnected" indicator in the navigation header and periodically attempts to reconnect.

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
1. **Show the bait:** Open `http://[EC2-IP]/` in your browser. Show the blue, clean "CloudShield Corp" Employee Portal. Log in using user: `admin`, password: `admin123`.
2. **Expose records:** Navigate to the Employees page, show the database records, search filters, and leave request tabs.
3. **Open the SOC:** Open `http://[EC2-IP]/dashboard/` in a split window. Show the dark-themed Security Dashboard. Log in using `admin` / `cloudshield123`.
4. **Point out elements:** Show the live threat gauge (resting at green/Safe), the system status indicator (all services green/running), and the empty Blocked IPs table.

### Phase 2: Simulating Application Exploit Checks (4 Minutes)
1. **Directory Traversal Verification:**
   - In your browser or curl, access: `http://[EC2-IP]/api/download?file=../../../../etc/passwd`
   - Immediately point to the SOC dashboard.
   - **Result:** A red glow flashes. A `DirectoryTraversal` alert with `High` severity appears in the live feed.
2. **Stored XSS Verification:**
   - In the Employee Portal, submit a contact message containing a script element: `<script>alert("XSS")</script>`.
   - Point to the SOC dashboard.
   - **Result:** An `XSS` alert appears on the dashboard. The raw string is safely rendered as text by the dashboard UI.

### Phase 3: Live Automated Block Demonstration (5 Minutes)
1. **Brute Force Verification:**
   - Run a Hydra login audit check from your Kali Linux terminal.
   - Show the live logs terminal on the SOC dashboard scroll rapidly.
   - **Result:** A `BruteForce` critical alert triggers.
   - **Firewall Action:** Point out the countdown banner that instantly appears on the Blocked IPs page.
   - Show the Kali terminal hang. Attempt to load the portal from the Kali machine; it will time out.
2. **Local Firewall Audit:**
   - SSH into the EC2 instance from a safe IP. Run: `sudo ufw status`.
   - **Result:** Show the examiner the rule: `Anywhere DENY [Kali_IP]`.

### Phase 4: AI & Anomaly Vector Checks (3 Minutes)
1. **Radar Vector Inspection:**
   - Open the SOC Dashboard **AI Detection** page.
   - Show the 7-dimensional Radar Chart updating with the latest data features.
2. **Manual Feature Validation:**
   - Use the slider controls to input anomalous features manually (e.g., failed logins = 20, error rate = 85%).
   - Click **Run Anomaly Audit**.
   - **Result:** Show the Threat Score jump into the warning zone (>80), displaying the classification of `Malicious`.
