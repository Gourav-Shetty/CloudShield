const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const portalUri = 'mongodb+srv://cloudshield:UJYdrUs9mgOkKs@cloudshieldcluster.mjjbyzh.mongodb.net/cloudshield_portal?retryWrites=true&w=majority&appName=CloudShieldCluster';

async function seed() {
  try {
    console.log('Connecting to Portal DB...');
    await mongoose.connect(portalUri);
    
    const User = mongoose.model('User', new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true },
      password: { type: String, required: true },
      role: { type: String, default: 'employee' },
      isLocked: { type: Boolean, default: false }
    }));

    const existing = await User.findOne({ username: 'employee' });
    if (existing) {
      console.log('User \"employee\" already exists.');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('employee123', salt);
      
      await User.create({
        username: 'employee',
        email: 'employee@cloudshield.ai',
        password: hashedPassword,
        role: 'employee',
        isLocked: false
      });
      console.log('Seeded User: username: \"employee\" / password: \"employee123\"');
    }
  } catch (err) {
    console.error('Seeding failed:', err.stack);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
