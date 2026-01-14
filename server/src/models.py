"""Pydantic models for the Knowledge Graph API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# =============================================================================
# Knowledge Graph Models
# =============================================================================


class KnowledgeGraphBase(BaseModel):
    """Base model for knowledge graph."""

    name: str
    description: Optional[str] = None


class KnowledgeGraphCreate(KnowledgeGraphBase):
    """Model for creating a knowledge graph."""

    copy_from_graph_id: Optional[str] = Field(None, alias="copyFromGraphId")

    model_config = {"populate_by_name": True}


class KnowledgeGraphUpdate(BaseModel):
    """Model for updating a knowledge graph."""

    name: Optional[str] = None
    description: Optional[str] = None


class KnowledgeGraph(KnowledgeGraphBase):
    """Full knowledge graph model."""

    id: str
    is_default: bool = Field(alias="isDefault")
    is_readonly: bool = Field(alias="isReadonly")
    source_graph_id: Optional[str] = Field(None, alias="sourceGraphId")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


# =============================================================================
# Course Models
# =============================================================================


class CourseBase(BaseModel):
    """Base model for course."""

    name: str
    color: str


class CourseCreate(CourseBase):
    """Model for creating a course."""

    pass


class CourseUpdate(BaseModel):
    """Model for updating a course."""

    name: Optional[str] = None
    color: Optional[str] = None


class Course(CourseBase):
    """Full course model."""

    id: int
    graph_id: str = Field(alias="graphId")
    course_id: int = Field(alias="courseId")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


class CourseWithoutGraphId(CourseBase):
    """Course model without graphId for full graph data response."""

    id: int
    course_id: int = Field(alias="courseId")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


# =============================================================================
# Topic Models
# =============================================================================


class TopicBase(BaseModel):
    """Base model for topic."""

    url_slug: str = Field(alias="urlSlug")
    display_name: str = Field(alias="displayName")
    course_id: int = Field(alias="courseId")

    model_config = {"populate_by_name": True}


class TopicCreate(TopicBase):
    """Model for creating a topic."""

    content_html: Optional[str] = Field(None, alias="contentHtml")
    content_text: Optional[str] = Field(None, alias="contentText")


class TopicUpdate(BaseModel):
    """Model for updating a topic."""

    display_name: Optional[str] = Field(None, alias="displayName")
    course_id: Optional[int] = Field(None, alias="courseId")
    content_html: Optional[str] = Field(None, alias="contentHtml")
    content_text: Optional[str] = Field(None, alias="contentText")

    model_config = {"populate_by_name": True}


class Topic(TopicBase):
    """Full topic model."""

    id: int
    graph_id: str = Field(alias="graphId")
    parent_slugs: list[str] = Field(alias="parentSlugs")
    content_html: Optional[str] = Field(None, alias="contentHtml")
    content_text: Optional[str] = Field(None, alias="contentText")
    has_content: bool = Field(alias="hasContent")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


class TopicWithoutGraphId(BaseModel):
    """Topic model without graphId for full graph data response."""

    id: int
    url_slug: str = Field(alias="urlSlug")
    display_name: str = Field(alias="displayName")
    course_id: int = Field(alias="courseId")
    parent_slugs: list[str] = Field(alias="parentSlugs")
    content_html: Optional[str] = Field(None, alias="contentHtml")
    content_text: Optional[str] = Field(None, alias="contentText")
    has_content: bool = Field(alias="hasContent")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


# =============================================================================
# Edge Models
# =============================================================================


class EdgeBase(BaseModel):
    """Base model for edge."""

    parent_slug: str = Field(alias="parentSlug")
    child_slug: str = Field(alias="childSlug")

    model_config = {"populate_by_name": True}


class EdgeCreate(EdgeBase):
    """Model for creating an edge."""

    pass


class Edge(EdgeBase):
    """Full edge model."""

    id: int
    graph_id: str = Field(alias="graphId")
    created_at: str = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class EdgeWithoutGraphId(EdgeBase):
    """Edge model without graphId for full graph data response."""

    id: int
    created_at: str = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


# =============================================================================
# Batch Operations Models
# =============================================================================


class BatchCourseUpdate(BaseModel):
    """Model for batch course update."""

    course_id: int = Field(alias="courseId")
    data: CourseUpdate

    model_config = {"populate_by_name": True}


class BatchTopicUpdate(BaseModel):
    """Model for batch topic update."""

    url_slug: str = Field(alias="urlSlug")
    data: TopicUpdate

    model_config = {"populate_by_name": True}


class BatchEdgeDelete(BaseModel):
    """Model for batch edge delete."""

    parent_slug: str = Field(alias="parentSlug")
    child_slug: str = Field(alias="childSlug")

    model_config = {"populate_by_name": True}


class BatchCoursesOperations(BaseModel):
    """Batch operations for courses."""

    create: Optional[list[CourseCreate]] = None
    update: Optional[list[BatchCourseUpdate]] = None
    delete: Optional[list[int]] = None


class BatchTopicsOperations(BaseModel):
    """Batch operations for topics."""

    create: Optional[list[TopicCreate]] = None
    update: Optional[list[BatchTopicUpdate]] = None
    delete: Optional[list[str]] = None


class BatchEdgesOperations(BaseModel):
    """Batch operations for edges."""

    create: Optional[list[EdgeCreate]] = None
    delete: Optional[list[BatchEdgeDelete]] = None


class BatchOperations(BaseModel):
    """Model for batch operations."""

    courses: Optional[BatchCoursesOperations] = None
    topics: Optional[BatchTopicsOperations] = None
    edges: Optional[BatchEdgesOperations] = None


class BatchResult(BaseModel):
    """Result of batch operations."""

    courses_created: int = Field(alias="coursesCreated")
    courses_updated: int = Field(alias="coursesUpdated")
    courses_deleted: int = Field(alias="coursesDeleted")
    topics_created: int = Field(alias="topicsCreated")
    topics_updated: int = Field(alias="topicsUpdated")
    topics_deleted: int = Field(alias="topicsDeleted")
    edges_created: int = Field(alias="edgesCreated")
    edges_deleted: int = Field(alias="edgesDeleted")

    model_config = {"populate_by_name": True}


# =============================================================================
# Full Graph Data Models
# =============================================================================


class FullGraphData(BaseModel):
    """Full graph data model."""

    graph: KnowledgeGraph
    courses: list[CourseWithoutGraphId]
    topics: list[TopicWithoutGraphId]
    edges: list[EdgeWithoutGraphId]


# =============================================================================
# API Response Models
# =============================================================================


class ErrorDetail(BaseModel):
    """Error detail model."""

    code: str
    message: str
    details: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Error response model."""

    success: bool = False
    error: ErrorDetail


class SuccessResponse(BaseModel):
    """Generic success response model."""

    success: bool = True
    data: dict


class DeletedResponse(BaseModel):
    """Response for delete operations."""

    deleted: bool = True
