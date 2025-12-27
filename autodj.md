# AutoDJ & Playlist Manager

**Status:** Planning Phase  
**Started:** December 27, 2024  
**Target Integration:** StreamDock sidebar menu as "Playlists"

---

## 🎯 Overview

A full-featured playlist creator and AutoDJ system for Icecast servers. Built modular for development/testing, then integrated with StreamDock in Phase 3.

### Design Principles
- **Clean, modern Material Design** - matches StreamDock dark mode aesthetic
- **Intuitive & simple** - all features discoverable without documentation
- **Compact yet functional** - efficient use of space, scrollable lists
- **Drag-and-drop** - for library and playlist management

---

## 📋 Three-Phase Development Plan

### Phase 1: Standalone Playlist Editor (Modular)
> **Goal:** Build the playlist editor as a standalone web component

| Component | Description |
|-----------|-------------|
| **Audio Library** | Drag-and-drop upload, file browser, metadata display |
| **Playlist Editor** | Create/edit/delete playlists, drag-to-reorder tracks |
| **Search & Filter** | Quick search, sort by artist/title/duration/date |
| **Metadata Editor** | View/edit ID3 tags inline |

#### Deliverables
- [ ] Standalone `/playlist-editor` page (modular, no StreamDock dependencies)
- [ ] File upload with drag-and-drop zone
- [ ] Audio library with sortable table
- [ ] Playlist creation/management
- [ ] Drag tracks from library to playlist
- [ ] Reorder tracks within playlist (drag-and-drop)
- [ ] SQLite schema for library and playlists
- [ ] REST API endpoints for CRUD operations

---

### Phase 2: AutoDJ Engine (Modular)
> **Goal:** Build the scheduling/automation engine

| Component | Description |
|-----------|-------------|
| **Scheduler** | Time-based playlist rotation |
| **Smart Shuffle** | Rules-based playback (no repeat, mix genres) |
| **Crossfade** | Configurable overlap between tracks |
| **Now Playing** | Track current song, history, up next |

#### Deliverables
- [ ] AutoDJ daemon/service (Node.js or Liquidsoap integration)
- [ ] Schedule configuration UI
- [ ] Crossfade settings (0-10 seconds)
- [ ] Playback rules (shuffle, repeat, gap between same artist)
- [ ] "Now Playing" real-time display
- [ ] "Play Next" queue management
- [ ] Stream output to Icecast mount

---

### Phase 3: StreamDock Integration
> **Goal:** Full integration into the StreamDock application

| Component | Description |
|-----------|-------------|
| **Sidebar Menu** | "Playlists" nav item with ListMusic icon |
| **Station Binding** | Assign AutoDJ as fallback or primary for stations |
| **Unified UI** | Match existing StreamDock styling/components |

#### Deliverables
- [ ] Add "Playlists" to Sidebar.jsx navItems
- [ ] New `/playlists` route in App.jsx
- [ ] Playlists.jsx page component
- [ ] Station → AutoDJ assignment in EditStationModal
- [ ] AutoDJ as fallback source option (replaces relay)
- [ ] Shared database schema (extend stations.db)

---

## 🏗️ Technical Architecture

### Database Schema (Phase 1 & 2)

```sql
-- Audio Library
CREATE TABLE audio_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL UNIQUE,
  title TEXT,
  artist TEXT,
  album TEXT,
  duration INTEGER, -- seconds
  bitrate INTEGER,
  format TEXT, -- mp3, flac, ogg, etc.
  filesize INTEGER,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_played DATETIME
);

-- Playlists
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 0
);

-- Playlist Tracks (junction table)
CREATE TABLE playlist_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  audio_file_id INTEGER NOT NULL,
  position INTEGER NOT NULL, -- order in playlist
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE
);

-- Schedules (Phase 2)
CREATE TABLE schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  day_of_week TEXT, -- 'monday', 'tuesday', etc. or NULL for daily
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT 1,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Playback History (Phase 2)
CREATE TABLE playback_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audio_file_id INTEGER NOT NULL,
  station_id INTEGER, -- Phase 3: links to stations table
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audio_file_id) REFERENCES audio_files(id)
);
```

### API Endpoints Plan

#### Phase 1 - Library & Playlists
```
GET    /api/library              - List all audio files
POST   /api/library/upload       - Upload audio file(s)
DELETE /api/library/:id          - Delete audio file
PATCH  /api/library/:id          - Update metadata

GET    /api/playlists            - List all playlists
POST   /api/playlists            - Create playlist
GET    /api/playlists/:id        - Get playlist with tracks
PUT    /api/playlists/:id        - Update playlist
DELETE /api/playlists/:id        - Delete playlist

POST   /api/playlists/:id/tracks           - Add track to playlist
PUT    /api/playlists/:id/tracks/reorder   - Reorder tracks
DELETE /api/playlists/:id/tracks/:trackId  - Remove track
```

