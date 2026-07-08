const mongoose = require('mongoose');

const uri = "mongodb+srv://cloudshield:UJYdrUs9mgOkKs@cloudshieldcluster.mjjbyzh.mongodb.net/cloudshield_portal?retryWrites=true&w=majority&appName=CloudShieldCluster";

async function checkAdmin() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    const userSchema = new mongoose.Schema({
      username: String,
      isLocked: Boolean,
      lastLoginIP: String
    });

    const User = mongoose.model('User', userSchema, 'users');

    const admin = await User.findOne({ username: 'admin' });
    console.log("----------------------------------------");
    if (admin) {
      console.log("Admin User found:");
      console.log(`  ID: ${admin._id}`);
      console.log(`  Username: ${admin.username}`);
      console.log(`  isLocked: ${admin.isLocked}`);
      console.log(`  lastLoginIP: ${admin.lastLoginIP}`);
    } else {
      console.log("Admin User NOT found in the 'users' collection!");
    }
    console.log("----------------------------------------");

  } catch (err) {
    console.error("Error connecting/querying:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

checkAdmin();
