# 🏆 CloudShield AI — Master Deployment, Auditing, and Viva Guide
## (A Complete Final-Year MCA Evaluation Blueprint)

This document is the master orchestration guide for **CloudShield AI**. It consolidates all steps required to set up the infrastructure, deploy the codebase, audit the detection engines, and present a live demonstration for academic examiners.

---

## 📋 Table of Contents
1. [System Architecture & Flow](#1-system-architecture--flow)
2. [Phase A: AWS EC2 VM Setup](#2-phase-a-aws-ec2-vm-setup)
3. [Phase B: MongoDB Atlas Setup](#3-phase-b-mongodb-atlas-setup)
4. [Phase C: Repository Deployment](#4-phase-c-repository-deployment)
5. [Phase D: Security Audit & Rule Validation](#5-phase-d-security-audit--rule-validation)
6. [Phase E: Live Viva Demo Roadmap (15 Minutes)](#6-phase-e-live-viva-demo-roadmap-15-minutes)
7. [Phase F: Essential Examiner Q&A Sheet](#7-phase-f-essential-examiner-qa-sheet)

---

## 1. System Architecture & Flow

CloudShield AI is a closed-loop security system that monitors application-layer transactions (Layer 7) and automates network-layer blocks (Layer 3/4) upon threat detection.

```
                  +--------------------------------+
                  |         Auditing Client        |
                  |     (Kali Linux / Windows Host) |
                  +--------------------------------+
                                  |
                                  | HTTP Exploit Audit
                                  v
+-----------------------------------------------------------------------+
| AWS EC2 VM (Ubuntu 22.04 LTS)                                         |
|                                                                       |
|   +---------------------+  Log Forward  +-------------------------+   |
|   |   Employee Portal   | ------------> |   Monitoring Platform   |   |
|   |  (React/Node:3000)  |               |  (Node/Socket.IO:5000)  |   |
|   +---------------------+               +-------------------------+   |
|                                            /         |         \      |
|                               POST /analyze          |          \     |
|                                          v           |           v    |
|                                    +----------+ +---------+ +-------+ |
|                                    | AI Flask | | Sockets | | SSH   | |
|                                    |  (8000)  | | Broadcast | UFW   | |
|                                    +----------+ +---------+ +-------+ |
|                                                      |          |     |
|                                                      v          v     |
|                                                +-----------+ +------+ |
|                                                | Dashboard | | deny | |
|                                                |  (3001)   | | rule | |
|                                                +-----------+ +------+ |
+-----------------------------------------------------------------------+
```

---

## 2. Phase A: AWS EC2 VM Setup

Follow these steps to launch your virtual server on AWS EC2.

### Step 1: Set a $0 Billing Safety Alert
Before launching resources, set up a zero-spend budget to avoid unexpected charges:
1. Log in to your [AWS Management Console](https://console.aws.amazon.com/).
2. Search for **Billing** in the top search bar and click **Billing and Cost Management**.
3. In the left-hand menu, click **Budgets** → **Create budget**.
4. Select **Customize (advanced)** → **Cost budget** → **Next**.
5. Configure:
   - **Budget name:** `ZeroCostAlert`
   - **Period:** Monthly
   - **Budget amount:** `1` (USD)
6. Click **Next** → **Add an alert threshold**:
   - **Threshold:** `1` % of budgeted amount (meaning $0.01)
   - **Email recipients:** Enter your personal email address.
7. Click **Next** → **Create budget**. AWS will now email you if any resources generate even a $0.01 charge.

### Step 2: Launch the Ubuntu VM
1. Go to the **EC2 Dashboard** and click **Launch instance**.
2. Set the following parameters:
   - **Name:** `CloudShield-Security-Server`
   - **OS Image (AMI):** `Ubuntu Server 22.04 LTS` (Look for the **"Free tier eligible"** label)
   - **Architecture:** `64-bit (x86)`
   - **Instance Type:** `t2.micro` (Free tier eligible)
   - **Key Pair:** Click **Create new key pair**. Set:
     - *Key pair name:* `cloudshield-key`
     - *Private key file format:* `.pem`
     - Click **Create key pair** (the file `cloudshield-key.pem` will download automatically).
   - **Storage:** Increase from the default 8 GB to **`20 GiB gp3`** (GP3 is faster and still within the 30 GB free tier allowance).

### Step 3: Configure Network Firewall Rules (Security Group)
Under **Network settings** during launch (or by editing the security group after launch), add the following inbound rules:

| Rule Type | Port | Source | Description |
|---|---|---|---|
| SSH | 22 | My IP (or Anywhere for demo) | SSH Server access |
| HTTP | 80 | Anywhere (0.0.0.0/0) | Nginx reverse proxy |
| Custom TCP | 3000 | Anywhere (0.0.0.0/0) | Employee Portal API |
| Custom TCP | 3001 | Anywhere (0.0.0.0/0) | Employee Portal Frontend |
| Custom TCP | 5000 | Anywhere (0.0.0.0/0) | Monitoring Platform API |
| Custom TCP | 5173 | Anywhere (0.0.0.0/0) | SOC Dashboard Frontend |
| Custom TCP | 8000 | Anywhere (0.0.0.0/0) | AI Flask Service |

Click **Launch Instance**.

### Step 4: SSH Connection from Windows
1. Open **Git Bash** (or WSL / command terminal) on Windows.
2. Locate the folder where you saved the downloaded key (e.g. `Downloads` or `~/.ssh`).
3. Set the key file permissions (SSH will reject keys that are too open):
   ```bash
   chmod 400 cloudshield-key.pem
   ```
4. Connect to the instance (replace the IP with your EC2 Public IP):
   ```bash
   ssh -i cloudshield-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```
5. Type `yes` to confirm the host key verification. You are now inside the Linux terminal.

### Step 5: Install Server Dependencies
Once connected, copy and paste this entire block into the VM terminal to install the system packages:
```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3, pip, and virtual environments
sudo apt install -y python3 python3-pip python3-venv

# Install Nginx and Git
sudo apt install -y nginx git

# Install PM2 globally (Process Manager for Node)
sudo npm install -g pm2

# Enable PM2 on system boot
pm2 startup
# (Run the exact sudo env command printed by the output above)

# Verify installations
node -v && python3 --version && nginx -v && pm2 --version
```

### Step 6: Enable UFW Firewall
Configure UFW to prevent external locks while keeping target ports accessible:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 5173/tcp
sudo ufw allow 8000/tcp
sudo ufw --force enable
sudo ufw status
```

---

## 3. Phase B: MongoDB Atlas Setup

CloudShield AI uses MongoDB Atlas to run separate logical databases for the application and the monitoring hub.

### Step 1: Create Cluster
1. Sign up/Log in to [cloud.mongodb.com](https://cloud.mongodb.com/) (Google login is free and cardless).
2. Click **Build a Database** and select the **M0 Free** cluster.
3. Select **AWS** as the provider and choose `ap-south-1` (Mumbai) or your closest region.
4. Set the cluster name to `CloudShieldCluster` and click **Create**.

### Step 2: Configure Credentials and Whitelist
1. **Create Database User:**
   - Username: `cloudshield`
   - Password: Create a secure password (write it down, e.g., `pass123`)
   - Role: Atlas admin (Read/write access)
2. **Configure Network Access:**
   - Click **Network Access** in the left menu.
   - Click **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`). (This allows your EC2 VM and local PC to connect without updating IP ranges).

### Step 3: Get connection strings
1. Go to **Database** → click **Connect** next to your cluster.
2. Select **Drivers** (Node.js).
3. Copy the connection string template:
   `mongodb+srv://cloudshield:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
4. Replace `<password>` with your database user password. Keep this string ready.

---

## 4. Phase C: Repository Deployment

### Step 1: Clone the Repo on the VM
In your EC2 SSH terminal, run:
```bash
cd /home/ubuntu
git clone https://github.com/<YOUR_USERNAME>/CloudShield-AI.git
cd CloudShield-AI
```

### Step 2: Configure Environment Variables
You must create three separate `.env` files. Open a terminal text editor to write them:

#### 1. Portal Backend Environment
```bash
nano employee-portal/backend/.env
```
Paste and update:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://cloudshield:<DB_PASSWORD>@cluster0.xxxxx.mongodb.net/cloudshield_portal?retryWrites=true&w=majority
JWT_SECRET=supersecrettoken123
JWT_EXPIRES_IN=24h
MONITORING_URL=http://localhost:5000
```
*(Save and exit via `Ctrl+X` → `Y` → `Enter`)*

#### 2. Monitoring Backend Environment
```bash
nano monitoring-platform/.env
```
Paste and update:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://cloudshield:<DB_PASSWORD>@cluster0.xxxxx.mongodb.net/cloudshield_monitor?retryWrites=true&w=majority
JWT_SECRET=socdashboardsecret456
AI_SERVICE_URL=http://localhost:8000
PORTAL_DB_URI=mongodb+srv://cloudshield:<DB_PASSWORD>@cluster0.xxxxx.mongodb.net/cloudshield_portal?retryWrites=true&w=majority

# SSH firewall configuration (local loopback interface)
SSH_HOST=127.0.0.1
SSH_USERNAME=ubuntu
SSH_PRIVATE_KEY_PATH=/home/ubuntu/.ssh/cloudshield-key.pem
```

#### 3. AI Flask Service Environment
```bash
nano ai-service/.env
```
Paste:
```env
PYTHONUNBUFFERED=1
PORT=8000
CONTAMINATION=0.15
N_ESTIMATORS=200
```

### Step 3: Copy Your Private Key
The monitoring platform needs access to the host SSH interface to run UFW updates. Copy the content of your local `cloudshield-key.pem` private key into the VM's SSH directory:
```bash
nano /home/ubuntu/.ssh/cloudshield-key.pem
```
*Paste your private key (.pem file text) completely.*
```bash
# Secure the key permissions on the VM
chmod 600 /home/ubuntu/.ssh/cloudshield-key.pem
```

### Step 4: Run the Deploy Script
Run the automated builder script:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```
This script will install all Node modules, set up the Python environment, compile the React assets, apply Nginx proxy configurations, and bootstrap the services via PM2 and systemd.

---

## 5. Phase D: Security Audit & Rule Validation

You can verify the rules using any testing machine (like a Kali VM or WSL prompt on Windows) with access to the EC2 Public IP.

---

### Audit 1: Brute Force Detection Check
* **Verification:** Attempts to send multiple failed authentication requests to verify that the monitoring tool intercepts logins and locks the client out.
* **Testing Command:**
  Run `hydra` against the login API (this tests a fast authentication dictionary lookup):
  ```bash
  hydra -l admin -P /usr/share/wordlists/fasttrack.txt http-post-form \
    "/api/auth/login:username=^USER^&password=^PASS^:Invalid" \
    -s 3000 -vV <YOUR_EC2_PUBLIC_IP>
  ```
* **Expected Result:** The Rule Engine flags a `BruteForce` event (5 failed attempts). The monitoring server executes `sudo ufw deny` against your auditing IP, disconnecting Hydra. The **Blocked IPs** table on the dashboard shows a 15-minute countdown.

---

### Audit 2: SQL Injection Query Validation
* **Verification:** Tests how the database search route handles query parameters containing SQL syntax tokens.
* **Testing Command:**
  Run `sqlmap` to audit the employee query input parameter:
  ```bash
  sqlmap -u "http://<YOUR_EC2_PUBLIC_IP>:3000/api/employees/search?search=test" --batch --dbms=mongodb --level=1
  ```
* **Expected Result:** The rule engine matches the query patterns (e.g. `'`, `UNION`, `SELECT`), raises a `Critical` `SQLInjection` alert, and blocks the auditing machine IP instantly.

---

### Audit 3: XSS Payload Interception Check
* **Verification:** Validates that code elements submitted in input text forms trigger warnings before they can be rendered.
* **Testing Command:**
  Submit a script tag using `curl` to the portal contact backend:
  ```bash
  curl -X POST http://<YOUR_EC2_PUBLIC_IP>:3000/api/contact \
    -H "Content-Type: application/json" \
    -d '{"name": "Auditor", "email": "test@audit.org", "subject": "Audit", "message": "<script>alert(1)</script>"}'
  ```
* **Expected Result:** A `High` severity `XSS` alert triggers and prints to the live log terminal feed.

---

### Audit 4: Directory Traversal Check
* **Verification:** Tests if relative directory navigation triggers alerts on file retrieval routes.
* **Testing Command:**
  Attempt to fetch system files via traversal variables using `curl`:
  ```bash
  curl "http://<YOUR_EC2_PUBLIC_IP>:3000/api/download?file=../../../../etc/passwd"
  ```
* **Expected Result:** Intercepted as `DirectoryTraversal` of `High` severity.

---

### Audit 5: HTTP Flood (DoS) Check
* **Verification:** Tests rate throttling by firing a rapid request volume.
* **Testing Command:**
  Run ApacheBench to perform 500 requests at a concurrency level of 10:
  ```bash
  ab -n 500 -c 10 http://<YOUR_EC2_PUBLIC_IP>:3000/api/employees
  ```
* **Expected Result:** Request count per minute spikes. Triggers a `HTTPFlood` warning.

---

### Audit 6: Vulnerability Scanner Signature Check (Port Scan)
* **Verification:** Verifies that automated security scanners are recognized by their User-Agent signatures.
* **Testing Command:**
  Send a query with a custom Nmap User-Agent header:
  ```bash
  curl -A "Mozilla/5.0 (compatible; Nmap Scripting Engine; http://nmap.org/book/nse.html)" \
    "http://<YOUR_EC2_PUBLIC_IP>:3000/api/employees"
  ```
* **Expected Result:** Rule engine flags a `PortScan` threat type, triggering a critical alert and blocking the IP.

---

### Audit 7: AI Anomaly Vector Validation
* **Verification:** Verifies that the Isolation Forest model returns elevated Threat Scores when evaluating anomalous feature vectors.
* **Testing Command:**
  Manually post a high-traffic feature block to the `/monitor/analyze` proxy route:
  ```bash
  curl -X POST http://<YOUR_EC2_PUBLIC_IP>:5000/monitor/analyze \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <YOUR_ADMIN_JWT_TOKEN>" \
    -d '{
      "features": {
        "requests_per_minute": 350.0,
        "failed_login_count": 12,
        "unique_endpoints": 28,
        "avg_request_interval_ms": 120.0,
        "session_duration_s": 30.0,
        "error_rate": 0.75,
        "avg_payload_length": 850.0
      }
    }'
  ```
* **Expected Result:** Returns prediction `-1` (Anomaly) with a Threat Score of `> 80` (Malicious).

---

## 6. Phase E: Live Viva Demo Roadmap (15 Minutes)

Follow this structure during your exam presentation to showcase a complete system:

```
[00:00 - 03:00]  Introduction & Setup Showroom
  - Show Nginx dashboard. Log in to the blue HR Employee Portal (admin / admin123).
  - Open the SOC Dashboard in another window (admin / cloudshield123). Point out
    the system metrics (CPU, Memory, Sockets online, UFW status active).

[03:00 - 07:00]  Exploits Verification Check
  - Trigger Directory Traversal in a separate browser tab: /api/download?file=../../etc/passwd.
  - Show the SOC dashboard immediately display a High alert card.
  - Submit a comment containing <script> on the contact form. Show the XSS Alert card.

[07:00 - 12:00]  Automated Incident Mitigation Loop (The Climax)
  - Run the Nmap User-Agent audit query (Audit 5b) or Hydra.
  - Point to the SOC dashboard: Live log terminal streams, Critical Alert fires,
    the IP is instantly added to the Blocked IPs table with a 15-minute countdown.
  - Attempt to load the Employee Portal from your testing client: connection times out.
  - Show the terminal: Run `sudo ufw status` on the VM to verify the rule is in place.

[12:00 - 15:00]  AI Behavioral Page & Reports
  - Open the AI Detection tab. Show the Radar chart representing features.
  - Adjust sliders to simulate malicious metrics, click analyze, and show the Threat Score jump.
  - Download the incident log report as a JSON file.
```

---

## 7. Phase F: Essential Examiner Q&A Sheet

Memorize these top 15 questions and answers for your viva:

#### Q1: What makes this system unique compared to standard security tools?
**A:** Standard security models use static firewall rules. CloudShield AI links application-layer behavior analysis (regex signature engine + Isolation Forest machine learning) with automated host-level network firewall reconfiguration (UFW block rules) dynamically.

#### Q2: How does the logging process work?
**A:** The Employee Portal backend runs a custom `requestLogger` middleware. Whenever a client gets a response, the portal intercepts and forwards the transaction log (IP, status, payload, User-Agent) via HTTP POST to the SOC monitoring backend.

#### Q3: Why did you separate the portal DB from the monitoring DB?
**A:** To maintain modular separation of concerns. The Employee Portal database (`cloudshield_portal`) manages employee identities and user roles. The Monitoring database (`cloudshield_monitor`) holds security logs, alerts, incidents, and blocked IPs.

#### Q4: Why is Isolation Forest used for anomaly detection?
**A:** In computer networks, normal traffic is abundant, while malicious events are rare and unpredictable. Isolation Forest is an unsupervised algorithm that isolates outliers by randomly partitioning feature values. Because anomalies require fewer splits to isolate, they have shorter path lengths in the trees, letting us spot zero-day attacks without labels.

#### Q5: What features are analyzed by the AI service?
**A:** A 7-dimensional vector representing an IP's activity window: `requests_per_minute`, `failed_login_count`, `unique_endpoints`, `avg_request_interval_ms`, `session_duration_s`, `error_rate`, and `avg_payload_length`.

#### Q6: Why did you use WebSockets (Socket.IO)?
**A:** Traditional HTTP polling creates network overhead and delays alert delivery. Socket.IO maintains a persistent TCP channel to push live logs, system stats, and alerts to the dashboard instantly.

#### Q7: How is the Python Flask service connected to Node.js?
**A:** Node.js proxies request windows to the Flask service via HTTP POST `/analyze`. Flask processes the data, calculates the anomaly score, and returns JSON. This prevents CPU-heavy Python calculations from blocking the Node event loop.

#### Q8: How does the auto-unblocking mechanism function?
**A:** When an IP block is executed, a Node.js `setTimeout` is scheduled for 15 minutes. Upon expiration, the backend connects via SSH to the server and runs `sudo ufw delete deny from [IP]`.

#### Q9: How is the bait web application intentionally vulnerable?
**A:**
- **SQLi:** The employee search endpoint passes parameters directly into a Mongoose regex query without validation.
- **XSS:** The contact message form stores inputs raw without HTML escaping.
- **Directory Traversal:** The file download endpoint accepts paths containing `../` sequences without sanitization.

#### Q10: How does Nginx route requests?
**A:** Nginx acts as a reverse proxy. It listens on port 80 and routes path segments: `/` goes to the static employee portal, `/dashboard` to the security dashboard, `/api` to the portal API, and `/monitor` to the monitoring backend.

#### Q11: How is the database user protected?
**A:** We use environment files (`.env`) to map variables like `MONGODB_URI` and `JWT_SECRET`. These files are excluded from Git via `.gitignore` to prevent credentials leakage.

#### Q12: What is the rule signature for SQL Injection detection?
**A:** It screens query strings and payload values against a regex scanning for SQL keywords and characters: `/('|--|;|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|OR\s+1\s*=\s*1)/i`.

#### Q13: What happens to a user account when their IP is blocked?
**A:** For authentication-related attacks (like brute-force), the monitoring engine locks the portal user account (`isLocked: true`) in the database, preventing further login attempts from other IPs.

#### Q14: How did you verify the dashboard runs without errors?
**A:** We compiled the React frontends using Vite (`npm run build`). Vite processes the code, validates syntax, and outputs optimized static bundles (HTML, JS, CSS) to `/dist` directories.

#### Q15: How can system logs be exported for compliance?
**A:** Administrators can navigate to the Reports tab on the SOC dashboard, select an incident, and download a structured JSON audit log containing the full attack history and blocking timeline.
