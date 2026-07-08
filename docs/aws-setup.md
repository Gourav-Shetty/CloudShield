# ☁️ CloudShield AI — Complete AWS EC2 Setup Guide

> **Audience:** Absolute beginners with zero prior cloud experience.
> Follow every step exactly. Do **not** skip anything.

---

## Table of Contents

1. [Create an AWS Account](#1-create-an-aws-account)
2. [Set a $0 Billing Alert](#2-set-a-0-billing-alert)
3. [Launch an EC2 Instance](#3-launch-an-ec2-instance)
4. [Configure Security Group Rules](#4-configure-security-group-rules)
5. [Connect via SSH from Windows](#5-connect-via-ssh-from-windows)
6. [Install All Server Software](#6-install-all-server-software)
7. [Enable the UFW Firewall](#7-enable-the-ufw-firewall)
8. [Set Up MongoDB Atlas (Free M0)](#8-set-up-mongodb-atlas-free-m0)
9. [Clone the Repository](#9-clone-the-repository)
10. [Create Environment Files](#10-create-environment-files)
11. [Run the Deployment Script](#11-run-the-deployment-script)
12. [Verify Everything Works](#12-verify-everything-works)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Create an AWS Account

1. Open <https://aws.amazon.com/> and click **Create an AWS Account**.
2. Enter your **email address** and choose an **account name** (e.g., `CloudShield-Dev`).
3. Verify the email — AWS will send a verification code.
4. Choose **Personal** account type.
5. Enter your **credit/debit card** — *AWS will charge ₹2 / $1 to verify, then refund it.*
6. Complete **identity verification** (phone/SMS).
7. Select the **Basic Support — Free** plan.
8. Sign in to the **AWS Management Console** at <https://console.aws.amazon.com/>.

> **⚠️ Important:** The Free Tier gives you **750 hours/month** of t2.micro for 12 months — more than enough to run 24/7 for one month.

---

## 2. Set a $0 Billing Alert

This ensures you are **immediately notified** if any charges appear.

1. Go to **AWS Console** → search for **Billing** → click **Billing and Cost Management**.
2. In the left sidebar, click **Budgets** → **Create a budget**.
3. Choose **Customize (advanced)** → **Cost budget** → **Next**.
4. Set:
   - **Budget name:** `ZeroCostAlert`
   - **Period:** Monthly
   - **Budget amount:** `1` (USD)
5. Click **Next** → **Add an alert threshold**:
   - **Threshold:** `1` % of budgeted amount (i.e., $0.01)
   - **Email recipients:** Enter your email address
6. Click **Next** → **Create budget**.

You will now get an email if **any** charge appears on your account.

---

## 3. Launch an EC2 Instance

1. In the AWS Console, use the **search bar** at the top — type `EC2` → click **EC2**.
2. Make sure you are in the **Mumbai (ap-south-1)** region (top-right dropdown).
   - *You can use any region, but Mumbai gives the lowest latency from India.*
3. Click the orange **Launch instance** button.

### Instance Settings

| Setting                  | Value                                          |
|--------------------------|-------------------------------------------------|
| **Name**                 | `CloudShield-AI-Server`                         |
| **OS Image (AMI)**       | Ubuntu Server 22.04 LTS (Free tier eligible)    |
| **Architecture**         | 64-bit (x86)                                    |
| **Instance type**        | `t2.micro` (Free tier eligible)                 |
| **Key pair**             | Click **Create new key pair** (see below)        |
| **Network settings**     | Keep defaults + allow SSH, HTTP (see below)      |
| **Storage**              | `20 GiB` gp3 (increase from default 8 GiB)     |

### Create a Key Pair

1. Click **Create new key pair**.
2. **Key pair name:** `cloudshield-key`
3. **Type:** RSA
4. **Format:** `.pem` (for Git Bash / Linux / macOS)
5. Click **Create key pair** — the file `cloudshield-key.pem` downloads automatically.
6. **Move it to a safe location:**

```powershell
# In PowerShell on your Windows machine
mkdir ~\.ssh -Force
Move-Item ~\Downloads\cloudshield-key.pem ~\.ssh\cloudshield-key.pem
```

### Network Settings (during launch)

Check these boxes:
- ✅ Allow SSH traffic from **My IP**
- ✅ Allow HTTP traffic from the internet
- ✅ Allow HTTPS traffic from the internet

4. Click **Launch instance**.
5. Wait ~60 seconds for the instance to reach **Running** state.
6. Click on the **Instance ID** to open the detail page.
7. Copy the **Public IPv4 address** (e.g., `13.232.xxx.xxx`) — you will need this.

---

## 4. Configure Security Group Rules

We need additional ports open for the monitoring dashboard and AI service.

1. On the EC2 instance detail page, click the **Security** tab.
2. Click the **Security group** link (e.g., `sg-0abc123...`).
3. Click **Edit inbound rules** → **Add rule** for each of these:

| Type        | Port Range | Source          | Description              |
|-------------|-----------|-----------------|--------------------------|
| SSH         | 22        | My IP           | SSH access               |
| HTTP        | 80        | 0.0.0.0/0      | Nginx web server         |
| HTTPS       | 443       | 0.0.0.0/0      | Future SSL               |
| Custom TCP  | 3000      | 0.0.0.0/0      | Employee Portal API      |
| Custom TCP  | 5000      | 0.0.0.0/0      | Monitoring Platform      |
| Custom TCP  | 8000      | 0.0.0.0/0      | AI Service               |

4. Click **Save rules**.

> **Note:** Ports 3000/5000/8000 are opened for **direct debugging only**. In production, all traffic goes through Nginx on port 80 and these direct ports are not needed.

---

## 5. Connect via SSH from Windows

### Option A: Git Bash (Recommended)

1. Install Git for Windows from <https://git-scm.com/download/win> if you don't have it.
2. Open **Git Bash**.
3. Run:

```bash
# Fix key permissions (required — SSH will refuse an open key)
chmod 400 ~/.ssh/cloudshield-key.pem

# Connect to your EC2 instance (replace the IP)
ssh -i ~/.ssh/cloudshield-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

4. Type `yes` when asked about the fingerprint.
5. You should see `ubuntu@ip-xxx-xxx-xxx-xxx:~$` — you are now on the server.

### Option B: Windows Terminal / PowerShell

```powershell
ssh -i $env:USERPROFILE\.ssh\cloudshield-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

### Option C: PuTTY

1. Download PuTTY and PuTTYgen from <https://www.putty.org/>.
2. Open PuTTYgen → **Load** → select `cloudshield-key.pem` → **Save private key** as `cloudshield-key.ppk`.
3. Open PuTTY → **Host Name:** `ubuntu@<YOUR_EC2_PUBLIC_IP>` → **Port:** 22.
4. In the sidebar: **Connection → SSH → Auth → Credentials** → browse to `cloudshield-key.ppk`.
5. Click **Open**.

---

## 6. Install All Server Software

Run **every command below** in order on the EC2 instance.

### 6.1 Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 6.2 Install Node.js 20

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify
node -v    # Should print v20.x.x
npm -v     # Should print 10.x.x
```

### 6.3 Install Python 3 & pip

```bash
sudo apt install -y python3 python3-pip python3-venv

# Verify
python3 --version   # Should print Python 3.10.x or later
pip3 --version
```

### 6.4 Install Nginx

```bash
sudo apt install -y nginx

# Verify Nginx is running
sudo systemctl status nginx
# You should see "active (running)"
```

Visit `http://<YOUR_EC2_PUBLIC_IP>/` in your browser — you should see the **Welcome to nginx!** page.

### 6.5 Install PM2 (Node.js process manager)

```bash
sudo npm install -g pm2

# Verify
pm2 --version   # Should print 5.x.x

# Set PM2 to start on boot
pm2 startup
# It will print a command starting with "sudo env PATH=..." — COPY AND RUN that command.
```

### 6.6 Install Git

```bash
sudo apt install -y git

# Verify
git --version
```

### 6.7 Install build-essential (needed for some npm packages)

```bash
sudo apt install -y build-essential
```

---

## 7. Enable the UFW Firewall

```bash
# Allow SSH first (so you don't lock yourself out!)
sudo ufw allow OpenSSH

# Allow web traffic
sudo ufw allow 'Nginx Full'

# Allow direct access to services (for debugging)
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 8000/tcp

# Enable the firewall
sudo ufw enable
# Type 'y' to confirm

# Verify
sudo ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
3000/tcp                   ALLOW       Anywhere
5000/tcp                   ALLOW       Anywhere
8000/tcp                   ALLOW       Anywhere
```

---

## 8. Set Up MongoDB Atlas (Free M0)

CloudShield AI uses MongoDB for storing user data, security logs, and AI predictions. We will use **MongoDB Atlas** (cloud-hosted, free forever).

### 8.1 Create an Atlas Account

1. Go to <https://www.mongodb.com/atlas> → click **Try Free**.
2. Sign up with Google or email.
3. Choose the **M0 Free** tier.

### 8.2 Create a Cluster

1. **Provider:** AWS
2. **Region:** Mumbai (ap-south-1) — *same region as your EC2 for lowest latency*
3. **Cluster name:** `CloudShield-Cluster`
4. Click **Create Deployment**.

### 8.3 Create a Database User

1. You will be prompted immediately. Set:
   - **Username:** `cloudshield-admin`
   - **Password:** Click **Autogenerate Secure Password** → **copy and save this password!**
2. Click **Create Database User**.

### 8.4 Whitelist Your EC2 IP

1. Click **Network Access** in the left sidebar.
2. Click **Add IP Address**.
3. For development/demo, click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *In production, add only your EC2's public IP.*
4. Click **Confirm**.

### 8.5 Get Your Connection String

1. Go back to **Database** → click **Connect** on your cluster.
2. Choose **Drivers** → **Node.js**.
3. Copy the connection string. It looks like:

```
mongodb+srv://cloudshield-admin:<PASSWORD>@cloudshield-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=CloudShield-Cluster
```

4. Replace `<PASSWORD>` with the password you saved.
5. **Save this full string** — you will paste it into `.env` files.

---

## 9. Clone the Repository

```bash
cd /home/ubuntu

# Clone your project (replace with your actual repo URL)
git clone https://github.com/<YOUR_USERNAME>/CloudShield-AI.git

# Verify
ls CloudShield-AI/
```

You should see: `ai-service/  docs/  employee-portal/  monitoring-platform/  nginx/  pm2/  scripts/  security-dashboard/  README.md`

---

## 10. Create Environment Files

### 10.1 Employee Portal Backend `.env`

```bash
nano /home/ubuntu/CloudShield-AI/employee-portal/backend/.env
```

Paste the following (edit the values):

```env
NODE_ENV=production
PORT=3000

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://cloudshield-admin:<PASSWORD>@cloudshield-cluster.xxxxx.mongodb.net/employee-portal?retryWrites=true&w=majority

# JWT secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random

# JWT token expiry
JWT_EXPIRES_IN=24h
```

Press `Ctrl+X` → `Y` → `Enter` to save.

> **Tip:** Generate a random JWT secret with: `openssl rand -hex 32`

### 10.2 Monitoring Platform `.env`

```bash
nano /home/ubuntu/CloudShield-AI/monitoring-platform/.env
```

```env
NODE_ENV=production
PORT=5000

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://cloudshield-admin:<PASSWORD>@cloudshield-cluster.xxxxx.mongodb.net/monitoring?retryWrites=true&w=majority

# AI Service URL (internal)
AI_SERVICE_URL=http://127.0.0.1:8000
```

### 10.3 AI Service `.env`

```bash
nano /home/ubuntu/CloudShield-AI/ai-service/.env
```

```env
PYTHONUNBUFFERED=1
PORT=8000

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://cloudshield-admin:<PASSWORD>@cloudshield-cluster.xxxxx.mongodb.net/ai-service?retryWrites=true&w=majority

# Model parameters
CONTAMINATION=0.1
N_ESTIMATORS=100
```

---

## 11. Run the Deployment Script

```bash
cd /home/ubuntu/CloudShield-AI

# Make the deploy script executable
chmod +x scripts/deploy.sh

# Run it
./scripts/deploy.sh
```

The script will:
1. ✅ Pull latest code from Git
2. ✅ Install Employee Portal backend dependencies
3. ✅ Build Employee Portal frontend
4. ✅ Install Monitoring Platform dependencies
5. ✅ Build Security Dashboard frontend
6. ✅ Set up Python venv and install AI dependencies
7. ✅ Copy and activate Nginx config
8. ✅ Install and start AI Service systemd unit
9. ✅ Start all Node.js services with PM2

Wait for the **"DEPLOYMENT COMPLETE"** message.

---

## 12. Verify Everything Works

### 12.1 Check PM2 services

```bash
pm2 status
```

You should see:

```
┌────┬────────────────────────┬─────────┬──────┬───────────┬──────────┐
│ id │ name                   │ mode    │ ↺    │ status    │ cpu      │
├────┼────────────────────────┼─────────┼──────┼───────────┼──────────┤
│ 0  │ employee-portal        │ fork    │ 0    │ online    │ 0%       │
│ 1  │ monitoring-platform    │ fork    │ 0    │ online    │ 0%       │
└────┴────────────────────────┴─────────┴──────┴───────────┴──────────┘
```

### 12.2 Check AI Service

```bash
sudo systemctl status cloudshield-ai
```

Should show `active (running)`.

### 12.3 Check Nginx

```bash
sudo systemctl status nginx
```

Should show `active (running)`.

### 12.4 Test from your browser

Open these URLs in your browser (replace `<IP>` with your EC2 public IP):

| URL                          | Expected Result                     |
|------------------------------|-------------------------------------|
| `http://<IP>/`               | Employee Portal login page          |
| `http://<IP>/api/`           | API response (JSON)                 |
| `http://<IP>/dashboard/`     | Security Dashboard UI               |
| `http://<IP>/monitor/`       | Monitoring API response             |
| `http://<IP>/ai/`            | AI Service health check response    |

### 12.5 Test from the command line on EC2

```bash
curl http://localhost:3000        # Employee Portal API
curl http://localhost:5000        # Monitoring Platform
curl http://localhost:8000        # AI Service
curl http://localhost             # Nginx → Employee Portal Frontend
```

---

## 13. Troubleshooting

### PM2 service is not "online"

```bash
# Check logs
pm2 logs employee-portal --lines 50
pm2 logs monitoring-platform --lines 50

# Common fix: missing .env file
ls -la /home/ubuntu/CloudShield-AI/employee-portal/backend/.env
ls -la /home/ubuntu/CloudShield-AI/monitoring-platform/.env
```

### AI Service won't start

```bash
# Check logs
sudo journalctl -u cloudshield-ai -f

# Common fixes:
# 1. Missing venv
cd /home/ubuntu/CloudShield-AI/ai-service && python3 -m venv venv

# 2. Missing requirements
source venv/bin/activate && pip install -r requirements.txt
```

### Nginx returns 502 Bad Gateway

This means Nginx is running but the backend service is down.

```bash
# Check which service is on which port
sudo ss -tlnp | grep -E '3000|5000|8000'

# Restart everything
pm2 restart all
sudo systemctl restart cloudshield-ai
sudo systemctl restart nginx
```

### Cannot connect to MongoDB

```bash
# Test MongoDB connection from EC2
# Install mongosh
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongosh

# Test connection
mongosh "mongodb+srv://cloudshield-admin:<PASSWORD>@cloudshield-cluster.xxxxx.mongodb.net/"
```

### Port not accessible from browser

```bash
# Check UFW
sudo ufw status

# Check EC2 Security Group in AWS Console
# Make sure the port is in the inbound rules
```

### SSH connection timeout

- Verify the **Security Group** allows SSH (port 22) from your IP.
- Your IP may have changed — update the Security Group rule.
- Check if the instance is in **Running** state in the EC2 console.

---

## Quick Reference Card

| Component              | Port  | Command to restart                     |
|------------------------|-------|----------------------------------------|
| Employee Portal        | 3000  | `pm2 restart employee-portal`          |
| Monitoring Platform    | 5000  | `pm2 restart monitoring-platform`      |
| AI Service             | 8000  | `sudo systemctl restart cloudshield-ai`|
| Nginx                  | 80    | `sudo systemctl restart nginx`         |
| **All services**       | —     | `./scripts/deploy.sh`                  |

---

*Last updated: July 2026*
