"""API routes for knowledge graphs."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from src.db.types import DatabaseAdapter
from src.models import (
    BatchOperations,
    BatchResult,
    Course,
    CourseCreate,
    CourseUpdate,
    DeletedResponse,
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

router = APIRouter(prefix="/api/v1/graphs", tags=["graphs"])


# =============================================================================
# Dependency Injection
# =============================================================================


async def get_db(request: Request) -> DatabaseAdapter:
    """Get database adapter from app state."""
    return request.app.state.db


async def get_graph_or_404(
    graph_id: str, db: DatabaseAdapter = Depends(get_db)
) -> KnowledgeGraph:
    """Get graph or raise 404."""
    graph = await db.get_graph(graph_id)
    if not graph:
        raise HTTPException(
            status_code=404,
            detail={"code": "GRAPH_NOT_FOUND", "message": f"Graph {graph_id} not found"},
        )
    return graph


async def require_writable(graph: KnowledgeGraph = Depends(get_graph_or_404)) -> KnowledgeGraph:
    """Require graph to be writable."""
    if graph.is_readonly:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "READONLY_GRAPH",
                "message": "Cannot modify read-only graph",
            },
        )
    return graph


# =============================================================================
# Response Helpers
# =============================================================================


def success_response(data: Any, status_code: int = 200) -> dict:
    """Create a success response."""
    return {"success": True, "data": data}


# =============================================================================
# Knowledge Graph Routes
# =============================================================================


@router.get("", response_model=None)
async def list_graphs(db: DatabaseAdapter = Depends(get_db)) -> dict:
    """List all knowledge graphs."""
    graphs = await db.list_graphs()
    return success_response([g.model_dump(by_alias=True) for g in graphs])


@router.post("", response_model=None, status_code=201)
async def create_graph(
    data: KnowledgeGraphCreate, db: DatabaseAdapter = Depends(get_db)
) -> dict:
    """Create a new knowledge graph."""
    if not data.name or not data.name.strip():
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "Name is required"},
        )

    # Check if copyFromGraphId exists
    if data.copy_from_graph_id:
        source = await db.get_graph(data.copy_from_graph_id)
        if not source:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "GRAPH_NOT_FOUND",
                    "message": f"Source graph {data.copy_from_graph_id} not found",
                },
            )

    graph = await db.create_graph(data)
    return success_response(graph.model_dump(by_alias=True))


@router.get("/{graph_id}", response_model=None)
async def get_graph(graph: KnowledgeGraph = Depends(get_graph_or_404)) -> dict:
    """Get a knowledge graph by ID."""
    return success_response(graph.model_dump(by_alias=True))


@router.patch("/{graph_id}", response_model=None)
async def update_graph(
    data: KnowledgeGraphUpdate,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Update a knowledge graph."""
    updated = await db.update_graph(graph.id, data)
    return success_response(updated.model_dump(by_alias=True))


@router.delete("/{graph_id}", response_model=None)
async def delete_graph(
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Delete a knowledge graph."""
    if graph.is_default:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "CANNOT_DELETE_DEFAULT",
                "message": "Cannot delete default graph",
            },
        )

    await db.delete_graph(graph.id)
    return success_response({"deleted": True})


# =============================================================================
# Course Routes
# =============================================================================


@router.get("/{graph_id}/courses", response_model=None)
async def list_courses(
    graph: KnowledgeGraph = Depends(get_graph_or_404),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """List all courses in a graph."""
    courses = await db.list_courses(graph.id)
    return success_response([c.model_dump(by_alias=True) for c in courses])


@router.post("/{graph_id}/courses", response_model=None, status_code=201)
async def create_course(
    data: CourseCreate,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Create a new course."""
    if not data.name or not data.name.strip():
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "Name is required"},
        )
    if not data.color:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "Color is required"},
        )

    course = await db.create_course(graph.id, data)
    return success_response(course.model_dump(by_alias=True))


