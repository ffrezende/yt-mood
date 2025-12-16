# Redis Setup Guide

## Quick Start

### Using Docker (Recommended)

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### Verify Redis is Running

```bash
# Test connection
redis-cli ping
# Should return: PONG
```

## Configuration

Update your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty if no password
```

## Common Issues

### 1. Redis Not Running

**Error:** `ECONNREFUSED` or connection timeout

**Solution:**
```bash
# Start Redis (Docker)
docker start redis

# Or start Redis service
redis-server
```

### 2. Wrong Port

**Error:** Connection refused on port 6379

**Solution:**
- Check if Redis is running on a different port
- Update `REDIS_PORT` in `.env`

### 3. Redis Password Required

**Error:** `NOAUTH Authentication required`

**Solution:**
- Add password to `.env`: `REDIS_PASSWORD=your_password`
- Or remove password from Redis configuration

### 4. Redis on Different Host

**Error:** Can't connect to localhost

**Solution:**
- Update `REDIS_HOST` in `.env` to the correct host
- Ensure Redis is accessible from your network

## Testing Connection

The application will automatically test the Redis connection on startup. You should see:

```
✅ Redis connection successful: localhost:6379
```

If you see an error, check:
1. Redis is running
2. Port is correct (default: 6379)
3. No firewall blocking the connection
4. Password is correct (if set)

## Windows Setup

### Option 1: Docker Desktop
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Option 2: WSL2
```bash
# In WSL2 terminal
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start
```

### Option 3: Memurai (Windows Native)
Download from: https://www.memurai.com/

## macOS Setup

```bash
# Using Homebrew
brew install redis
brew services start redis
```

## Linux Setup

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

