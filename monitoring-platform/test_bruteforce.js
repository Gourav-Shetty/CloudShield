const axios = require('axios');

// Simulate 7 failed login logs sent directly to the monitoring platform
async function testBruteForce() {
  const monitoringUrl = 'http://localhost:5000';
  
  console.log("Sending 7 failed login logs directly to monitoring platform...\n");
  
  for (let i = 1; i <= 7; i++) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        ip: '::1',
        method: 'POST',
        endpoint: '/api/auth/login',
        status: 401,
        userAgent: 'Mozilla/5.0 BruteForceTest',
        eventType: 'Login',
        payload: { username: 'admin', reason: 'Invalid password' },
      };
      
      const response = await axios.post(`${monitoringUrl}/logs`, logEntry, { timeout: 5000 });
      const alert = response.data.alert;
      
      console.log(`Attempt ${i}: Log saved (ID: ${response.data.logId})`);
      if (alert) {
        console.log(`  >>> ALERT TRIGGERED! Type: ${alert.attackType}, Severity: ${alert.severity}`);
        console.log(`  >>> Description: ${alert.description}`);
      }
    } catch (err) {
      console.error(`Attempt ${i}: ERROR - ${err.message}`);
    }
  }
  
  console.log("\nDone! Now check if admin account is locked...\n");
  
  // Check the admin user
  const mongoose = require('mongoose');
  const uri = "mongodb+srv://cloudshield:UJYdrUs9mgOkKs@cloudshieldcluster.mjjbyzh.mongodb.net/cloudshield_portal?retryWrites=true&w=majority&appName=CloudShieldCluster";
  
  // Wait a moment for the incident response to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await mongoose.connect(uri);
  const User = mongoose.model('User', new mongoose.Schema({ username: String, isLocked: Boolean, lastLoginIP: String }), 'users');
  const admin = await User.findOne({ username: 'admin' });
  
  if (admin) {
    console.log(`Admin user isLocked: ${admin.isLocked}`);
    console.log(`Admin user lastLoginIP: ${admin.lastLoginIP}`);
    if (admin.isLocked) {
      console.log("\n✅ SUCCESS! Account is locked! The brute force detection works!");
    } else {
      console.log("\n❌ Account is NOT locked. The lockout did not trigger.");
    }
  }
  
  await mongoose.disconnect();
}

testBruteForce().catch(console.error);
