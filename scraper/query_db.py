"""
Query script for exploring the graph.db SQLite database.

This script provides example SQL queries to explore the knowledge graph data.

DATABASE SCHEMA:
================

1. COURSES TABLE
   - id: INTEGER PRIMARY KEY - Unique identifier for each course
   - name: TEXT - Course name (e.g., "Calculus", "Linear Algebra")
   - color: TEXT - Color code for visualization (e.g., "#FF5733")

2. TOPICS TABLE
   - id: INTEGER PRIMARY KEY - Unique identifier for each topic
   - url_slug: TEXT UNIQUE - URL-friendly identifier (e.g., "derivatives", "matrix-multiplication")
   - display_name: TEXT - Human-readable name shown in UI
   - course_id: INTEGER - Foreign key to courses table
   - parent_slugs: TEXT - JSON array of parent topic slugs
   - content_html: TEXT - HTML content for the topic (nullable)
   - content_text: TEXT - Plain text content for the topic (nullable)
   - has_content: INTEGER - Boolean flag (0/1) indicating if topic has content

3. EDGES TABLE
   - id: INTEGER PRIMARY KEY - Unique identifier for each edge
   - parent_slug: TEXT - URL slug of the parent/prerequisite topic
   - child_slug: TEXT - URL slug of the child/dependent topic

RELATIONSHIPS:
==============
- Topics belong to Courses (topics.course_id -> courses.id)
- Edges represent prerequisite relationships between Topics
  (parent_slug is a prerequisite for child_slug)
"""

import sqlite3
from pathlib import Path

# Path to the database
DB_PATH = Path(__file__).parent.parent / "data" / "graph.db"


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def print_section(title: str):
    """Print a section header."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}\n")


def query_basic_stats(conn: sqlite3.Connection):
    """Query basic statistics about the database."""
    print_section("BASIC STATISTICS")

    cursor = conn.cursor()

    # Count records in each table
    cursor.execute("SELECT COUNT(*) as count FROM courses")
    print(f"Total courses: {cursor.fetchone()['count']}")

    cursor.execute("SELECT COUNT(*) as count FROM topics")
    print(f"Total topics: {cursor.fetchone()['count']}")

    cursor.execute("SELECT COUNT(*) as count FROM edges")
    print(f"Total edges (prerequisite relationships): {cursor.fetchone()['count']}")

    # Topics with content
    cursor.execute("SELECT COUNT(*) as count FROM topics WHERE has_content = 1")
    print(f"Topics with content: {cursor.fetchone()['count']}")


def query_all_courses(conn: sqlite3.Connection):
    """List all courses in the database."""
    print_section("ALL COURSES")

    cursor = conn.cursor()
    cursor.execute("SELECT id, name, color FROM courses ORDER BY id")

    for row in cursor.fetchall():
        print(f"  [{row['id']}] {row['name']} (color: {row['color']})")


def query_topics_per_course(conn: sqlite3.Connection):
    """Count topics per course."""
    print_section("TOPICS PER COURSE")

    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.name, COUNT(t.id) as topic_count
        FROM courses c
        LEFT JOIN topics t ON c.id = t.course_id
        GROUP BY c.id, c.name
        ORDER BY topic_count DESC
    """)

    for row in cursor.fetchall():
        print(f"  {row['name']}: {row['topic_count']} topics")


def query_sample_topics(conn: sqlite3.Connection, limit: int = 10):
    """Show sample topics from the database."""
    print_section(f"SAMPLE TOPICS (first {limit})")

    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.id, t.url_slug, t.display_name, c.name as course_name, t.has_content
        FROM topics t
        JOIN courses c ON t.course_id = c.id
        ORDER BY t.id
        LIMIT ?
    """, (limit,))

    for row in cursor.fetchall():
        content_indicator = "[has content]" if row['has_content'] else ""
        print(f"  [{row['id']}] {row['display_name']}")
        print(f"       slug: {row['url_slug']}, course: {row['course_name']} {content_indicator}")


def query_sample_edges(conn: sqlite3.Connection, limit: int = 10):
    """Show sample edges (prerequisite relationships)."""
    print_section(f"SAMPLE EDGES (first {limit})")

    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id, e.parent_slug, e.child_slug,
               p.display_name as parent_name,
               ch.display_name as child_name
        FROM edges e
        LEFT JOIN topics p ON e.parent_slug = p.url_slug
        LEFT JOIN topics ch ON e.child_slug = ch.url_slug
        ORDER BY e.id
        LIMIT ?
    """, (limit,))

    for row in cursor.fetchall():
        parent = row['parent_name'] or row['parent_slug']
        child = row['child_name'] or row['child_slug']
        print(f"  [{row['id']}] {parent} -> {child}")
        print(f"       (prerequisite)    (depends on)")


