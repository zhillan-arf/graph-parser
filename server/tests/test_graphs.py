"""Tests for knowledge graph API endpoints."""

import pytest
from httpx import AsyncClient


class TestGraphEndpoints:
    """Tests for /api/v1/graphs endpoints."""

    async def test_list_graphs_empty(self, client: AsyncClient):
        """Test listing graphs when only default graph exists."""
        response = await client.get("/api/v1/graphs")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Default graph should exist
        assert isinstance(data["data"], list)
        assert len(data["data"]) >= 1

    async def test_create_graph(self, client: AsyncClient):
        """Test creating a new graph."""
        response = await client.post(
            "/api/v1/graphs",
            json={"name": "Test Graph", "description": "A test graph"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Test Graph"
        assert data["data"]["description"] == "A test graph"
        assert data["data"]["isDefault"] is False
        assert data["data"]["isReadonly"] is False
        assert "id" in data["data"]
        assert "createdAt" in data["data"]
        assert "updatedAt" in data["data"]

    async def test_create_graph_missing_name(self, client: AsyncClient):
        """Test creating graph without name fails."""
        response = await client.post("/api/v1/graphs", json={"name": ""})
        assert response.status_code == 400
        data = response.json()
        assert "VALIDATION_ERROR" in str(data)

    async def test_get_graph(self, client: AsyncClient):
        """Test getting a specific graph."""
        # Create a graph first
        create_response = await client.post(
            "/api/v1/graphs", json={"name": "Get Test Graph"}
        )
        graph_id = create_response.json()["data"]["id"]

        # Get the graph
        response = await client.get(f"/api/v1/graphs/{graph_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == graph_id
        assert data["data"]["name"] == "Get Test Graph"

    async def test_get_graph_not_found(self, client: AsyncClient):
        """Test getting non-existent graph returns 404."""
        response = await client.get("/api/v1/graphs/nonexistent-id")
        assert response.status_code == 404
        data = response.json()
        assert "GRAPH_NOT_FOUND" in str(data)

    async def test_update_graph(self, client: AsyncClient):
        """Test updating a graph."""
        # Create a graph
        create_response = await client.post(
            "/api/v1/graphs", json={"name": "Original Name"}
        )
        graph_id = create_response.json()["data"]["id"]

        # Update the graph
        response = await client.patch(
            f"/api/v1/graphs/{graph_id}",
            json={"name": "Updated Name", "description": "New description"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Updated Name"
        assert data["data"]["description"] == "New description"

    async def test_update_readonly_graph_fails(self, client: AsyncClient):
        """Test updating a readonly graph fails."""
        # Get the default (readonly) graph
        list_response = await client.get("/api/v1/graphs")
        default_graph = next(
            g for g in list_response.json()["data"] if g["isDefault"]
        )

        response = await client.patch(
            f"/api/v1/graphs/{default_graph['id']}", json={"name": "New Name"}
        )
        assert response.status_code == 409
        assert "READONLY_GRAPH" in str(response.json())

    async def test_delete_graph(self, client: AsyncClient):
        """Test deleting a graph."""
        # Create a graph
        create_response = await client.post(
            "/api/v1/graphs", json={"name": "To Delete"}
        )
        graph_id = create_response.json()["data"]["id"]

        # Delete the graph
        response = await client.delete(f"/api/v1/graphs/{graph_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["deleted"] is True

        # Verify it's deleted
        get_response = await client.get(f"/api/v1/graphs/{graph_id}")
        assert get_response.status_code == 404

    async def test_delete_default_graph_fails(self, client: AsyncClient):
        """Test deleting default graph fails."""
        list_response = await client.get("/api/v1/graphs")
        default_graph = next(
            g for g in list_response.json()["data"] if g["isDefault"]
        )

        response = await client.delete(f"/api/v1/graphs/{default_graph['id']}")
        assert response.status_code == 409
        assert "CANNOT_DELETE_DEFAULT" in str(response.json()) or "READONLY_GRAPH" in str(response.json())

    async def test_copy_graph(self, client: AsyncClient):
        """Test copying a graph with all its data."""
        # Create source graph with data
        source_response = await client.post(
            "/api/v1/graphs", json={"name": "Source Graph"}
        )
        source_id = source_response.json()["data"]["id"]

        # Add a course
        await client.post(
            f"/api/v1/graphs/{source_id}/courses",
            json={"name": "Test Course", "color": "#FF0000"},
        )

        # Copy the graph
        copy_response = await client.post(
            "/api/v1/graphs",
            json={"name": "Copied Graph", "copyFromGraphId": source_id},
        )
        assert copy_response.status_code == 201
        copied_id = copy_response.json()["data"]["id"]
        assert copy_response.json()["data"]["sourceGraphId"] == source_id

        # Verify course was copied
        courses_response = await client.get(f"/api/v1/graphs/{copied_id}/courses")
        assert len(courses_response.json()["data"]) == 1


class TestCourseEndpoints:
    """Tests for /api/v1/graphs/{graphId}/courses endpoints."""

    async def test_list_courses_empty(self, client: AsyncClient):
        """Test listing courses when none exist."""
        # Create a graph
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Course Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        response = await client.get(f"/api/v1/graphs/{graph_id}/courses")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"] == []

    async def test_create_course(self, client: AsyncClient):
        """Test creating a course."""
        # Create a graph
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Course Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "Mathematics", "color": "#3498db"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Mathematics"
        assert data["data"]["color"] == "#3498db"
        assert data["data"]["courseId"] == 1
        assert data["data"]["graphId"] == graph_id

    async def test_create_course_sequential_ids(self, client: AsyncClient):
        """Test that course IDs are sequential."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Sequential ID Test"}
        )
        graph_id = graph_response.json()["data"]["id"]

        # Create three courses
        for i, name in enumerate(["First", "Second", "Third"], start=1):
            response = await client.post(
                f"/api/v1/graphs/{graph_id}/courses",
                json={"name": name, "color": f"#00000{i}"},
            )
            assert response.json()["data"]["courseId"] == i

    async def test_create_course_missing_name(self, client: AsyncClient):
        """Test creating course without name fails."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "", "color": "#000000"},
        )
        assert response.status_code == 400

    async def test_create_course_missing_color(self, client: AsyncClient):
        """Test creating course without color fails."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/courses", json={"name": "Test", "color": ""}
        )
        assert response.status_code == 400

    async def test_get_course(self, client: AsyncClient):
        """Test getting a specific course."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "Physics", "color": "#e74c3c"},
        )

        response = await client.get(f"/api/v1/graphs/{graph_id}/courses/1")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "Physics"

    async def test_get_course_not_found(self, client: AsyncClient):
        """Test getting non-existent course returns 404."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        response = await client.get(f"/api/v1/graphs/{graph_id}/courses/999")
        assert response.status_code == 404
        assert "COURSE_NOT_FOUND" in str(response.json())

    async def test_update_course(self, client: AsyncClient):
        """Test updating a course."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "Original", "color": "#000000"},
        )

        response = await client.patch(
            f"/api/v1/graphs/{graph_id}/courses/1",
            json={"name": "Updated", "color": "#FFFFFF"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "Updated"
        assert data["data"]["color"] == "#FFFFFF"

    async def test_delete_course(self, client: AsyncClient):
        """Test deleting a course."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "To Delete", "color": "#000000"},
        )

        response = await client.delete(f"/api/v1/graphs/{graph_id}/courses/1")
        assert response.status_code == 200
        assert response.json()["data"]["deleted"] is True

        # Verify deletion
        get_response = await client.get(f"/api/v1/graphs/{graph_id}/courses/1")
        assert get_response.status_code == 404


class TestTopicEndpoints:
    """Tests for /api/v1/graphs/{graphId}/topics endpoints."""

    async def _create_graph_with_course(self, client: AsyncClient) -> tuple[str, int]:
        """Helper to create a graph with a course."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Topic Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        course_response = await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "Test Course", "color": "#000000"},
        )
        course_id = course_response.json()["data"]["courseId"]

        return graph_id, course_id

    async def test_list_topics_empty(self, client: AsyncClient):
        """Test listing topics when none exist."""
        graph_id, _ = await self._create_graph_with_course(client)

        response = await client.get(f"/api/v1/graphs/{graph_id}/topics")
        assert response.status_code == 200
        assert response.json()["data"] == []

    async def test_create_topic(self, client: AsyncClient):
        """Test creating a topic."""
        graph_id, course_id = await self._create_graph_with_course(client)

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "introduction",
                "displayName": "Introduction to Python",
                "courseId": course_id,
                "contentHtml": "<p>Welcome</p>",
                "contentText": "Welcome",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["urlSlug"] == "introduction"
        assert data["data"]["displayName"] == "Introduction to Python"
        assert data["data"]["courseId"] == course_id
        assert data["data"]["parentSlugs"] == []
        assert data["data"]["hasContent"] is True

    async def test_create_topic_without_content(self, client: AsyncClient):
        """Test creating a topic without content."""
        graph_id, course_id = await self._create_graph_with_course(client)

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "empty-topic",
                "displayName": "Empty Topic",
                "courseId": course_id,
            },
        )
        assert response.status_code == 201
        assert response.json()["data"]["hasContent"] is False

    async def test_create_topic_duplicate_slug_fails(self, client: AsyncClient):
        """Test creating topic with duplicate slug fails."""
        graph_id, course_id = await self._create_graph_with_course(client)

        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "duplicate",
                "displayName": "First",
                "courseId": course_id,
            },
        )

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "duplicate",
                "displayName": "Second",
                "courseId": course_id,
            },
        )
        assert response.status_code == 409
        assert "DUPLICATE_ENTRY" in str(response.json())

    async def test_create_topic_invalid_course_fails(self, client: AsyncClient):
        """Test creating topic with non-existent course fails."""
        graph_id, _ = await self._create_graph_with_course(client)

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "test",
                "displayName": "Test",
                "courseId": 999,
            },
        )
        assert response.status_code == 404
        assert "COURSE_NOT_FOUND" in str(response.json())

    async def test_get_topic(self, client: AsyncClient):
        """Test getting a specific topic."""
        graph_id, course_id = await self._create_graph_with_course(client)

        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "get-test",
                "displayName": "Get Test",
                "courseId": course_id,
            },
        )

        response = await client.get(f"/api/v1/graphs/{graph_id}/topics/get-test")
        assert response.status_code == 200
        assert response.json()["data"]["urlSlug"] == "get-test"

    async def test_get_topic_not_found(self, client: AsyncClient):
        """Test getting non-existent topic returns 404."""
        graph_id, _ = await self._create_graph_with_course(client)

        response = await client.get(f"/api/v1/graphs/{graph_id}/topics/nonexistent")
        assert response.status_code == 404
        assert "TOPIC_NOT_FOUND" in str(response.json())

    async def test_update_topic(self, client: AsyncClient):
        """Test updating a topic."""
        graph_id, course_id = await self._create_graph_with_course(client)

        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "update-test",
                "displayName": "Original",
                "courseId": course_id,
            },
        )

        response = await client.patch(
            f"/api/v1/graphs/{graph_id}/topics/update-test",
            json={"displayName": "Updated", "contentHtml": "<p>New content</p>"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["displayName"] == "Updated"
        assert data["data"]["hasContent"] is True

    async def test_delete_topic(self, client: AsyncClient):
        """Test deleting a topic."""
        graph_id, course_id = await self._create_graph_with_course(client)

        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "to-delete",
                "displayName": "To Delete",
                "courseId": course_id,
            },
        )

        response = await client.delete(f"/api/v1/graphs/{graph_id}/topics/to-delete")
        assert response.status_code == 200
        assert response.json()["data"]["deleted"] is True

        # Verify deletion
        get_response = await client.get(f"/api/v1/graphs/{graph_id}/topics/to-delete")
        assert get_response.status_code == 404

    async def test_get_topic_prerequisites(self, client: AsyncClient):
        """Test getting topic prerequisites."""
        graph_id, course_id = await self._create_graph_with_course(client)

        # Create two topics
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "prerequisite",
                "displayName": "Prerequisite Topic",
                "courseId": course_id,
            },
        )
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "dependent",
                "displayName": "Dependent Topic",
                "courseId": course_id,
            },
        )

        # Create edge
        await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": "prerequisite", "childSlug": "dependent"},
        )

        # Get prerequisites
        response = await client.get(
            f"/api/v1/graphs/{graph_id}/topics/dependent/prerequisites"
        )
        assert response.status_code == 200
        prereqs = response.json()["data"]
        assert len(prereqs) == 1
        assert prereqs[0]["urlSlug"] == "prerequisite"

    async def test_get_topic_dependents(self, client: AsyncClient):
        """Test getting topics that depend on a topic."""
        graph_id, course_id = await self._create_graph_with_course(client)

        # Create two topics
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "parent-topic",
                "displayName": "Parent Topic",
                "courseId": course_id,
            },
        )
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "child-topic",
                "displayName": "Child Topic",
                "courseId": course_id,
            },
        )

        # Create edge
        await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": "parent-topic", "childSlug": "child-topic"},
        )

        # Get dependents
        response = await client.get(
            f"/api/v1/graphs/{graph_id}/topics/parent-topic/dependents"
        )
        assert response.status_code == 200
        dependents = response.json()["data"]
        assert len(dependents) == 1
        assert dependents[0]["urlSlug"] == "child-topic"


