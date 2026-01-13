import { Router } from 'express';
import initSqlJs, { type Database } from 'sql.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');

const router = Router();

interface Course {
  id: number;
  name: string;
  color: string;
}

interface Topic {
  id: number;
  url_slug: string;
  display_name: string;
  course_id: number;
  parent_slugs: string[];
  content_html: string | null;
  content_text: string | null;
  has_content: boolean;
}

interface Edge {
  id: number;
  parent_slug: string;
  child_slug: string;
}

interface GraphData {
  courses: Course[];
  topics: Topic[];
  edges: Edge[];
}

async function loadFromDatabase(): Promise<GraphData> {
  const dbPath = join(DATA_DIR, 'graph.db');
  const SQL = await initSqlJs();
  const fileBuffer = readFileSync(dbPath);
  const db: Database = new SQL.Database(fileBuffer);

  const coursesResult = db.exec('SELECT id, name, color FROM courses ORDER BY id');
  const courses: Course[] = coursesResult.length > 0
    ? coursesResult[0].values.map(row => ({
        id: row[0] as number,
        name: row[1] as string,
        color: row[2] as string,
      }))
    : [];

  const topicsResult = db.exec(`
    SELECT id, url_slug, display_name, course_id, parent_slugs,
           content_html, content_text, has_content
    FROM topics ORDER BY id
  `);
  const topics: Topic[] = topicsResult.length > 0
    ? topicsResult[0].values.map(row => ({
        id: row[0] as number,
        url_slug: row[1] as string,
        display_name: row[2] as string,
        course_id: row[3] as number,
        parent_slugs: row[4] ? JSON.parse(row[4] as string) : [],
        content_html: row[5] as string | null,
        content_text: row[6] as string | null,
        has_content: Boolean(row[7]),
      }))
    : [];

  const edgesResult = db.exec('SELECT id, parent_slug, child_slug FROM edges ORDER BY id');
  const edges: Edge[] = edgesResult.length > 0
    ? edgesResult[0].values.map(row => ({
        id: row[0] as number,
        parent_slug: row[1] as string,
        child_slug: row[2] as string,
      }))
    : [];

  db.close();
  return { courses, topics, edges };
}

async function loadGraphData(): Promise<GraphData> {
  const jsonPath = join(DATA_DIR, 'graph.json');

  // Try JSON file first (faster)
  if (existsSync(jsonPath)) {
    const content = readFileSync(jsonPath, 'utf-8');
    return JSON.parse(content) as GraphData;
  }

  // Fall back to database
  return loadFromDatabase();
}

router.get('/graph', async (req, res) => {
  try {
    const data = await loadGraphData();

    // Remove content_html for payload optimization (keep full content_text)
    for (const topic of data.topics) {
      topic.content_html = null;
    }

    res.json(data);
  } catch (error) {
    console.error('Error loading graph data:', error);
    res.status(500).json({ error: 'Failed to load graph data' });
  }
});

export default router;
