"""SQLite database adapter implementation."""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiosqlite

from src.db.types import DatabaseAdapter
from src.models import (
    BatchOperations,
    BatchResult,
    Course,
    CourseCreate,
    CourseUpdate,
    CourseWithoutGraphId,
    Edge,
    EdgeCreate,
    EdgeWithoutGraphId,
    FullGraphData,
    KnowledgeGraph,
    KnowledgeGraphCreate,
    KnowledgeGraphUpdate,
    Topic,
    TopicCreate,
    TopicUpdate,
    TopicWithoutGraphId,
)


def _now_iso() -> str:
    """Return current time as ISO string."""
    return datetime.now(timezone.utc).isoformat()


class SQLiteAdapter(DatabaseAdapter):
    """SQLite database adapter using aiosqlite."""

    def __init__(self, db_path: str, scraper_db_path: Optional[str] = None):
        self.db_path = db_path
        self.scraper_db_path = scraper_db_path
        self.db: Optional[aiosqlite.Connection] = None

    async def initialize(self) -> None:
        """Initialize the database connection and schema."""
        # Ensure directory exists
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        self.db = await aiosqlite.connect(self.db_path)
        self.db.row_factory = aiosqlite.Row

        # Enable foreign keys
        await self.db.execute("PRAGMA foreign_keys = ON")

        # Create schema
        await self._create_schema()

        # Initialize default graph from scraper DB if needed
        await self._init_default_graph()

        await self.db.commit()

    async def _create_schema(self) -> None:
        """Create database schema."""
        await self.db.executescript(
            """
            CREATE TABLE IF NOT EXISTS knowledge_graphs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                is_default INTEGER DEFAULT 0,
                is_readonly INTEGER DEFAULT 0,
                source_graph_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (source_graph_id) REFERENCES knowledge_graphs(id)
            );

            CREATE INDEX IF NOT EXISTS idx_kg_created_at ON knowledge_graphs(created_at);
            CREATE INDEX IF NOT EXISTS idx_kg_is_default ON knowledge_graphs(is_default);

            CREATE TABLE IF NOT EXISTS kg_courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                graph_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(graph_id, course_id),
                FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_courses_graph_id ON kg_courses(graph_id);

            CREATE TABLE IF NOT EXISTS kg_topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                graph_id TEXT NOT NULL,
                url_slug TEXT NOT NULL,
                display_name TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                parent_slugs TEXT DEFAULT '[]',
                content_html TEXT,
                content_text TEXT,
                has_content INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(graph_id, url_slug),
                FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_topics_graph_id ON kg_topics(graph_id);
            CREATE INDEX IF NOT EXISTS idx_topics_graph_slug ON kg_topics(graph_id, url_slug);
            CREATE INDEX IF NOT EXISTS idx_topics_graph_course ON kg_topics(graph_id, course_id);

            CREATE TABLE IF NOT EXISTS kg_edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                graph_id TEXT NOT NULL,
                parent_slug TEXT NOT NULL,
                child_slug TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(graph_id, parent_slug, child_slug),
                FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_edges_graph_id ON kg_edges(graph_id);
            CREATE INDEX IF NOT EXISTS idx_edges_parent ON kg_edges(graph_id, parent_slug);
            CREATE INDEX IF NOT EXISTS idx_edges_child ON kg_edges(graph_id, child_slug);
        """
        )

    async def _init_default_graph(self) -> None:
        """Initialize default graph from scraper database if it exists."""
        # Check if default graph already exists
        cursor = await self.db.execute(
            "SELECT id FROM knowledge_graphs WHERE is_default = 1"
        )
        row = await cursor.fetchone()
        if row:
            return

        # Check if scraper DB exists
        if not self.scraper_db_path or not os.path.exists(self.scraper_db_path):
            # Create empty default graph
            now = _now_iso()
            graph_id = str(uuid.uuid4())
            await self.db.execute(
                """
                INSERT INTO knowledge_graphs (id, name, description, is_default, is_readonly, created_at, updated_at)
                VALUES (?, ?, ?, 1, 1, ?, ?)
                """,
                (graph_id, "Default Graph", "Default knowledge graph", now, now),
            )
            return

        # Import from scraper database
        scraper_db = await aiosqlite.connect(self.scraper_db_path)
        scraper_db.row_factory = aiosqlite.Row

        try:
            now = _now_iso()
            graph_id = str(uuid.uuid4())

            # Create the default graph
            await self.db.execute(
                """
                INSERT INTO knowledge_graphs (id, name, description, is_default, is_readonly, created_at, updated_at)
                VALUES (?, ?, ?, 1, 1, ?, ?)
                """,
                (
                    graph_id,
                    "Default Graph",
                    "Imported from scraper database",
                    now,
                    now,
                ),
            )

            # Import courses
            cursor = await scraper_db.execute(
                "SELECT id, name, color FROM courses ORDER BY id"
            )
            courses = await cursor.fetchall()
            for course in courses:
                await self.db.execute(
                    """
                    INSERT INTO kg_courses (graph_id, course_id, name, color, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (graph_id, course["id"], course["name"], course["color"], now, now),
                )

            # Import topics
            cursor = await scraper_db.execute(
                "SELECT url_slug, display_name, course_id, content_html, content_text FROM topics"
            )
            topics = await cursor.fetchall()
            for topic in topics:
                has_content = 1 if topic["content_html"] or topic["content_text"] else 0
                await self.db.execute(
                    """
                    INSERT INTO kg_topics (graph_id, url_slug, display_name, course_id, parent_slugs, content_html, content_text, has_content, created_at, updated_at)
                    VALUES (?, ?, ?, ?, '[]', ?, ?, ?, ?, ?)
                    """,
                    (
                        graph_id,
                        topic["url_slug"],
                        topic["display_name"],
                        topic["course_id"],
                        topic["content_html"],
                        topic["content_text"],
                        has_content,
                        now,
                        now,
                    ),
                )

            # Import edges and update parent_slugs
            cursor = await scraper_db.execute(
                "SELECT parent_slug, child_slug FROM edges"
            )
            edges = await cursor.fetchall()
            for edge in edges:
                await self.db.execute(
                    """
                    INSERT INTO kg_edges (graph_id, parent_slug, child_slug, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (graph_id, edge["parent_slug"], edge["child_slug"], now),
                )

            # Update parent_slugs for all topics
            cursor = await self.db.execute(
                """
                SELECT child_slug, GROUP_CONCAT(parent_slug) as parents
                FROM kg_edges WHERE graph_id = ?
                GROUP BY child_slug
                """,
                (graph_id,),
            )
            child_parents = await cursor.fetchall()
            for row in child_parents:
                parent_slugs = json.dumps(row["parents"].split(","))
                await self.db.execute(
                    """
                    UPDATE kg_topics SET parent_slugs = ?
                    WHERE graph_id = ? AND url_slug = ?
                    """,
                    (parent_slugs, graph_id, row["child_slug"]),
                )

        finally:
            await scraper_db.close()

    async def close(self) -> None:
        """Close the database connection."""
        if self.db:
            await self.db.close()
            self.db = None

    def _row_to_graph(self, row: aiosqlite.Row) -> KnowledgeGraph:
        """Convert a database row to a KnowledgeGraph model."""
        return KnowledgeGraph(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            isDefault=bool(row["is_default"]),
            isReadonly=bool(row["is_readonly"]),
            sourceGraphId=row["source_graph_id"],
            createdAt=row["created_at"],
            updatedAt=row["updated_at"],
        )

    def _row_to_course(self, row: aiosqlite.Row) -> Course:
        """Convert a database row to a Course model."""
        return Course(
            id=row["id"],
            graphId=row["graph_id"],
            courseId=row["course_id"],
            name=row["name"],
            color=row["color"],
            createdAt=row["created_at"],
            updatedAt=row["updated_at"],
        )

    def _row_to_topic(self, row: aiosqlite.Row) -> Topic:
        """Convert a database row to a Topic model."""
        parent_slugs = json.loads(row["parent_slugs"]) if row["parent_slugs"] else []
        return Topic(
            id=row["id"],
            graphId=row["graph_id"],
            urlSlug=row["url_slug"],
            displayName=row["display_name"],
            courseId=row["course_id"],
            parentSlugs=parent_slugs,
            contentHtml=row["content_html"],
            contentText=row["content_text"],
            hasContent=bool(row["has_content"]),
            createdAt=row["created_at"],
            updatedAt=row["updated_at"],
        )

    def _row_to_edge(self, row: aiosqlite.Row) -> Edge:
        """Convert a database row to an Edge model."""
        return Edge(
            id=row["id"],
            graphId=row["graph_id"],
            parentSlug=row["parent_slug"],
            childSlug=row["child_slug"],
            createdAt=row["created_at"],
        )

    # =========================================================================
    # Graph Operations
    # =========================================================================

    async def list_graphs(self) -> list[KnowledgeGraph]:
        """List all knowledge graphs."""
        cursor = await self.db.execute(
            "SELECT * FROM knowledge_graphs ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        return [self._row_to_graph(row) for row in rows]

    async def get_graph(self, graph_id: str) -> Optional[KnowledgeGraph]:
        """Get a knowledge graph by ID."""
        cursor = await self.db.execute(
            "SELECT * FROM knowledge_graphs WHERE id = ?", (graph_id,)
        )
        row = await cursor.fetchone()
        return self._row_to_graph(row) if row else None

    async def create_graph(self, data: KnowledgeGraphCreate) -> KnowledgeGraph:
        """Create a new knowledge graph."""
        now = _now_iso()
        graph_id = str(uuid.uuid4())

        await self.db.execute(
            """
            INSERT INTO knowledge_graphs (id, name, description, is_default, is_readonly, source_graph_id, created_at, updated_at)
            VALUES (?, ?, ?, 0, 0, ?, ?, ?)
            """,
            (
                graph_id,
                data.name,
                data.description,
                data.copy_from_graph_id,
                now,
                now,
            ),
        )

        # If copying from another graph, copy all data
        if data.copy_from_graph_id:
            await self._copy_graph_data(data.copy_from_graph_id, graph_id)

        await self.db.commit()
        return await self.get_graph(graph_id)

    async def _copy_graph_data(self, source_id: str, target_id: str) -> None:
        """Copy all data from source graph to target graph."""
        now = _now_iso()

        # Copy courses
        await self.db.execute(
            """
            INSERT INTO kg_courses (graph_id, course_id, name, color, created_at, updated_at)
            SELECT ?, course_id, name, color, ?, ?
            FROM kg_courses WHERE graph_id = ?
            """,
            (target_id, now, now, source_id),
        )

        # Copy topics
        await self.db.execute(
            """
            INSERT INTO kg_topics (graph_id, url_slug, display_name, course_id, parent_slugs, content_html, content_text, has_content, created_at, updated_at)
            SELECT ?, url_slug, display_name, course_id, parent_slugs, content_html, content_text, has_content, ?, ?
            FROM kg_topics WHERE graph_id = ?
            """,
            (target_id, now, now, source_id),
        )

        # Copy edges
        await self.db.execute(
            """
            INSERT INTO kg_edges (graph_id, parent_slug, child_slug, created_at)
            SELECT ?, parent_slug, child_slug, ?
            FROM kg_edges WHERE graph_id = ?
            """,
            (target_id, now, source_id),
        )

    async def update_graph(
        self, graph_id: str, data: KnowledgeGraphUpdate
    ) -> KnowledgeGraph:
        """Update a knowledge graph."""
        now = _now_iso()

        updates = []
        params = []

        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name)
        if data.description is not None:
            updates.append("description = ?")
            params.append(data.description)

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(graph_id)

            await self.db.execute(
                f"UPDATE knowledge_graphs SET {', '.join(updates)} WHERE id = ?",
                params,
            )
            await self.db.commit()

        return await self.get_graph(graph_id)

    async def delete_graph(self, graph_id: str) -> None:
        """Delete a knowledge graph."""
        await self.db.execute("DELETE FROM knowledge_graphs WHERE id = ?", (graph_id,))
        await self.db.commit()

    # =========================================================================
    # Course Operations
    # =========================================================================

    async def list_courses(self, graph_id: str) -> list[Course]:
        """List all courses in a graph."""
        cursor = await self.db.execute(
            "SELECT * FROM kg_courses WHERE graph_id = ? ORDER BY course_id",
            (graph_id,),
        )
        rows = await cursor.fetchall()
        return [self._row_to_course(row) for row in rows]

    async def get_course(self, graph_id: str, course_id: int) -> Optional[Course]:
        """Get a course by ID."""
        cursor = await self.db.execute(
            "SELECT * FROM kg_courses WHERE graph_id = ? AND course_id = ?",
            (graph_id, course_id),
        )
        row = await cursor.fetchone()
        return self._row_to_course(row) if row else None

    async def create_course(self, graph_id: str, data: CourseCreate) -> Course:
        """Create a new course."""
        now = _now_iso()

        # Get max course_id for this graph
        cursor = await self.db.execute(
            "SELECT COALESCE(MAX(course_id), 0) + 1 as next_id FROM kg_courses WHERE graph_id = ?",
            (graph_id,),
        )
        row = await cursor.fetchone()
        course_id = row["next_id"]

        cursor = await self.db.execute(
            """
            INSERT INTO kg_courses (graph_id, course_id, name, color, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (graph_id, course_id, data.name.strip(), data.color, now, now),
        )
        await self.db.commit()

        return await self.get_course(graph_id, course_id)

    async def update_course(
        self, graph_id: str, course_id: int, data: CourseUpdate
    ) -> Course:
        """Update a course."""
        now = _now_iso()

        updates = []
        params = []

        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name.strip())
        if data.color is not None:
            updates.append("color = ?")
            params.append(data.color)

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(graph_id)
            params.append(course_id)

            await self.db.execute(
                f"UPDATE kg_courses SET {', '.join(updates)} WHERE graph_id = ? AND course_id = ?",
                params,
            )
            await self.db.commit()

        return await self.get_course(graph_id, course_id)

    async def delete_course(self, graph_id: str, course_id: int) -> None:
        """Delete a course."""
        await self.db.execute(
            "DELETE FROM kg_courses WHERE graph_id = ? AND course_id = ?",
            (graph_id, course_id),
        )
        await self.db.commit()

    # =========================================================================
    # Topic Operations
    # =========================================================================

    async def list_topics(self, graph_id: str) -> list[Topic]:
        """List all topics in a graph."""
        cursor = await self.db.execute(
            "SELECT * FROM kg_topics WHERE graph_id = ? ORDER BY display_name",
            (graph_id,),
        )
        rows = await cursor.fetchall()
        return [self._row_to_topic(row) for row in rows]

    async def get_topic(self, graph_id: str, url_slug: str) -> Optional[Topic]:
        """Get a topic by URL slug."""
        cursor = await self.db.execute(
            "SELECT * FROM kg_topics WHERE graph_id = ? AND url_slug = ?",
            (graph_id, url_slug),
        )
        row = await cursor.fetchone()
        return self._row_to_topic(row) if row else None

    async def create_topic(self, graph_id: str, data: TopicCreate) -> Topic:
        """Create a new topic."""
        now = _now_iso()
        has_content = 1 if data.content_html or data.content_text else 0

        await self.db.execute(
            """
            INSERT INTO kg_topics (graph_id, url_slug, display_name, course_id, parent_slugs, content_html, content_text, has_content, created_at, updated_at)
            VALUES (?, ?, ?, ?, '[]', ?, ?, ?, ?, ?)
            """,
            (
                graph_id,
                data.url_slug,
                data.display_name,
                data.course_id,
                data.content_html,
                data.content_text,
                has_content,
                now,
                now,
            ),
        )
        await self.db.commit()

        return await self.get_topic(graph_id, data.url_slug)

    async def update_topic(
        self, graph_id: str, url_slug: str, data: TopicUpdate
    ) -> Topic:
        """Update a topic."""
        now = _now_iso()

        # Get current topic for has_content calculation
        current = await self.get_topic(graph_id, url_slug)

        updates = []
        params = []

        if data.display_name is not None:
            updates.append("display_name = ?")
            params.append(data.display_name)
        if data.course_id is not None:
            updates.append("course_id = ?")
            params.append(data.course_id)
        if data.content_html is not None:
            updates.append("content_html = ?")
            params.append(data.content_html)
        if data.content_text is not None:
            updates.append("content_text = ?")
            params.append(data.content_text)

        # Recalculate has_content
        content_html = (
            data.content_html if data.content_html is not None else current.content_html
        )
        content_text = (
            data.content_text if data.content_text is not None else current.content_text
        )
        has_content = 1 if content_html or content_text else 0
        updates.append("has_content = ?")
        params.append(has_content)

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(graph_id)
            params.append(url_slug)

            await self.db.execute(
                f"UPDATE kg_topics SET {', '.join(updates)} WHERE graph_id = ? AND url_slug = ?",
                params,
            )
            await self.db.commit()

        return await self.get_topic(graph_id, url_slug)

    async def delete_topic(self, graph_id: str, url_slug: str) -> None:
        """Delete a topic and its related edges."""
        # Delete edges involving this topic
        await self.db.execute(
            "DELETE FROM kg_edges WHERE graph_id = ? AND (parent_slug = ? OR child_slug = ?)",
            (graph_id, url_slug, url_slug),
        )

        # Update parent_slugs in affected topics
        cursor = await self.db.execute(
            "SELECT url_slug, parent_slugs FROM kg_topics WHERE graph_id = ? AND parent_slugs LIKE ?",
            (graph_id, f'%"{url_slug}"%'),
        )
        rows = await cursor.fetchall()
        for row in rows:
            parent_slugs = json.loads(row["parent_slugs"])
            if url_slug in parent_slugs:
                parent_slugs.remove(url_slug)
                await self.db.execute(
                    "UPDATE kg_topics SET parent_slugs = ? WHERE graph_id = ? AND url_slug = ?",
                    (json.dumps(parent_slugs), graph_id, row["url_slug"]),
                )

        # Delete the topic
        await self.db.execute(
            "DELETE FROM kg_topics WHERE graph_id = ? AND url_slug = ?",
            (graph_id, url_slug),
        )
        await self.db.commit()

    async def get_topic_prerequisites(
        self, graph_id: str, url_slug: str
    ) -> list[Topic]:
        """Get prerequisite topics for a topic."""
        topic = await self.get_topic(graph_id, url_slug)
        if not topic or not topic.parent_slugs:
            return []

        placeholders = ",".join("?" * len(topic.parent_slugs))
        cursor = await self.db.execute(
            f"SELECT * FROM kg_topics WHERE graph_id = ? AND url_slug IN ({placeholders})",
            [graph_id] + topic.parent_slugs,
        )
        rows = await cursor.fetchall()
        return [self._row_to_topic(row) for row in rows]

    async def get_topic_dependents(self, graph_id: str, url_slug: str) -> list[Topic]:
        """Get topics that depend on a topic."""
        cursor = await self.db.execute(
            """
            SELECT t.* FROM kg_topics t
            JOIN kg_edges e ON t.graph_id = e.graph_id AND t.url_slug = e.child_slug
            WHERE e.graph_id = ? AND e.parent_slug = ?
            """,
            (graph_id, url_slug),
        )
        rows = await cursor.fetchall()
        return [self._row_to_topic(row) for row in rows]

    # =========================================================================
    # Edge Operations
    # =========================================================================

    async def list_edges(self, graph_id: str) -> list[Edge]:
        """List all edges in a graph."""
        cursor = await self.db.execute(
            "SELECT * FROM kg_edges WHERE graph_id = ? ORDER BY id", (graph_id,)
        )
        rows = await cursor.fetchall()
        return [self._row_to_edge(row) for row in rows]

    async def get_edge(
        self, graph_id: str, parent_slug: str, child_slug: str
    ) -> Optional[Edge]:
        """Get an edge by parent and child slugs."""
        cursor = await self.db.execute(
            "SELECT * FROM kg_edges WHERE graph_id = ? AND parent_slug = ? AND child_slug = ?",
            (graph_id, parent_slug, child_slug),
        )
        row = await cursor.fetchone()
        return self._row_to_edge(row) if row else None

    async def create_edge(self, graph_id: str, data: EdgeCreate) -> Edge:
        """Create a new edge."""
        now = _now_iso()

        await self.db.execute(
            """
            INSERT INTO kg_edges (graph_id, parent_slug, child_slug, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (graph_id, data.parent_slug, data.child_slug, now),
        )

        # Update child topic's parent_slugs
        cursor = await self.db.execute(
            "SELECT parent_slugs FROM kg_topics WHERE graph_id = ? AND url_slug = ?",
            (graph_id, data.child_slug),
        )
        row = await cursor.fetchone()
        if row:
            parent_slugs = json.loads(row["parent_slugs"]) if row["parent_slugs"] else []
            if data.parent_slug not in parent_slugs:
                parent_slugs.append(data.parent_slug)
                await self.db.execute(
                    "UPDATE kg_topics SET parent_slugs = ?, updated_at = ? WHERE graph_id = ? AND url_slug = ?",
                    (json.dumps(parent_slugs), now, graph_id, data.child_slug),
                )

        await self.db.commit()
        return await self.get_edge(graph_id, data.parent_slug, data.child_slug)

    async def delete_edge(
        self, graph_id: str, parent_slug: str, child_slug: str
    ) -> None:
        """Delete an edge."""
        now = _now_iso()

        await self.db.execute(
            "DELETE FROM kg_edges WHERE graph_id = ? AND parent_slug = ? AND child_slug = ?",
            (graph_id, parent_slug, child_slug),
        )

        # Update child topic's parent_slugs
        cursor = await self.db.execute(
            "SELECT parent_slugs FROM kg_topics WHERE graph_id = ? AND url_slug = ?",
            (graph_id, child_slug),
        )
        row = await cursor.fetchone()
        if row:
            parent_slugs = json.loads(row["parent_slugs"]) if row["parent_slugs"] else []
            if parent_slug in parent_slugs:
                parent_slugs.remove(parent_slug)
                await self.db.execute(
                    "UPDATE kg_topics SET parent_slugs = ?, updated_at = ? WHERE graph_id = ? AND url_slug = ?",
                    (json.dumps(parent_slugs), now, graph_id, child_slug),
                )

        await self.db.commit()

    # =========================================================================
    # Batch Operations
    # =========================================================================

    async def batch_update(
        self, graph_id: str, operations: BatchOperations
    ) -> BatchResult:
        """Perform batch operations on a graph."""
        result = BatchResult(
            coursesCreated=0,
            coursesUpdated=0,
            coursesDeleted=0,
            topicsCreated=0,
            topicsUpdated=0,
            topicsDeleted=0,
            edgesCreated=0,
            edgesDeleted=0,
        )

        # Process deletions first (edges -> topics -> courses)
        if operations.edges and operations.edges.delete:
            for edge_del in operations.edges.delete:
                try:
                    await self.delete_edge(
                        graph_id, edge_del.parent_slug, edge_del.child_slug
                    )
                    result.edges_deleted += 1
                except Exception:
                    pass

        if operations.topics and operations.topics.delete:
            for url_slug in operations.topics.delete:
                try:
                    await self.delete_topic(graph_id, url_slug)
                    result.topics_deleted += 1
                except Exception:
                    pass

        if operations.courses and operations.courses.delete:
            for course_id in operations.courses.delete:
                try:
                    await self.delete_course(graph_id, course_id)
                    result.courses_deleted += 1
                except Exception:
                    pass

        # Process creates (courses -> topics -> edges)
        if operations.courses and operations.courses.create:
            for course_data in operations.courses.create:
                try:
                    await self.create_course(graph_id, course_data)
                    result.courses_created += 1
                except Exception:
                    pass

        if operations.topics and operations.topics.create:
            for topic_data in operations.topics.create:
                try:
                    await self.create_topic(graph_id, topic_data)
                    result.topics_created += 1
                except Exception:
                    pass

        if operations.edges and operations.edges.create:
            for edge_data in operations.edges.create:
                try:
                    await self.create_edge(graph_id, edge_data)
                    result.edges_created += 1
                except Exception:
                    pass

        # Process updates (courses -> topics)
        if operations.courses and operations.courses.update:
            for course_update in operations.courses.update:
                try:
                    await self.update_course(
                        graph_id, course_update.course_id, course_update.data
                    )
                    result.courses_updated += 1
                except Exception:
                    pass

        if operations.topics and operations.topics.update:
            for topic_update in operations.topics.update:
                try:
                    await self.update_topic(
                        graph_id, topic_update.url_slug, topic_update.data
                    )
                    result.topics_updated += 1
                except Exception:
                    pass

        await self.db.commit()
        return result

    # =========================================================================
    # Full Graph Data
    # =========================================================================

    async def get_full_graph_data(self, graph_id: str) -> FullGraphData:
        """Get complete graph data including all courses, topics, and edges."""
        graph = await self.get_graph(graph_id)

        # Get courses without graphId
        cursor = await self.db.execute(
            "SELECT * FROM kg_courses WHERE graph_id = ? ORDER BY course_id",
            (graph_id,),
        )
        course_rows = await cursor.fetchall()
        courses = [
            CourseWithoutGraphId(
                id=row["id"],
                courseId=row["course_id"],
                name=row["name"],
                color=row["color"],
                createdAt=row["created_at"],
                updatedAt=row["updated_at"],
            )
            for row in course_rows
        ]

        # Get topics without graphId and strip contentHtml
        cursor = await self.db.execute(
            "SELECT * FROM kg_topics WHERE graph_id = ? ORDER BY display_name",
            (graph_id,),
        )
        topic_rows = await cursor.fetchall()
        topics = [
            TopicWithoutGraphId(
                id=row["id"],
                urlSlug=row["url_slug"],
                displayName=row["display_name"],
                courseId=row["course_id"],
                parentSlugs=json.loads(row["parent_slugs"])
                if row["parent_slugs"]
                else [],
                contentHtml=None,  # Strip contentHtml for full graph data
                contentText=row["content_text"],
                hasContent=bool(row["has_content"]),
                createdAt=row["created_at"],
                updatedAt=row["updated_at"],
            )
            for row in topic_rows
        ]

        # Get edges without graphId
        cursor = await self.db.execute(
            "SELECT * FROM kg_edges WHERE graph_id = ? ORDER BY id", (graph_id,)
        )
        edge_rows = await cursor.fetchall()
        edges = [
            EdgeWithoutGraphId(
                id=row["id"],
                parentSlug=row["parent_slug"],
                childSlug=row["child_slug"],
                createdAt=row["created_at"],
            )
            for row in edge_rows
        ]

        return FullGraphData(graph=graph, courses=courses, topics=topics, edges=edges)