class TestEdgeEndpoints:
    """Tests for /api/v1/graphs/{graphId}/edges endpoints."""

    async def _create_graph_with_topics(
        self, client: AsyncClient
    ) -> tuple[str, str, str]:
        """Helper to create a graph with two topics."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Edge Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "Test Course", "color": "#000000"},
        )

        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={"urlSlug": "topic-a", "displayName": "Topic A", "courseId": 1},
        )
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={"urlSlug": "topic-b", "displayName": "Topic B", "courseId": 1},
        )

        return graph_id, "topic-a", "topic-b"

    async def test_list_edges_empty(self, client: AsyncClient):
        """Test listing edges when none exist."""
        graph_id, _, _ = await self._create_graph_with_topics(client)

        response = await client.get(f"/api/v1/graphs/{graph_id}/edges")
        assert response.status_code == 200
        assert response.json()["data"] == []

    async def test_create_edge(self, client: AsyncClient):
        """Test creating an edge."""
        graph_id, topic_a, topic_b = await self._create_graph_with_topics(client)

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": topic_a, "childSlug": topic_b},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["parentSlug"] == topic_a
        assert data["data"]["childSlug"] == topic_b

    async def test_create_edge_updates_parent_slugs(self, client: AsyncClient):
        """Test that creating an edge updates the child's parentSlugs."""
        graph_id, topic_a, topic_b = await self._create_graph_with_topics(client)

        await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": topic_a, "childSlug": topic_b},
        )

        # Check child topic's parentSlugs
        topic_response = await client.get(f"/api/v1/graphs/{graph_id}/topics/{topic_b}")
        assert topic_a in topic_response.json()["data"]["parentSlugs"]

    async def test_create_self_reference_edge_fails(self, client: AsyncClient):
        """Test creating self-referencing edge fails."""
        graph_id, topic_a, _ = await self._create_graph_with_topics(client)

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": topic_a, "childSlug": topic_a},
        )
        assert response.status_code == 400
        assert "self-referencing" in str(response.json()).lower()

    async def test_create_duplicate_edge_fails(self, client: AsyncClient):
        """Test creating duplicate edge fails."""
        graph_id, topic_a, topic_b = await self._create_graph_with_topics(client)

        await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": topic_a, "childSlug": topic_b},
        )

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": topic_a, "childSlug": topic_b},
        )
        assert response.status_code == 409
        assert "DUPLICATE_ENTRY" in str(response.json())

    async def test_create_edge_nonexistent_parent_fails(self, client: AsyncClient):
        """Test creating edge with non-existent parent fails."""
        graph_id, _, topic_b = await self._create_graph_with_topics(client)

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": "nonexistent", "childSlug": topic_b},
        )
        assert response.status_code == 404
        assert "TOPIC_NOT_FOUND" in str(response.json())

    async def test_delete_edge(self, client: AsyncClient):
        """Test deleting an edge."""
        graph_id, topic_a, topic_b = await self._create_graph_with_topics(client)

        await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": topic_a, "childSlug": topic_b},
        )

        response = await client.delete(
            f"/api/v1/graphs/{graph_id}/edges/{topic_a}/{topic_b}"
        )
        assert response.status_code == 200
        assert response.json()["data"]["deleted"] is True

    async def test_delete_edge_updates_parent_slugs(self, client: AsyncClient):
        """Test that deleting an edge updates the child's parentSlugs."""
        graph_id, topic_a, topic_b = await self._create_graph_with_topics(client)

        await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": topic_a, "childSlug": topic_b},
        )

        await client.delete(f"/api/v1/graphs/{graph_id}/edges/{topic_a}/{topic_b}")

        # Check child topic's parentSlugs
        topic_response = await client.get(f"/api/v1/graphs/{graph_id}/topics/{topic_b}")
        assert topic_a not in topic_response.json()["data"]["parentSlugs"]

    async def test_delete_edge_not_found(self, client: AsyncClient):
        """Test deleting non-existent edge returns 404."""
        graph_id, topic_a, topic_b = await self._create_graph_with_topics(client)

        response = await client.delete(
            f"/api/v1/graphs/{graph_id}/edges/{topic_a}/{topic_b}"
        )
        assert response.status_code == 404
        assert "EDGE_NOT_FOUND" in str(response.json())


