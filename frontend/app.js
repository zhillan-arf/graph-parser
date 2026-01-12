// Knowledge Graph Viewer

let cy = null;
let graphData = null;
let courseMap = {};

// Initialize the application
async function init() {
    try {
        await loadGraphData();
        initCytoscape();
        initControls();
        updateStats();
        buildLegend();
        document.getElementById('loading').classList.add('hidden');
    } catch (error) {
        console.error('Failed to initialize:', error);
        document.getElementById('loading').textContent = 'Failed to load graph data. Please ensure the server is running.';
    }
}

// Load graph data from JSON file or API
async function loadGraphData() {
    const response = await fetch('/api/graph');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    graphData = await response.json();

    // Build course map for quick lookup
    graphData.courses.forEach(course => {
        courseMap[course.id] = course;
    });

    // Populate course filter dropdown
    const courseFilter = document.getElementById('course-filter');
    graphData.courses.forEach(course => {
        if (course.name !== 'Missing') {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name;
            courseFilter.appendChild(option);
        }
    });
}

// Initialize Cytoscape graph
function initCytoscape() {
    const elements = buildCytoscapeElements();

    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'background-color': 'data(color)',
                    'color': '#1a1a2e',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '10px',
                    'font-weight': '500',
                    'width': 'label',
                    'height': '30px',
                    'padding': '8px',
                    'shape': 'roundrectangle',
                    'text-wrap': 'wrap',
                    'text-max-width': '120px',
                    'border-width': 2,
                    'border-color': 'data(borderColor)',
                    'text-outline-width': 0,
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 3,
                    'border-color': '#e94560',
                }
            },
            {
                selector: 'node.highlighted',
                style: {
                    'border-width': 3,
                    'border-color': '#ffffff',
                    'z-index': 999,
                }
            },
            {
                selector: 'node.path-ancestor',
                style: {
                    'border-width': 3,
                    'border-color': '#ffd700',
                    'z-index': 998,
                }
            },
            {
                selector: 'node.path-descendant',
                style: {
                    'border-width': 3,
                    'border-color': '#00ff88',
                    'z-index': 998,
                }
            },
            {
                selector: 'node.dimmed',
                style: {
                    'opacity': 0.3,
                }
            },
            {
                selector: 'node.search-match',
                style: {
                    'border-width': 4,
                    'border-color': '#e94560',
                    'z-index': 1000,
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1.5,
                    'line-color': '#4a4a6a',
                    'target-arrow-color': '#4a4a6a',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 0.8,
                }
            },
            {
                selector: 'edge.highlighted',
                style: {
                    'width': 3,
                    'line-color': '#ffd700',
                    'target-arrow-color': '#ffd700',
                    'z-index': 999,
                }
            },
            {
                selector: 'edge.dimmed',
                style: {
                    'opacity': 0.2,
                }
            }
        ],
        layout: {
            name: 'dagre',
            rankDir: 'TB',
            nodeSep: 50,
            rankSep: 80,
            padding: 30,
        },
        minZoom: 0.1,
        maxZoom: 3,
        wheelSensitivity: 0.3,
    });

    // Node click handler
    cy.on('tap', 'node', function(evt) {
        const node = evt.target;
        selectNode(node);
    });

    // Background click to deselect
    cy.on('tap', function(evt) {
        if (evt.target === cy) {
            clearSelection();
        }
    });

    // Double-click to highlight path
    cy.on('dbltap', 'node', function(evt) {
        const node = evt.target;
        highlightPath(node);
    });
}

// Build Cytoscape elements from graph data
function buildCytoscapeElements() {
    const nodes = graphData.topics.map(topic => {
        const course = courseMap[topic.course_id];
        const color = course ? course.color : '#888888';
        // Darken the border color
        const borderColor = darkenColor(color, 0.3);

        return {
            data: {
                id: topic.url_slug,
                label: topic.display_name,
                color: color,
                borderColor: borderColor,
                courseId: topic.course_id,
                courseName: course ? course.name : 'Unknown',
                hasContent: topic.has_content,
                contentText: topic.content_text,
            }
        };
    });

    const edges = graphData.edges.map(edge => ({
        data: {
            id: `${edge.parent_slug}->${edge.child_slug}`,
            source: edge.parent_slug,
            target: edge.child_slug,
        }
    }));

    return [...nodes, ...edges];
}

