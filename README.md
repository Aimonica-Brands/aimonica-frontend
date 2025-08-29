# Aimonica Frontend

## Project Overview

Aimonica Frontend is a modern Web 3.0 frontend application built with Next.js, supporting multi-chain wallet connections and providing token staking, trading, and asset management functionality.

## Project Installation

```bash
# Clone project
git clone <repository-url>
cd aimonica-frontend

# Install dependencies
npm install
```

## Environment Variables Configuration

Create `.env` file:

```bash
# Fill in Callback URI / Redirect URL in Twitter Developer Platform
NEXTAUTH_URL=your-domain
NEXT_PUBLIC_AUTH_SECRET=your-auth-secret-here(random 32-bit string)
NEXT_PUBLIC_TWITTER_CLIENT_ID=your-twitter-client-id
NEXT_PUBLIC_TWITTER_CLIENT_SECRET=your-twitter-client-secret
NEXT_PUBLIC_COOKIEFUN_APIKEY=your-cookiefun-api-key
NEXT_PUBLIC_COINGECKO_APIKEY=your-coingecko-api-key
```

## Configuration

### 1. PM2 Process Management Configuration

The project includes `ecosystem.config.js` for PM2 process management:

```javascript
module.exports = {
  apps: [
    {
      name: 'aimonica-frontend',
      script: 'npm',
      args: 'start',
      autorestart: true,
      combine_logs: true,
      error_file: 'logs/aimonica-frontend/error.log',
      max_restarts: 5,
      min_uptime: '10s',
      out_file: 'logs/aimonica-frontend/normal.log',
      restart_delay: 5000,
    },
  ],
};
```

### 2. Port Configuration

- **Development environment**: 3009
- **Production environment**: 3009

## Deployment Guide

### 1. Development Environment

```bash
# Start development server
npm run dev

# Or start with production configuration
npm run dev:prod
```

### 2. Production Build

```bash
# Build production version
npm run build
```

### 3. PM2 Deployment

```bash
# Install PM2 (if not installed)
npm install -g pm2

# Start application
pm2 start

# Check application status
pm2 status

# View logs
pm2 logs aimonica-frontend

# Restart application
pm2 restart aimonica-frontend

# Stop application
pm2 stop aimonica-frontend

# Delete application
pm2 delete aimonica-frontend
```
