#!/bin/bash
# Flush existing rules
sudo iptables -F

# Set default policies
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# Allow established and related connections
sudo iptables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow ICMP (ping) with rate limiting
sudo iptables -A INPUT -p icmp --icmp-type 8 -m limit --limit 1/second --limit-burst 5 -j ACCEPT

# Allow SSH (port 22) with rate limiting
sudo iptables -A INPUT -p tcp --dport 22 -m limit --limit 5/minute --limit-burst 10 -j ACCEPT

# Allow HTTP (port 80)
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Allow HTTPS (port 443)
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow custom port (e.g., 5000) with rate limiting
sudo iptables -A INPUT -p tcp --dport 5000 -m limit --limit 30/minute --limit-burst 50 -j ACCEPT

# Allow new connections with rate limiting
sudo iptables -A INPUT -m state --state NEW -m limit --limit 30/minute --limit-burst 50 -j ACCEPT

# Print the rules
sudo iptables -L -v 