@router.get("/{graph_id}/courses/{course_id}", response_model=None)
async def get_course(
    course_id: int,
    graph: KnowledgeGraph = Depends(get_graph_or_404),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Get a course by ID."""
    course = await db.get_course(graph.id, course_id)
    if not course:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "COURSE_NOT_FOUND",
                "message": f"Course {course_id} not found",
            },
        )
    return success_response(course.model_dump(by_alias=True))


@router.patch("/{graph_id}/courses/{course_id}", response_model=None)
async def update_course(
    course_id: int,
    data: CourseUpdate,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Update a course."""
    course = await db.get_course(graph.id, course_id)
    if not course:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "COURSE_NOT_FOUND",
                "message": f"Course {course_id} not found",
            },
        )

    updated = await db.update_course(graph.id, course_id, data)
    return success_response(updated.model_dump(by_alias=True))


@router.delete("/{graph_id}/courses/{course_id}", response_model=None)
async def delete_course(
    course_id: int,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Delete a course."""
    course = await db.get_course(graph.id, course_id)
    if not course:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "COURSE_NOT_FOUND",
                "message": f"Course {course_id} not found",
            },
        )

    await db.delete_course(graph.id, course_id)
    return success_response({"deleted": True})


# =============================================================================
# Topic Routes
# =============================================================================


@router.get("/{graph_id}/topics", response_model=None)
async def list_topics(
    graph: KnowledgeGraph = Depends(get_graph_or_404),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """List all topics in a graph."""
    topics = await db.list_topics(graph.id)
    return success_response([t.model_dump(by_alias=True) for t in topics])


@router.post("/{graph_id}/topics", response_model=None, status_code=201)
async def create_topic(
    data: TopicCreate,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Create a new topic."""
    if not data.url_slug or not data.url_slug.strip():
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "URL slug is required"},
        )
    if not data.display_name or not data.display_name.strip():
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "Display name is required"},
        )

    # Check if course exists
    course = await db.get_course(graph.id, data.course_id)
    if not course:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "COURSE_NOT_FOUND",
                "message": f"Course {data.course_id} not found",
            },
        )

    # Check for duplicate slug
    existing = await db.get_topic(graph.id, data.url_slug)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "DUPLICATE_ENTRY",
                "message": f"Topic with slug {data.url_slug} already exists",
            },
        )

    topic = await db.create_topic(graph.id, data)
    return success_response(topic.model_dump(by_alias=True))


@router.get("/{graph_id}/topics/{url_slug}", response_model=None)
async def get_topic(
    url_slug: str,
    graph: KnowledgeGraph = Depends(get_graph_or_404),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Get a topic by URL slug."""
    topic = await db.get_topic(graph.id, url_slug)
    if not topic:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TOPIC_NOT_FOUND",
                "message": f"Topic {url_slug} not found",
            },
        )
    return success_response(topic.model_dump(by_alias=True))


@router.patch("/{graph_id}/topics/{url_slug}", response_model=None)
async def update_topic(
    url_slug: str,
    data: TopicUpdate,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Update a topic."""
    topic = await db.get_topic(graph.id, url_slug)
    if not topic:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TOPIC_NOT_FOUND",
                "message": f"Topic {url_slug} not found",
            },
        )

    # Check if new course exists
    if data.course_id is not None:
        course = await db.get_course(graph.id, data.course_id)
        if not course:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "COURSE_NOT_FOUND",
                    "message": f"Course {data.course_id} not found",
                },
            )

    updated = await db.update_topic(graph.id, url_slug, data)
    return success_response(updated.model_dump(by_alias=True))


@router.delete("/{graph_id}/topics/{url_slug}", response_model=None)
async def delete_topic(
    url_slug: str,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Delete a topic."""
    topic = await db.get_topic(graph.id, url_slug)
    if not topic:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TOPIC_NOT_FOUND",
                "message": f"Topic {url_slug} not found",
            },
        )

    await db.delete_topic(graph.id, url_slug)
    return success_response({"deleted": True})


@router.get("/{graph_id}/topics/{url_slug}/prerequisites", response_model=None)
async def get_topic_prerequisites(
    url_slug: str,
    graph: KnowledgeGraph = Depends(get_graph_or_404),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Get prerequisite topics for a topic."""
    topic = await db.get_topic(graph.id, url_slug)
    if not topic:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TOPIC_NOT_FOUND",
                "message": f"Topic {url_slug} not found",
            },
        )

    prerequisites = await db.get_topic_prerequisites(graph.id, url_slug)
    return success_response([t.model_dump(by_alias=True) for t in prerequisites])


