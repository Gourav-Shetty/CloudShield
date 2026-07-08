<div align="center">

<img src="https://img.shields.io/badge/CloudShield-AI-0ea5e9?style=for-the-badge&logo=shield&logoColor=white" alt="CloudShield AI"/>

# 🛡️ CloudShield AI

**AI-Powered Cloud Security Monitoring & Automated Incident Response**

*A full-stack, distributed SIEM + IPS system that detects, classifies, and autonomously responds to real-time cyber threats using Machine Learning and automated firewall orchestration.*

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-IsolationForest-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

<br/>

> *Final Year MCA Project — Bridging Layer 7 application-layer vulnerability logging with Layer 3/4 network-layer automated firewall defense.*

</div>

---

## 📖 What Is CloudShield AI?

CloudShield AI is a **multi-service cybersecurity platform** that simulates a real-world Security Operations Center (SOC). It deliberately exposes a vulnerable Employee Management Portal as a **honeypot-style bait application**, captures all incoming attack traffic, pipes it through two detection layers — a **signature-based Rule Engine** and an **unsupervised ML anomaly detector** — and autonomously applies **`ufw` firewall blocks** on the hosting server via SSH.

The result is a closed-loop, end-to-end security pipeline: from the attacker's first malicious request all the way to an automatic IP ban, a live SOC dashboard alert, and a full incident report — all within seconds.

---

## 🏗️ System Architecture

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Kali Linux (Audit VM)                                                      │
 │  Hydra · Sqlmap · ApacheBench · curl                                        │
 └──────────────────────────────┬──────────────────────────────────────────────┘
                                │  HTTP Attack Traffic
                                ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  AWS EC2 (Ubuntu 22.04 LTS) — Production Host                              │
 │                                                                             │
 │  ┌───────────────────────┐    Forward Logs    ┌────────────────────────┐   │
 │  │   Employee Portal     │ ──────────────────▶│  Monitoring Platform   │   │
 │  │  React + Express      │                    │  Node.js + Socket.IO   │   │
 │  │  Port :3000           │                    │  Port :5000            │   │
 │  │  (Vulnerable Bait)    │                    │  Rule Engine + SIEM    │   │
 │  └───────────┬───────────┘                    └──────┬────────┬────────┘   │
 │              │                                       │        │            │
 │           MongoDB                               POST /analyze  Socket.IO   │
 │           (Portal DB)                                │        │            │
 │                                                      ▼        ▼            │
 │                                          ┌──────────────┐  ┌────────────┐  │
 │                                          │ AI Service   │  │  SOC       │  │
 │                                          │ Flask :8000  │  │  Dashboard │  │
 │                                          │ Isolation    │  │  React     │  │
 │                                          │ Forest + RF  │  │  Port :3000│  │
 │                                          └──────────────┘  └────────────┘  │
 │                                                                             │
 │  SSH + UFW  ◀──── Automated Block ────────────────────────────────────────  │
 │  sudo ufw deny from <attacker-ip>                                           │
 └─────────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              [ Subsequent packets dropped ]
```

**The full detection pipeline for a single request:**

```
Incoming Request
      │
      ▼
① Request Logger (Employee Portal middleware)
      │  Logs: IP, method, endpoint, payload, status, timestamp
      ▼
② Rule Engine (Monitoring Platform)
      │  Checks: BruteForce · SQLi · XSS · DirectoryTraversal · HTTPFlood · Enumeration
      ▼
③ AI Microservice (Flask + scikit-learn)
      │  Extracts: 7-feature vector → Isolation Forest (anomaly) + Random Forest (class)
      ▼
④ Incident Response Engine
      │  Creates: Alert → Incident → AttackHistory documents
      ▼
⑤ SSH Orchestration
      │  Executes: `sudo ufw deny from <ip>` on EC2
      ▼
⑥ Real-time Broadcast (Socket.IO)
      │  Emits: new-alert · ip-blocked · stats-update → SOC Dashboard
      ▼
⑦ SOC Dashboard
      └─ Live charts, alerts table, IP block list update instantly
