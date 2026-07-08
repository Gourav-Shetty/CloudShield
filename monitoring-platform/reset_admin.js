// Reset everything for a clean test
require('dotenv').config();
const mongoose = require('mongoose');

async function resetAll() {
  // Reset admin in portal DB
  const portalUri = process.env.PORTAL_DB_URI;
  const portalConn = await mongoose.createConnection(portalUri).asPromise();
  const User = portalConn.model('User', new mongoose.Schema({ username: String, isLocked: Boolean }), 'users');
  await User.updateOne({ username: 'admin' }, { $set: { isLocked: false } });
  console.log('✔ Admin account unlocked');
  await portalConn.close();

  // Clear blocked IPs in monitor DB
  const monitorUri = process.env.MONGODB_URI;
  const monitorConn = await mongoose.createConnection(monitorUri).asPromise();
  const BlockedIp = monitorConn.model('BlockedIp', new mongoose.Schema({}, { strict: false }), 'blocked_ips');
  const deleted = await BlockedIp.deleteMany({});
  console.log(`✔ Cleared ${deleted.deletedCount} blocked IP records`);
  await monitorConn.close();

  console.log('\nAll clean! Restart your servers and test again.');
}

resetAll().catch(console.error);
