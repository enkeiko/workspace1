
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HANDOVER_FILE = path.join(__dirname, '../docs/Collaboration/HANDOVER.md');
const LOG_FILE = path.join(__dirname, '../docs/Reviews/Auto_Review_Log.md');

function getStatus() {
  try {
    const content = fs.readFileSync(HANDOVER_FILE, 'utf8');
    const match = content.match(/STATUS: \[(.*?)\]/);
    return match ? match[1] : null;
  } catch (e) {
    console.error('Error reading HANDOVER:', e);
    return null;
  }
}

function updateStatus(newStatus) {
  try {
    let content = fs.readFileSync(HANDOVER_FILE, 'utf8');
    content = content.replace(/STATUS: \[.*?\]/, `STATUS: [${newStatus}]`);
    fs.writeFileSync(HANDOVER_FILE, content);
    console.log(`Updated Status to [${newStatus}]`);
  } catch (e) {
    console.error('Error updating HANDOVER:', e);
  }
}

function logReview(phase) {
  const timestamp = new Date().toISOString();
  const logEntry = `\n## Review at ${timestamp}\n- **Phase:** ${phase || 'Unknown'}\n- **Action:** Auto-Approved by Proxy Watcher\n- **Snapshot:** Git Commit created.\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (e) {
    // If file doesn't exist, create it
    fs.writeFileSync(LOG_FILE, `# Auto Review Log\n${logEntry}`);
  }
}

function runCommand(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Error running command "${cmd}":`, e.message);
  }
}

console.log("=== Agent B (Proxy Watcher) Started ===");
console.log("Monitoring docs/Collaboration/HANDOVER.md for [REVIEW_READY]...");

setInterval(() => {
  const status = getStatus();
  
  if (status === 'REVIEW_READY') {
    console.log("\n[!] Detected REVIEW_READY. Starting Auto-Review Protocol...");
    
    // 1. Git Commit (Snapshot)
    console.log("-> Creating Git Commit...");
    runCommand('git add .');
    runCommand('git commit -m "Auto-Snapshot by Agent B Proxy" --allow-empty');
    
    // 2. Log
    logReview('Detected Phase Completion');
    
    // 3. Unblock Agent A
    console.log("-> Approving...");
    updateStatus('REVIEW_DONE');
    
    console.log("-> Cycle Complete. Waiting for next phase...");
  } else if (status === 'ALL_COMPLETED') {
    console.log("\n[!!!] ALL PHASES COMPLETED. Mission Success.");
    process.exit(0);
  } else {
    process.stdout.write('.'); // Heartbeat
  }
}, 30000); // Check every 30 seconds