```

---

## 🧠 How the AI Works

The AI Microservice at `ai-service/` uses a **dual-model pipeline**:

| Model | Type | Role |
|-------|------|------|
| **Isolation Forest** | Unsupervised (sklearn) | Detects statistical anomalies in traffic patterns without labelled data |
| **Random Forest Classifier** | Supervised (sklearn) | Classifies traffic into attack categories with a probability confidence score |

**7-feature vector extracted per IP window:**

| Feature | Description |
|---------|-------------|
| `requests_per_minute` | Request rate in the last 60s |
| `failed_login_count` | Failed auth attempts from this IP |
| `unique_endpoints` | Count of distinct URL paths hit |
| `avg_request_interval_ms` | Mean time between successive requests |
| `session_duration_s` | Duration of the IP's current session |
| `error_rate` | Ratio of 4xx/5xx responses |
| `avg_payload_length` | Mean byte length of request bodies |

The Isolation Forest identifies **outliers** (IPs whose behaviour deviates from baseline), while the Random Forest assigns a **threat label + confidence %** (e.g., `SQLInjection (97%)`, `Normal (93%)`).

---

## 🔍 Detection Capabilities

| # | Attack Vector | Detection Method | Threshold | Auto-Response |
|---|--------------|-----------------|-----------|---------------|
| 1 | **Brute Force** | Failed login counter per IP window | > 5 failures / 60s | CAPTCHA → Account Lock → IP Block |
| 2 | **SQL Injection** | Regex signature on URL + payload | Any match | Critical Alert + IP Block |
| 3 | **Cross-Site Scripting (XSS)** | Regex on `<script>`, `onerror=`, `javascript:` | Any match | High Alert |
| 4 | **Directory Traversal** | Regex on `../`, `..\`, `%2e%2e` sequences | Any match | High Alert |
| 5 | **HTTP Flood / DoS** | Request rate counter per IP | > 100 req / 60s | High Alert + Rate Limit |
| 6 | **Endpoint Enumeration** | Unique 404 counter per IP | > 10 unique 404s / 60s | Medium Alert |
| 7 | **Behavioural Anomaly** | Isolation Forest deviation score | Threat score > 80 | AI Warning + Anomaly Record |

### Progressive Containment (Brute Force)
CloudShield applies **graduated responses** rather than blocking on first detection:

```
Attempt 1–5   →  Normal logging
Attempt 6+    →  CAPTCHA challenge required
CAPTCHA fails →  Account locked + IP hard-blocked (UFW deny)
```

---

## 🛠️ Technology Stack

| Layer | Component | Technologies |
|-------|-----------|-------------|
| **Bait Application** | Employee Portal Backend | Node.js, Express.js, MongoDB, JWT, bcrypt |
| **Bait Application** | Employee Portal Frontend | React 18, Vite, Tailwind CSS, Axios |
| **SIEM Core** | Monitoring Platform | Node.js, Express, Socket.IO, Mongoose, ssh2, Morgan |
| **AI Engine** | Anomaly Detection Service | Python 3.10+, Flask, scikit-learn, pandas, NumPy |
| **SOC UI** | Security Dashboard | React 18, Vite, Tailwind CSS, Recharts, Socket.IO Client |
| **Infrastructure** | Server & Firewall | AWS EC2 (Ubuntu 22.04), Nginx, PM2, UFW |
| **Database** | Persistent Storage | MongoDB Atlas (dual databases: portal + monitor) |
| **Audit Tools** | Attack Simulation | Kali Linux, Hydra, Sqlmap, ApacheBench, curl |

---

## 📂 Project Structure

```
CloudShield-AI/
│
├── 🤖 ai-service/                  # Python Flask ML microservice
│   ├── app.py                      # Flask entry point, model init
│   ├── routes/analyze.py           # POST /analyze + GET /health endpoints
│   ├── model/                      # Isolation Forest + Random Forest wrappers
│   │   ├── detector.py             # Anomaly detection (IsolationForest)
│   │   ├── classifier.py           # Attack classification (RandomForest)
│   │   └── feature_extractor.py    # Raw log → 7-feature vector
│   └── requirements.txt
│
├── 🏢 employee-portal/             # Honeypot HR application
│   ├── backend/                    # Express API (intentionally vulnerable)
│   │   ├── middleware/
│   │   │   ├── checkIpBlock.js     # IP block enforcement + CAPTCHA gate
│   │   │   └── requestLogger.js    # Forwards every request log to SIEM
│   │   ├── routes/                 # Auth, employee, leave, contact, CAPTCHA
│   │   └── server.js
│   └── frontend/                   # React corporate HR UI (blue theme)
│       └── src/
│           ├── pages/              # Login, Dashboard, Employees, Leave, Contact, Profile
│           └── components/         # Layout, SlideCaptcha
│
├── 📡 monitoring-platform/         # SIEM aggregator & incident response engine
│   ├── services/
│   │   ├── ruleEngine.js           # Signature detection + threat scoring
│   │   ├── incidentResponse.js     # SSH orchestration + UFW block automation
│   │   └── systemMonitor.js        # CPU/memory/service health broadcaster
│   ├── routes/                     # Auth, Logs, Alerts, Incidents, Blocked IPs, Reports, Analyze
│   ├── models/                     # Log, Alert, Incident, Anomaly, BlockedIp, AttackHistory
│   └── server.js
│
├── 🖥️  security-dashboard/         # SOC analyst React UI (cyberpunk dark theme)
│   └── src/
│       ├── pages/                  # Overview, Alerts, LiveLogs, BlockedIPs, Incidents, AIDetection, Reports
│       └── components/Layout.jsx   # Sidebar with grouped nav + real-time status
│
├── 🌐 nginx/                       # Nginx reverse proxy configuration
├── ⚙️  pm2/                        # PM2 process ecosystem file
├── 🔧 scripts/deploy.sh            # One-command Ubuntu deployment script
└── 📚 docs/
    ├── aws-setup.md                # AWS EC2 + MongoDB Atlas setup guide
    ├── verification-guide.md       # Step-by-step demo & feature verification
    └── viva-guide.md               # 30 examiner Q&A pairs + demo roadmap
