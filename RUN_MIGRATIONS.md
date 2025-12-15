# Run Database Migrations - Complete Guide

## Current Issue
Database tables don't exist. Need to run Prisma migrations.

## Important: Stop Backend First!

**The backend must be stopped before running migrations.**

1. **Stop the backend** (Ctrl+C in the backend terminal)
2. **Then run migrations**
3. **Then restart backend**

## Step-by-Step

### Step 1: Stop Backend
Press `Ctrl+C` in the terminal where backend is running.

### Step 2: Check PostgreSQL is Running

**Check services:**
```powershell
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

**If not running, start it:**
- Press `Win + R`, type `services.msc`
- Find "PostgreSQL" service
- Right-click → Start

### Step 3: Create Database (if needed)

**Connect to PostgreSQL:**
```powershell
# Find psql path (usually in Program Files)
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres

# Or if psql is in PATH:
psql -U postgres
```

**Create database:**
```sql
CREATE DATABASE gym_users;
\q
```

### Step 4: Run Migrations

**Navigate to backend:**
```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
```

**Generate Prisma Client:**
```powershell
npm run prisma:generate
```

**If you get permission error:**
- Make sure backend is stopped
- Close any IDEs/editors that might have files open
- Try again

**Run migrations:**
```powershell
npm run prisma:migrate
```

**When prompted, enter migration name:**
```
init
```

**This creates all tables in the database.**

### Step 5: Verify

**Check tables were created:**
```powershell
psql -U postgres -d gym_users
```

```sql
\dt
```

**Should see:**
- User
- UserProfile
- UserPreference
- Post
- PostLike
- Comment
- Follow
- UserGymLink
- UserExternalRef

### Step 6: Restart Backend

```powershell
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service
npm run dev
```

**Now try login again - should work!**

## Quick Commands

```powershell
# 1. Stop backend (Ctrl+C)

# 2. Navigate to backend
cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service

# 3. Generate Prisma Client
npm run prisma:generate

# 4. Run migrations
npm run prisma:migrate

# 5. Restart backend
npm run dev
```

## Troubleshooting

### Permission Error
- Stop backend
- Close VS Code/editors
- Run as Administrator if needed

### Connection Timeout
- Start PostgreSQL service
- Check database exists
- Verify `.env` has correct connection string

### Database Doesn't Exist
- Create it: `CREATE DATABASE gym_users;`