@router.get("/{graph_id}/topics/{url_slug}/dependents", response_model=None)
async def get_topic_dependents(
    url_slug: str,
    graph: KnowledgeGraph = Depends(get_graph_or_404),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Get topics that depend on a topic."""
    topic = await db.get_topic(graph.id, url_slug)
    if not topic:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TOPIC_NOT_FOUND",
                "message": f"Topic {url_slug} not found",
            },
        )

    dependents = await db.get_topic_dependents(graph.id, url_slug)
    return success_response([t.model_dump(by_alias=True) for t in dependents])


# =============================================================================
# Edge Routes
# =============================================================================


@router.get("/{graph_id}/edges", response_model=None)
async def list_edges(
    graph: KnowledgeGraph = Depends(get_graph_or_404),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """List all edges in a graph."""
    edges = await db.list_edges(graph.id)
    return success_response([e.model_dump(by_alias=True) for e in edges])


@router.post("/{graph_id}/edges", response_model=None, status_code=201)
async def create_edge(
    data: EdgeCreate,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Create a new edge (prerequisite relationship)."""
    # Check self-reference
    if data.parent_slug == data.child_slug:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "Cannot create self-referencing edge",
            },
        )

    # Check parent topic exists
    parent = await db.get_topic(graph.id, data.parent_slug)
    if not parent:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TOPIC_NOT_FOUND",
                "message": f"Parent topic {data.parent_slug} not found",
            },
        )

    # Check child topic exists
    child = await db.get_topic(graph.id, data.child_slug)
    if not child:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TOPIC_NOT_FOUND",
                "message": f"Child topic {data.child_slug} not found",
            },
        )

    # Check for duplicate edge
    existing = await db.get_edge(graph.id, data.parent_slug, data.child_slug)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "DUPLICATE_ENTRY",
                "message": f"Edge from {data.parent_slug} to {data.child_slug} already exists",
            },
        )

    edge = await db.create_edge(graph.id, data)
    return success_response(edge.model_dump(by_alias=True))


@router.delete("/{graph_id}/edges/{parent_slug}/{child_slug}", response_model=None)
async def delete_edge(
    parent_slug: str,
    child_slug: str,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Delete an edge."""
    edge = await db.get_edge(graph.id, parent_slug, child_slug)
    if not edge:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "EDGE_NOT_FOUND",
                "message": f"Edge from {parent_slug} to {child_slug} not found",
            },
        )

    await db.delete_edge(graph.id, parent_slug, child_slug)
    return success_response({"deleted": True})


# =============================================================================
# Batch Operations
# =============================================================================


@router.post("/{graph_id}/batch", response_model=None)
async def batch_operations(
    data: BatchOperations,
    graph: KnowledgeGraph = Depends(require_writable),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Perform batch operations on a graph."""
    result = await db.batch_update(graph.id, data)
    return success_response(result.model_dump(by_alias=True))


# =============================================================================
# Full Graph Data
# =============================================================================


@router.get("/{graph_id}/data", response_model=None)
async def get_full_graph_data(
    graph: KnowledgeGraph = Depends(get_graph_or_404),
    db: DatabaseAdapter = Depends(get_db),
) -> dict:
    """Get complete graph data including all courses, topics, and edges."""
    data = await db.get_full_graph_data(graph.id)
    return success_response({
        "graph": data.graph.model_dump(by_alias=True),
        "courses": [c.model_dump(by_alias=True) for c in data.courses],
        "topics": [t.model_dump(by_alias=True) for t in data.topics],
        "edges": [e.model_dump(by_alias=True) for e in data.edges],
    })