class TestBatchOperations:
    """Tests for /api/v1/graphs/{graphId}/batch endpoint."""

    async def test_batch_create_courses(self, client: AsyncClient):
        """Test batch creating courses."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Batch Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/batch",
            json={
                "courses": {
                    "create": [
                        {"name": "Course 1", "color": "#111111"},
                        {"name": "Course 2", "color": "#222222"},
                    ]
                }
            },
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["coursesCreated"] == 2

    async def test_batch_create_topics_and_edges(self, client: AsyncClient):
        """Test batch creating topics and edges."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Batch Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        # Create course first
        await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "Test", "color": "#000000"},
        )

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/batch",
            json={
                "topics": {
                    "create": [
                        {"urlSlug": "batch-a", "displayName": "Batch A", "courseId": 1},
                        {"urlSlug": "batch-b", "displayName": "Batch B", "courseId": 1},
                    ]
                },
                "edges": {
                    "create": [{"parentSlug": "batch-a", "childSlug": "batch-b"}]
                },
            },
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["topicsCreated"] == 2
        assert data["edgesCreated"] == 1

    async def test_batch_update_courses(self, client: AsyncClient):
        """Test batch updating courses."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Batch Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "Original", "color": "#000000"},
        )

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/batch",
            json={
                "courses": {
                    "update": [{"courseId": 1, "data": {"name": "Updated"}}]
                }
            },
        )
        assert response.status_code == 200
        assert response.json()["data"]["coursesUpdated"] == 1

        # Verify update
        course_response = await client.get(f"/api/v1/graphs/{graph_id}/courses/1")
        assert course_response.json()["data"]["name"] == "Updated"

    async def test_batch_delete_operations(self, client: AsyncClient):
        """Test batch delete operations."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Batch Test Graph"}
        )
        graph_id = graph_response.json()["data"]["id"]

        # Setup: create course, topics, edge
        await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "To Delete", "color": "#000000"},
        )
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={"urlSlug": "del-a", "displayName": "Del A", "courseId": 1},
        )
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={"urlSlug": "del-b", "displayName": "Del B", "courseId": 1},
        )
        await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": "del-a", "childSlug": "del-b"},
        )

        response = await client.post(
            f"/api/v1/graphs/{graph_id}/batch",
            json={
                "edges": {"delete": [{"parentSlug": "del-a", "childSlug": "del-b"}]},
                "topics": {"delete": ["del-a"]},
            },
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["edgesDeleted"] == 1
        assert data["topicsDeleted"] == 1


class TestFullGraphData:
    """Tests for /api/v1/graphs/{graphId}/data endpoint."""

    async def test_get_full_graph_data(self, client: AsyncClient):
        """Test getting full graph data."""
        graph_response = await client.post(
            "/api/v1/graphs", json={"name": "Full Data Test"}
        )
        graph_id = graph_response.json()["data"]["id"]

        # Create course
        await client.post(
            f"/api/v1/graphs/{graph_id}/courses",
            json={"name": "Test Course", "color": "#FF0000"},
        )

        # Create topics
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={
                "urlSlug": "topic-1",
                "displayName": "Topic 1",
                "courseId": 1,
                "contentHtml": "<p>Content</p>",
            },
        )
        await client.post(
            f"/api/v1/graphs/{graph_id}/topics",
            json={"urlSlug": "topic-2", "displayName": "Topic 2", "courseId": 1},
        )

        # Create edge
        await client.post(
            f"/api/v1/graphs/{graph_id}/edges",
            json={"parentSlug": "topic-1", "childSlug": "topic-2"},
        )

        response = await client.get(f"/api/v1/graphs/{graph_id}/data")
        assert response.status_code == 200
        data = response.json()["data"]

        # Verify structure
        assert "graph" in data
        assert "courses" in data
        assert "topics" in data
        assert "edges" in data

        # Verify graph
        assert data["graph"]["id"] == graph_id
        assert data["graph"]["name"] == "Full Data Test"

        # Verify courses (without graphId)
        assert len(data["courses"]) == 1
        assert "graphId" not in data["courses"][0]
        assert data["courses"][0]["name"] == "Test Course"

        # Verify topics (without graphId, contentHtml stripped)
        assert len(data["topics"]) == 2
        for topic in data["topics"]:
            assert "graphId" not in topic
            assert topic["contentHtml"] is None  # Stripped

        # Verify edges (without graphId)
        assert len(data["edges"]) == 1
        assert "graphId" not in data["edges"][0]


