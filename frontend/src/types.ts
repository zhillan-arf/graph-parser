export interface Course {
  id: number;
  name: string;
  color: string;
}

export interface Topic {
  id: number;
  url_slug: string;
  display_name: string;
  course_id: number;
  parent_slugs: string[];
  content_html: string | null;
  content_text: string | null;
  has_content: boolean;
}

export interface Edge {
  id: number;
  parent_slug: string;
  child_slug: string;
}

export interface GraphData {
  courses: Course[];
  topics: Topic[];
  edges: Edge[];
}

export type LayoutType = 'dagre' | 'force';
