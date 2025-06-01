# Space Syntax Nova™: Analytical Functions and AI Integration

**Author**: Hatef Jafari Sharami
**App Version**: 1.9 &copy; 2025
**Application**: Academic and scientific use only. Commercial usage prohibited.

## Introduction

Space Syntax Nova is a spatial analysis application used to examine the visibility, connectivity, and structural efficiency of floor plans using advanced graph theory and geometric computation. This article outlines how core analysis functions like visibility, connectivity, complex nodes, and rendering operate, their mathematical and algorithmic basis in space syntax theory, and how they can be integrated with AI platforms like Google Colab for generative design and evaluation of floor plans.

Through this integration, architects, urban planners, and researchers can harness spatial syntax logic and machine learning to refine layout planning, simulate circulation patterns, and assess spatial qualities like openness, accessibility, and user navigation.

By automating the analysis of geometric space, Space Syntax Nova enables deeper insights into the relationship between built environments and human behavior. These insights are valuable not only for academic exploration but also for real-time design feedback and the creation of intelligent architectural solutions.

---

## 1. Core Analysis Functions and Theoretical Foundation

### 1.1 Visibility Analysis

**Theory:** Based on Visibility Graph Analysis (VGA), this measures how much of a space is visible from any point within a polygon. It derives from the isovist field — the set of all points visible from a given vantage point.

**JavaScript Snippet:**
This function determines if two line segments intersect, a core operation for checking visibility between points by ensuring no obstacles (polygon edges) lie in between them.

```javascript
function doLinesIntersect(p1, p2, p3, p4) {
  function ccw(a, b, c) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}
```

**Python Equivalent:**

```python
from shapely.geometry import LineString

def is_visible(p1, p2, walls):
    line = LineString([p1, p2])
    return not any(line.crosses(wall) for wall in walls)
```

### 1.2 Connectivity Analysis

**Theory:** Local connectivity in space syntax refers to the number of immediate neighbors reachable from a point without intersecting obstacles and within a fixed radius. It relates to spatial legibility and local movement potential.

**JavaScript Snippet:**
This snippet, part of the `generateConnectivityLines` function, iterates through grid points and adds a connection line if two points are within the maximum connection radius (e.g., 0.6m) and are mutually visible (not crossing any polygon edges).

```javascript
// From generateConnectivityLines function
function generateConnectivityLines() {
    // ... (logic to generate grid points 'pts') ...
    const maxDist = 0.6; // Assuming 0.6 meters for local connectivity
    connectivityLines = []; // Clear previous lines
    for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
            const p1 = pts[i];
            const p2 = pts[j];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y); // Calculate distance
            if (dist <= maxDist && !crossesAnyPolygonEdge(p1, p2)) { // Check distance and visibility
                connectivityLines.push([p1, p2]); // Add connection
            }
        }
    }
}
```

**Python Equivalent:**

```python
from math import hypot

def is_connected(p1, p2, walls, radius=0.6):
    return hypot(p2[0]-p1[0], p2[1]-p1[1]) <= radius and is_visible(p1, p2, walls)
```

### 1.3 Complex Nodes (Global Graph Construction)

**Theory:** Complex Nodes represent a full navigation graph, connecting all mutually visible points regardless of distance, producing a saturated structure for global analysis such as centrality and depth.

**JavaScript Snippet:**
This function, `generateConnections`, creates the "Complex Nodes" graph by iterating through all pairs of grid points within the main polygon and adding a connection (edge) if there are no obstacles between them, effectively building a comprehensive visibility graph.

```javascript
function generateConnections() {
    const mainPolygon = getLargestPolygon();
    if (!mainPolygon || mainPolygon.length < 3) {
        showMessageBox('Please draw at least one polygon first to generate complex nodes.');
        return;
    }

    // Clear previous analysis lines and states
    connections = [];
    visibilityLines = [];
    connectivityLines = [];
    showVisibility = false;
    showConnectivity = false;

    const points = generateGridPoints(mainPolygon);
    if (points.length === 0) {
        showMessageBox('No grid points generated. Ensure polygon is valid and visible.');
        return;
    }

    // Generate all-to-all visibility graph for complex nodes
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const p1 = points[i];
            const p2 = points[j];
            if (!crossesAnyPolygonEdge(p1, p2)) {
                // All mutually visible points form a connection
                connections.push([p1, p2]);
            }
        }
    }
    showMessageBox(`Generated ${connections.length} complex node connections.`);
    redraw(); // Redraw with new connections
}
```

