"""Simple HTTP server to serve the frontend and graph API."""

import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

from .database import init_database, load_courses, load_topics, load_edges, DEFAULT_DB_PATH

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DATA_DIR = PROJECT_ROOT / "data"


class GraphAPIHandler(SimpleHTTPRequestHandler):
    """HTTP handler that serves static files and the graph API."""

    def __init__(self, *args, **kwargs):
        # Change to frontend directory for static file serving
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

    def do_GET(self):
        # API endpoint for graph data
        if self.path == "/api/graph":
            self.serve_graph_api()
        else:
            # Serve static files
            super().do_GET()

    def serve_graph_api(self):
        """Serve the graph data as JSON."""
        try:
            # Try to load from JSON file first (faster)
            json_path = DATA_DIR / "graph.json"
            if json_path.exists():
                with open(json_path) as f:
                    data = json.load(f)
            else:
                # Fall back to database
                conn = init_database(DEFAULT_DB_PATH)
                courses = load_courses(conn)
                topics = load_topics(conn)
                edges = load_edges(conn)
                conn.close()

                data = {
                    "courses": [c.to_dict() for c in courses],
                    "topics": [t.to_dict() for t in topics],
                    "edges": [e.to_dict() for e in edges],
                }

            # Send response
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            # Don't include full content in API response to reduce payload
            # Only send first 500 chars of content_text
            for topic in data["topics"]:
                if topic.get("content_text"):
                    topic["content_text"] = topic["content_text"][:500]
                # Remove HTML content entirely from API
                topic["content_html"] = None

            self.wfile.write(json.dumps(data).encode())

        except Exception as e:
            self.send_error(500, f"Internal server error: {e}")

    def log_message(self, format, *args):
        """Override to customize logging."""
        print(f"[{self.log_date_time_string()}] {args[0]}")


def run_server(host: str = "localhost", port: int = 8000):
    """Run the development server."""
    server_address = (host, port)
    httpd = HTTPServer(server_address, GraphAPIHandler)

    print(f"Starting server at http://{host}:{port}")
    print(f"Serving frontend from: {FRONTEND_DIR}")
    print(f"Graph data from: {DATA_DIR}")
    print("Press Ctrl+C to stop")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        httpd.server_close()


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Run the graph viewer development server")
    parser.add_argument("--host", default="localhost", help="Host to bind to (default: localhost)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to (default: 8000)")

    args = parser.parse_args()
    run_server(args.host, args.port)


if __name__ == "__main__":
    main()
