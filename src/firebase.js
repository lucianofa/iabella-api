const admin = require('firebase-admin');
const path = require('path');

console.log(path.join(__dirname, '..', 'serviceAccountKey.json'));

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports.db = db;