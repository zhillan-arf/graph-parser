# Knowledge Graph - Data Resources

Source: https://www.justinmath.com/files/content-graph.html

## Overview

This document describes the data structure and content available from the JustinMath knowledge graph. The graph is a client-side application with all data embedded inline as JavaScript - there are no external APIs or JSON files.

---

## Data Architecture

### Rendering Technology
- **Library**: D3.js with Graphviz integration (`d3-graphviz`)
- **Graph Format**: DOT language markup generated dynamically from JavaScript objects
- **Rendering**: `d3.select("#graph").graphviz()` renders the graph

### Data Location
- **All data is inline** within a single `<script>` tag in the HTML
- No external JSON files or API endpoints
- Data is defined as JavaScript variable assignments

---

## Data Structures

### 1. Courses (Categories)

Courses define color-coded categories for organizing topics.

| ID | Name | Color (Hex) | Description |
|----|------|-------------|-------------|
| 1 | Missing | `gray` | Placeholder for topics without content |
| 2 | Algebra | `#f0c9ff` | Light purple |
| 3 | Calculus | `#bdffc8` | Light green |
| 4 | Linear Algebra | `#c9e4ff` | Light blue |
| 5 | Coding | `#ffe19c` | Light orange |
| 6 | Differential Equations | `#ffdbdb` | Light red/pink |
| 7 | Machine Learning | `#b0fff6` | Light cyan |
| 8 | Statistics | `#ffe19c` | Light orange |

### 2. Topics (Nodes)

Each topic represents a node in the knowledge graph.

**Topic Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | number | Auto-incremented unique identifier |
| `url` | string | URL slug (kebab-case), used for content page |
| `course` | Course | Reference to parent course (determines color) |
| `parents` | Topic[] | Array of prerequisite topics (defines edges) |
| `parentsById` | Map | Map of parent topic IDs |
| `name` | string | Display name (auto-generated from URL slug) |
| `style` | object | Visual styling properties |

**JavaScript Pattern:**
```javascript
let topicVariable = graph.addTopic('url-slug', courseReference, [parentTopic1, parentTopic2])
```

### 3. Edges (Dependencies)

Edges are implicitly defined by the `parents` array in each topic. Each parent relationship creates a directed edge from parent → child, representing prerequisite knowledge.

**Edge Format in DOT:**
```
"parent-topic-id" -> "child-topic-id"
```

---

## Content URLs

### URL Pattern
```
https://www.justinmath.com/{url-slug}
```

**Examples:**
- `https://www.justinmath.com/solving-linear-equations`
- `https://www.justinmath.com/slope-intercept-form`
- `https://www.justinmath.com/power-rule-for-derivatives`

### Display Name Transformation
URL slugs are converted to display names by:
1. Replacing hyphens with spaces
2. Capitalizing first letter of each word

Example: `solving-linear-equations` → `Solving Linear Equations`

### Content Loading
When a node is clicked:
1. Topic ID extracted from SVG element's title
2. `topic.updateInfoPanel()` called
3. Content loaded via iframe: `<iframe src="https://www.justinmath.com/{url-slug}">`

**Note:** Topics with course `Missing` (gray) may not have actual content at their URLs.

---

## Complete Topic List (115 Topics)

### Foundation (3 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `entrypoint` | Missing | [] |
| `arithmetic` | Missing | [entrypoint] |
| `geometry` | Missing | [arithmetic] |

### Introductory Python (7 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `introductory-python-strings-ints-floats-booleans` | Coding | [arithmetic] |
| `introductory-python-lists-dictionaries-arrays` | Coding | [introductory-python-strings-ints-floats-booleans] |
| `introductory-python-if-while-for` | Coding | [introductory-python-lists-dictionaries-arrays] |
| `introductory-python-functions` | Coding | [introductory-python-if-while-for] |
| `introductory-python-classes` | Missing | [introductory-python-functions] |
| `object-oriented-programming` | Missing | [introductory-python-classes] |
| `from-procedures-to-objects` | Coding | [object-oriented-programming] |

