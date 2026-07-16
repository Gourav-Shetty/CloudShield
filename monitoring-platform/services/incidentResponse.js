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
 * Create an incident, apply a progressive quarantine (Block, RateLimit, Captcha),
 * and schedule automatic unblocking/cooldown after 15 minutes.
 *
 * @param {Object} alertData      – Alert-like object with sourceIP, severity, attackType, description
 * @param {Object} io             – Socket.IO server instance
 * @param {Object} classification – Optional AI classifier prediction result
 */
async function handleIncident(alertData, io, classification = null) {
  const ip = alertData.sourceIP;
  const now = new Date();

  // Check if there is an active (Open/Investigating) incident for this IP and attackType
  const existingIncident = await Incident.findOne({
    sourceIP: ip,
    attackType: alertData.attackType,
    status: { $in: ['Open', 'Investigating'] }
  });

  if (existingIncident) {
    console.log(`[IncidentResponse] Aggregating alert into existing Incident: ${existingIncident.incidentId}`);
    
    // Add the new alert reference to the existing incident
    if (alertData._id && !existingIncident.relatedAlerts.includes(alertData._id)) {
      existingIncident.relatedAlerts.push(alertData._id);
    }
    
    existingIncident.actionsTaken.push({
      action: 'Alert aggregated',
      timestamp: now,
      details: alertData.description || `Aggregated duplicate alert for ${alertData.attackType}`,
    });
    
    await existingIncident.save();
    
    if (io) {
      io.emit('incident-updated', existingIncident);
    }
    return existingIncident;
  }

  /* --- Determine progressive restriction type --- */
  let restrictionType = 'Block';
  let rateLimitRps = 2;

  const predictedClass = classification?.predictedClass || alertData.attackType;
  
  if (predictedClass === 'SQLInjection' || predictedClass === 'XSS' || predictedClass === 'PortScan' || (alertData.description && alertData.description.includes('escalation'))) {
    restrictionType = 'Block';
  } else if (predictedClass === 'DDoS' || predictedClass === 'HTTPFlood') {
    // Escalate DDoS / HTTP Flood to hard Block for active demonstration effectiveness
    restrictionType = 'Block';
  } else if (predictedClass === 'BruteForce' || predictedClass === 'Enumeration') {
    restrictionType = 'Captcha';
  }

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

  /* --- 3. Lock Targeted Account (Only for hard 'Block' restriction) --- */
  if (restrictionType === 'Block') {
    try {
      const targetUsername = alertData.details?.username || '';
      await lockUserAccount(ip, targetUsername);
      incident.actionsTaken.push({
        action: 'Account Locked',
        timestamp: new Date(),
        details: `Locked user account associated with IP ${ip}${targetUsername ? ' / Username ' + targetUsername : ''}`,
      });
      report.actionsPerformed.push('Account Locked');
    } catch (lockErr) {
      console.error(`[IncidentResponse] Lock account failed for ${ip}:`, lockErr.message);
    }
  }

  /* --- 4. Check if IP is already restricted --- */
  const existingBlock = await BlockedIp.findOne({ ip, isActive: true });
  if (existingBlock) {
    incident.actionsTaken.push({
      action: 'IP already restricted',
      timestamp: new Date(),
      details: `IP ${ip} is already restricted with policy: ${existingBlock.restrictionType}`,
    });
    await incident.save();
    return incident;
  }

  /* --- 5. SSH Firewall Block (Only for hard 'Block' restriction) --- */
  let sshSuccess = false;
  if (restrictionType === 'Block') {
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
  } else {
    incident.actionsTaken.push({
      action: 'Dynamic quarantine applied',
      timestamp: new Date(),
      details: `Applied progressive quarantine: ${restrictionType}`,
    });
    report.actionsPerformed.push(`Quarantined: ${restrictionType}`);
  }

  /* --- 6. Create BlockedIp document --- */
  const blockedAt = new Date();
  const unblockAt = new Date(blockedAt.getTime() + 15 * 60 * 1000); // +15 min

  const blockedRecord = await BlockedIp.create({
    ip,
    blockedAt,
    unblockAt,
    reason: alertData.description || alertData.attackType,
    attackType: alertData.attackType,
    isActive: true,
    restrictionType,
    rateLimitRps,
  });

  /* --- 7. Persist updates --- */
  incident.actionsTaken.push({
    action: 'BlockedIp record created',
    timestamp: new Date(),
    details: `Restriction type: ${restrictionType}, expires at ${unblockAt.toISOString()}`,
  });
  await incident.save();
  report.timeline.push({
    event: 'IP restricted',
    timestamp: new Date(),
    details: `Restricted under ${restrictionType} policy until ${unblockAt.toISOString()}`,
  });
  await report.save();

  /* --- 8. Socket.IO broadcast --- */
  if (io) {
    io.emit('ip-blocked', {
      ip,
      blockedAt,
      unblockAt,
      reason: alertData.description || alertData.attackType,
      restrictionType,
      rateLimitRps,
    });
  }

  /* --- 9. Schedule auto-unblock (15 min) --- */
  setTimeout(async () => {
    try {
      if (restrictionType === 'Block') {
        // Attempt SSH unblock
        try {
          await sshExec(`sudo ufw delete deny from ${ip}`);
        } catch (sshErr) {
          console.error(`[IncidentResponse] SSH unblock failed for ${ip}:`, sshErr.message);
        }
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
            action: 'IP restriction expired',
            timestamp: new Date(),
            details: `Quarantine expired for ${ip} after 15-minute cooldown`,
          },
        },
      });

      console.log(`[IncidentResponse] Restriction expired for ${ip}`);
    } catch (err) {
      console.error(`[IncidentResponse] Cooldown process error for ${ip}:`, err.message);
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

  // Look up recent failed login logs from this IP to find targeted usernames
  const Log = require('../models/Log');
  let usernames = [];
  try {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // last 5 minutes
    const recentLogs = await Log.find({
      ip,
      eventType: 'Login',
      status: 401,
      timestamp: { $gte: cutoff }
    }).lean();
    usernames = [...new Set(recentLogs.map(l => l.payload?.username).filter(Boolean))];
  } catch (logErr) {
    console.warn('[IncidentResponse] Failed to query recent failed login logs:', logErr.message);
  }

  let portalConn;
  try {
    portalConn = await mongoose.createConnection(portalUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).asPromise();

    const UserModel = portalConn.models.User || portalConn.model(
      'User',
      new mongoose.Schema({
        isLocked: Boolean,
        lastLoginIP: String,
        username: String,
      }),
      'users',
    );

    // Build the query to lock both by IP and by specific targeted usernames
    const query = {
      $or: [
        { lastLoginIP: ip },
      ]
    };
    if (usernames.length > 0) {
      query.$or.push({ username: { $in: usernames } });
    }

    const result = await UserModel.updateMany(
      query,
      { $set: { isLocked: true } },
    );

    console.log(`[IncidentResponse] Locked ${result.modifiedCount} account(s) for IP ${ip} (targeted: ${usernames.join(', ')})`);
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
