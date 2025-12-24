# Relay & Fallback Feature Tracker

> Dedicated tracking for relay/fallback streaming feature implementation

---

## ✅ Completed

### Stage 1: Database & Foundation
- [x] Add `relay_url`, `relay_enabled`, `relay_mode` fields to stations table
- [x] Update database queries to include relay fields
- [x] Add relay fields to station API responses

### Stage 2: UI - Edit Station Modal
- [x] Add "External Source" section to Edit Station modal
- [x] Relay URL input with "Test URL" button
- [x] Enable/disable toggle
- [x] Primary/Fallback mode selector
- [x] Test URL validation endpoint (`/api/relay/test-url`)

### Stage 3: Relay Manager Service
- [x] Create `relayManager.js` with ffmpeg streaming
- [x] `startRelay(stationId)` - starts ffmpeg process
- [x] `stopRelay(stationId)` - kills ffmpeg process
- [x] `isActive(stationId)` - checks if relay running
- [x] Auto-start primary relays on server boot
- [x] Manual start/stop via Edit Station modal

### Stage 4A: Fallback Auto-Start (CURRENT)
- [x] Detect encoder drop in status polling
- [x] If fallback configured → auto-start relay
- [x] Create "Fallback Activated" alert (bell + email)
- [x] Add `fallback_activated` email styling
- [ ] **Track active fallback state in API** ← NEXT

### Station Card UI Updates
- [x] RELAY badge (blue) when primary mode enabled
- [x] FALLBACK badge (amber) when fallback configured
- [ ] **FALLBACK ACTIVE badge (red)** when relay is actually running

---

## 🔜 Next Phases

### Stage 4B: Encoder Return Detection
- [ ] Detect when encoder reconnects while fallback active
- [ ] Auto-stop fallback when encoder returns
- [ ] Create "Encoder Restored" alert (bell + email)

### Stage 4C: Dynamic UI Status
- [ ] API returns `relayActive: true/false` for each station
- [ ] Station card shows "FALLBACK ACTIVE" when relay is streaming
- [ ] Visual distinction between "standby" and "active" fallback

### Stage 5: Advanced Features (Future)
- [ ] Relay health monitoring
- [ ] Manual fallback override button
- [ ] Fallback quality/bitrate display
- [ ] Relay logs viewer

---

## Quick Reference

| State | Badge | Color | Meaning |
|-------|-------|-------|---------|
| No relay | (none) | - | Normal encoder-only station |
| Primary mode | RELAY | Blue | Always streaming from relay URL |
| Fallback standby | FALLBACK | Amber | Ready to activate if encoder drops |
| Fallback active | FALLBACK ACTIVE | Red | Currently streaming from fallback |

---

## Files Modified

- `server/relayManager.js` - Core relay management
- `server/index.js` - API endpoints, monitoring loop, alerts
- `server/db.js` - Database schema and queries
- `src/components/EditStationModal.jsx` - Relay configuration UI
- `src/pages/Stations.jsx` - Station card display with badges
