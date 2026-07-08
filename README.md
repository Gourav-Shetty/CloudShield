# 🛡️ CloudShield AI

> **AI-Assisted Cloud Security Monitoring and Automated Incident Response System**  
> A distributed, multi-service SIEM and IPS application designed for final-year MCA project evaluation.

CloudShield AI bridges the gap between **Layer 7 (Application Layer) vulnerability logging** and **Layer 3/4 (Network Layer) firewall defense**. The system deliberately exposes a vulnerable Employee Management Portal (as bait) to capture realistic application attacks, parses request transactions through a signature-based Rule Engine and an unsupervised Machine Learning model (Isolation Forest), and automates active firewall blocks (`ufw`) via SSH orchestration.

---

## 🏗️ System Architecture

```
                                +---------------------------+
                                |     Kali Linux VM         |
                                |     (Audit Client)        |
                                +---------------------------+
                                              |
                                              | HTTP Exploit Traffic (Port 80 / 3000)
                                              v
+---------------------------------------------------------------------------------------+
| AWS EC2 Instance (Ubuntu 22.04 LTS)                                                   |
|                                                                                       |
|   +-----------------------+            Forward Logs           +-------------------+   |
|   |    Employee Portal    | --------------------------------> |    Monitoring     |   |
|   |  (React/Node.js:3000) |                                   |  (Node.js:5000)   |   |
|   +-----------------------+                                   +-------------------+   |
|                                                                 /       |       \     |
|                                                     Analyze    /        |        \    |
|                                                    (HTTP POST)/         |         \   |
|                                                              v          v          v  |
|                                                     +------------+ +--------+ +-----+ |
|                                                     | AI Service | | Socket | | SSH | |
|                                                     | (Flask:8000| |  .IO   | | UFW | |
|                                                     +------------+ +--------+ +-----+ |
|                                                                         |        |    |
|                                                                         |        |    |
|                                      Push Live Events to SOC Dashboard  v        v    |
|                                    ======================================    Applies  |
|                                    | Security Dashboard (React UI:3001) |    UFW Block|
|                                    ======================================             |
+---------------------------------------------------------------------------------------+
                                                                                   |
                                                                                   v
                                                                       [ Drops subsequent packets ]
```

---

## 🛠️ Technology Stack

| Layer | Component | Technologies Used |
|---|---|---|
| **Auditing** | Penetration Audits VM | Kali Linux, Hydra, Sqlmap, ApacheBench, curl |
| **Bait Web Application** | Employee Portal | React.js, Vite, Tailwind CSS, Express, MongoDB |
| **SIEM & Sockets Engine** | Monitoring Platform | Node.js, Express, Socket.IO, ssh2, MongoDB |
| **Behavioral AI Engine** | Python AI Service | Flask, Python 3, scikit-learn (Isolation Forest), pandas |
| **Front-End Dashboard** | SOC Dashboard UI | React.js, Vite, Tailwind CSS, Recharts |
| **Server & Firewall** | Hosting & Response | AWS EC2 (t2.micro), Ubuntu 22.04 LTS, Nginx, UFW, PM2 |

---

## 📂 Project Structure

```
CloudShield-AI/
├── ai-service/             # Flask Machine Learning API (Isolation Forest)
├── docs/                   # Full Project Documentation guides
│   ├── aws-setup.md        # Step-by-step AWS EC2 & MongoDB cloud installation
│   ├── kali-demo-guide.md  # Rules validation and security check manual
│   └── viva-guide.md       # Examiner preparation questions & viva demo script
├── employee-portal/        # bait HR portal application
│   ├── backend/            # Express API (intentionally vulnerable endpoints)
│   └── frontend/           # React corporate client UI
├── monitoring-platform/    # Main SOC aggregator and ssh blocking backend
├── nginx/                  # Nginx site configurations
├── pm2/                    # PM2 process configuration profiles
├── scripts/                # Deployment utilities
│   └── deploy.sh           # Main one-command deploy script for Ubuntu servers
├── .gitignore              # Repository gitignore configuration
└── README.md               # Master project guide
```

---

## 🚀 Quick Starts

### 1. Documentation Guides (Read First)
Before launching components, refer to the target documentation in the `docs/` directory:
* **[AWS Deployment Guide](docs/aws-setup.md):** Guides you step-by-step to launch a free t2.micro EC2 server, set up billing budgets, install dependencies, and configure security rules.
* **[Defensive Auditing Manual](docs/kali-demo-guide.md):** Outlines testing parameters to trigger SQLi, XSS, brute force, directory traversal, and DDoS alerts, verifying active firewall blocking.
* **[Viva Examiner Guide](docs/viva-guide.md):** Includes project design justifications, a 15-minute exam demo roadmap, and 30 expected examiner question-and-answer pairs.

---

### 2. Local Development (Windows / Local Host)

Ensure **Node.js 20+**, **Python 3.10+**, and a **running MongoDB** (local or Atlas) are ready.

#### Step A: Employee Portal Backend
1. Go to `employee-portal/backend/` and copy `.env.example` to `.env`. Fill in `MONGODB_URI` and `JWT_SECRET`.
2. Install packages and start:
   ```bash
   cd employee-portal/backend
   npm install
   npm start
   ```
   *Logs will seed a default admin user: `admin` / `admin123`.*

#### Step B: Monitoring Platform
1. Go to `monitoring-platform/` and copy `.env.example` to `.env`. Fill in `MONGODB_URI`, `JWT_SECRET`, and `PORTAL_DB_URI`.
2. Install packages and start:
   ```bash
   cd ../../monitoring-platform
   npm install
   npm start
   ```
   *Seeding creates dashboard credentials: `admin` / `cloudshield123`.*

#### Step C: AI Microservice
1. Go to `ai-service/` and install requirements:
   ```bash
   cd ../ai-service
   pip install -r requirements.txt
   python app.py
   ```
   *The Isolation Forest model will auto-train on synthetic data on startup.*

#### Step D: Frontends
Start both user interfaces concurrently (in separate terminals):
```bash
# Employee Portal Frontend (Port 5173)
cd ../employee-portal/frontend
npm install
npm run dev

# SOC Dashboard Frontend (Port 3000 / 5173 alternate)
cd ../../security-dashboard
npm install
npm run dev
```

---

## 🔐 Detection Capabilities

The system screens incoming request windows for the following exploit vectors:

1. **Brute Force:** Triggers if an IP logs `> 5` failed login requests in `60` seconds. (Action: UFW deny IP + lock targeted user profile).
2. **SQL Injection:** Signature check for SQL keywords (`SELECT`, `UNION`, `OR 1=1`) in URL parameters and JSON payloads.
3. **Stored XSS:** Checks for unescaped code markers (`<script>`, `onerror=`, `javascript:`) in contact text fields.
4. **Directory Traversal:** Checks for escape navigation sequences (`../`, `..\`) in file retrieval routes.
5. **HTTP Flood (DoS):** Identifies requests exceeding `100` calls per minute from a single IP.
6. **Behavioral Anomaly:** The Python AI microservice tracks deviations in request frequency, status ratios, payload averages, and route distributions using the Isolation Forest model, raising warning indicators for high threat scores (>80).
