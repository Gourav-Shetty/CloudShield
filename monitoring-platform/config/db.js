const mongoose = require('mongoose');

/**
 * Connect to the primary CloudShield Monitor MongoDB database.
 * Retries once on initial failure before letting the process exit.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`[DB] MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