### Algebra - Linear Functions (11 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `solving-linear-equations` | Algebra | [arithmetic] |
| `slope-intercept-form` | Algebra | [solving-linear-equations] |
| `point-slope-form` | Algebra | [slope-intercept-form] |
| `standard-form-of-a-line` | Algebra | [slope-intercept-form] |
| `linear-systems` | Algebra | [slope-intercept-form] |
| `drawing-horizontal-and-vertical-lines` | Algebra | [slope-intercept-form, linear-inequalities-in-the-plane] |
| `drawing-slanted-lines` | Algebra | [drawing-horizontal-and-vertical-lines] |
| `linear-inequalities-in-the-number-line` | Algebra | [solving-linear-equations] |
| `linear-inequalities-in-the-plane` | Algebra | [linear-inequalities-in-the-number-line, slope-intercept-form] |
| `the-easiest-way-to-remember-closed-vs-open-interval-notation` | Algebra | [linear-inequalities-in-the-number-line] |
| `the-physics-behind-an-egg-drop-a-lively-story` | Algebra | [slope-intercept-form] |

### Algebra - Quadratic Functions (13 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `standard-form-of-a-quadratic-equation` | Algebra | [slope-intercept-form] |
| `factoring-quadratic-equations` | Algebra | [standard-form-of-a-quadratic-equation] |
| `quadratic-formula` | Algebra | [factoring-quadratic-equations] |
| `completing-the-square` | Algebra | [quadratic-formula] |
| `vertex-form` | Algebra | [point-slope-form, completing-the-square] |
| `quadratic-systems` | Algebra | [linear-systems, quadratic-formula] |
| `quadratic-inequalities` | Algebra | [vertex-form, linear-inequalities-in-the-plane] |
| `systems-of-inequalities` | Algebra | [linear-systems, vertex-form] |
| `drawing-absolute-value` | Algebra | [drawing-slanted-lines, absolute-value, vertex-form] |
| `drawing-parabolas` | Algebra | [drawing-slanted-lines, vertex-form] |
| `drawing-roots` | Algebra | [drawing-parabolas, reflections-of-functions] |
| `absolute-value` | Algebra | [quadratic-formula] |
| `building-an-iron-man-suit-a-physics-workbook` | Algebra | [the-physics-behind-an-egg-drop-a-lively-story] |

### Algebra - Polynomial Functions (8 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `standard-form-and-end-behavior-of-polynomials` | Algebra | [standard-form-of-a-quadratic-equation] |
| `zeros-of-polynomials` | Algebra | [quadratic-formula] |
| `rational-roots-and-synthetic-division` | Algebra | [zeros-of-polynomials] |
| `sketching-graphs-of-polynomials` | Algebra | [factoring-quadratic-equations, zeros-of-polynomials] |
| `polynomial-long-division` | Algebra | [rational-roots-and-synthetic-division] |
| `horizontal-asymptotes-of-rational-functions` | Algebra | [standard-form-and-end-behavior-of-polynomials] |
| `vertical-asymptotes-of-rational-functions` | Algebra | [factoring-quadratic-equations, horizontal-asymptotes-of-rational-functions] |
| `graphing-rational-functions-with-horizontal-and-vertical-asymptotes` | Algebra | [vertical-asymptotes-of-rational-functions] |

### Algebra - Advanced Functions (9 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `graphing-rational-functions-with-slant-and-polynomial-asymptotes` | Algebra | [polynomial-long-division, graphing-rational-functions-with-horizontal-and-vertical-asymptotes] |
| `radical-functions` | Algebra | [rational-roots-and-synthetic-division] |
| `exponential-and-logarithmic-functions` | Algebra | [slope-intercept-form] |
| `trigonometric-functions` | Algebra | [slope-intercept-form, geometry] |
| `piecewise-functions` | Algebra | [standard-form-of-a-quadratic-equation, exponential-and-logarithmic-functions, absolute-value, trigonometric-functions] |
| `shifts-of-functions` | Algebra | [vertex-form, radical-functions] |
| `rescalings-of-functions` | Algebra | [trigonometric-functions, shifts-of-functions] |
| `reflections-of-functions` | Algebra | [rescalings-of-functions] |
| `inverse-functions` | Algebra | [graphing-rational-functions-with-horizontal-and-vertical-asymptotes, radical-functions, exponential-and-logarithmic-functions, absolute-value] |

