# jm-graph-parser
Parses knowledge graphs from publicly available resources.

## Requirements

- **Python**: 3.11+ with uv for dependency management
- **Node.js**: 18+ (20 recommended, see `.nvmrc`)

## Project Structure

```
graph-parser/
├── scraper/              # Python scraping logic (uv environment)
│   ├── models.py         # Data models (Course, Topic, Edge)
│   ├── database.py       # SQLite database operations
│   ├── graph_scraper.py  # Graph structure extraction
│   ├── content_scraper.py# Topic content extraction
│   └── main.py           # CLI entry point for scraping
├── server/               # Node.js API server (Express + TypeScript)
│   ├── src/
│   │   ├── index.ts      # Server entry point
│   │   └── routes/api.ts # API routes
│   └── package.json
├── frontend/             # React frontend (Vite + React Flow)
│   ├── src/
│   │   ├── App.tsx       # Main application
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utility functions
│   └── package.json
└── data/                 # Generated data storage
    └── graph.db          # SQLite database
```

## Setup

### Python Scraper
```bash
# Install Python dependencies with uv
uv sync

# Run the scraper to populate the database
uv run scrape
```

### Node.js Server & Frontend
```bash
# If using nvm, switch to the correct Node version
nvm use

# Install server dependencies
cd server && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

## Development

Run the API server and frontend in separate terminals:

```bash
# Terminal 1: Start the API server (port 3001)
cd server && npm run dev

# Terminal 2: Start the React frontend (port 3002)
cd frontend && npm run dev
```

Then open http://localhost:5173 in your browser.

## Production Build

```bash
# Build the frontend
cd frontend && npm run build

# Start production server (serves built frontend)
cd ../server && NODE_ENV=production npm start
```

## Features

- **Interactive Graph Visualization**: View the knowledge graph with React Flow
- **Search**: Find topics by name or URL slug
- **Course Filtering**: Filter nodes by course/category
- **Path Highlighting**: Double-click to highlight prerequisites and dependents
- **Learning Path**: View the ordered list of prerequisites for any topic
- **Detail Panel**: See topic details, prerequisites, and content preview
