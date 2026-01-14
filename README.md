# jm-graph-parser
Parses knowledge graphs from publicly available resources.

## Features

- **Interactive Graph Visualization**: View the knowledge graph with React Flow
- **Search**: Find topics by name or URL slug
- **Course Filtering**: Filter nodes by course/category
- **Path Highlighting**: Double-click to highlight prerequisites and dependents
- **Learning Path**: View the ordered list of prerequisites for any topic
- **Detail Panel**: See topic details, prerequisites, and content preview

## Data Models

The knowledge graph is built from three core entities:

### Course

A course represents a category or grouping for topics. Each topic belongs to exactly one course.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier |
| `name` | string | Display name (e.g., "Algebra", "Calculus") |
| `color` | string | Hex color code for visual distinction |

### Topic

A topic is a node in the knowledge graph representing a single concept or skill.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier |
| `urlSlug` | string | URL-friendly identifier (e.g., "linear-equations") |
| `displayName` | string | Human-readable name |
| `courseId` | number | Foreign key to the parent course |
| `parentSlugs` | string[] | List of prerequisite topic slugs |
| `contentHtml` | string? | Optional HTML content for the topic |
| `contentText` | string? | Optional plain text content |
| `hasContent` | boolean | Whether the topic has associated content |

### Edge

An edge represents a directed prerequisite relationship between two topics. If topic A is a prerequisite for topic B, the edge points from A (parent) to B (child).

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier |
| `parentSlug` | string | The prerequisite topic's URL slug |
| `childSlug` | string | The dependent topic's URL slug |

## API Documentation (v1)

Base URL: `/api/v1/graphs`

All responses follow a standard format:
```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Description" }
}
```

### Knowledge Graphs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all graphs |
| POST | `/` | Create a new graph |
| GET | `/:graphId` | Get graph metadata |
| PATCH | `/:graphId` | Update graph name/description |
| DELETE | `/:graphId` | Delete a graph (not default) |
| GET | `/:graphId/data` | Get full graph data (courses, topics, edges) |
| POST | `/:graphId/batch` | Batch update operations |

**Create Graph Request:**
```json
{
  "name": "My Graph",
  "description": "Optional description",
  "copyFromGraphId": "source-id"  // Optional: copy from existing graph
}
```

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:graphId/courses` | List all courses |
| POST | `/:graphId/courses` | Create a course |
| GET | `/:graphId/courses/:courseId` | Get a course |
| PATCH | `/:graphId/courses/:courseId` | Update a course |
| DELETE | `/:graphId/courses/:courseId` | Delete a course |

**Create/Update Course Request:**
```json
{
  "name": "Course Name",
  "color": "#FF5733"
}
```

### Topics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:graphId/topics` | List all topics |
| POST | `/:graphId/topics` | Create a topic |
| GET | `/:graphId/topics/:urlSlug` | Get a topic |
| PATCH | `/:graphId/topics/:urlSlug` | Update a topic |
| DELETE | `/:graphId/topics/:urlSlug` | Delete a topic |
| GET | `/:graphId/topics/:urlSlug/prerequisites` | Get topic's prerequisites |
| GET | `/:graphId/topics/:urlSlug/dependents` | Get topics that depend on this one |

**Create Topic Request:**
```json
{
  "urlSlug": "topic-slug",
  "displayName": "Topic Name",
  "courseId": 1,
  "contentHtml": "<p>Optional HTML content</p>",
  "contentText": "Optional plain text"
}
```

### Edges

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:graphId/edges` | List all edges |
| POST | `/:graphId/edges` | Create an edge (prerequisite relationship) |
| DELETE | `/:graphId/edges/:parentSlug/:childSlug` | Delete an edge |

**Create Edge Request:**
```json
{
  "parentSlug": "prerequisite-topic",
  "childSlug": "dependent-topic"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `GRAPH_NOT_FOUND` | 404 | Graph does not exist |
| `COURSE_NOT_FOUND` | 404 | Course does not exist |
| `TOPIC_NOT_FOUND` | 404 | Topic does not exist |
| `EDGE_NOT_FOUND` | 404 | Edge does not exist |
| `READONLY_GRAPH` | 409 | Cannot modify read-only graph |
| `CANNOT_DELETE_DEFAULT` | 409 | Cannot delete the default graph |
| `DATABASE_ERROR` | 500 | Internal database error |

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

## Requirements

- **Python**: 3.11+ with uv for dependency management
- **Node.js**: 18+ (20 recommended, see `.nvmrc`)

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