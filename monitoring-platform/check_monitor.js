const mongoose = require('mongoose');

const uri = "mongodb+srv://cloudshield:UJYdrUs9mgOkKs@cloudshieldcluster.mjjbyzh.mongodb.net/cloudshield_monitor?retryWrites=true&w=majority&appName=CloudShieldCluster";

async function checkMonitor() {
  try {
    console.log("Connecting to MongoDB Atlas Monitor DB...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    const Alert = mongoose.model('Alert', new mongoose.Schema({}, { strict: false }), 'alerts');
    const Log = mongoose.model('Log', new mongoose.Schema({}, { strict: false }), 'logs');
    const Incident = mongoose.model('Incident', new mongoose.Schema({}, { strict: false }), 'incidents');

    const logsCount = await Log.countDocuments();
    const alertsCount = await Alert.countDocuments();
    const incidentsCount = await Incident.countDocuments();

    console.log("----------------------------------------");
    console.log(`Logs Count: ${logsCount}`);
    console.log(`Alerts Count: ${alertsCount}`);
    console.log(`Incidents Count: ${incidentsCount}`);

    console.log("\nRecent Logs (last 5):");
    const logs = await Log.find().sort({ timestamp: -1 }).limit(5);
    logs.forEach(l => {
      console.log(`  IP: ${l.get('ip')} | Method: ${l.get('method')} | Url: ${l.get('endpoint')} | Status: ${l.get('status')} | EventType: ${l.get('eventType')}`);
    });

    console.log("\nRecent Alerts (last 5):");
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(5);
    alerts.forEach(a => {
      console.log(`  IP: ${a.get('sourceIP')} | Type: ${a.get('attackType')} | Severity: ${a.get('severity')} | Desc: ${a.get('description')}`);
    });

    console.log("\nRecent Incidents (last 5):");
    const incidents = await Incident.find().sort({ createdAt: -1 }).limit(5);
    incidents.forEach(i => {
      console.log(`  IP: ${i.get('sourceIP')} | Type: ${i.get('attackType')} | Status: ${i.get('status')} | Actions:`, i.get('actionsTaken'));
    });
    console.log("----------------------------------------");

  } catch (err) {
    console.error("Error connecting/querying:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

checkMonitor();
