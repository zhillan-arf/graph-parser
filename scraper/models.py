"""Data models for JM knowledge graph."""

from dataclasses import dataclass, field


@dataclass
class Course:
    """Represents a course/category in the knowledge graph."""
    id: int
    name: str
    color: str

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "color": self.color}


@dataclass
class Topic:
    """Represents a topic node in the knowledge graph."""
    id: int
    url_slug: str
    display_name: str
    course_id: int
    parent_slugs: list[str] = field(default_factory=list)
    content_html: str | None = None
    content_text: str | None = None
    has_content: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "url_slug": self.url_slug,
            "display_name": self.display_name,
            "course_id": self.course_id,
            "parent_slugs": self.parent_slugs,
            "content_html": self.content_html,
            "content_text": self.content_text,
            "has_content": self.has_content,
        }


@dataclass
class Edge:
    """Represents a directed edge (prerequisite relationship) in the graph."""
    id: int
    parent_slug: str
    child_slug: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "parent_slug": self.parent_slug,
            "child_slug": self.child_slug,
        }
