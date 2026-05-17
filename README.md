# MeTube

Curate a single YouTube playlist for your child to watch. Search for channels, subscribe to them, and decide which new videos to add to the playlist or ignore.

## Features

- **Google Auth** - Sign in with your Google account (persists across server restarts)
- **Persistent Sessions** - Sessions and OAuth tokens survive server restarts
- **Channel Search** - Search for YouTube channels and subscribe to them
- **Video Curation** - New videos appear with title, thumbnail, and description
- **Add/Ignore** - Add videos to your YouTube playlist or ignore them
- **Duration Filters** - Auto-ignore videos outside MIN_DURATION / MAX_DURATION on sync
- **Error Handling** - Toast notifications when adding to playlist fails, videos remain pending
- **Swipe Gestures** - Swipe left to ignore, swipe right to add
- **Dark Mode** - Toggle between light and dark themes
- **Sync Subscriptions** - Sync your YouTube account subscriptions

## Setup

### Prerequisites

- [mise](https://mise.jdx.dev/) for tool management
- A Google Cloud project with YouTube Data API v3 enabled

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
YOUTUBE_API_KEY=your-youtube-api-key
MIN_DURATION=60
MAX_DURATION=3600
SESSION_SECRET=a-random-secret-string
YOUTUBE_PLAYLIST_ID=your-youtube-playlist-id
PORT=3000
```

#### Duration Filters

- `MIN_DURATION` (default: `60`) — Minimum video duration in seconds. Shorter videos are auto-ignored.
- `MAX_DURATION` (default: `3600`) — Maximum video duration in seconds. Longer videos are auto-ignored.

### 2. Install Dependencies

```bash
bun install
```

### 3. Run Development Servers

```bash
# Run both backend and frontend
bun run dev

# Or run separately
bun run dev:backend   # Backend on port 3000
bun run dev:frontend  # Frontend on port 5173
```

### 4. Build for Production

```bash
bun run build
```

### 5. Run with Docker

```bash
# Build and run with docker compose
docker compose up --build

# Or build the image directly
docker build -t me-tube .
docker run -p 3000:3000 --env-file .env me-tube
```

The app will be available at `http://localhost:3000`.

## Testing

```bash
# Run all tests
bun run test

# Run backend tests only
bun run test:backend

# Run frontend tests only
bun run test:frontend
```

## Architecture

### Backend

- **Runtime**: Bun with TypeScript
- **Database**: SQLite (built-in `bun:sqlite`)
- **Framework**: Express.js
- **Auth**: Google OAuth 2.0 Device Flow with persistent tokens in SQLite
- **Sessions**: SQLite-based session store (survives restarts)
- **API**: REST API with session-based auth
- **Token Refresh**: Automatic OAuth2 token refresh before API calls

### Frontend

- **Framework**: React 19
- **State Management**: Redux Toolkit + Redux Sagas
- **Styling**: SCSS modules
- **Build Tool**: Vite
- **Architecture**:
  - Presentational components (stateless, visual only)
  - Connected wrappers using `connect` from react-redux
  - Redux Toolkit slices for state management
  - Redux Sagas for all side effects (no useEffect)

### Project Structure

```
├── backend/
│   ├── src/
│   │   ├── auth/          # OAuth helpers
│   │   ├── db/            # Database schema and repository
│   │   ├── routes/        # Express routes
│   │   └── youtube/       # YouTube API integration
│   └── tests/             # Backend tests
├── frontend/
│   ├── src/frontend/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   │   └── connected/ # Connected wrappers
│   │   ├── sagas/         # Redux Sagas
│   │   ├── slices/        # Redux Toolkit slices
│   │   ├── store/         # Store configuration
│   │   ├── styles/        # Global styles
│   │   └── types/         # TypeScript types
│   └── tests/             # Frontend tests
└── public/                # Static assets
```

## Google Cloud Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **YouTube Data API v3**
3. Create OAuth 2.0 device credentials
4. Create a YouTube playlist and note its ID
5. Add an API key for non-authenticated requests

## Usage

1. Open `http://localhost:5175` in your browser
2. Sign in with Google
3. Search for channels and subscribe
4. Click "Sync Channels" to fetch new videos
5. Add or ignore videos using buttons or swipe gestures
6. Click "Sync Subscriptions" to import your YouTube subscriptions
