# Anti-DDOS-System: Complete Setup & Run Guide

## 1. Install WSL (Windows Subsystem for Linux)
Open PowerShell as Administrator and run:
```powershell
wsl --install
```
Restart your computer if prompted.

---

## 2. Open WSL and Update Packages
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 3. Install Node.js and npm
```bash
sudo apt install -y nodejs npm
```

---

## 4. Clone or Copy the Project
If using Git:
```bash
git clone <your-repo-url>
cd Anti-DDOS-System
```
Or copy your project files to `/mnt/c/Users/ajay/Desktop/Anti-DDOS-System`.

---

## 5. Install Project Dependencies
```bash
cd /mnt/c/Users/ajay/Desktop/Anti-DDOS-System
npm install
```
(If you have backend/frontend, run `npm install` in each subdirectory as needed.)

---

## 6. Set Up Environment Variables
Create a `.env` file in your project root (example):
```env
TARGET_IP=127.0.0.1
TARGET_PORT=5000
BLOCKED_PORT=12345
```
Add any other variables your app needs.

---

## 7. Set Up iptables Rules
Make sure your `iptables_ddos_rules.sh` script is present and executable:
```bash
chmod +x iptables_ddos_rules.sh
./iptables_ddos_rules.sh
```

---

## 8. Start the Backend Server
```bash
cd backend
npm install
npm start
```
(or `node server.js` if you don't use npm scripts)

---

## 9. Start the Frontend (if any)
```bash
cd frontend
npm install
npm start
```

---

## 10. Run the Attack Simulator
```bash
cd test
node attack_simulator.js
```

---

## 11. Check iptables Stats
```bash
sudo iptables -L -v
```

---

## 12. (Optional) Install netcat for Manual Testing
```bash
sudo apt install netcat
```
Test dropped ports:
```bash
nc -vz 127.0.0.1 12345
```

---

## Notes
- If you want to allow loopback traffic again, add the loopback ACCEPT rule back to your iptables script.
- For real DROP testing, try connecting from another device to your WSL IP on a blocked port.
- Adjust environment variables and ports as needed for your setup.

---

**You are now ready to run and test the Anti-DDOS-System!** 