// Darken a hex color
function darkenColor(hex, factor) {
    if (hex === 'gray') return '#555555';
    if (!hex.startsWith('#')) return hex;

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const darken = (c) => Math.floor(c * (1 - factor));

    return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
}

// Select a node and show details
function selectNode(node) {
    cy.nodes().removeClass('highlighted');
    node.addClass('highlighted');

    const data = node.data();
    showDetailPanel(data, node);
}

// Clear selection
function clearSelection() {
    cy.nodes().removeClass('highlighted path-ancestor path-descendant dimmed');
    cy.edges().removeClass('highlighted dimmed');
    hideDetailPanel();
}

// Show the detail panel
function showDetailPanel(data, node) {
    const panel = document.getElementById('detail-panel');
    panel.classList.remove('hidden');

    document.getElementById('topic-title').textContent = data.label;

    const badge = document.getElementById('topic-course');
    badge.textContent = data.courseName;
    badge.style.backgroundColor = data.color;
    badge.style.color = isLightColor(data.color) ? '#1a1a2e' : '#ffffff';

    document.getElementById('topic-url').href = `https://www.justinmath.com/${data.id}`;

    // Prerequisites (parents)
    const prereqList = document.getElementById('prereq-list');
    prereqList.innerHTML = '';
    const parents = node.incomers('node');
    if (parents.length > 0) {
        parents.forEach(parent => {
            const li = document.createElement('li');
            li.textContent = parent.data('label');
            li.onclick = () => selectNode(parent);
            prereqList.appendChild(li);
        });
    } else {
        prereqList.innerHTML = '<li class="no-items">No prerequisites</li>';
    }

    // Leads to (children)
    const leadsList = document.getElementById('leads-list');
    leadsList.innerHTML = '';
    const children = node.outgoers('node');
    if (children.length > 0) {
        children.forEach(child => {
            const li = document.createElement('li');
            li.textContent = child.data('label');
            li.onclick = () => selectNode(child);
            leadsList.appendChild(li);
        });
    } else {
        leadsList.innerHTML = '<li class="no-items">No dependent topics</li>';
    }

    // Content preview
    const contentDiv = document.getElementById('content-text');
    if (data.hasContent && data.contentText) {
        // Show first 500 chars
        const preview = data.contentText.substring(0, 500);
        contentDiv.textContent = preview + (data.contentText.length > 500 ? '...' : '');
    } else {
        contentDiv.innerHTML = '<em>No content available</em>';
    }
}

// Hide the detail panel
function hideDetailPanel() {
    document.getElementById('detail-panel').classList.add('hidden');
}

// Check if a color is light
function isLightColor(hex) {
    if (hex === 'gray') return false;
    if (!hex.startsWith('#')) return true;

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

// Highlight the path (ancestors and descendants) of a node
function highlightPath(node) {
    cy.nodes().removeClass('highlighted path-ancestor path-descendant dimmed');
    cy.edges().removeClass('highlighted dimmed');

    // Get all ancestors (predecessors)
    const ancestors = node.predecessors('node');
    const ancestorEdges = node.predecessors('edge');

    // Get all descendants (successors)
    const descendants = node.successors('node');
    const descendantEdges = node.successors('edge');

    // Mark path nodes and edges
    node.addClass('highlighted');
    ancestors.addClass('path-ancestor');
    descendants.addClass('path-descendant');
    ancestorEdges.addClass('highlighted');
    descendantEdges.addClass('highlighted');

    // Dim non-path elements
    cy.nodes().not(node).not(ancestors).not(descendants).addClass('dimmed');
    cy.edges().not(ancestorEdges).not(descendantEdges).addClass('dimmed');
}

// Initialize controls
function initControls() {
    // Search
    const searchInput = document.getElementById('search');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTopics(e.target.value);
        }, 200);
    });

    document.getElementById('clear-search').addEventListener('click', () => {
        searchInput.value = '';
        searchTopics('');
    });

    // Course filter
    document.getElementById('course-filter').addEventListener('change', (e) => {
        filterByCourse(e.target.value);
    });

    // Layout selector
    document.getElementById('layout-select').addEventListener('change', (e) => {
        changeLayout(e.target.value);
    });

    // Fit button
    document.getElementById('fit-btn').addEventListener('click', () => {
        cy.fit(cy.nodes(':visible'), 50);
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
        resetGraph();
    });

    // Close panel button
    document.getElementById('close-panel').addEventListener('click', () => {
        clearSelection();
    });
}

