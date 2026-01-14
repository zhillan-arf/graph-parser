"""Database adapter interface and types."""

from abc import ABC, abstractmethod
from typing import Optional

from src.models import (
    BatchOperations,
    BatchResult,
    Course,
    CourseCreate,
    CourseUpdate,
    Edge,
    EdgeCreate,
    FullGraphData,
    KnowledgeGraph,
    KnowledgeGraphCreate,
    KnowledgeGraphUpdate,
    Topic,
    TopicCreate,
    TopicUpdate,
)


class DatabaseAdapter(ABC):
    """Abstract base class for database adapters."""

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the database connection and schema."""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close the database connection."""
        pass

    # =========================================================================
    # Graph Operations
    # =========================================================================

    @abstractmethod
    async def list_graphs(self) -> list[KnowledgeGraph]:
        """List all knowledge graphs."""
        pass

    @abstractmethod
    async def get_graph(self, graph_id: str) -> Optional[KnowledgeGraph]:
        """Get a knowledge graph by ID."""
        pass

    @abstractmethod
    async def create_graph(self, data: KnowledgeGraphCreate) -> KnowledgeGraph:
        """Create a new knowledge graph."""
        pass

    @abstractmethod
    async def update_graph(
        self, graph_id: str, data: KnowledgeGraphUpdate
    ) -> KnowledgeGraph:
        """Update a knowledge graph."""
        pass

    @abstractmethod
    async def delete_graph(self, graph_id: str) -> None:
        """Delete a knowledge graph."""
        pass

    # =========================================================================
    # Course Operations
    # =========================================================================

    @abstractmethod
    async def list_courses(self, graph_id: str) -> list[Course]:
        """List all courses in a graph."""
        pass

    @abstractmethod
    async def get_course(self, graph_id: str, course_id: int) -> Optional[Course]:
        """Get a course by ID."""
        pass

    @abstractmethod
    async def create_course(self, graph_id: str, data: CourseCreate) -> Course:
        """Create a new course."""
        pass

    @abstractmethod
    async def update_course(
        self, graph_id: str, course_id: int, data: CourseUpdate
    ) -> Course:
        """Update a course."""
        pass

    @abstractmethod
    async def delete_course(self, graph_id: str, course_id: int) -> None:
        """Delete a course."""
        pass

    # =========================================================================
    # Topic Operations
    # =========================================================================

    @abstractmethod
    async def list_topics(self, graph_id: str) -> list[Topic]:
        """List all topics in a graph."""
        pass

    @abstractmethod
    async def get_topic(self, graph_id: str, url_slug: str) -> Optional[Topic]:
        """Get a topic by URL slug."""
        pass

    @abstractmethod
    async def create_topic(self, graph_id: str, data: TopicCreate) -> Topic:
        """Create a new topic."""
        pass

    @abstractmethod
    async def update_topic(
        self, graph_id: str, url_slug: str, data: TopicUpdate
    ) -> Topic:
        """Update a topic."""
        pass

    @abstractmethod
    async def delete_topic(self, graph_id: str, url_slug: str) -> None:
        """Delete a topic."""
        pass

    @abstractmethod
    async def get_topic_prerequisites(self, graph_id: str, url_slug: str) -> list[Topic]:
        """Get prerequisite topics for a topic."""
        pass

    @abstractmethod
    async def get_topic_dependents(self, graph_id: str, url_slug: str) -> list[Topic]:
        """Get topics that depend on a topic."""
        pass

    # =========================================================================
    # Edge Operations
    # =========================================================================

    @abstractmethod
    async def list_edges(self, graph_id: str) -> list[Edge]:
        """List all edges in a graph."""
        pass

    @abstractmethod
    async def get_edge(
        self, graph_id: str, parent_slug: str, child_slug: str
    ) -> Optional[Edge]:
        """Get an edge by parent and child slugs."""
        pass

    @abstractmethod
    async def create_edge(self, graph_id: str, data: EdgeCreate) -> Edge:
        """Create a new edge."""
        pass

    @abstractmethod
    async def delete_edge(
        self, graph_id: str, parent_slug: str, child_slug: str
    ) -> None:
        """Delete an edge."""
        pass

    # =========================================================================
    # Batch Operations
    # =========================================================================

    @abstractmethod
    async def batch_update(
        self, graph_id: str, operations: BatchOperations
    ) -> BatchResult:
        """Perform batch operations on a graph."""
        pass

    # =========================================================================
    # Full Graph Data
    # =========================================================================

    @abstractmethod
    async def get_full_graph_data(self, graph_id: str) -> FullGraphData:
        """Get complete graph data including all courses, topics, and edges."""
        pass
