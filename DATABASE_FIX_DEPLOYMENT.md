# 🚨 DATABASE FIX + DEPLOYMENT

**Date**: November 6, 2025  
**Issue**: Missing database schema (batches table doesn't exist)  
**Solution**: Database initialization script created

---

## 🔧 Problem Identified

1. ❌ **Database had no schema** - `init-db.sql` was missing
2. ❌ **HTTP 404 errors persisting** - Already fixed in code, needs redeploy

The database was starting empty because the `init-db.sql` file referenced in `docker-compose.yml` didn't exist.

---

## ✅ What's Fixed

1. ✅ **Created `init-db.sql`** with complete database schema:
   - `pipelines` table
   - `batches` table  
   - `jobs` table
   - All indexes and triggers
   - Seed data

2. ✅ **JobSubmit fix** already in place (from earlier)
   - `pipeline_id` now parsed as integer

---

## 🚀 DEPLOYMENT COMMANDS

### **On Dev Machine (if not already pushed):**

```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline

# Check if init-db.sql is in git
git status

# If it shows init-db.sql as untracked:
git add init-db.sql
git commit -m "Add missing database initialization schema"
git push origin main
```

### **On Production LXC (CRITICAL - Database Reset Required):**

```bash
cd ~/image-pipeline-app

# Pull latest code
git pull origin main

# ⚠️  STOP everything and WIPE database
docker compose down -v

# This removes:
# - All containers
# - All volumes (including postgres_data)
# - Forces fresh database initialization

# Rebuild and start with fresh database
docker compose up -d --build

# Watch logs to verify schema creation
docker compose logs postgres -f

# Look for: "Database schema initialized successfully"
# Press Ctrl+C when you see it

# Verify all services are running
docker compose ps

# Should show all services as "Up"
```

---

## 🔍 Verification Steps

### **1. Check Database Schema**

```bash
# Connect to database
docker exec -it pipeline-db psql -U pipeline_user -d pipeline_db

# Run these SQL commands:
\dt                          -- List all tables
SELECT COUNT(*) FROM pipelines;
SELECT COUNT(*) FROM batches;
SELECT COUNT(*) FROM jobs;
\q                           -- Exit
```

**Expected output:**
```
           List of relations
 Schema |    Name    | Type  |     Owner      
--------+------------+-------+----------------
 public | batches    | table | pipeline_user
 public | jobs       | table | pipeline_user
 public | pipelines  | table | pipeline_user
```

### **2. Test Web UI**

1. Navigate to `http://10.0.4.39:3000`
2. Go to **"Manage Pipelines"**
3. Create a test pipeline
4. Go to **"Submit Job"**
5. Select pipeline and upload a test image
6. **Should work without HTTP 404 error!**

### **3. Check Logs (if issues)**

```bash
# API logs
docker compose logs api --tail=50

# Worker logs
docker compose logs worker --tail=50

# Database logs
docker compose logs postgres --tail=50
```

---

## 📋 What the Schema Contains

### **Tables:**
```sql
pipelines
├── id (serial primary key)
├── name (unique)
├── description
├── config (jsonb)
└── timestamps

batches
├── id (uuid primary key)
├── customer_prefix
├── batch_date
├── base_directory_name
├── render_description
├── total_files
├── pipeline_id → pipelines(id)
├── status
└── timestamps

jobs
├── id (uuid primary key)
├── batch_id → batches(id)
├── pipeline_id → pipelines(id)
├── input_filename
├── input_base64
├── status
├── output_files (jsonb)
├── error_message
└── timestamps
```

### **Automatic Behaviors:**
- ✅ Batch status updates when jobs complete
- ✅ Timestamps auto-update on changes
- ✅ Default pipeline seeded for testing
- ✅ UUIDs generated automatically
- ✅ Indexes for fast queries

---

## ⚠️ IMPORTANT NOTES

### **Data Loss Warning:**
```bash
docker compose down -v  # ← This deletes ALL data!
```

Running this command will:
- ❌ Delete all existing pipelines
- ❌ Delete all existing jobs
- ❌ Delete all existing batches
- ✅ Create fresh schema
- ✅ Fix "batches does not exist" errors

**If you have important data**, back it up first:
```bash
# Backup database (if needed)
docker exec pipeline-db pg_dump -U pipeline_user pipeline_db > backup_$(date +%Y%m%d).sql
```

### **Why Full Reset?**
The database started without any schema. There's no clean way to add the schema retroactively without conflicts. A fresh start ensures clean initialization.

---

## 🎯 Expected Result

After deployment:
- ✅ No more "batches does not exist" errors
- ✅ No more HTTP 404 errors on job submission
- ✅ Clean database with proper schema
- ✅ All tables, indexes, and triggers in place
- ✅ Beautiful sliders with temporal color gradients
- ✅ Ready for production use

---

## 📞 Troubleshooting

### **Issue: Still seeing "batches does not exist"**
**Solution:**
```bash
# Database didn't initialize - check if init-db.sql is mounted
docker compose down -v
docker compose up -d --build
docker compose logs postgres | grep "init"
```

### **Issue: HTTP 404 still appearing**
**Solution:**
```bash
# Code not rebuilt - force rebuild
docker compose down
docker compose build --no-cache api
docker compose up -d
```

### **Issue: Services won't start**
**Solution:**
```bash
# Check container status
docker compose ps
docker compose logs api --tail=100
docker compose logs postgres --tail=100
```

---

## ✅ Deployment Checklist

- [ ] Git pull latest code on LXC
- [ ] Stop all containers: `docker compose down -v`
- [ ] Rebuild: `docker compose up -d --build`
- [ ] Verify postgres logs show "Database schema initialized"
- [ ] Check all services running: `docker compose ps`
- [ ] Test pipeline creation in web UI
- [ ] Test job submission in web UI
- [ ] Verify no HTTP 404 errors
- [ ] Verify no "batches does not exist" errors
- [ ] Enjoy beautiful color-gradient sliders! 🎨

---

**Ready to deploy? Just follow the commands above!** 🚀
