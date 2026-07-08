// Test lockUserAccount directly
require('dotenv').config();
const mongoose = require('mongoose');

async function testLock() {
  const portalUri = process.env.PORTAL_DB_URI;
  console.log('PORTAL_DB_URI:', portalUri ? 'SET' : 'NOT SET');
  
  if (!portalUri) {
    console.log('PORTAL_DB_URI is not configured!');
    return;
  }

  let portalConn;
  try {
    console.log('Connecting to portal DB...');
    portalConn = await mongoose.createConnection(portalUri).asPromise();
    console.log('Connected to portal DB!');

    const UserModel = portalConn.model(
      'User',
      new mongoose.Schema({
        username: String,
        isLocked: Boolean,
        lastLoginIP: String,
      }),
      'users',
    );

    // First check what users exist
    const allUsers = await UserModel.find({});
    console.log(`\nTotal users in collection: ${allUsers.length}`);
    allUsers.forEach(u => {
      console.log(`  username: ${u.username}, isLocked: ${u.isLocked}, lastLoginIP: "${u.lastLoginIP}"`);
    });

    // Try to find users with lastLoginIP = ::1
    const matching = await UserModel.find({ lastLoginIP: '::1' });
    console.log(`\nUsers with lastLoginIP "::1": ${matching.length}`);
    matching.forEach(u => {
      console.log(`  username: ${u.username}, isLocked: ${u.isLocked}`);
    });

    // Now try the actual update
    console.log('\nAttempting updateMany({ lastLoginIP: "::1" }, { $set: { isLocked: true } })...');
    const result = await UserModel.updateMany(
      { lastLoginIP: '::1' },
      { $set: { isLocked: true } }
    );
    console.log(`Result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

    // Verify
    const admin = await UserModel.findOne({ username: 'admin' });
    console.log(`\nAfter update - admin isLocked: ${admin?.isLocked}`);

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    if (portalConn) await portalConn.close();
    console.log('\nDone.');
  }
}

testLock();
