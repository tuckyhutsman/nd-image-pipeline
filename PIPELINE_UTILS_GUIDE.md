# Pipeline Utility Commands

Quick reference for managing your image pipeline system.

## Quick Start

```bash
# Make executable (first time only)
chmod +x ./pipeline-utils.sh

# View all commands
./pipeline-utils.sh help

# Check system health
./pipeline-utils.sh check-health

# Flush everything and start fresh
./pipeline-utils.sh flush-all
```

## Commands Reference

### 🗑️ Database Cleanup Commands

#### `flush-pipelines`
Delete all pipeline definitions (keeps jobs)
```bash
./pipeline-utils.sh flush-pipelines
```
**Use when**: Pipeline definitions are corrupted or outdated

#### `flush-jobs`
Delete all job records (keeps pipeline definitions)
```bash
./pipeline-utils.sh flush-jobs
```
**Use when**: Job history is cluttered and you want a fresh start

#### `flush-all` ⚠️
**DANGEROUS** - Delete everything: pipelines, jobs, queue, outputs
```bash
./pipeline-utils.sh flush-all
```
**Confirms with**: Type `DELETE ALL` when prompted

**Use when**: Complete system reset needed

#### `reset-database`
**DANGEROUS** - Full database reset to initial state
```bash
./pipeline-utils.sh reset-database
```
**Confirms with**: Type `RESET DATABASE` when prompted

**Use when**: Starting completely fresh

---

### 📋 Queue Commands

#### `flush-queue`
Clear all jobs from Redis queue (doesn't delete from database)
```bash
./pipeline-utils.sh flush-queue
```
**Use when**: Queue is stuck with pending jobs

#### `queue-stats`
Show current queue statistics
```bash
./pipeline-utils.sh queue-stats
```
**Output**: Redis queue info and stats

---

### 📁 Output File Commands

#### `clean-outputs`
Delete all processed output files
```bash
./pipeline-utils.sh clean-outputs
```
**Use when**: Freeing up disk space

#### `list-outputs`
Show all output directories
```bash
./pipeline-utils.sh list-outputs
```
**Output**: List of job IDs with their output directories

---

### 🔍 Diagnostic Commands

#### `check-health`
Full system health check
```bash
./pipeline-utils.sh check-health
```
**Output**: 
- Database connection status
- Redis connection status
- Container statuses
- Database statistics (pipelines, jobs, queue size)

#### `show-pipelines`
List all pipelines in database
```bash
./pipeline-utils.sh show-pipelines
```
**Output**: Table with ID, name, customer_id, created_at

#### `show-jobs`
List all jobs (last 20)
```bash
./pipeline-utils.sh show-jobs
```
**Output**: Table with job ID, status, file name, creation time

---

## Common Scenarios

### Scenario 1: Fresh Start After Failed Deployment
```bash
./pipeline-utils.sh flush-all
# Recreate pipelines via Pipeline Editor UI
```

### Scenario 2: Clean Up Old Pipelines
```bash
./pipeline-utils.sh show-pipelines      # See what exists
./pipeline-utils.sh flush-pipelines     # Delete old ones
# Create new ones via Pipeline Editor
```

### Scenario 3: Fix Stuck Jobs
```bash
./pipeline-utils.sh check-health        # Diagnose
./pipeline-utils.sh flush-queue         # Clear queue
./pipeline-utils.sh show-jobs           # See database jobs
./pipeline-utils.sh flush-jobs          # Clear if needed
```

### Scenario 4: Disk Space Recovery
```bash
./pipeline-utils.sh list-outputs        # See what's using space
./pipeline-utils.sh clean-outputs       # Delete output files
# Note: Database records remain for reference
```

### Scenario 5: Complete System Reset
```bash
./pipeline-utils.sh reset-database      # Full reset
# All tables cleared, Redis flushed, outputs deleted
# System ready for fresh configuration
```

---

## Safety Features

### Confirmation Prompts
Most dangerous operations require typed confirmation:
- `flush-all` requires: `DELETE ALL`
- `reset-database` requires: `RESET DATABASE`
- Other destructive ops require: `yes/no`

### Health Check First
Always run before any cleanup:
```bash
./pipeline-utils.sh check-health
```

### Backup Recommendations
Before running `flush-all` or `reset-database`:
1. Export any critical pipeline configs
2. Download completed job outputs
3. Note any important job IDs

---

## Troubleshooting the Script

### "docker compose: command not found"
Make sure you're in the project directory with docker-compose running

### "Connection refused" errors
Check that containers are running:
```bash
docker compose ps
```

### Database or Redis won't connect
Restart containers:
```bash
docker compose restart
```

### Permission denied
Make script executable:
```bash
chmod +x ./pipeline-utils.sh
```

---

## Advanced Usage

### View command source
```bash
cat ./pipeline-utils.sh
```

### Run single diagnostic
```bash
./pipeline-utils.sh check-health | grep Database
```

### Combine with other tools
```bash
# Export database before cleanup
./pipeline-utils.sh show-pipelines > pipelines-backup.txt
./pipeline-utils.sh show-jobs > jobs-backup.txt

# Then safely clean
./pipeline-utils.sh flush-all
```

---

## Quick Reference Table

| Command | Purpose | Danger Level | Confirmation |
|---------|---------|--------------|--------------|
| `help` | Show this help | 🟢 Safe | None |
| `check-health` | System diagnostics | 🟢 Safe | None |
| `show-pipelines` | List pipelines | 🟢 Safe | None |
| `show-jobs` | List jobs | 🟢 Safe | None |
| `list-outputs` | List outputs | 🟢 Safe | None |
| `queue-stats` | Queue info | 🟢 Safe | None |
| `flush-queue` | Clear Redis queue | 🟡 Medium | yes/no |
| `clean-outputs` | Delete output files | 🟡 Medium | yes/no |
| `flush-jobs` | Delete all jobs | 🔴 High | yes/no |
| `flush-pipelines` | Delete pipelines | 🔴 High | yes/no |
| `flush-all` | Delete everything | 🔴 DANGER | `DELETE ALL` |
| `reset-database` | Full reset | 🔴 DANGER | `RESET DATABASE` |

---

## Tips & Best Practices

✅ **DO:**
- Run `check-health` before any cleanup
- Use `show-*` commands to preview what will be deleted
- Keep manual backups of important pipeline configs
- Test on staging before using in production

❌ **DON'T:**
- Run multiple cleanup commands simultaneously
- Use `flush-all` without confirming you don't need the data
- Run from wrong directory (go to project root first)
- Skip the confirmation prompt by piping `yes`

---

## Feedback & Improvements

These utilities can be expanded with:
- Backup/restore functionality
- Selective cleanup (by date, status, pipeline ID)
- Scheduled cleanup jobs
- Email notifications
- Detailed logs

Let me know if you'd like any of these features added!

---

**Last Updated**: November 5, 2025  
**Version**: 1.0