```

---

## 🚀 Local Development Setup

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20+ | Backend APIs + Frontend build |
| Python | 3.10+ | AI microservice |
| MongoDB | Atlas or local | Data persistence |
| npm | 9+ | Package management |

---

### Step 1 — Employee Portal Backend

```bash
cd employee-portal/backend
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_SECRET, MONITORING_URL
npm install
npm run dev
```

> Runs on **port 4000**. Seeds default user: `admin` / `admin123`

---

### Step 2 — Monitoring Platform (SIEM)

```bash
cd monitoring-platform
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_SECRET, PORTAL_DB_URI, AI_SERVICE_URL
npm install
npm run dev
```

> Runs on **port 5000**. Seeds dashboard admin: `admin` / `cloudshield123`

---

### Step 3 — AI Microservice

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
python app.py
```

> Runs on **port 8000**. Isolation Forest auto-trains on synthetic baseline data at startup.

---

### Step 4 — Frontend UIs

```bash
# Terminal A — Employee Portal UI
cd employee-portal/frontend
npm install && npm run dev
# → http://localhost:5173

# Terminal B — SOC Security Dashboard
cd security-dashboard
npm install && npm run dev
# → http://localhost:3000
```

---

### 🔑 Default Credentials

| Interface | URL | Username | Password |
|-----------|-----|----------|----------|
| Employee Portal | http://localhost:5173 | `admin` | `admin123` |
| SOC Dashboard | http://localhost:3000 | `admin` | `cloudshield123` |
| AI Service Health | http://localhost:8000/health | — | — |
| Monitoring API | http://localhost:5000 | — | JWT via `/auth/login` |

---

## 🖥️ Screenshots

### SOC Security Dashboard — Overview
> Real-time threat gauge, neon stat cards, live traffic chart, and recent alerts with severity-coded rows.

### Employee Portal — Login
> Split-screen enterprise login with animated gradient panel and security feature highlights.

### AI Detection — Threat Analysis
> Per-IP anomaly scores, classification labels (`SQLInjection 97%`), and radar chart visualization.

### Blocked IPs — Incident Management
> Live list of firewall-blocked IPs with timestamps, reasons, and manual unban controls.

---

## 🔐 Security Features Breakdown

### Rule Engine (Signature-Based)

```javascript
// Example: SQL Injection signature
const SQL_REGEX = /('|--|;|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|OR\s+1\s*=\s*1|EXEC)/i;

// Example: Brute Force tracking
if (loginAttempts[ip].filter(t => t > Date.now() - 60000).length > 5) {
  // → CRITICAL alert + CAPTCHA challenge
}
```

### AI Anomaly Detection (Python)

```python
# POST /analyze
{
  "features": {
    "requests_per_minute": 142,
    "failed_login_count": 8,
    "unique_endpoints": 3,
    "avg_request_interval_ms": 420,
    "session_duration_s": 38,
    "error_rate": 0.73,
    "avg_payload_length": 312
  }
}

# Response
{
  "anomaly_score": -0.42,       # Negative = outlier
  "threat_score": 91,           # 0–100 severity
  "label": "SQLInjection",
  "confidence": 0.97,
  "classification": "Malicious"
}
```

