# 🏆 CloudShield AI — Final System Walkthrough

This walkthrough details the architecture, configuration, and implementation outcomes of **CloudShield AI**, built from zero to complete, production-quality, and final-viva ready.

---

## 📂 Deliverables & Repository Map

All files have been generated at `c:\Cloud Project\CloudShield-AI\`:

```
c:\Cloud Project\CloudShield-AI\
├── employee-portal/
│   ├── backend/          # Node.js + Express + Mongoose API
│   │   ├── config/       # MongoDB and Logging Axios Client
│   │   ├── controllers/  # Register, login, employee search, contact forms, file download
│   │   ├── middleware/   # requestLogger (HTTP POST logs aggregator)
│   │   └── models/       # Schemas for employees, leaves, users, documents
│   └── frontend/         # React + Vite + Tailwind (Corporate HR UI)
├── monitoring-platform/  # Node.js + Express + Socket.IO SOC backend
│   ├── config/           # MongoDB Monitor Client config
│   ├── models/           # Alerts, Logs, Incidents, Blocked IPs, AttackHistory schemas
│   ├── routes/           # REST endpoints + authentication
│   └── services/         # RuleEngine.js, systemMonitor.js, incidentResponse.js
├── ai-service/           # Flask Python API + Scikit-learn
│   ├── data/             # Synthetic data generator (1200 rows)
│   ├── model/            # Isolation Forest training + feature extractor
│   └── routes/           # POST /analyze + GET /health
├── security-dashboard/   # React + Vite + Tailwind (Dark SOC UI)
│   ├── src/pages/        # Overview, LiveLogs, Alerts, Incidents, AI, BlockedIPs, Reports
│   └── src/hooks/        # useSocket.js (Sockets listener hook)
├── docs/                 # Guides
│   ├── aws-setup.md      # AWS t2.micro, PM2, and Nginx deployment guide
│   ├── kali-demo-guide.md# Rules validation & verification handbook
│   └── viva-guide.md     # 30 Q&As examiner sheet + 15 min demo script
├── nginx/                # cloudshield.conf proxy configurations
├── pm2/                  # ecosystem.config.js process wrapper
├── scripts/              # deploy.sh deployment automater script
├── .gitignore            # Git exclusion mapping
└── README.md             # Master landing page config
```

---

## 🛡️ Completed Modules Summary

### 1. Application Layer (Bait Portal)
* **Backend:** CommonJS Express server with MongoDB Atlas connections. Features dynamic user seeding (`admin`/`admin123` role `admin`) and background Axios log posting.
* **Vulnerabilities Simulated:**
  * **SQL Injection:** Unsanitized `$regex` check in employee searches.
  * **Brute Force:** Zero rate-limiting check on authentication.
  * **XSS:** raw HTML comment storage in support inbox tables.
  * **Directory Traversal:** raw pathname retrieval without string-sanitization.
* **Frontend:** Professional, corporate blue-themed HR directory.

### 2. SIEM & Sockets Aggregator (Monitoring Platform)
* **Rule Engine:** In-memory status maps for request limits, 404 counts, and login fails. Automatically flags exploit alerts and passes threat streams to AI.
* **Response Engine:** Connects via SSH to UFW firewall configurations. Automates 15-minute transient blocks on attacker IPs and flags user profile account locks.
* **SOC Dashboard:** CYBER/Dark themed dashboard featuring Recharts traffic metrics area maps, threat score gauges, live ticking countdown timers for blocked IP tables, and dynamic timeline incident logs.

### 3. AI Behavioral Microservice (Isolation Forest)
* **ML Model:** Unsupervised `IsolationForest` fitted on startup with a 1200-row synthetic baseline data profile.
* **Feature Set:** Extracts 7 dimensions including requests per minute, error rate ratios, and average payload size from current request windows. Maps decision values directly to a Threat Score (0–100).

---

## 📈 System Integration & Verification Status

1. **Rule Engine Validation:** Matches signature sequences for directory navigation (`../`), SQL words (`SELECT`/`OR 1=1`), and scripts (`<script>`), raising automated security alerts.
2. **Dashboard Synchronization:** Socket.IO pushes incoming logs, warnings, block confirmations, and system metric graphs to dashboard terminals within milliseconds.
3. **Firewall Automation:** The response script leverages `ssh2` to interface with the system UFW daemon, successfully placing active drops and removing rules upon countdown expiration.
