"""Scraper for fetching content from individual JM topic pages."""

import time
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

from .models import Topic

BASE_URL = "https://www.justinmath.com"
REQUEST_DELAY = 0.5  # Seconds between requests to be respectful
MAX_WORKERS = 3  # Concurrent requests


def fetch_topic_content(url_slug: str) -> tuple[str | None, str | None, bool]:
    """Fetch and extract content from a single topic page.

    Args:
        url_slug: The URL slug for the topic

    Returns:
        Tuple of (content_html, content_text, has_content)
    """
    url = f"{BASE_URL}/{url_slug}"

    try:
        response = requests.get(url, timeout=30)

        if response.status_code == 404:
            return None, None, False

        response.raise_for_status()
        html = response.text

        soup = BeautifulSoup(html, "lxml")

        # Remove script and style elements
        for element in soup(["script", "style", "nav", "header", "footer"]):
            element.decompose()

        # Try to find the main content area
        # JM likely uses a specific container for content
        content_element = None

        # Try common content selectors
        for selector in ["article", "main", ".content", ".post-content", "#content", ".entry-content"]:
            content_element = soup.select_one(selector)
            if content_element:
                break

        # Fallback to body if no specific content container found
        if not content_element:
            content_element = soup.body

        if content_element:
            content_html = str(content_element)
            content_text = content_element.get_text(separator="\n", strip=True)
            has_content = len(content_text) > 100  # Assume meaningful content is > 100 chars
            return content_html, content_text, has_content

        return None, None, False

    except requests.RequestException as e:
        print(f"  Error fetching {url_slug}: {e}")
        return None, None, False


def scrape_topic_content(topic: Topic) -> Topic:
    """Scrape content for a single topic and update it.

    Args:
        topic: The topic to scrape content for

    Returns:
        The updated topic with content fields populated
    """
    content_html, content_text, has_content = fetch_topic_content(topic.url_slug)
    topic.content_html = content_html
    topic.content_text = content_text
    topic.has_content = has_content
    return topic


def scrape_all_content(
    topics: list[Topic],
    skip_missing_course: bool = True,
    progress_callback=None,
) -> list[Topic]:
    """Scrape content for all topics.

    Args:
        topics: List of topics to scrape
        skip_missing_course: If True, skip topics with course_id=1 (Missing)
        progress_callback: Optional callback function(completed, total, topic_slug)

    Returns:
        The updated list of topics with content fields populated
    """
    # Filter topics if needed
    topics_to_scrape = topics
    if skip_missing_course:
        topics_to_scrape = [t for t in topics if t.course_id != 1]

    total = len(topics_to_scrape)
    print(f"Scraping content for {total} topics...")

    completed = 0

    for topic in topics_to_scrape:
        scrape_topic_content(topic)
        completed += 1

        if progress_callback:
            progress_callback(completed, total, topic.url_slug)
        else:
            status = "✓" if topic.has_content else "✗"
            print(f"  [{completed}/{total}] {status} {topic.url_slug}")

        # Rate limiting
        time.sleep(REQUEST_DELAY)

    # Count results
    with_content = sum(1 for t in topics_to_scrape if t.has_content)
    print(f"\nContent scraping complete: {with_content}/{total} topics have content")

    return topics


def scrape_all_content_parallel(
    topics: list[Topic],
    skip_missing_course: bool = True,
    max_workers: int = MAX_WORKERS,
) -> list[Topic]:
    """Scrape content for all topics using parallel requests.

    Args:
        topics: List of topics to scrape
        skip_missing_course: If True, skip topics with course_id=1 (Missing)
        max_workers: Maximum number of concurrent requests

    Returns:
        The updated list of topics with content fields populated
    """
    # Filter topics if needed
    topics_to_scrape = topics
    if skip_missing_course:
        topics_to_scrape = [t for t in topics if t.course_id != 1]

    total = len(topics_to_scrape)
    print(f"Scraping content for {total} topics (parallel, {max_workers} workers)...")

    completed = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_topic = {
            executor.submit(scrape_topic_content, topic): topic
            for topic in topics_to_scrape
        }

        # Process completed tasks
        for future in as_completed(future_to_topic):
            topic = future_to_topic[future]
            completed += 1

            try:
                future.result()  # This updates the topic in place
                status = "✓" if topic.has_content else "✗"
            except Exception as e:
                status = "!"
                print(f"  Error processing {topic.url_slug}: {e}")

            print(f"  [{completed}/{total}] {status} {topic.url_slug}")

    # Count results
    with_content = sum(1 for t in topics_to_scrape if t.has_content)
    print(f"\nContent scraping complete: {with_content}/{total} topics have content")

    return topics


if __name__ == "__main__":
    # Test with a few topics
    test_topics = [
        Topic(id=1, url_slug="solving-linear-equations", display_name="Solving Linear Equations", course_id=2),
        Topic(id=2, url_slug="slope-intercept-form", display_name="Slope Intercept Form", course_id=2),
        Topic(id=3, url_slug="entrypoint", display_name="Entrypoint", course_id=1),  # Missing course
    ]

    print("Testing content scraper with sample topics...")
    scrape_all_content(test_topics, skip_missing_course=False)

    for topic in test_topics:
        print(f"\n{topic.url_slug}:")
        print(f"  has_content: {topic.has_content}")
        if topic.content_text:
            print(f"  text preview: {topic.content_text[:200]}...")
