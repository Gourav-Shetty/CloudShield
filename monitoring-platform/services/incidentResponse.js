const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');
const mongoose = require('mongoose');

const Incident = require('../models/Incident');
const AttackHistory = require('../models/AttackHistory');
const BlockedIp = require('../models/BlockedIp');

/* ------------------------------------------------------------------ */
/*  SSH helper                                                         */
/* ------------------------------------------------------------------ */

/**
 * Execute a command on the remote EC2 instance via SSH.
 * Returns the stdout on success or throws on failure.
 */
function sshExec(command) {
  return new Promise((resolve, reject) => {
    const host = process.env.SSH_HOST;
    const username = process.env.SSH_USERNAME || 'ubuntu';
    const keyPath = process.env.SSH_PRIVATE_KEY_PATH || './keys/cloudshield-key.pem';

    if (!host) {
      return reject(new Error('SSH_HOST not configured'));
    }

    let privateKey;
    try {
      privateKey = fs.readFileSync(path.resolve(keyPath));
    } catch (err) {
      return reject(new Error(`SSH key not found at ${keyPath}: ${err.message}`));
    }

    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          let stdout = '';
          let stderr = '';

          stream.on('data', (data) => {
            stdout += data.toString();
          });
          stream.stderr.on('data', (data) => {
            stderr += data.toString();
          });
          stream.on('close', (code) => {
            conn.end();
            if (code !== 0) {
              return reject(new Error(`SSH command exited with code ${code}: ${stderr}`));
            }
            resolve(stdout.trim());
          });
        });
      })
      .on('error', (err) => {
        reject(err);
      })
      .connect({ host, username, privateKey });
  });
}

/* ------------------------------------------------------------------ */
/*  handleIncident — automated incident response                       */
/* ------------------------------------------------------------------ */

/**
 * Create an incident, attempt to block the IP via SSH/UFW,
 * and schedule automatic unblocking after 15 minutes.
 *
 * @param {Object} alertData – Alert-like object with sourceIP, severity, attackType, description
 * @param {Object} io        – Socket.IO server instance
 */
async function handleIncident(alertData, io) {
  const ip = alertData.sourceIP;
  const now = new Date();

  /* --- 1. Create Incident --- */
  const incident = new Incident({
    status: 'Open',
    severity: alertData.severity || 'Critical',
    relatedAlerts: alertData._id ? [alertData._id] : [],
    sourceIP: ip,
    attackType: alertData.attackType,
    actionsTaken: [
      {
        action: 'Incident created',
        timestamp: now,
        details: alertData.description || `Auto-created from ${alertData.attackType} alert`,
      },
    ],
  });
  await incident.save();

  /* --- 2. Create AttackHistory report --- */
  const report = new AttackHistory({
    ipAddress: ip,
    attackType: alertData.attackType,
    severity: alertData.severity || 'Critical',
    ruleTriggered: alertData.attackType,
    summary: alertData.description || `${alertData.attackType} attack from ${ip}`,
    timeline: [
      {
        event: 'Attack detected',
        timestamp: now,
        details: alertData.description || '',
      },
    ],
    actionsPerformed: ['Incident created'],
  });
  await report.save();

  /* --- 3. Check if IP is already blocked --- */
  const existingBlock = await BlockedIp.findOne({ ip, isActive: true });
  if (existingBlock) {
    incident.actionsTaken.push({
      action: 'IP already blocked',
      timestamp: new Date(),
      details: `IP ${ip} was already blocked at ${existingBlock.blockedAt}`,
    });
    await incident.save();
    return incident;
  }

  /* --- 3.5 Lock Targeted Account (if Brute Force) --- */
  if (alertData.attackType === 'BruteForce') {
    try {
      await lockUserAccount(ip);
      incident.actionsTaken.push({
        action: 'Account Locked',
        timestamp: new Date(),
        details: `Locked user account associated with IP ${ip}`,
      });
      report.actionsPerformed.push('Account Locked');
    } catch (lockErr) {
      console.error(`[IncidentResponse] Lock account failed for ${ip}:`, lockErr.message);
    }
  }

  /* --- 4. SSH block --- */
  let sshSuccess = false;
  try {
    await sshExec(`sudo ufw deny from ${ip} && echo 'BLOCKED'`);
    sshSuccess = true;
    incident.actionsTaken.push({
      action: 'IP blocked via UFW',
      timestamp: new Date(),
      details: `Successfully blocked ${ip} on firewall`,
    });
    report.actionsPerformed.push('IP blocked via UFW');
  } catch (err) {
    console.error(`[IncidentResponse] SSH block failed for ${ip}:`, err.message);
    incident.actionsTaken.push({
      action: 'SSH block failed',
      timestamp: new Date(),
      details: `Failed to block ${ip} via SSH: ${err.message}`,
    });
    report.actionsPerformed.push(`SSH block failed: ${err.message}`);
  }

  /* --- 5. Create BlockedIp document --- */
  const blockedAt = new Date();
  const unblockAt = new Date(blockedAt.getTime() + 15 * 60 * 1000); // +15 min

  const blockedRecord = await BlockedIp.create({
    ip,
    blockedAt,
    unblockAt,
    reason: alertData.description || alertData.attackType,
    attackType: alertData.attackType,
    isActive: true,
  });

  /* --- 6. Persist updates --- */
  incident.actionsTaken.push({
    action: 'BlockedIp record created',
    timestamp: new Date(),
    details: `Block expires at ${unblockAt.toISOString()}`,
  });
  await incident.save();
  report.timeline.push({
    event: 'IP blocked',
    timestamp: new Date(),
    details: `Blocked until ${unblockAt.toISOString()}`,
  });
  await report.save();

  /* --- 7. Socket.IO broadcast --- */
  if (io) {
    io.emit('ip-blocked', {
      ip,
      blockedAt,
      unblockAt,
      reason: alertData.description || alertData.attackType,
    });
  }

  /* --- 8. Schedule auto-unblock (15 min) --- */
  setTimeout(async () => {
    try {
      // Attempt SSH unblock
      try {
        await sshExec(`sudo ufw delete deny from ${ip}`);
      } catch (sshErr) {
        console.error(`[IncidentResponse] SSH unblock failed for ${ip}:`, sshErr.message);
      }

      // Update BlockedIp
      await BlockedIp.findByIdAndUpdate(blockedRecord._id, {
        isActive: false,
        unblockedAt: new Date(),
      });

      // Emit unblock event
      if (io) {
        io.emit('ip-unblocked', { ip, unblockedAt: new Date() });
      }

      // Update incident
      await Incident.findByIdAndUpdate(incident._id, {
        $push: {
          actionsTaken: {
            action: 'IP auto-unblocked',
            timestamp: new Date(),
            details: `Auto-unblocked ${ip} after 15-minute cooldown`,
          },
        },
      });

      console.log(`[IncidentResponse] Auto-unblocked ${ip}`);
    } catch (err) {
      console.error(`[IncidentResponse] Auto-unblock error for ${ip}:`, err.message);
    }
  }, 15 * 60 * 1000);

  return incident;
}

