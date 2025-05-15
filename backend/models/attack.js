const mongoose = require('mongoose');

const attackSchema = new mongoose.Schema({
  timestamp: Date,
  sourceIP: String,
  destinationIP: String,
  type: String,
  severity: String,
  detectedBy: String,
}); 

module.exports = mongoose.model('Attack', attackSchema);
