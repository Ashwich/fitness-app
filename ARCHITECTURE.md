# Fitsera Application Architecture

## Overview

The Fitsera platform consists of **3 separate codebases** that work together to provide a complete fitness management solution.

---

## Codebase Structure

### 1. React Native Mobile App (Current Codebase)
**Location:** `c:\Users\Lenovo\Desktop\fitsera-app`  
**Technology:** React Native (Expo)  
**Purpose:** Mobile application for end users (fitness enthusiasts)

**Key Features:**
- User authentication and profiles
- Fitness tracking (calories, steps, water intake)
- Social features (posts, follows, messages)
- Gym discovery and browsing
- Real-time notifications via Socket.IO

**Backend Connection:**
- **Service:** User Service (port 8081)
- **Base URL:** `EXPO_PUBLIC_USERS_SERVICE_URL` (default: `http://192.168.1.6:8081`)
- **API Path:** `/api/users/*`
- **Database:** Separate user database (managed by user-service)

**Key Files:**
- `src/api/client.js` - Main API client for user-service
- `src/config/env.js` - Environment configuration
- `src/api/services/*` - Service modules for different features

---

### 2. Website Frontend
**Location:** (Separate codebase - not in this repository)  
**Technology:** (Web framework - React/Vue/etc.)  
**Purpose:** Web portal for gym management

**Backend Connection:**
- **Service:** Gym Management Service (port 3000)
- **API Path:** `/api/gyms/*` or `/gyms/*`
- **Database:** Separate gym database (managed by gym-management-service)

**Key Features:**
- Gym registration and management
- Gym admin dashboard
- Staff management
- Gym data handling

---

### 3. Microservices Backend (Separate Codebase)
**Location:** (Separate codebase - not in this repository)  
**Technology:** Node.js/Express  
**Deployment:** Both services run on the same instance/server

#### 3.1 User Service
**Port:** 8081  
**Purpose:** Handles all user-related operations for the React Native app

**Responsibilities:**
- User authentication (login, registration)
- User profiles and settings
- Fitness data (calories, steps, water intake)
- Social features (posts, follows, messages, notifications)
- Real-time communication (Socket.IO)

**Database:** Separate user database  
**API Base Path:** `/api/users/*`

**Endpoints Examples:**
- `POST /api/users/login`
- `POST /api/users/register`
- `GET /api/users/profile`
- `GET /api/users/posts`
- `GET /api/users/gyms` (reads from gym-service via internal API)

**Internal API Calls:**
- Can call gym-management-service to fetch gym data
- Uses internal service-to-service communication

---

#### 3.2 Gym Management Service
**Port:** 3000  
**Purpose:** Handles all gym-related operations for the website frontend

**Responsibilities:**
- Gym registration and approval
- Gym admin authentication
- Gym data management (details, locations, amenities)
- Staff management
- Gym reviews (future)

**Database:** Separate gym database  
**API Base Path:** `/gyms/*` or `/api/gyms/*`

**Endpoints Examples:**
- `POST /gyms/signup`
- `POST /gyms/login`
- `GET /gyms` (public - all approved gyms)
- `GET /gyms/city/:city` (public - gyms by city)
- `GET /gyms/:id` (gym details)

**Internal API Calls:**
- Can call user-service to fetch user data when needed
- Uses internal service-to-service communication

---

## Service-to-Service Communication

### Architecture Pattern
Both microservices run on the **same instance** but are separate processes. They communicate via **internal HTTP API calls** using localhost or internal network addresses.

### Communication Flow

```
┌─────────────────┐         ┌──────────────────┐
│  React Native   │────────▶│   User Service   │
│      App        │         │   (Port 8081)    │
└─────────────────┘         └────────┬─────────┘
                                     │
                                     │ Internal API Call
                                     │ (localhost:3000)
                                     ▼
                            ┌──────────────────┐
                            │ Gym Management   │
                            │   Service        │
                            │   (Port 3000)    │
                            └────────┬─────────┘
                                     │
                                     │ Internal API Call
                                     │ (localhost:8081)
                                     ▼
                            ┌──────────────────┐
                            │   User Service   │
                            │   (Port 8081)    │
                            └──────────────────┘
```

### Internal API Configuration

**User Service → Gym Service:**
- **Internal URL:** `http://localhost:3000` (or `http://127.0.0.1:3000`)
- **Use Case:** Fetch gym data for users browsing gyms in the app

**Gym Service → User Service:**
- **Internal URL:** `http://localhost:8081` (or `http://127.0.0.1:8081`)
- **Use Case:** Fetch user data when gym admins need user information

### Security Considerations

1. **Internal Network Only:** Internal API calls should only work on localhost/internal network
2. **No External Exposure:** Internal endpoints should not be exposed to external clients
3. **Service Authentication:** Consider adding service-to-service authentication tokens
4. **Rate Limiting:** Apply rate limiting to prevent abuse
5. **Error Handling:** Proper error handling and fallbacks

---

## Database Architecture

### User Service Database
- Stores: User accounts, profiles, posts, follows, messages, notifications, fitness data
- **Separate database instance**

### Gym Management Service Database
- Stores: Gym registrations, gym details, gym admins, staff, gym locations
- **Separate database instance**

### Data Sharing
- Services share data via **internal API calls** (not direct database access)
- Each service maintains its own database
- Data consistency maintained through API contracts

---

## Environment Variables

### React Native App (.env)
```env
EXPO_PUBLIC_USERS_SERVICE_URL=http://192.168.1.6:8081
EXPO_PUBLIC_GYM_SERVICE_URL=http://192.168.1.6:3000
EXPO_PUBLIC_APP_NAME=Fitsera
```

### User Service (.env)
```env
PORT=8081
DATABASE_URL=...
INTERNAL_GYM_SERVICE_URL=http://localhost:3000
```

### Gym Management Service (.env)
```env
PORT=3000
DATABASE_URL=...
INTERNAL_USER_SERVICE_URL=http://localhost:8081
```

---

## Development Setup

### Running Services Locally

1. **User Service:**
   ```bash
   cd path/to/user-service
   npm run dev
   # Runs on http://localhost:8081
   ```

2. **Gym Management Service:**
   ```bash
   cd path/to/gym-management-service
   npm run dev
   # Runs on http://localhost:3000
   ```

3. **React Native App:**
   ```bash
   cd fitsera-app
   npm start
   ```

### Testing Internal API Calls

**From User Service to Gym Service:**
```bash
curl http://localhost:3000/gyms?limit=10
```

**From Gym Service to User Service:**
```bash
curl http://localhost:8081/api/users/health
```

---

## Future Enhancements

1. **Service Discovery:** Implement service registry for dynamic service discovery
2. **API Gateway:** Add API gateway for unified external API access
3. **Message Queue:** Consider message queue (RabbitMQ/Kafka) for async communication
4. **Caching:** Add Redis for caching shared data
5. **Load Balancing:** Add load balancers for high availability
6. **Monitoring:** Add centralized logging and monitoring (ELK stack, Prometheus)

---

## Notes

- Both microservices run on the **same server instance**
- Each service has its **own separate database**
- Services communicate via **internal HTTP API calls** (localhost)
- External clients (React Native app, website) connect to their respective services
- Internal API calls should be fast and reliable (same network, no external routing)

---

**Last Updated:** 2024
**Maintained By:** Development Team