### Algebra - Compositions & Intuition (6 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `compositions-of-functions` | Algebra | [trigonometric-functions, inverse-functions] |
| `parametric-equations` | Missing | [compositions-of-functions] |
| `intuiting-functions` | Algebra | [slope-intercept-form] |
| `intuiting-sequences` | Algebra | [slope-intercept-form] |
| `intuiting-series` | Algebra | [intuiting-sequences] |
| `thales-theorem` | Algebra | [geometry, quadratic-formula] |

### Algebra - Graphing Calculator Drawing (6 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `drawing-shading-with-sine` | Algebra | [trigonometric-functions] |
| `drawing-euclidean-ellipses` | Algebra | [drawing-shading-with-sine, absolute-value] |
| `drawing-non-euclidean-ellipses` | Algebra | [drawing-euclidean-ellipses] |
| `drawing-rotation` | Algebra | [drawing-non-euclidean-ellipses] |
| `drawing-lissajous-curves` | Algebra | [trigonometric-functions, parametric-equations] |
| `drawing-composition-waves-implicit-trig-patterns` | Algebra | [trigonometric-functions] |

### Calculus - Limits & Derivatives (12 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `intuiting-limits` | Calculus | [intuiting-functions, absolute-value] |
| `intuiting-derivatives` | Calculus | [intuiting-limits] |
| `intuiting-integrals` | Calculus | [intuiting-derivatives] |
| `evaluating-limits` | Calculus | [piecewise-functions, vertical-asymptotes-of-rational-functions, intuiting-limits] |
| `limits-by-logarithms-squeeze-theorem-and-eulers-constant` | Calculus | [evaluating-limits, linear-inequalities-in-the-number-line] |
| `derivatives-and-the-difference-quotient` | Calculus | [evaluating-limits, intuiting-derivatives] |
| `power-rule-for-derivatives` | Calculus | [derivatives-and-the-difference-quotient] |
| `chain-rule` | Calculus | [power-rule-for-derivatives, compositions-of-functions] |
| `properties-of-derivatives` | Calculus | [chain-rule] |
| `derivatives-of-non-polynomial-functions` | Calculus | [properties-of-derivatives] |
| `finding-local-extrema` | Calculus | [derivatives-of-non-polynomial-functions] |
| `differentials-and-approximation` | Calculus | [derivatives-of-non-polynomial-functions, point-slope-form] |

### Calculus - Integration (8 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `antiderivatives` | Calculus | [derivatives-of-non-polynomial-functions] |
| `finding-area-using-integrals` | Calculus | [antiderivatives, intuiting-integrals] |
| `integration-by-substitution` | Calculus | [antiderivatives] |
| `integration-by-parts` | Calculus | [integration-by-substitution] |
| `improper-integrals` | Calculus | [finding-area-using-integrals, integration-by-substitution] |
| `separation-of-variables` | Differential Equations | [integration-by-substitution] |
| `lhopitals-rule` | Calculus | [derivatives-of-non-polynomial-functions] |

### Calculus - Series (6 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `geometric-series` | Calculus | [evaluating-limits, intuiting-series] |
| `tests-for-convergence` | Calculus | [geometric-series, improper-integrals] |
| `taylor-series` | Calculus | [tests-for-convergence] |
| `manipulating-taylor-series` | Calculus | [taylor-series] |
| `but-where-do-the-taylor-series-and-lagrange-error-bound-even-come-from` | Calculus | [taylor-series] |
| `trick-to-apply-the-chain-rule-fast-peeling-the-onion` | Calculus | [chain-rule] |