// Search topics
function searchTopics(query) {
    cy.nodes().removeClass('search-match dimmed');

    if (!query.trim()) {
        updateVisibleCount();
        return;
    }

    const lowerQuery = query.toLowerCase();
    const matches = cy.nodes().filter(node => {
        return node.data('label').toLowerCase().includes(lowerQuery) ||
               node.data('id').toLowerCase().includes(lowerQuery);
    });

    if (matches.length > 0) {
        matches.addClass('search-match');
        cy.nodes().not(matches).addClass('dimmed');

        // Zoom to first match
        if (matches.length <= 10) {
            cy.fit(matches, 100);
        }
    }

    updateVisibleCount();
}

// Filter by course
function filterByCourse(courseId) {
    if (courseId === 'all') {
        cy.nodes().show();
        cy.edges().show();
    } else {
        const courseIdNum = parseInt(courseId);
        cy.nodes().forEach(node => {
            if (node.data('courseId') === courseIdNum) {
                node.show();
            } else {
                node.hide();
            }
        });

        // Show edges where both endpoints are visible
        cy.edges().forEach(edge => {
            const source = edge.source();
            const target = edge.target();
            if (source.visible() && target.visible()) {
                edge.show();
            } else {
                edge.hide();
            }
        });

        cy.fit(cy.nodes(':visible'), 50);
    }

    updateVisibleCount();
}

// Change layout
function changeLayout(layoutName) {
    let layoutConfig;

    switch (layoutName) {
        case 'dagre':
            layoutConfig = {
                name: 'dagre',
                rankDir: 'TB',
                nodeSep: 50,
                rankSep: 80,
                padding: 30,
            };
            break;
        case 'breadthfirst':
            layoutConfig = {
                name: 'breadthfirst',
                directed: true,
                padding: 30,
                spacingFactor: 1.5,
            };
            break;
        case 'cose':
            layoutConfig = {
                name: 'cose',
                idealEdgeLength: 100,
                nodeOverlap: 20,
                padding: 30,
                randomize: false,
            };
            break;
        default:
            return;
    }

    cy.layout(layoutConfig).run();
}

// Reset graph to initial state
function resetGraph() {
    cy.nodes().removeClass('highlighted path-ancestor path-descendant dimmed search-match');
    cy.edges().removeClass('highlighted dimmed');
    cy.nodes().show();
    cy.edges().show();
    document.getElementById('search').value = '';
    document.getElementById('course-filter').value = 'all';
    hideDetailPanel();
    cy.fit(cy.nodes(), 50);
    updateVisibleCount();
}

// Update statistics
function updateStats() {
    document.getElementById('node-count').textContent = `${graphData.topics.length} topics`;
    document.getElementById('edge-count').textContent = `${graphData.edges.length} edges`;
    updateVisibleCount();
}

function updateVisibleCount() {
    const visible = cy.nodes(':visible').length;
    document.getElementById('visible-count').textContent = `${visible} visible`;
}

// Build legend
function buildLegend() {
    const legend = document.getElementById('legend');
    legend.innerHTML = '';

    graphData.courses.forEach(course => {
        if (course.name === 'Missing') return;

        const item = document.createElement('div');
        item.className = 'legend-item';

        const color = document.createElement('div');
        color.className = 'legend-color';
        color.style.backgroundColor = course.color;

        const label = document.createElement('span');
        label.textContent = course.name;

        item.appendChild(color);
        item.appendChild(label);
        legend.appendChild(item);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
