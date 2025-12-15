# Fix Database Setup - Step by Step

## Current Error
```
The table `public.User` does not exist in the current database.
```

This means Prisma migrations haven't been run yet.

## Solution

### Step 1: Check PostgreSQL is Running

**Option A: Check Services**
1. Press `Win + R`, type `services.msc`, press Enter
2. Look for "PostgreSQL" service
3. If it's stopped, right-click → Start

**Option B: PowerShell**
```powershell
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

**If PostgreSQL is not installed:**
- Download from: https://www.postgresql.org/download/windows/
- Install with default settings
- Remember the password you set during installation
- Update `.env` file if password is different

### Step 2: Create Database (if it doesn't exist)

**Open Command Prompt or PowerShell:**

```powershell
# Connect to PostgreSQL (default password is usually "postgres")
psql -U postgres -h localhost

# If psql is not in PATH, find it:
# Usually at: C:\Program Files\PostgreSQL\XX\bin\psql.exe
```

**In psql, run:**
```sql
-- List all databases
\l

-- If gym_users doesn't exist, create it:
CREATE DATABASE gym_users;

-- Exit
\q
```

**Or use pgAdmin:**
1. Open pgAdmin
2. Connect to PostgreSQL server
3. Right-click "Databases" → Create → Database
4. Name: `gym_users`
5. Click Save

### Step 3: Verify Database Connection

**Test connection:**
```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run prisma:generate
```

**If this works, connection is good. If it times out, PostgreSQL is not running.**

### Step 4: Run Migrations

**Once PostgreSQL is running and database exists:**

```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service

# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate
```

**When prompted for migration name, type:**
```
init
```

**This will create all tables:**
- User
- UserProfile
- UserPreference
- Post
- PostLike
- Comment
- Follow
- etc.

### Step 5: Verify Tables Created

**Connect to database:**
```powershell
psql -U postgres -d gym_users -h localhost
```

**List tables:**
```sql
\dt
```

**Should see all the tables listed above.**

### Step 6: Restart Backend

**After migrations complete:**
```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```

**Test login again - should work now!**

## Quick Checklist

- [ ] PostgreSQL service is running
- [ ] Database `gym_users` exists
- [ ] `.env` file has correct `DB_SOURCE` connection string
- [ ] Prisma Client generated: `npm run prisma:generate`
- [ ] Migrations run: `npm run prisma:migrate`
- [ ] Backend restarted: `npm run dev`

## Common Issues

### Issue 1: Connection Timeout
**Fix:** Start PostgreSQL service

### Issue 2: Database Doesn't Exist
**Fix:** Create database: `CREATE DATABASE gym_users;`

### Issue 3: Wrong Password
**Fix:** Update `.env` file with correct password

### Issue 4: psql Not Found
**Fix:** Add PostgreSQL bin folder to PATH, or use pgAdmin

## If PostgreSQL is Not Installed

1. Download: https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the password
4. Create database: `gym_users`
5. Update `.env` if password is different
6. Run migrations