### Differential Equations (9 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `slope-fields-and-euler-approximation` | Differential Equations | [differentials-and-approximation, separation-of-variables] |
| `solving-differential-equations-by-substitution` | Differential Equations | [separation-of-variables] |
| `characteristic-polynomial-of-a-differential-equation` | Differential Equations | [zeros-of-polynomials, separation-of-variables, reflections-of-functions] |
| `undetermined-coefficients` | Differential Equations | [characteristic-polynomial-of-a-differential-equation, linear-systems] |
| `integrating-factors` | Differential Equations | [separation-of-variables] |
| `variation-of-parameters` | Differential Equations | [undetermined-coefficients] |
| `solving-differential-equations-with-taylor-series` | Differential Equations | [taylor-series, separation-of-variables] |
| `matrix-exponential-and-systems-of-linear-differential-equations` | Differential Equations | [generalized-eigenvectors-and-jordan-form, taylor-series, characteristic-polynomial-of-a-differential-equation] |
| `higher-order-variation-of-parameters` | Differential Equations | [variation-of-parameters, shearing-cramers-rule-and-volume-by-reduction] |

### Multivariable Calculus (4 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `partial-derivatives-and-the-gradient-vector` | Missing | [finding-local-extrema, lines-and-planes] |
| `iterated-integrals` | Missing | [improper-integrals, partial-derivatives-and-the-gradient-vector] |
| `when-can-you-manipulate-differentials-like-fractions` | Calculus | [partial-derivatives-and-the-gradient-vector] |
| `path-dependency-in-multivariable-limits` | Calculus | [intuiting-limits, parametric-equations] |

### Calculus Applications (12 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `applications-of-calculus-cardiac-output` | Calculus | [finding-area-using-integrals] |
| `applications-of-calculus-understanding-plaque-buildup` | Calculus | [finding-area-using-integrals] |
| `applications-of-calculus-modeling-tumor-growth` | Calculus | [separation-of-variables] |
| `applications-of-calculus-rocket-propulsion` | Calculus | [separation-of-variables, differentials-and-approximation, the-physics-behind-an-egg-drop-a-lively-story] |
| `applications-of-calculus-rendering-3d-computer-graphics` | Calculus | [finding-area-using-integrals] |
| `applications-of-calculus-physics-engines-in-video-games` | Calculus | [slope-fields-and-euler-approximation, parametric-equations, the-physics-behind-an-egg-drop-a-lively-story] |
| `applications-of-calculus-optimization-via-gradient-descent` | Calculus | [finding-local-extrema] |
| `applications-of-calculus-maximizing-profit` | Calculus | [finding-local-extrema] |
| `applications-of-calculus-continuously-compounded-interest` | Calculus | [limits-by-logarithms-squeeze-theorem-and-eulers-constant] |
| `applications-of-calculus-a-failure-of-intuition` | Calculus | [intuiting-limits] |
| `applications-of-calculus-derivatives-in-string-art` | Calculus | [derivatives-and-the-difference-quotient] |
| `applications-of-calculus-calculating-the-horsepower-of-an-offensive-lineman` | Calculus | [antiderivatives, the-physics-behind-an-egg-drop-a-lively-story] |

### Calculus History (2 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `history-of-calculus-the-man-who-broke-math` | Calculus | [taylor-series] |
| `history-of-calculus-the-newton-leibniz-controversy` | Calculus | [derivatives-and-the-difference-quotient] |