class TestReadonlyConstraints:
    """Tests for readonly graph constraints."""

    async def test_cannot_create_course_on_readonly(self, client: AsyncClient):
        """Test that creating a course on readonly graph fails."""
        list_response = await client.get("/api/v1/graphs")
        default_graph = next(
            g for g in list_response.json()["data"] if g["isReadonly"]
        )

        response = await client.post(
            f"/api/v1/graphs/{default_graph['id']}/courses",
            json={"name": "Test", "color": "#000000"},
        )
        assert response.status_code == 409
        assert "READONLY_GRAPH" in str(response.json())

    async def test_cannot_create_topic_on_readonly(self, client: AsyncClient):
        """Test that creating a topic on readonly graph fails."""
        list_response = await client.get("/api/v1/graphs")
        default_graph = next(
            g for g in list_response.json()["data"] if g["isReadonly"]
        )

        response = await client.post(
            f"/api/v1/graphs/{default_graph['id']}/topics",
            json={"urlSlug": "test", "displayName": "Test", "courseId": 1},
        )
        assert response.status_code == 409
        assert "READONLY_GRAPH" in str(response.json())

    async def test_cannot_batch_on_readonly(self, client: AsyncClient):
        """Test that batch operations on readonly graph fails."""
        list_response = await client.get("/api/v1/graphs")
        default_graph = next(
            g for g in list_response.json()["data"] if g["isReadonly"]
        )

        response = await client.post(
            f"/api/v1/graphs/{default_graph['id']}/batch",
            json={"courses": {"create": [{"name": "Test", "color": "#000"}]}},
        )
        assert response.status_code == 409
        assert "READONLY_GRAPH" in str(response.json())


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    async def test_health_check(self, client: AsyncClient):
        """Test health check endpoint."""
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
