// db.js
const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url, { useUnifiedTopology: true });

let db;

async function connectToMongo() {
  try {
    await client.connect();
    db = client.db('crossroads');
    console.log('✅ Connected to MongoDB');
    // Create indexes for better query performance
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('requests').createIndex({ studentId: 1 });
    await db.collection('requests').createIndex({ requestId: 1 }, { unique: true });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

function getDb() {
  if (!db) throw new Error('Database not connected');
  return db;
}

module.exports = { connectToMongo, getDb };