### Linear Algebra (15 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `n-dimensional-space` | Linear Algebra | [radical-functions, absolute-value, geometry] |
| `dot-product-and-cross-product` | Linear Algebra | [n-dimensional-space, trigonometric-functions] |
| `lines-and-planes` | Linear Algebra | [dot-product-and-cross-product] |
| `span-subspaces-and-reduction` | Linear Algebra | [lines-and-planes] |
| `elimination-as-vector-reduction` | Linear Algebra | [span-subspaces-and-reduction, linear-systems] |
| `n-dimensional-volume-formula` | Linear Algebra | [dot-product-and-cross-product] |
| `volume-as-the-determinant-of-a-square-linear-system` | Linear Algebra | [span-subspaces-and-reduction, n-dimensional-volume-formula] |
| `shearing-cramers-rule-and-volume-by-reduction` | Linear Algebra | [volume-as-the-determinant-of-a-square-linear-system, linear-systems] |
| `linear-systems-as-transformations-of-vectors-by-matrices` | Linear Algebra | [span-subspaces-and-reduction] |
| `matrix-multiplication` | Linear Algebra | [linear-systems-as-transformations-of-vectors-by-matrices] |
| `rescaling-shearing-and-the-determinant` | Linear Algebra | [matrix-multiplication, shearing-cramers-rule-and-volume-by-reduction] |
| `inverse-matrices` | Linear Algebra | [rescaling-shearing-and-the-determinant, inverse-functions] |
| `eigenvalues-eigenvectors-and-diagonalization` | Linear Algebra | [inverse-matrices] |
| `generalized-eigenvectors-and-jordan-form` | Linear Algebra | [eigenvalues-eigenvectors-and-diagonalization] |
| `recursive-sequence-formulas-via-diagonalization` | Linear Algebra | [eigenvalues-eigenvectors-and-diagonalization, intuiting-sequences] |

### AI Primer (5 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `what-is-ai` | Machine Learning | [entrypoint] |
| `the-first-wave-of-ai-reasoning-as-search` | Machine Learning | [what-is-ai] |
| `the-second-wave-of-ai-expert-systems` | Machine Learning | [the-first-wave-of-ai-reasoning-as-search] |
| `the-third-wave-of-ai-computation-power-and-neural-networks` | Machine Learning | [the-second-wave-of-ai-expert-systems] |
| `cutting-through-the-hype-of-ai` | Machine Learning | [the-third-wave-of-ai-computation-power-and-neural-networks] |

### Introductory Coding Exercises (8 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `some-short-introductory-coding-exercises` | Coding | [introductory-python-functions] |
| `converting-between-binary-decimal-and-hexadecimal` | Coding | [some-short-introductory-coding-exercises, exponential-and-logarithmic-functions] |
| `recursive-sequences` | Coding | [some-short-introductory-coding-exercises, intuiting-sequences] |
| `simulating-coin-flips` | Coding | [some-short-introductory-coding-exercises, probability-mass] |
| `implementing-cartesian-product` | Coding | [some-short-introductory-coding-exercises] |
| `brute-force-search-with-linear-encoding-cryptography` | Coding | [some-short-introductory-coding-exercises, inverse-functions] |
| `solving-magic-squares-via-backtracking` | Coding | [brute-force-search-with-linear-encoding-cryptography] |
| `estimating-roots-via-bisection-search-and-newton-raphson-method` | Coding | [some-short-introductory-coding-exercises, differentials-and-approximation] |

### Sorting & Data Structures (5 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `selection-bubble-insertion-and-counting-sort` | Coding | [some-short-introductory-coding-exercises] |
| `merge-sort-and-quicksort` | Coding | [selection-bubble-insertion-and-counting-sort, recursive-sequences] |
| `hash-tables` | Coding | [basic-matrix-arithmetic] |
| `breadth-first-and-depth-first-traversals` | Coding | [basic-matrix-arithmetic] |
| `distance-and-shortest-paths-in-unweighted-graphs` | Coding | [breadth-first-and-depth-first-traversals] |

### Graph Algorithms (1 topic)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `dijkstras-algorithm-for-distance-and-shortest-paths-in-weighted-graphs` | Coding | [distance-and-shortest-paths-in-unweighted-graphs] |