**Python Graph Representation:**

```python
import networkx as nx
G = nx.Graph()
for i, pi in enumerate(points):
    for j, pj in enumerate(points):
        if i < j and is_visible(pi, pj, walls):
            G.add_edge(i, j, weight=hypot(pj[0]-pi[0], pj[1]-pi[1]))
```

### 1.4 Rendering and Heatmap Generation

**Theory:** Rendering computes a heatmap of visibility intensity per spatial cell. This simulates isovist density: the more lines pass through a cell, the more visually dominant it is.

**JavaScript Snippet:**
This code demonstrates the core logic within the `renderAnalysis` function where, after generating visibility lines, it iterates through them and samples points along each line. For every sampled point, it increments the `count` of the corresponding grid cell, effectively building the heatmap data.

```javascript
// Part of the renderAnalysis function after visibilityLines are generated
function renderAnalysis() {
    // ... (initial setup and generateVisibilityLines() call) ...

    // Initialize analysis grid and populate based on visibility lines
    analysisGrid = [];
    maxCrossingCount = 0;
    // ... (logic to define grid cells based on main polygon bounds) ...

    // Iterate over all visibility lines and mark intersected grid cells
    visibilityLines.forEach(line => {
        const p1 = line[0];
        const p2 = line[1];
        // Simplified sampling for demonstration
        const numSamples = 10; // For instance, 10 samples per line

        for (let i = 0; i <= numSamples; i++) {
            const t = numSamples === 0 ? 0.5 : i / numSamples;
            const sampleX = p1.x + t * (p2.x - p1.x);
            const sampleY = p1.y + t * (p2.y - p1.y);

            // Find which cell this sample point falls into and increment its count
            const gridX = Math.floor((sampleX - mainPolygonBounds.minX) / cellWidth); // Assuming bounds and cell dimensions are defined
            const gridY = Math.floor((sampleY - mainPolygonBounds.minY) / cellHeight);

            if (gridX >= 0 && gridX < gridResolution && gridY >= 0 && gridY < gridResolution) {
                const cellIndex = gridY * gridResolution + gridX;
                analysisGrid[cellIndex].count++;
                if (analysisGrid[cellIndex].count > maxCrossingCount) {
                    maxCrossingCount = analysisGrid[cellIndex].count;
                }
            }
        }
    });
    // ... (rest of the rendering logic to display heatmap) ...
}
```

**Python (NumPy Heatmap):**

```python
import numpy as np
heatmap = np.zeros((H, W))
for line in visibility_lines:
    for px, py in sample_line_pixels(line):
        heatmap[py, px] += 1
```

---

## 2. Integrating with AI (Google Colab + Python)

### Objective

To automate plan evaluation, prediction, and generation using ML on visibility/connectivity heatmaps. These integrations can form the core of generative architectural design workflows, where feedback loops from syntax analysis guide iterative improvements.

Machine learning models trained on syntactic spatial features can predict usability, navigability, or even aesthetic preferences based on underlying spatial logic. These models can support architects in exploring alternative spatial arrangements, correcting inefficiencies, and evaluating design quality before construction begins.

This kind of AI-assisted design allows not only for assessment but also for the creative generation of novel spatial layouts. For instance, a generative model can be conditioned on a set of visibility metrics to synthesize optimized floor plans. Reinforcement learning agents could use space syntax scores as rewards, gradually learning to produce spatial configurations with higher usability or clarity.

By embedding space syntax outputs such as visibility graphs and heatmaps into AI systems, the spatial behavior of humans can be modeled and optimized at scale. This synergy brings predictive intelligence into the design loop, promoting evidence-based architecture.

### Colab Instructions

