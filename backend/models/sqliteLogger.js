const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./attacks.db');

// Create table with index
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS attacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      confidence TEXT,
      events INTEGER,
      firstEvent TEXT,
      lastEvent TEXT,
      sourceIP TEXT,
      destinationIP TEXT,
      severity TEXT,
      detectedBy TEXT,
      timestamp TEXT
    )
  `);

  // Create index on timestamp for faster queries
  db.run('CREATE INDEX IF NOT EXISTS idx_attacks_timestamp ON attacks(timestamp)');
});

function logAttack(attackData) {
  const {
    type, confidence, events, firstEvent, lastEvent,
    sourceIP, destinationIP, severity, detectedBy, timestamp
  } = attackData;

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO attacks (
        type, confidence, events, firstEvent, lastEvent,
        sourceIP, destinationIP, severity, detectedBy, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        confidence,
        events,
        firstEvent,
        lastEvent,
        sourceIP,
        destinationIP,
        severity,
        detectedBy,
        timestamp || new Date().toISOString()
      ],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getAllAttacks(offset = 0, limit = 20, callback) {
  db.get('SELECT COUNT(*) as total FROM attacks', [], (err, countResult) => {
    if (err) return callback(err);

    db.all(
      'SELECT * FROM attacks ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [limit, offset],
      (err, rows) => {
        if (err) return callback(err);
        callback(null, {
          attacks: rows,
          total: countResult.total
        });
      }
    );
  });
}

module.exports = { logAttack, getAllAttacks };
