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

// Function to log a new attack into the database
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
        timestamp || new Date().toISOString() // Default to current timestamp if not provided
      ],
      function(err) {
        if (err) reject(err); // Reject the promise if there's an error
        else resolve(this.lastID); // Resolve with the ID of the newly inserted attack
      }
    );
  });
}

// Function to get all attacks with pagination (limit and offset)
function getAllAttacks(offset = 0, limit = 20, callback) {
  db.get('SELECT COUNT(*) as total FROM attacks', [], (err, countResult) => {
    if (err) return callback(err);

    // Query to fetch attacks with pagination (limit and offset)
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

// Function to get various statistics for the dashboard
function getDashboardStats(callback) {
  const stats = {
    totalAttacks: 0,
    typesCount: {},
    attacksByDay: [],
    topSourceIPs: []
  };

  // Fetch total count of attacks
  db.get('SELECT COUNT(*) as total FROM attacks', (err, row) => {
    if (err) return callback(err);
    stats.totalAttacks = row.total;

    // Count attacks grouped by type (e.g., SYN, DoS, etc.)
    db.all('SELECT type, COUNT(*) as count FROM attacks GROUP BY type', (err, rows) => {
      if (err) return callback(err);
      rows.forEach(r => stats.typesCount[r.type] = r.count);

      // Fetch attack count by day (last 7 days)
      db.all(`
        SELECT date(timestamp) as day, COUNT(*) as count 
        FROM attacks 
        GROUP BY day 
        ORDER BY day DESC LIMIT 7
      `, (err, rows) => {
        if (err) return callback(err);
        stats.attacksByDay = rows.reverse(); // Reverse to show from recent to oldest day

        // Fetch top 5 source IPs with the highest number of attacks
        db.all(`
          SELECT sourceIP, COUNT(*) as count 
          FROM attacks 
          GROUP BY sourceIP 
          ORDER BY count DESC LIMIT 5
        `, (err, rows) => {
          if (err) return callback(err);
          stats.topSourceIPs = rows;

          callback(null, stats); // Return all the collected stats
        });
      });
    });
  });
}

// ✅ New function to get attack timeline data (attacks grouped by time)
function getAttackTimeline(callback) {
  // Structure to hold timeline data (grouped by hour, day, or week)
  const timelineData = {
    attacksByHour: [],
    attacksByDay: [],
    attacksByWeek: []
  };

  // Fetch attacks grouped by hour for the last 24 hours
  db.all(`
    SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
    FROM attacks
    WHERE timestamp >= datetime('now', '-1 day') 
    GROUP BY hour
    ORDER BY hour ASC
  `, (err, rows) => {
    if (err) return callback(err);
    timelineData.attacksByHour = rows;

    // Fetch attacks grouped by day for the last 7 days
    db.all(`
      SELECT date(timestamp) as day, COUNT(*) as count
      FROM attacks
      WHERE timestamp >= datetime('now', '-7 day')
      GROUP BY day
      ORDER BY day ASC
    `, (err, rows) => {
      if (err) return callback(err);
      timelineData.attacksByDay = rows;

      // Fetch attacks grouped by week for the last month
      db.all(`
        SELECT strftime('%Y-%W', timestamp) as week, COUNT(*) as count
        FROM attacks
        WHERE timestamp >= datetime('now', '-1 month')
        GROUP BY week
        ORDER BY week ASC
      `, (err, rows) => {
        if (err) return callback(err);
        timelineData.attacksByWeek = rows;

        callback(null, timelineData); // Return all the timeline data
      });
    });
  });
}

// ✅ New function to fetch daily attack counts (attacks grouped by day)
function getDailyAttackTimeline(callback) {
  // Fetch attacks grouped by day
  db.all(`
    SELECT date(timestamp) as day, COUNT(*) as count
    FROM attacks
    GROUP BY day
    ORDER BY day DESC
  `, (err, rows) => {
    if (err) return callback(err);
    callback(null, rows); // Return daily attack counts
  });
}

// Final correct export
module.exports = {
  logAttack,
  getAllAttacks,
  getDashboardStats,
  getAttackTimeline, // Export existing hourly timeline function
  getDailyAttackTimeline // Export new daily attack timeline function
};