### Matrix & Optimization (3 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `basic-matrix-arithmetic` | Coding | [matrix-multiplication, intuiting-sequences, introductory-python-classes] |
| `reduced-row-echelon-form-and-applications-to-matrix-arithmetic` | Coding | [inverse-matrices, basic-matrix-arithmetic] |
| `simplex-method` | Coding | [reduced-row-echelon-form-and-applications-to-matrix-arithmetic, linear-inequalities-in-the-plane] |

### Gradient Descent (2 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `single-variable-gradient-descent` | Machine Learning | [some-short-introductory-coding-exercises, applications-of-calculus-optimization-via-gradient-descent] |
| `multivariable-gradient-descent` | Machine Learning | [single-variable-gradient-descent, partial-derivatives-and-the-gradient-vector] |

### ML - Regression (6 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `linear-polynomial-and-multiple-linear-regression-via-pseudoinverse` | Machine Learning | [reduced-row-echelon-form-and-applications-to-matrix-arithmetic] |
| `regressing-a-linear-combination-of-nonlinear-functions-via-pseudoinverse` | Machine Learning | [linear-polynomial-and-multiple-linear-regression-via-pseudoinverse] |
| `power-exponential-and-logistic-regression-via-pseudoinverse` | Machine Learning | [regressing-a-linear-combination-of-nonlinear-functions-via-pseudoinverse] |
| `regression-via-gradient-descent` | Machine Learning | [power-exponential-and-logistic-regression-via-pseudoinverse, multivariable-gradient-descent] |
| `multiple-regression-and-interaction-terms` | Machine Learning | [linear-polynomial-and-multiple-linear-regression-via-pseudoinverse] |
| `overfitting-underfitting-cross-validation-and-the-bias-variance-tradeoff` | Machine Learning | [linear-polynomial-and-multiple-linear-regression-via-pseudoinverse] |

### ML - Classification & Clustering (4 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `k-means-clustering` | Machine Learning | [basic-matrix-arithmetic] |
| `k-nearest-neighbors` | Machine Learning | [overfitting-underfitting-cross-validation-and-the-bias-variance-tradeoff] |
| `naive-bayes` | Machine Learning | [probability-mass, k-nearest-neighbors] |
| `decision-trees` | Machine Learning | [k-nearest-neighbors, breadth-first-and-depth-first-traversals, the-second-wave-of-ai-expert-systems] |

### Neural Networks (5 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `introduction-to-neural-network-regressors` | Machine Learning | [power-exponential-and-logistic-regression-via-pseudoinverse, multiple-regression-and-interaction-terms, reflections-of-functions, the-third-wave-of-ai-computation-power-and-neural-networks] |
| `backpropagation` | Machine Learning | [introduction-to-neural-network-regressors, multivariable-gradient-descent] |
| `introduction-to-blondie24-and-neuroevolution` | Machine Learning | [backpropagation] |
| `reimplementing-fogels-tic-tac-toe-paper` | Machine Learning | [introduction-to-blondie24-and-neuroevolution] |
| `reimplementing-blondie24` | Machine Learning | [reimplementing-fogels-tic-tac-toe-paper, reduced-search-depth-and-heuristic-evaluation-for-connect-four] |

### Game AI (5 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `implementing-tic-tac-toe-and-connect-four` | Coding | [basic-matrix-arithmetic] |
| `canonical-and-reduced-game-trees-for-tic-tac-toe` | Coding | [decision-trees, implementing-tic-tac-toe-and-connect-four] |
| `minimax-strategy` | Coding | [canonical-and-reduced-game-trees-for-tic-tac-toe] |
| `reduced-search-depth-and-heuristic-evaluation-for-connect-four` | Coding | [minimax-strategy] |
| `reimplementing-blondie24-convolutional-version` | Machine Learning | [reimplementing-blondie24] |

