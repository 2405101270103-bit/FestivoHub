const { MongoClient } = require('mongodb');
const config = require('../config');

let cached = global.mongo;

if (!cached) {
  cached = global.mongo = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      tlsAllowInvalidCertificates: config.mongodb.tlsAllowInvalidCertificates,
    };
    cached.promise = MongoClient.connect(config.mongodb.uri, opts).then((client) => {
      return {
        client,
        db: client.db(config.mongodb.db),
      };
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = { connectToDatabase };
