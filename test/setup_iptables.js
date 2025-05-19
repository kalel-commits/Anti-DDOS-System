const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function setupIptables() {
  try {
    console.log('Setting up iptables rules...');

    // Create rules directory if it doesn't exist
    await execAsync('sudo mkdir -p /etc/iptables');

    // Flush existing rules
    console.log('Flushing existing rules...');
    await execAsync('sudo iptables -F');
    await execAsync('sudo iptables -X');
    await execAsync('sudo iptables -Z');

    // Set default policies
    console.log('Setting default policies...');
    await execAsync('sudo iptables -P INPUT DROP');
    await execAsync('sudo iptables -P FORWARD DROP');
    await execAsync('sudo iptables -P OUTPUT ACCEPT');

    // Allow established connections
    console.log('Setting up connection rules...');
    await execAsync('sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT');

    // Allow localhost
    await execAsync('sudo iptables -A INPUT -i lo -j ACCEPT');

    // Drop invalid packets
    console.log('Setting up invalid packet handling...');
    await execAsync('sudo iptables -A INPUT -m state --state INVALID -j DROP');

    // Allow ICMP (ping) with rate limiting
    console.log('Setting up ICMP rules...');
    await execAsync('sudo iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s --limit-burst 5 -j ACCEPT');

    // Allow SSH with basic rate limiting
    console.log('Setting up SSH rules...');
    await execAsync('sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m limit --limit 5/minute --limit-burst 10 -j ACCEPT');

    // Allow HTTP and HTTPS with rate limiting
    console.log('Setting up HTTP/HTTPS rules...');
    await execAsync('sudo iptables -A INPUT -p tcp --dport 80 -m state --state NEW -m limit --limit 20/minute --limit-burst 30 -j ACCEPT');
    await execAsync('sudo iptables -A INPUT -p tcp --dport 443 -m state --state NEW -m limit --limit 20/minute --limit-burst 30 -j ACCEPT');

    // Allow our application port with rate limiting
    console.log('Setting up application rules...');
    await execAsync('sudo iptables -A INPUT -p tcp --dport 5000 -m state --state NEW -m limit --limit 30/minute --limit-burst 50 -j ACCEPT');

    // Add connection tracking with stricter limits
    console.log('Setting up connection tracking...');
    await execAsync('sudo iptables -A INPUT -m state --state NEW -m limit --limit 30/minute --limit-burst 50 -j ACCEPT');

    // Add protection against port scanning
    console.log('Setting up port scan protection...');
    await execAsync('sudo iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP');
    await execAsync('sudo iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP');

    // Add protection against SYN flood
    console.log('Setting up SYN flood protection...');
    await execAsync('sudo iptables -A INPUT -p tcp --syn -m limit --limit 1/s --limit-burst 3 -j ACCEPT');

    // Save rules
    console.log('Saving rules...');
    await execAsync('sudo sh -c "iptables-save > /etc/iptables/rules.v4"');
    
    // Ensure rules are loaded
    await execAsync('sudo sh -c "iptables-restore < /etc/iptables/rules.v4"');

    // Verify rules are applied
    console.log('Verifying rules...');
    const { stdout: rules } = await execAsync('sudo iptables -L -n -v');
    console.log('\nCurrent iptables rules:');
    console.log(rules);

    console.log('\nIptables rules set up successfully');
  } catch (error) {
    console.error('Error setting up iptables rules:', error);
    process.exit(1);
  }
}

// Run the setup
setupIptables(); 