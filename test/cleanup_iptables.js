const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function cleanupIptables() {
  try {
    console.log('Cleaning up iptables rules...');

    // Create iptables directory if it doesn't exist
    await execAsync('sudo mkdir -p /etc/iptables');

    // Flush all rules
    await execAsync('sudo iptables -F');
    await execAsync('sudo iptables -X');
    await execAsync('sudo iptables -Z');

    // Reset default policies
    await execAsync('sudo iptables -P INPUT ACCEPT');
    await execAsync('sudo iptables -P FORWARD ACCEPT');
    await execAsync('sudo iptables -P OUTPUT ACCEPT');

    // Save empty rules
    await execAsync('sudo sh -c "iptables-save > /etc/iptables/rules.v4"');
    
    // Verify rules are cleared
    const { stdout: rules } = await execAsync('sudo iptables -L -n -v');
    console.log('\nCurrent iptables rules:');
    console.log(rules);

    console.log('\nIptables rules cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up iptables rules:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupIptables(); 