const mongoose = require('mongoose');

const monitorUri = 'mongodb+srv://cloudshield:UJYdrUs9mgOkKs@cloudshieldcluster.mjjbyzh.mongodb.net/cloudshield_monitor?retryWrites=true&w=majority&appName=CloudShieldCluster';
const portalUri = 'mongodb+srv://cloudshield:UJYdrUs9mgOkKs@cloudshieldcluster.mjjbyzh.mongodb.net/cloudshield_portal?retryWrites=true&w=majority&appName=CloudShieldCluster';

async function reset() {
  try {
    console.log('--- RESETTING CLOUDSHIELD AI SECURITY STATE ---');

    // 1. Connect to Monitor DB and clear all blocked IPs
    console.log('Connecting to Monitoring DB...');
    const monitorConn = await mongoose.createConnection(monitorUri).asPromise();
    const BlockedIp = monitorConn.model('BlockedIp', new mongoose.Schema({ isActive: Boolean }), 'blockedips');
    const Alert = monitorConn.model('Alert', new mongoose.Schema({}), 'alerts');
    const Incident = monitorConn.model('Incident', new mongoose.Schema({}), 'incidents');
    const Anomaly = monitorConn.model('Anomaly', new mongoose.Schema({}), 'anomalies');

    console.log('Clearing all active IP bans...');
    await BlockedIp.updateMany({}, { $set: { isActive: false } });
    
    console.log('Clearing all alerts, incidents, and anomalies...');
    await Alert.deleteMany({});
    await Incident.deleteMany({});
    await Anomaly.deleteMany({});
    await monitorConn.close();
    console.log('Monitoring DB clean.');

    // 2. Connect to Portal DB and unlock all user accounts
    console.log('Connecting to Portal DB...');
    const portalConn = await mongoose.createConnection(portalUri).asPromise();
    const User = portalConn.model('User', new mongoose.Schema({ isLocked: Boolean }), 'users');

    console.log('Unlocking all portal user accounts...');
    await User.updateMany({}, { $set: { isLocked: false } });
    await portalConn.close();
    console.log('Portal DB clean.');

    console.log('\n✔ SUCCESS: All IP blocks cleared and all accounts unlocked! Ready for testing.');
  } catch (err) {
    console.error('Reset failed:', err.stack);
  }
}

reset();