Google Colab is an ideal platform to test and deploy AI models due to its ease of use and access to GPU/TPU acceleration. Using it in conjunction with Space Syntax Nova allows for direct analysis and experimentation on spatial layouts.

Each of the steps below represents a key stage in the data pipeline—from vector plan extraction to deep learning model training. Together, they form a replicable template for integrating syntax-based spatial reasoning into AI workflows.

#### Step 1: Upload & Convert SVG

```bash
!apt install librsvg2-bin  # Ensure rsvg-convert is available
!rsvg-convert -o plan.png space-syntax-nova-export.svg
```

This converts an exported vector SVG plan into a pixel-based PNG format, which simplifies processing with computer vision models.

#### Step 2: Load Image

```python
import cv2
from google.colab.patches import cv2_imshow
image = cv2.imread('plan.png', cv2.IMREAD_GRAYSCALE)
cv2_imshow(image)
```

Here, the image is read in grayscale, which is standard input for most CNN-based classifiers or segmentation models.

#### Step 3: Use Heatmap in ML

```python
from PIL import Image
import numpy as np
img = Image.open('heatmap.png').convert('L')
array = np.array(img) / 255.0  # Normalize for ML
```

Heatmaps from Space Syntax Nova can be fed into models directly, used as regression targets, or serve as conditioning inputs for design generation algorithms.

#### Step 4: Train Classifier / Regressor

```python
import tensorflow as tf
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(array.shape[0], array.shape[1], 1)),
    tf.keras.layers.Conv2D(32, 3, activation='relu'),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(1, activation='linear')  # Output score or classification
])
model.compile(optimizer='adam', loss='mse')
```

This simple convolutional neural network can evaluate or rank architectural plans based on metrics derived from spatial structure, such as visual integration, field density, or potential movement corridors.

---

## 3. Python Integration Example

For deeper analytical or experimental use, integrating the outputs of Space Syntax Nova into Python environments enables more granular control and customization. You can write scripts to analyze topological graphs, process polygons, or even simulate virtual agents navigating layouts.

This section presents essential operations for working with the exported `.ssn` files and leveraging them within traditional data science workflows.

### Load .ssn Data

```python
import json
with open('spacesyntax_map.ssn') as f:
    data = json.load(f)
polygons = data['allPolygons']
```

This JSON-based format retains all polygonal geometry and metadata, making it suitable for parsing into spatial graph models or design analysis frameworks.

### Compute Polygon Area (Shoelace Formula)

```python
def polygon_area(poly):
    return 0.5 * abs(sum(x*y_next - x_next*y for (x, y), (x_next, y_next) in zip(poly, poly[1:] + [poly[0]])))
```

Measuring the area of individual polygons enables filtering, classification, and massing studies across floor plans.

### Visibility Score (Mean Density)

```python
def visibility_score(grid):
    return np.mean([cell['count'] for cell in grid])
```

This function offers a scalar summary of spatial openness or dominance, often correlating with perceived comfort or navigability.

### Visibility Entropy

```python
def visibility_entropy(grid):
    from scipy.stats import entropy
    counts = [cell['count'] for cell in grid if cell['count'] > 0]
    return entropy(np.histogram(counts, bins=10)[0])
```

Entropy provides a measure of variation in visibility — high entropy may indicate balanced sightlines, while low entropy could signal visual bottlenecks.
These metrics can be used to train ML models, drive generative algorithms, or provide automated design diagnostics.

---

## Conclusion

Space Syntax Nova™ offers a powerful, research-grade platform that blends spatial theory with practical digital tools. It empowers designers and scientists to perform rigorous visibility and connectivity analysis and brings these metrics directly into the workflows of data-driven architecture and AI-driven spatial intelligence.

Through direct integration with Google Colab and Python environments, Nova supports rapid iteration, generative modeling, and algorithmic evaluation of spatial layouts. It can be used to train intelligent models that learn spatial features, optimize environments for human experience, and automate the critique and improvement of built forms.

The provided scripts, methods, and theoretical grounding make it an ideal foundation for both academic studies and real-world application in interior architecture, UX-driven floor planning, robotics navigation, and smart environment design.

---

For inquiries, improvements, or collaborations, please contact: hatef@sharami.me