### Scientific Simulation (4 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `implementing-euler-estimation` | Coding | [slope-fields-and-euler-approximation, basic-matrix-arithmetic] |
| `sir-model-for-the-spread-of-disease` | Coding | [implementing-euler-estimation] |
| `hodgkin-huxley-model-of-action-potentials-in-neurons` | Coding | [sir-model-for-the-spread-of-disease] |
| `a-brief-overview-of-stdp-learning-during-neural-simulation` | Coding | [hodgkin-huxley-model-of-action-potentials-in-neurons, breadth-first-and-depth-first-traversals] |

### Topological Data Analysis (6 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `intuiting-the-mapper-algorithm` | Machine Learning | [k-means-clustering] |
| `mapper-software-demonstration-of-tdamapper` | Machine Learning | [intuiting-the-mapper-algorithm] |
| `mapper-use-cases-at-ayasdi` | Machine Learning | [mapper-software-demonstration-of-tdamapper] |
| `mapper-use-cases-at-aunalytics` | Machine Learning | [mapper-software-demonstration-of-tdamapper] |
| `intuiting-persistent-homology` | Machine Learning | [n-dimensional-space] |
| `persistent-homology-software-demonstration-of-tda` | Machine Learning | [intuiting-persistent-homology] |

### Misc ML (3 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `solving-tower-of-hanoi-with-general-problem-solver` | Machine Learning | [introductory-python-functions, the-first-wave-of-ai-reasoning-as-search] |
| `subtle-things-to-watch-out-for-when-demonstrating-lp-norm-regularization-on-a-high-degree-polynomial-regression-model` | Machine Learning | [regression-via-gradient-descent, overfitting-underfitting-cross-validation-and-the-bias-variance-tradeoff] |
| `intuiting-adversarial-examples-in-neural-networks-via-a-simple-computational-experiment` | Machine Learning | [backpropagation, overfitting-underfitting-cross-validation-and-the-bias-variance-tradeoff] |

### Statistics (4 topics)
| URL Slug | Course | Parents |
|----------|--------|---------|
| `probability-mass` | Missing | [piecewise-functions] |
| `probability-density` | Missing | [probability-mass, iterated-integrals] |
| `bayesian-inference` | Missing | [probability-density] |
| `estimating-a-visitation-interval` | Statistics | [bayesian-inference] |

---

## Scraping Strategy

### Data to Extract

1. **Graph Structure (from HTML/JS)**
   - Parse the inline JavaScript to extract:
     - Course definitions (id, name, color)
     - Topic definitions (url, course, parents)
   - This gives us the complete node and edge data

2. **Content Pages (from individual URLs)**
   - For each topic URL slug, fetch: `https://www.justinmath.com/{url-slug}`
   - Extract the main content from each page
   - Note: Topics with `Missing` course may return 404 or empty content

### Recommended Approach

```
1. Fetch content-graph.html
2. Parse <script> tag to extract JavaScript
3. Use regex or AST parsing to extract:
   - Course definitions
   - graph.addTopic() calls
4. Build node list and edge list from parsed data
5. For each topic URL:
   - Fetch https://www.justinmath.com/{url-slug}
   - Extract page content (title, body text, any embedded media)
   - Store content associated with topic ID
```

### Data Storage Schema

**Courses Table:**
```
id: number (primary key)
name: string
color: string (hex code)
```

**Topics Table:**
```
id: number (primary key)
url_slug: string (unique)
display_name: string
course_id: number (foreign key)
content_html: text (nullable)
content_text: text (nullable)
has_content: boolean
```

**Edges Table:**
```
id: number (primary key)
parent_topic_id: number (foreign key)
child_topic_id: number (foreign key)
```

---

## Technical Notes

- The graph uses D3.js v5+ with d3-graphviz extension
- DOT markup is generated client-side via `graph.getNodesMarkup()` and `graph.getEdgesMarkup()`
- Node styling (colors, shapes) is applied via the `Styler` class
- Click interactions handled by extracting topic ID from SVG `<title>` elements
- Learning path highlighting traverses ancestor chain via `topic.yieldAncestors()`
