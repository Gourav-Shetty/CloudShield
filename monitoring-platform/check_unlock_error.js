const mongoose = require('mongoose');
const portalUri = 'mongodb+srv://cloudshield:UJYdrUs9mgOkKs@cloudshieldcluster.mjjbyzh.mongodb.net/cloudshield_portal?retryWrites=true&w=majority&appName=CloudShieldCluster';
const ip = '198.51.100.42';

async function test() {
  let portalConn;
  try {
    console.log('Connecting to Portal DB...');
    portalConn = await mongoose.createConnection(portalUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).asPromise();
    console.log('Connected.');

    const UserModel = portalConn.model(
      'UserUnlockTest',
      new mongoose.Schema({ isLocked: Boolean, lastLoginIP: String, username: String }),
      'users',
    );

    const query = { $or: [{ lastLoginIP: ip }] };
    console.log('Executing updateMany...');
    const unlockResult = await UserModel.updateMany(
      query,
      { $set: { isLocked: false } },
    );
    console.log('Success! Result:', unlockResult);
  } catch (err) {
    console.error('ERROR OCCURRED IN MONGOOSE:');
    console.error(err.stack || err);
  } finally {
    if (portalConn) {
      await portalConn.close();
      console.log('Connection closed.');
    }
  }
}
test();