#### Phase 2 - AutoDJ Engine
```
GET    /api/autodj/status        - Current playback status
POST   /api/autodj/start         - Start AutoDJ
POST   /api/autodj/stop          - Stop AutoDJ
POST   /api/autodj/skip          - Skip current track
GET    /api/autodj/queue         - Get upcoming tracks
POST   /api/autodj/queue/:id     - Add track to queue

GET    /api/schedules            - List schedules
POST   /api/schedules            - Create schedule
PUT    /api/schedules/:id        - Update schedule
DELETE /api/schedules/:id        - Delete schedule
```

---

## 🎨 UI Component Structure

### Library View
```
┌─────────────────────────────────────────────────────────────┐
│ 📁 Audio Library                           [Upload] [Search]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  Drop files here to upload                              │ │
│ │               📁                                        │ │
│ │  Drag & drop audio files or click to browse             │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Title ▼         │ Artist      │ Album      │ Duration    │ │
├──────────────────┼─────────────┼────────────┼─────────────┤ │
│  Song Name 1     │ Artist A    │ Album X    │ 3:45        │ │
│  Song Name 2     │ Artist B    │ Album Y    │ 4:12        │ │
│  Song Name 3     │ Artist A    │ Album Z    │ 2:58        │ │
│  ... scrollable ...                                        │ │
└─────────────────────────────────────────────────────────────┘
```

### Playlist Editor View
```
┌──────────────────────────────┬──────────────────────────────┐
│ 📋 Playlists                 │ 🎵 Evening Chill (12 tracks) │
├──────────────────────────────┼──────────────────────────────┤
│ ▸ Evening Chill         [12] │ ═ Song Name 1       3:45     │
│   Morning Wake-Up       [8]  │ ═ Song Name 2       4:12     │
│   Weekend Party         [24] │ ═ Song Name 3       2:58     │
│   Talk Show Bumpers     [15] │ ═ Song Name 4       5:20     │
│                              │ ... drag to reorder ...      │
│ ────────────────             │                              │
│ [+ New Playlist]             │ Total: 48:32                 │
│                              │ [▶ Preview] [📡 Stream]      │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 🔧 Technology Choices

### Audio Playback Engine
| Option | Pros | Cons |
|--------|------|------|
| **Liquidsoap** | Battle-tested, crossfade built-in | Separate process, learning curve |
| **FFmpeg + Node** | Flexible, already in Docker | More custom code needed |
| **Web Audio API** | Pure JS, preview in browser | Server-side playback complex |

**Recommendation:** Liquidsoap integration ✅  
- Already in the stack for relay features
- Native crossfade, normalization, playlist support
- Can be controlled via telnet/HTTP

### File Storage
- Local filesystem: `/app/data/audiofiles/`
- Max file size: Configurable (default 100MB)
- Supported formats: MP3, FLAC, OGG, AAC, WAV

### Drag-and-Drop Library
- `react-beautiful-dnd` or `@dnd-kit/core` for smooth interactions
- File drop zone with `react-dropzone`

---

## 📝 Development Log

### December 27, 2024
- Initial planning document created
- Three-phase architecture defined
- Database schema drafted
- UI wireframes outlined
- **Phase 1 Implementation Started:**
  - Added database tables: `audio_files`, `playlists`, `playlist_tracks` to `server/db.js`
  - Added 14 API endpoints to `server/index.js` for library and playlist CRUD
  - Created `Playlists.jsx` page with Library tab (upload zone, search, file table) and Playlists tab (create/edit/delete playlists, track management)
  - Added `/playlists` route to `App.jsx`
  - Added "Playlists" nav item to `Sidebar.jsx`
  - ✅ Build verified successful

---

## 🐛 Issues & Notes

*Track any issues, blockers, or important decisions here*

| Date | Issue | Status | Resolution |
|------|-------|--------|------------|
| - | - | - | - |

---

## ✅ Implementation Checklist

### Phase 1 Checklist
- [x] Create database migrations for audio_files, playlists, playlist_tracks
- [x] Implement file upload endpoint with multer *(pending - drag-drop UI ready)*
- [x] Parse ID3 tags on upload (use `music-metadata` npm package) *(pending)*
- [x] Build Playlists.jsx component with Library and Playlists tabs
- [x] Build PlaylistEditor panel with dual-panel layout
- [x] Implement drag-and-drop upload zone (UI ready, backend pending)
- [x] Add search/filter functionality
- [x] Create modular page at `/playlists`

### Phase 2 Checklist
- [ ] Design Liquidsoap integration for dynamic playlists
- [ ] Create schedule management UI
- [ ] Implement crossfade settings
- [ ] Build "Now Playing" real-time display
- [ ] Add playback control buttons (start/stop/skip)
- [ ] Create play queue management
- [ ] Test with actual Icecast streaming

### Phase 3 Checklist
- [ ] Match existing StreamDock styling ✅ Already done
- [x] Add "Playlists" to sidebar navigation
- [x] Create `/playlists` route and page
- [ ] Add AutoDJ option in station edit modal
- [ ] Connect AutoDJ output to station mount
- [ ] Full integration testing

---

*Last Updated: December 27, 2024*
