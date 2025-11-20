const path = require('path');
const dotenv = require('dotenv');
const result = dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
if (result.error) {
  console.warn('.env not loaded from project root (checked:', path.resolve(__dirname, '..', '.env'), '). Using default lookup.');
}

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI tidak ditemukan di environment. Periksa file .env di root proyek.');
  process.exit(1);
}

// safety: do not print full uri with password
const safeUri = uri.replace(/:(?:[^:@]+)@/, ':*****@');
console.log('Menggunakan MONGO_URI:', safeUri);

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } catch (err) {
    console.error('Gagal terhubung ke MongoDB:', err.message || err);
    process.exitCode = 2;
  } finally {
    try { await client.close(); } catch (e) { /* ignore close errors */ }
  }
}

run().catch(err => { console.error(err); process.exit(3); });
