const axios = require('axios');

const attackUrl = 'http://localhost:5000/api/attacks'; // URL to backend API

async function simulateDDoS() {
  const attackData = {
    type: 'DDoS',
    confidence: 'High',
    events: 1000,
    firstEvent: new Date().toISOString(),
    lastEvent: new Date().toISOString(),
  };

  // Send a high volume of POST requests to simulate a DDoS attack
  for (let i = 0; i < 1000; i++) {  // Increase number of requests
    try {
      await axios.post(attackUrl, attackData);
      console.log(`Attack request ${i + 1} sent`);
    } catch (error) {
      console.error('Error sending attack request:', error);
    }

    // Shorten the delay between requests (optional)
    await new Promise(resolve => setTimeout(resolve, 10)); // Delay of 10ms
  }
}

simulateDDoS();

