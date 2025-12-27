# Relay & Fallback Feature

> **Status:** ✅ COMPLETE  
> **Last Updated:** December 26, 2024 @ 7:56 PM EST

---

## Overview

The Relay & Fallback feature allows StreamDock to automatically play a backup stream when your primary encoder disconnects, ensuring 24/7 uninterrupted broadcasting.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    FALLBACK MODE                             │
├─────────────────────────────────────────────────────────────┤
│  Encoder Connected:   🟠 ORANGE badge (fallback on standby) │
│  Encoder Disconnected: 🟢 GREEN badge (fallback is streaming)│
└─────────────────────────────────────────────────────────────┘
```

### Badge Color Legend

| Badge | Meaning | Audio Source |
|-------|---------|--------------|
| 🟢 **GREEN** | Fallback is ACTIVE | Fallback URL is streaming |
| 🟠 **ORANGE** | Fallback is on STANDBY | Your encoder (Mixxx, BUTT, etc.) is streaming |

---

## Setup Instructions

1. **Create or edit a station**
2. **Enable "Auto Fallback"** toggle
3. **Enter a Fallback URL** (any HTTP/HTTPS audio stream)
4. **Save the station**

The fallback will activate automatically when:
- Your encoder disconnects
- Your encoder is not connected when you enable the feature

---

## Technical Architecture

### Components

| Component | Role |
|-----------|------|
| **Liquidsoap** | Stream switcher with encoder detection |
| **Node.js API** | Receives webhooks, updates database |
| **SQLite** | Stores `relay_status` field |
| **React Frontend** | Displays badge, polls every 5 seconds |

### Data Flow

```
Encoder → Liquidsoap → Webhook → Node.js API → Database → Frontend Poll
                                     ↓
                              Badge Color Update
```

### Webhook Endpoints

| Endpoint | Trigger | Sets Badge |
|----------|---------|------------|
| `POST /api/encoder/:id/connected` | Encoder connects | 🟠 ORANGE |
| `POST /api/encoder/:id/disconnected` | Encoder disconnects | 🟢 GREEN |

---

## Bug History & Fixes

### Bug #1: Polling Overrides (Fixed)
**Problem:** The 5-second polling loop was overriding webhook-set status  
**Fix:** Removed `db.updateRelayStatus()` calls from polling logic

### Bug #2: Port Mismatch (Fixed)
**Problem:** Liquidsoap webhook used port 3001, Node.js runs on 3000  
**Fix:** Changed port in `server/liquidsoopConfig.js` from 3001 to 3000

### Bug #3: Auth Blocking Webhooks (Fixed)
**Problem:** Auth middleware blocked Liquidsoap's curl requests  
**Fix:** Added exemption for `/encoder/` paths in auth middleware

### Bug #4: No Auto-Refresh (Fixed)
**Problem:** Badge only updated on manual page refresh  
**Fix:** Added station data polling every 5 seconds in frontend

---

## Files Involved

| File | Purpose |
|------|---------|
| `server/liquidsoopConfig.js` | Generates Liquidsoap config with webhooks |
| `server/index.js` | Webhook endpoints, auth middleware |
| `server/db.js` | `updateRelayStatus()` function |
| `src/pages/Stations.jsx` | Badge display and polling |

---

## Testing Checklist

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable fallback on station | Badge turns 🟢 GREEN |
| 2 | Refresh page | Badge stays 🟢 GREEN |
| 3 | Connect encoder (Mixxx) | Badge turns 🟠 ORANGE (within 5s) |
| 4 | Disconnect encoder | Badge turns 🟢 GREEN (within 5s) |
| 5 | Audio plays continuously | ✅ No interruption |

---

## Troubleshooting

### Badge not updating?
1. Check Coolify logs for `[ENCODER] Connected` or `[ENCODER] Disconnected`
2. Verify webhook with: `curl -s -X POST http://127.0.0.1:3000/api/encoder/{station-id}/connected`
3. Should return `{"ok":true,"status":"connected"}`

### Getting "Unauthorized"?
- Auth middleware may be blocking webhooks
- Check that `/encoder/` path is exempted in `requireAuth` middleware

### Fallback not playing?
- Verify the fallback URL is accessible
- Check Liquidsoap logs for HTTP connection errors
