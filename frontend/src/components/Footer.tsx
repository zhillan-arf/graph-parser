import type { Course } from '../types';

interface FooterProps {
  courses: Course[];
  totalTopics: number;
  totalEdges: number;
  visibleCount: number;
}

export default function Footer({
  courses,
  totalTopics,
  totalEdges,
  visibleCount,
}: FooterProps) {
  return (
    <footer>
      <div className="stats">
        <span id="node-count">{totalTopics} topics</span>
        <span id="edge-count">{totalEdges} edges</span>
        <span id="visible-count">{visibleCount} visible</span>
      </div>
      <div className="legend" id="legend">
        {courses
          .filter((c) => c.name !== 'Missing')
          .map((course) => (
            <div key={course.id} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: course.color }}
              />
              <span>{course.name}</span>
            </div>
          ))}
      </div>
    </footer>
  );
}
