const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./attacks.db');

console.log('📊 Database Contents:');
console.log('=====================');

// Get total count
db.get('SELECT COUNT(*) as count FROM attacks', [], (err, row) => {
  if (err) {
    console.error('Error getting count:', err);
    return;
  }
  console.log(`Total records: ${row.count}`);
});

// Get all records
db.all('SELECT * FROM attacks ORDER BY timestamp DESC LIMIT 10', [], (err, rows) => {
  if (err) {
    console.error('Error fetching records:', err);
    return;
  }
  
  console.log('\nLast 10 records:');
  console.log('=====================');
  rows.forEach((row, index) => {
    console.log(`\nRecord ${index + 1}:`);
    console.log('---------------------');
    console.log(`ID: ${row.id}`);
    console.log(`Type: ${row.type}`);
    console.log(`Confidence: ${row.confidence}`);
    console.log(`Events: ${row.events}`);
    console.log(`Source IP: ${row.sourceIP}`);
    console.log(`Destination IP: ${row.destinationIP}`);
    console.log(`Severity: ${row.severity}`);
    console.log(`Detected By: ${row.detectedBy}`);
    console.log(`Timestamp: ${row.timestamp}`);
  });

  // Close the database connection
  db.close();
}); 