"""SQLite database storage for the knowledge graph."""

import json
import sqlite3
from pathlib import Path

from .models import Course, Topic, Edge

DEFAULT_DB_PATH = Path(__file__).parent.parent / "data" / "graph.db"


def init_database(db_path: Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """Initialize the SQLite database with schema.

    Args:
        db_path: Path to the database file

    Returns:
        Database connection
    """
    # Ensure directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    # Create courses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL
        )
    """)

    # Create topics table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY,
            url_slug TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            course_id INTEGER NOT NULL,
            parent_slugs TEXT,
            content_html TEXT,
            content_text TEXT,
            has_content INTEGER DEFAULT 0,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        )
    """)

    # Create edges table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS edges (
            id INTEGER PRIMARY KEY,
            parent_slug TEXT NOT NULL,
            child_slug TEXT NOT NULL,
            FOREIGN KEY (parent_slug) REFERENCES topics(url_slug),
            FOREIGN KEY (child_slug) REFERENCES topics(url_slug)
        )
    """)

    # Create indexes for faster lookups
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_topics_url_slug ON topics(url_slug)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_topics_course_id ON topics(course_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_edges_parent ON edges(parent_slug)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_edges_child ON edges(child_slug)")

    conn.commit()
    return conn


def clear_database(conn: sqlite3.Connection) -> None:
    """Clear all data from the database."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM edges")
    cursor.execute("DELETE FROM topics")
    cursor.execute("DELETE FROM courses")
    conn.commit()


def save_courses(conn: sqlite3.Connection, courses: list[Course]) -> None:
    """Save courses to the database."""
    cursor = conn.cursor()
    cursor.executemany(
        "INSERT OR REPLACE INTO courses (id, name, color) VALUES (?, ?, ?)",
        [(c.id, c.name, c.color) for c in courses],
    )
    conn.commit()


def save_topics(conn: sqlite3.Connection, topics: list[Topic]) -> None:
    """Save topics to the database."""
    cursor = conn.cursor()
    cursor.executemany(
        """INSERT OR REPLACE INTO topics
           (id, url_slug, display_name, course_id, parent_slugs, content_html, content_text, has_content)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                t.id,
                t.url_slug,
                t.display_name,
                t.course_id,
                json.dumps(t.parent_slugs),
                t.content_html,
                t.content_text,
                1 if t.has_content else 0,
            )
            for t in topics
        ],
    )
    conn.commit()


def save_edges(conn: sqlite3.Connection, edges: list[Edge]) -> None:
    """Save edges to the database."""
    cursor = conn.cursor()
    cursor.executemany(
        "INSERT OR REPLACE INTO edges (id, parent_slug, child_slug) VALUES (?, ?, ?)",
        [(e.id, e.parent_slug, e.child_slug) for e in edges],
    )
    conn.commit()


def load_courses(conn: sqlite3.Connection) -> list[Course]:
    """Load all courses from the database."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, color FROM courses ORDER BY id")
    return [Course(id=row["id"], name=row["name"], color=row["color"]) for row in cursor.fetchall()]


def load_topics(conn: sqlite3.Connection) -> list[Topic]:
    """Load all topics from the database."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT id, url_slug, display_name, course_id, parent_slugs,
                  content_html, content_text, has_content
           FROM topics ORDER BY id"""
    )
    return [
        Topic(
            id=row["id"],
            url_slug=row["url_slug"],
            display_name=row["display_name"],
            course_id=row["course_id"],
            parent_slugs=json.loads(row["parent_slugs"]) if row["parent_slugs"] else [],
            content_html=row["content_html"],
            content_text=row["content_text"],
            has_content=bool(row["has_content"]),
        )
        for row in cursor.fetchall()
    ]


def load_edges(conn: sqlite3.Connection) -> list[Edge]:
    """Load all edges from the database."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, parent_slug, child_slug FROM edges ORDER BY id")
    return [
        Edge(id=row["id"], parent_slug=row["parent_slug"], child_slug=row["child_slug"])
        for row in cursor.fetchall()
    ]


def export_to_json(conn: sqlite3.Connection, output_path: Path) -> None:
    """Export the entire database to a JSON file."""
    courses = load_courses(conn)
    topics = load_topics(conn)
    edges = load_edges(conn)

    data = {
        "courses": [c.to_dict() for c in courses],
        "topics": [t.to_dict() for t in topics],
        "edges": [e.to_dict() for e in edges],
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Exported to {output_path}")


def get_topic_by_slug(conn: sqlite3.Connection, slug: str) -> Topic | None:
    """Get a single topic by its URL slug."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT id, url_slug, display_name, course_id, parent_slugs,
                  content_html, content_text, has_content
           FROM topics WHERE url_slug = ?""",
        (slug,),
    )
    row = cursor.fetchone()
    if row:
        return Topic(
            id=row["id"],
            url_slug=row["url_slug"],
            display_name=row["display_name"],
            course_id=row["course_id"],
            parent_slugs=json.loads(row["parent_slugs"]) if row["parent_slugs"] else [],
            content_html=row["content_html"],
            content_text=row["content_text"],
            has_content=bool(row["has_content"]),
        )
    return None


def get_topic_children(conn: sqlite3.Connection, slug: str) -> list[Topic]:
    """Get all topics that have the given slug as a parent."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT t.id, t.url_slug, t.display_name, t.course_id, t.parent_slugs,
                  t.content_html, t.content_text, t.has_content
           FROM topics t
           JOIN edges e ON t.url_slug = e.child_slug
           WHERE e.parent_slug = ?
           ORDER BY t.id""",
        (slug,),
    )
    return [
        Topic(
            id=row["id"],
            url_slug=row["url_slug"],
            display_name=row["display_name"],
            course_id=row["course_id"],
            parent_slugs=json.loads(row["parent_slugs"]) if row["parent_slugs"] else [],
            content_html=row["content_html"],
            content_text=row["content_text"],
            has_content=bool(row["has_content"]),
        )
        for row in cursor.fetchall()
    ]
