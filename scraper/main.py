"""Main entry point for the JM knowledge graph scraper."""

import argparse
from pathlib import Path

from .graph_scraper import scrape_graph
from .content_scraper import scrape_all_content
from .database import (
    init_database,
    clear_database,
    save_courses,
    save_topics,
    save_edges,
    export_to_json,
    DEFAULT_DB_PATH,
)


def main():
    parser = argparse.ArgumentParser(
        description="Scrape JM knowledge graph data"
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"Path to SQLite database (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=None,
        help="Export data to JSON file after scraping",
    )
    parser.add_argument(
        "--skip-content",
        action="store_true",
        help="Skip scraping individual topic content pages",
    )
    parser.add_argument(
        "--include-missing",
        action="store_true",
        help="Include topics with 'Missing' course when scraping content",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing database before scraping",
    )

    args = parser.parse_args()

    # Initialize database
    print(f"Initializing database at {args.db}...")
    conn = init_database(args.db)

    if args.clear:
        print("Clearing existing data...")
        clear_database(conn)

    # Scrape graph structure
    print("\n=== Scraping Graph Structure ===")
    courses, topics, edges = scrape_graph()

    # Scrape content pages
    if not args.skip_content:
        print("\n=== Scraping Content Pages ===")
        scrape_all_content(
            topics,
            skip_missing_course=not args.include_missing,
        )

    # Save to database
    print("\n=== Saving to Database ===")
    print("Saving courses...")
    save_courses(conn, courses)
    print("Saving topics...")
    save_topics(conn, topics)
    print("Saving edges...")
    save_edges(conn, edges)

    print(f"\nData saved to {args.db}")

    # Export to JSON if requested
    if args.json:
        print(f"\n=== Exporting to JSON ===")
        export_to_json(conn, args.json)

    # Summary
    print("\n=== Summary ===")
    print(f"  Courses: {len(courses)}")
    print(f"  Topics: {len(topics)}")
    print(f"  Edges: {len(edges)}")

    if not args.skip_content:
        with_content = sum(1 for t in topics if t.has_content)
        print(f"  Topics with content: {with_content}")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