### Automated Firewall Response

```bash
# Executed via SSH (ssh2) when a CRITICAL alert fires:
sudo ufw deny from 198.51.100.42
# → "BLOCKED" confirmation logged to incident timeline

# Auto-reverted after 15 minutes:
sudo ufw delete deny from 198.51.100.42
```

---

## 🌐 Cloud Deployment (AWS EC2)

For full production deployment on Ubuntu 22.04:

```bash
# One-command deploy (after SSH into EC2):
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script handles: Node.js installation, Python venv setup, PM2 process management, Nginx reverse proxy configuration, and UFW firewall rules.

See **[`docs/aws-setup.md`](docs/aws-setup.md)** for the complete step-by-step guide including:
- EC2 instance launch + security group setup
- MongoDB Atlas cluster configuration + IP whitelisting
- Environment variable configuration
- Nginx site setup + PM2 startup scripts
- SSL/TLS setup with Let's Encrypt (optional)

---

## 📊 Live Monitoring Events (Socket.IO)

The dashboard receives real-time updates via the following Socket.IO events:

| Event | Payload | Dashboard Effect |
|-------|---------|-----------------|
| `new-log` | `{ ip, method, endpoint, status }` | Traffic chart updates, total log counter increments |
| `new-alert` | `{ severity, attackType, sourceIP, description }` | Alert appears in table, threat score recalculated |
| `ip-blocked` | `{ ip, blockedAt, unblockAt, reason }` | Blocked IP appears in list, counter increments |
| `ip-unblocked` | `{ ip, unblockedAt }` | IP removed from list after auto-expiry (15 min) |
| `system-status` | `{ cpu, memory, uptime, aiService }` | System health panel updates |
| `stats-update` | `{ totalLogs, activeAlerts, ... }` | All stat cards refresh |

---

## 🧪 Testing Attack Scenarios

Use **Kali Linux** (or any HTTP client) to simulate attacks and watch the SOC dashboard respond in real-time:

```bash
# 1. Brute Force (triggers CAPTCHA at 6 failures)
hydra -l admin -P /usr/share/wordlists/rockyou.txt \
  http-post-form "http://<host>:3000/api/auth/login:username=^USER^&password=^PASS^:Invalid"

# 2. SQL Injection
curl -X POST http://<host>:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"search": "1'\'' OR '\''1'\''='\''1"}'

# 3. XSS Attempt
curl -X POST http://<host>:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"message": "<script>alert(document.cookie)</script>"}'

# 4. Directory Traversal
curl "http://<host>:3000/api/files?path=../../etc/passwd"

# 5. HTTP Flood (100+ req/min triggers alert)
ab -n 500 -c 50 http://<host>:3000/api/employees
```

Expected SOC dashboard response for each: alert created → incident logged → firewall block applied → live dashboard updates within **< 2 seconds**.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`docs/aws-setup.md`](docs/aws-setup.md) | Complete AWS EC2 deployment guide |
| [`docs/verification-guide.md`](docs/verification-guide.md) | Step-by-step feature verification with expected outputs |
| [`docs/viva-guide.md`](docs/viva-guide.md) | 30 examiner Q&As, 15-min demo roadmap, system justifications |

---

## 🗺️ Roadmap / Future Scope

- [ ] **GeoIP Threat Map** — Visualise attack source countries on a world map
- [ ] **Email/SMS Alerting** — Notify SOC analysts via Twilio/SendGrid on critical incidents
- [ ] **MITRE ATT&CK Mapping** — Tag each detected attack to MITRE framework TTPs
- [ ] **Threat Intelligence Feeds** — Integrate with AbuseIPDB/VirusTotal for IP reputation
- [ ] **Packet-Level Capture** — Add Scapy/Wireshark integration for Layer 3/4 inspection
- [ ] **Deep Learning Upgrade** — Replace Isolation Forest with LSTM-based sequence anomaly detection

---

## 👨‍💻 Author

> Built as a Final Year MCA Project demonstrating the integration of **Machine Learning**, **real-time distributed systems**, **cloud infrastructure**, and **automated cybersecurity response** in a single unified platform.

---

<div align="center">

**⭐ Star this repo if you found it useful!**

*CloudShield AI — Detect. Classify. Respond. Automatically.*

</div>
