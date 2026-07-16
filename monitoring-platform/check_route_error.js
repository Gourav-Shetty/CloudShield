require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const incidentRoutes = require('./routes/incidentRoutes');

// Sign a valid token
const token = jwt.sign({ id: 'dummy_id', username: 'admin', role: 'admin' }, process.env.JWT_SECRET);

const req = {
  body: { ip: '127.0.0.1' },
  headers: {
    authorization: 'Bearer ' + token
  }
};

const res = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('Response JSON:', data);
    return this;
  }
};

// Find the unlock-account route handler
const route = incidentRoutes.stack.find(s => s.route && s.route.path === '/unlock-account');
const handler = route.route.stack[0].handle;
const actualRouteHandler = route.route.stack[1].handle; // stack[0] is auth middleware, stack[1] is the actual logic

async function run() {
  try {
    console.log('Connecting default mongoose connection...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');
    
    console.log('Running route handler logic directly...');
    // We call the actual route logic directly, bypassing the auth middleware stack[0]
    await actualRouteHandler(req, res);
  } catch (err) {
    console.error('CRITICAL ROUTE HANDLER ERROR:');
    console.error(err.stack || err);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
}
run();