def query_topics_with_most_prerequisites(conn: sqlite3.Connection, limit: int = 5):
    """Find topics that have the most prerequisites (incoming edges)."""
    print_section(f"TOPICS WITH MOST PREREQUISITES (top {limit})")

    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.display_name, t.url_slug, COUNT(e.id) as prereq_count
        FROM topics t
        JOIN edges e ON t.url_slug = e.child_slug
        GROUP BY t.url_slug
        ORDER BY prereq_count DESC
        LIMIT ?
    """, (limit,))

    for row in cursor.fetchall():
        print(f"  {row['display_name']}: {row['prereq_count']} prerequisites")
        print(f"       slug: {row['url_slug']}")


def query_root_topics(conn: sqlite3.Connection, limit: int = 10):
    """Find root topics (topics with no prerequisites)."""
    print_section(f"ROOT TOPICS - No prerequisites (first {limit})")

    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.display_name, t.url_slug, c.name as course_name
        FROM topics t
        JOIN courses c ON t.course_id = c.id
        WHERE t.url_slug NOT IN (SELECT child_slug FROM edges)
        ORDER BY t.id
        LIMIT ?
    """, (limit,))

    for row in cursor.fetchall():
        print(f"  {row['display_name']} ({row['course_name']})")
        print(f"       slug: {row['url_slug']}")


def query_leaf_topics(conn: sqlite3.Connection, limit: int = 10):
    """Find leaf topics (topics that are not prerequisites for anything)."""
    print_section(f"LEAF TOPICS - Not a prerequisite for anything (first {limit})")

    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.display_name, t.url_slug, c.name as course_name
        FROM topics t
        JOIN courses c ON t.course_id = c.id
        WHERE t.url_slug NOT IN (SELECT parent_slug FROM edges)
        ORDER BY t.id
        LIMIT ?
    """, (limit,))

    for row in cursor.fetchall():
        print(f"  {row['display_name']} ({row['course_name']})")
        print(f"       slug: {row['url_slug']}")


def run_custom_query(conn: sqlite3.Connection, sql: str):
    """Run a custom SQL query and print results."""
    print_section("CUSTOM QUERY RESULT")
    print(f"Query: {sql}\n")

    cursor = conn.cursor()
    cursor.execute(sql)

    rows = cursor.fetchall()
    if rows:
        # Print column headers
        columns = rows[0].keys()
        print("  " + " | ".join(columns))
        print("  " + "-" * (len(" | ".join(columns))))

        # Print rows
        for row in rows:
            values = [str(row[col]) for col in columns]
            print("  " + " | ".join(values))
    else:
        print("  No results found.")


def main():
    """Run all example queries."""
    print("\n" + "="*60)
    print(" GRAPH.DB DATABASE EXPLORER")
    print("="*60)
    print(f"\nDatabase path: {DB_PATH}")

    conn = get_connection()

    try:
        # Run all example queries
        # query_basic_stats(conn)
        # query_all_courses(conn)
        # query_topics_per_course(conn)
        # query_sample_topics(conn)
        # query_sample_edges(conn)
        # query_topics_with_most_prerequisites(conn)
        # query_root_topics(conn)
        # query_leaf_topics(conn)

        # # Example of custom query - uncomment to use
        run_custom_query(conn, "SELECT content_text FROM topics WHERE display_name LIKE '%Breadth First And Depth First Traversals%'")

    finally:
        conn.close()

    print("\n" + "="*60)
    print(" END OF REPORT")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()