/* ------------------------------------------------------------------ */
/*  manualBlock                                                        */
/* ------------------------------------------------------------------ */

async function manualBlock(ip, reason, io) {
  const existingBlock = await BlockedIp.findOne({ ip, isActive: true });
  if (existingBlock) {
    return { message: `IP ${ip} is already blocked`, block: existingBlock };
  }

  // Attempt SSH block
  try {
    await sshExec(`sudo ufw deny from ${ip} && echo 'BLOCKED'`);
  } catch (err) {
    console.error(`[IncidentResponse] Manual SSH block failed for ${ip}:`, err.message);
  }

  const blockedAt = new Date();
  const unblockAt = new Date(blockedAt.getTime() + 15 * 60 * 1000);

  const block = await BlockedIp.create({
    ip,
    blockedAt,
    unblockAt,
    reason: reason || 'Manual block',
    attackType: 'Manual',
    isActive: true,
  });

  if (io) {
    io.emit('ip-blocked', { ip, blockedAt, unblockAt, reason: reason || 'Manual block' });
  }

  // Schedule auto-unblock
  setTimeout(async () => {
    try {
      try {
        await sshExec(`sudo ufw delete deny from ${ip}`);
      } catch (_) {}

      await BlockedIp.findByIdAndUpdate(block._id, {
        isActive: false,
        unblockedAt: new Date(),
      });

      if (io) {
        io.emit('ip-unblocked', { ip, unblockedAt: new Date() });
      }
    } catch (err) {
      console.error(`[IncidentResponse] Scheduled unblock error:`, err.message);
    }
  }, 15 * 60 * 1000);

  return { message: `IP ${ip} blocked`, block };
}

/* ------------------------------------------------------------------ */
/*  manualUnblock                                                      */
/* ------------------------------------------------------------------ */

async function manualUnblock(ip, io) {
  const block = await BlockedIp.findOne({ ip, isActive: true });
  if (!block) {
    return { message: `No active block found for ${ip}` };
  }

  // Attempt SSH unblock
  try {
    await sshExec(`sudo ufw delete deny from ${ip}`);
  } catch (err) {
    console.error(`[IncidentResponse] Manual SSH unblock failed for ${ip}:`, err.message);
  }

  block.isActive = false;
  block.unblockedAt = new Date();
  await block.save();

  if (io) {
    io.emit('ip-unblocked', { ip, unblockedAt: new Date() });
  }

  return { message: `IP ${ip} unblocked`, block };
}

/* ------------------------------------------------------------------ */
/*  lockUserAccount                                                    */
/* ------------------------------------------------------------------ */

/**
 * Connect to the Employee Portal database and lock any user account
 * whose last login originated from the given IP address.
 */
async function lockUserAccount(ip) {
  const portalUri = process.env.PORTAL_DB_URI;
  if (!portalUri) {
    console.warn('[IncidentResponse] PORTAL_DB_URI not set — cannot lock account');
    return { success: false, message: 'PORTAL_DB_URI not configured' };
  }

  let portalConn;
  try {
    portalConn = await mongoose.createConnection(portalUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).asPromise();

    // Assume the portal stores users in a "users" collection
    const UserModel = portalConn.model(
      'User',
      new mongoose.Schema({
        isLocked: Boolean,
        lastLoginIP: String,
      }),
      'users',
    );

    const result = await UserModel.updateMany(
      { lastLoginIP: ip },
      { $set: { isLocked: true } },
    );

    console.log(`[IncidentResponse] Locked ${result.modifiedCount} account(s) for IP ${ip}`);
    return { success: true, modifiedCount: result.modifiedCount };
  } catch (err) {
    console.error('[IncidentResponse] Failed to lock accounts:', err.message);
    return { success: false, message: err.message };
  } finally {
    if (portalConn) {
      await portalConn.close();
    }
  }
}

module.exports = {
  handleIncident,
  manualBlock,
  manualUnblock,
  lockUserAccount,
};
