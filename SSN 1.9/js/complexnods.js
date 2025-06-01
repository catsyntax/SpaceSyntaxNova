// New arrays for spatial visibility and connectivity lines
let visibilityLines = [];
let connectivityLines = [];

// Toggles for the new lines
let showVisibility = false;
let showConnectivity = false;

// Function to generate grid points inside the main polygon
function generateGridPoints(targetPolygon) {
  if (!targetPolygon || targetPolygon.length < 3) return [];
  const minX = Math.min(...targetPolygon.map(p => p.x));
  const maxX = Math.max(...targetPolygon.map(p => p.x));
  const minY = Math.min(...targetPolygon.map(p => p.y));
  const maxY = Math.max(...targetPolygon.map(p => p.y));
  const spacing = 0.5;
  const pts = [];
  for (let x = minX; x <= maxX; x += spacing) {
    for (let y = minY; y <= maxY; y += spacing) {
      const pt = { x, y };
      if (pointInPolygon(pt, targetPolygon)) pts.push(pt);
    }
  }
  return pts;
}

// Check if a line crosses ANY polygon edge (excluding touching endpoints)
function crossesAnyPolygonEdge(a, b) {
  for (const poly of allPolygons) {
    for (let i = 0; i < poly.length; i++) {
      const l1 = poly[i];
      const l2 = poly[(i + 1) % poly.length];
      
      // Exclude cases where a or b equals polygon vertex (allow endpoint touches)
      // This logic ensures lines that start/end exactly on a vertex don't count as intersecting
      const isEndpointOfSegment1 = (a.x === l1.x && a.y === l1.y) || (a.x === l2.x && a.y === l2.y);
      const isEndpointOfSegment2 = (b.x === l1.x && b.y === l1.y) || (b.x === l2.x && b.y === l2.y);

      if (isEndpointOfSegment1 && isEndpointOfSegment2) {
        continue; // Both points are endpoints of the same segment, not an intersection
      }

      if (doLinesIntersect(a, b, l1, l2)) {
        return true;
      }
    }
  }
  return false;
}

// Generate visibility lines (green)
function generateVisibilityLines() {
  visibilityLines = [];
  const mainPolygon = getLargestPolygon();
  if (!mainPolygon) {
    showMessageBox('Please draw at least one polygon first.');
    return;
  }
  const pts = generateGridPoints(mainPolygon);
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i];
      const b = pts[j];
      if (!crossesAnyPolygonEdge(a, b)) { // Check against all polygon edges
        visibilityLines.push([a, b]);
      }
    }
  }
}

// Generate connectivity lines (purple)
// Connect points within a distance threshold (0.6m)
function generateConnectivityLines() {
  connectivityLines = [];
  const mainPolygon = getLargestPolygon();
  if (!mainPolygon) {
    showMessageBox('Please draw at least one polygon first.');
    return;
  }
  const pts = generateGridPoints(mainPolygon);
  const maxDist = 0.6; // max distance for connectivity link
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i];
      const b = pts[j];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist <= maxDist && !crossesAnyPolygonEdge(a, b)) { // Check against all polygon edges
        connectivityLines.push([a, b]);
      }
    }
  }
}

// Draw visibility lines
function drawVisibilityLines() {
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)'; // Green with transparency
  ctx.lineWidth = 1.5 / transform.scale; // Slightly thicker lines for visibility
  visibilityLines.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
}

// Draw connectivity lines
function drawConnectivityLines() {
  ctx.strokeStyle = 'rgba(0, 0, 255, 1)'; // Purple with transparency
  ctx.lineWidth = 1.5 / transform.scale; // Slightly thicker lines for visibility
  connectivityLines.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
}

// Extend redraw to draw these lines if toggled on
const originalRedraw = redraw;
redraw = function(mouseWorld = null) {
  originalRedraw(mouseWorld);
  if (showVisibility) drawVisibilityLines();
  if (showConnectivity) drawConnectivityLines();
};

// Add these functions for toggling visibility/connectivity

function toggleVisibility() {
  if (allPolygons.length === 0) {
    showMessageBox('Please draw at least one polygon first.');
    return;
  }
  showVisibility = !showVisibility;
  if (showVisibility) {
    generateVisibilityLines();
    showConnectivity = false; // turn off connectivity if on
    connections = []; // turn off "Complex Nudes" if on
  } else {
    visibilityLines = []; // Clear lines when toggled off
  }
  redraw();
}

function toggleConnectivity() {
  if (allPolygons.length === 0) {
    showMessageBox('Please draw at least one polygon first.');
    return;
  }
  showConnectivity = !showConnectivity;
  if (showConnectivity) {
    generateConnectivityLines();
    showVisibility = false; // turn off visibility if on
    connections = []; // turn off "Complex Nudes" if on
  } else {
    connectivityLines = []; // Clear lines when toggled off
  }
  redraw();
}