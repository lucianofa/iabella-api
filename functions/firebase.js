const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

console.log(`\n ########################$$$$$$$$$$$$$$$$$$$$$$$$`);
console.log(serviceAccount);
console.log(`\n ########################$$$$$$$$$$$$$$$$$$$$$$$$`);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports.db = db;