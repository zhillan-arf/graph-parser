"""Scraper for extracting graph structure from JustinMath content-graph.html."""

import re
import requests
from bs4 import BeautifulSoup

from .models import Course, Topic, Edge

GRAPH_URL = "https://www.justinmath.com/files/content-graph.html"


def fetch_graph_html() -> str:
    """Fetch the content-graph.html page."""
    response = requests.get(GRAPH_URL, timeout=30)
    response.raise_for_status()
    return response.text


def extract_script_content(html: str) -> str:
    """Extract the main JavaScript content from the HTML."""
    soup = BeautifulSoup(html, "lxml")
    scripts = soup.find_all("script")

    for script in scripts:
        if script.string and "graph.addTopic" in script.string:
            return script.string

    raise ValueError("Could not find script containing graph data")


def parse_color_constants(script: str) -> dict[str, str]:
    """Parse color constant definitions from the script.

    Colors are defined as: const COLOR_NAME = '#hexcode'
    """
    colors = {}

    # Pattern: const VARNAME = '#hexcode'
    pattern = r"const\s+(\w+)\s*=\s*['\"]([^'\"]+)['\"]"

    for var_name, value in re.findall(pattern, script):
        colors[var_name] = value

    return colors


def parse_courses(script: str) -> dict[str, Course]:
    """Parse course definitions from the script.

    Courses are defined as: let courseName = graph.addCourse('Name', 'color')
    """
    courses = {}

    # First, parse color constants
    color_constants = parse_color_constants(script)

    # Pattern: let varName = graph.addCourse('CourseName', 'color')
    # or: let varName = graph.addCourse('CourseName', color) where color is a variable
    pattern = r"let\s+(\w+)\s*=\s*graph\.addCourse\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*([^)]+)\s*\)"

    matches = re.findall(pattern, script)

    course_id = 1
    for var_name, course_name, color_value in matches:
        # Clean up color value - remove quotes if present
        color = color_value.strip().strip("'\"")

        # Handle variable references (e.g., LIGHT_PURPLE)
        if color in color_constants:
            color = color_constants[color]

        courses[var_name] = Course(id=course_id, name=course_name, color=color)
        course_id += 1

    return courses


def parse_topics(script: str, courses: dict[str, Course]) -> list[Topic]:
    """Parse topic definitions from the script.

    Topics are defined as:
    - let topicVar = graph.addTopic('url-slug', courseVar, [parent1, parent2])
    - let topicVar = graph.addTopic('url-slug', courseVar)  # no parents
    """
    topics = []
    topic_var_to_slug = {}

    # Pattern to match addTopic calls - parents array is optional
    # Matches both: addTopic('slug', course) and addTopic('slug', course, [parents])
    pattern = r"let\s+(\w+)\s*=\s*graph\.addTopic\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*(\w+)(?:\s*,\s*\[([^\]]*)\])?\s*\)"

    matches = re.findall(pattern, script)

    topic_id = 1
    for var_name, url_slug, course_var, parents_str in matches:
        # Get course ID
        course = courses.get(course_var)
        if not course:
            print(f"Warning: Unknown course variable '{course_var}' for topic '{url_slug}'")
            course_id = 1  # Default to Missing
        else:
            course_id = course.id

        # Convert URL slug to display name
        display_name = " ".join(word.capitalize() for word in url_slug.split("-"))

        # Store mapping for later edge resolution
        topic_var_to_slug[var_name] = url_slug

        topic = Topic(
            id=topic_id,
            url_slug=url_slug,
            display_name=display_name,
            course_id=course_id,
            parent_slugs=[],  # Will be resolved after all topics are parsed
        )
        topics.append(topic)
        topic_id += 1

    # Second pass: resolve parent slugs
    for match in re.finditer(pattern, script):
        var_name = match.group(1)
        url_slug = match.group(2)
        parents_str = match.group(4) or ""  # May be None if no parents specified

        parent_vars = [p.strip() for p in parents_str.split(",") if p.strip()]
        parent_slugs = []

        for parent_var in parent_vars:
            if parent_var in topic_var_to_slug:
                parent_slugs.append(topic_var_to_slug[parent_var])
            else:
                print(f"Warning: Unknown parent variable '{parent_var}' for topic '{url_slug}'")

        # Find and update the topic
        for topic in topics:
            if topic.url_slug == url_slug:
                topic.parent_slugs = parent_slugs
                break

    return topics


def build_edges(topics: list[Topic]) -> list[Edge]:
    """Build edge list from topic parent relationships."""
    edges = []
    edge_id = 1

    for topic in topics:
        for parent_slug in topic.parent_slugs:
            edge = Edge(
                id=edge_id,
                parent_slug=parent_slug,
                child_slug=topic.url_slug,
            )
            edges.append(edge)
            edge_id += 1

    return edges


def scrape_graph() -> tuple[list[Course], list[Topic], list[Edge]]:
    """Main function to scrape the entire graph structure.

    Returns:
        Tuple of (courses, topics, edges)
    """
    print("Fetching graph HTML...")
    html = fetch_graph_html()

    print("Extracting script content...")
    script = extract_script_content(html)

    print("Parsing courses...")
    courses_dict = parse_courses(script)
    courses = list(courses_dict.values())
    print(f"  Found {len(courses)} courses")

    print("Parsing topics...")
    topics = parse_topics(script, courses_dict)
    print(f"  Found {len(topics)} topics")

    print("Building edges...")
    edges = build_edges(topics)
    print(f"  Found {len(edges)} edges")

    return courses, topics, edges


if __name__ == "__main__":
    courses, topics, edges = scrape_graph()

    print("\n--- Courses ---")
    for course in courses:
        print(f"  {course.id}: {course.name} ({course.color})")

    print("\n--- Sample Topics ---")
    for topic in topics[:10]:
        print(f"  {topic.id}: {topic.url_slug} (course={topic.course_id}, parents={topic.parent_slugs})")

    print("\n--- Sample Edges ---")
    for edge in edges[:10]:
        print(f"  {edge.parent_slug} -> {edge.child_slug}")
