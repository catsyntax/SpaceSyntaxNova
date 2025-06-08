
function getCenterOfPolygons(polygons) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    polygons.forEach(polygon => {
        polygon.points.forEach(pt => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
        });
    });

    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
    };
}


let history = [];
let historyPointer = -1;
const MAX_HISTORY_STATES = 50; // Limit history to prevent excessive memory use

document.addEventListener('DOMContentLoaded', () => {
  saveState();
});

const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');
const statsDisplay = document.getElementById('stats-display');

let isDrawing = false;
let currentLine = []; // Points for the polygon currently being drawn
let drawingHistory = []; // Temporary history for current drawing points
let allPolygons = []; // Array to store all completed polygons
let connections = []; // For "Complex Nudes"

let selectedPolygonIndex = -1; // New: Index of the currently selected polygon
let isSelectionMode = false;
let selectionBox = null; // { x1, y1, x2, y2 }

let showLengths = true; // New state variable, true by default

const transform = {
  scale: 100, // pixels per meter
  offsetX: 0,
  offsetY: 0
};

let isPanning = false;
let panStart = { x: 0, y: 0 };
let panOffsetStart = { x: 0, y: 0 };

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  if (!isPanning) { // Only recenter if not panning
    transform.offsetX = canvas.width / 2;
    transform.offsetY = canvas.height / 2;
  }
  redraw();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function worldToScreen(pt) {
  return {
    x: pt.x * transform.scale + transform.offsetX,
    y: pt.y * transform.scale + transform.offsetY
  };
}

function screenToWorld(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left - transform.offsetX) / transform.scale,
    y: (evt.clientY - rect.top - transform.offsetY) / transform.scale
  };
}

// Snap a point to the nearest grid coordinate (default 0.1 units)
function snapToGrid(pt, gridSize = 0.1) {
  return {
    x: Math.round(pt.x / gridSize) * gridSize,
    y: Math.round(pt.y / gridSize) * gridSize
  };
}

function drawGrid() {
  const step = 0.1;
  const bounds = {
    left: -transform.offsetX / transform.scale,
    top: -transform.offsetY / transform.scale,
    right: (canvas.width - transform.offsetX) / transform.scale,
    bottom: (canvas.height - transform.offsetY) / transform.scale,
  };

  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1 / transform.scale;

  for (let x = Math.floor(bounds.left); x < bounds.right; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, bounds.top);
    ctx.lineTo(x, bounds.bottom);
    ctx.stroke();
  }

  for (let y = Math.floor(bounds.top); y < bounds.bottom; y += step) {
    ctx.beginPath();
    ctx.moveTo(bounds.left, y);
    ctx.lineTo(bounds.right, y);
    ctx.stroke();
  }
}

// Helper function to calculate the centroid of a polygon (already provided)
function calculatePolygonCentroid(poly) {
    let centerX = 0;
    let centerY = 0;
    for (const point of poly) {
        centerX += point.x;
        centerY += point.y;
    }
    return {
        x: centerX / poly.length,
        y: centerY / poly.length
    };
}

// NEW: Helper function to find the lowest Y coordinate of a polygon
function getLowestPointY(poly) {
    let lowestY = -Infinity; // Initialize with a very small number
    for (const point of poly) {
        if (point.y > lowestY) { // Assuming Y increases downwards
            lowestY = point.y;
        }
    }
    return lowestY;
}

function drawPolygon(poly, color = 'red', index = -1) {
    if (poly.length < 2) return;

    ctx.strokeStyle = (index === selectedPolygonIndex) ? 'blue' : color;
    ctx.lineWidth = 2 / transform.scale;

    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Add polygon number (1-based index)
    if (index !== -1) {
        const centroid = calculatePolygonCentroid(poly); // Still use centroid X for horizontal centering
        const lowestY = getLowestPointY(poly); // Get the lowest Y of the polygon

        // Create a point at the lowest Y, using centroid's X for horizontal positioning
        const textWorldPosition = { x: centroid.x, y: lowestY };
        const screenTextPosition = worldToScreen(textWorldPosition);

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation for text

        ctx.fillStyle = 'grey';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'right';
        // Set textBaseline to 'top' so the text starts *below* the calculated point.
        ctx.textBaseline = 'top';

        // Add a small offset to the y-coordinate to create a gap between polygon and text
        const yOffsetPixels = 5; // Adjust this value as needed for desired spacing

        ctx.fillText((index + 1).toString(), screenTextPosition.x, screenTextPosition.y + yOffsetPixels);
        ctx.restore();
    }
    if (showLengths) { // Only draw lengths if showLengths is true
        drawLengths(poly);
    }
}

// Draw lengths next to each polygon line segment
function drawLengths(poly) {
    if (poly.length < 2) return;
    ctx.fillStyle = 'black';
    ctx.font = `${12 / transform.scale}px Arial`;
    ctx.textBaseline = 'middle';

    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const len = Math.hypot(b.x - a.x, b.y - a.y).toFixed(2);

        // Offset the text perpendicular to the line for clarity
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.hypot(dx, dy);
        const normX = -dy / length;
        const normY = dx / length;
        const offset = 0.05; // 5 cm offset

        const textX = midX + normX * offset;
        const textY = midY + normY * offset;

        ctx.fillText(`${len} m`, textX, textY);
    }
}

// Draw lengths for current drawing line segments and the preview segment
function drawCurrent(mousePt = null) {
    if (currentLine.length === 0) return;

    ctx.strokeStyle = 'rgba(0, 0, 255, 1)';
    ctx.lineWidth = 1.5 / transform.scale;

    ctx.beginPath();
    ctx.moveTo(currentLine[0].x, currentLine[0].y);
    for (let pt of currentLine.slice(1)) {
        ctx.lineTo(pt.x, pt.y);
    }
    
    if (mousePt) {
        const last = currentLine[currentLine.length - 1];
        if (mousePt.x !== last.x || mousePt.y !== last.y) {
            ctx.lineTo(mousePt.x, mousePt.y);
        }
    }
    
    ctx.stroke();

    if (showLengths) { // Only draw lengths if showLengths is true
        ctx.fillStyle = 'black';
        ctx.font = `${12 / transform.scale}px Arial`;
        ctx.textBaseline = 'middle';

        // Draw lengths for each segment
        for (let i = 0; i < currentLine.length - 1; i++) {
            const a = currentLine[i];
            const b = currentLine[i + 1];
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const len = Math.hypot(b.x - a.x, b.y - a.y).toFixed(2);

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const length = Math.hypot(dx, dy);
            const normX = -dy / length;
            const normY = dx / length;
            const offset = 0.05;

            const textX = midX + normX * offset;
            const textY = midY + normY * offset;

            ctx.fillText(`${len} m`, textX, textY);
        }

        // Draw length for preview segment if mousePt exists
        if (mousePt && currentLine.length > 0) {
            const last = currentLine[currentLine.length - 1];
            const len = Math.hypot(mousePt.x - last.x, mousePt.y - last.y).toFixed(2);
            ctx.fillText(`${len} m`, mousePt.x + 0.1, mousePt.y - 0.1);
        }
    }
}

function drawConnections() {
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.01)'; // Blue with 1% opacity
  ctx.lineWidth = (1 / transform.scale) * 0.01; // Very thin line
  connections.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
}

function redraw(mouseWorld = null) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.offsetX, transform.offsetY);

  drawGrid();
  
  // Draw all completed polygons
  allPolygons.forEach((poly, index) => { // Pass index to drawPolygon
    drawPolygon(poly, 'rgba(255,0,0,1)', index);
  });

  drawCurrent(mouseWorld);
  drawConnections();

  
  if (isSelectionMode && selectionBox) {
    const screenStart = worldToScreen({ x: selectionBox.x1, y: selectionBox.y1 });
    const screenEnd = worldToScreen({ x: selectionBox.x2, y: selectionBox.y2 });

    const left = Math.min(screenStart.x, screenEnd.x);
    const top = Math.min(screenStart.y, screenEnd.y);
    const width = Math.abs(screenEnd.x - screenStart.x);
    const height = Math.abs(screenEnd.y - screenStart.y);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(left, top, width, height);
    ctx.restore();
  }

  updateStats();
}

// Polygon area calculation (Shoelace formula)
function polygonArea(poly) {
  let area = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(area / 2);
}

// Perimeter calculation
function polygonPerimeter(poly) {
  let perimeter = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += Math.hypot(poly[j].x - poly[i].x, poly[j].y - poly[i].y);
  }
  return perimeter;
}

// Function to find the largest polygon by area
function getLargestPolygon() {
  if (allPolygons.length === 0) return null;
  let largestArea = -1;
  let largestPoly = null;
  allPolygons.forEach(poly => {
    const area = polygonArea(poly);
    if (area > largestArea) {
      largestArea = area;
      largestPoly = poly;
    }
  });
  return largestPoly;
}

function updateStats() {
  let statsText = '';

  if (isSelectionMode) return;
  if (isDrawing) {
    const edges = currentLine.length > 1 ? currentLine.length - 1 : 0;
    let perimeter = 0;
    for (let i = 0; i < currentLine.length - 1; i++) {
      perimeter += Math.hypot(currentLine[i+1].x - currentLine[i].x, currentLine[i+1].y - currentLine[i].y);
    }
    statsText += `Drawing: Edges: ${edges}, Perimeter: ${perimeter.toFixed(2)} m | `;
  }

  const largestPoly = getLargestPolygon();
  if (largestPoly) {
    const edges = largestPoly.length;
    const perimeter = polygonPerimeter(largestPoly);
    const area = polygonArea(largestPoly);
    if (largestPoly) {
    const index = allPolygons.findIndex(p => p === largestPoly);
    const perimeter = polygonPerimeter(largestPoly);
    const area = polygonArea(largestPoly);
    statsText += `Largest Polygon: Polygon Number ${index + 1} (Perimeter: ${perimeter.toFixed(2)} m, Area: ${area.toFixed(2)} m²)`;
  }
  } else if (allPolygons.length > 0) {
    // If no single "largest" is highlighted, but there are polygons
    statsText += `Number of Polygons: ${allPolygons.length}. `;
  }
  if (selectedPolygonIndex !== -1 && allPolygons[selectedPolygonIndex]) {
    statsText += ` | Selected: Polygon ${selectedPolygonIndex + 1}.`;
  }


  statsDisplay.textContent = statsText.trim();
}

// Close polygon on double-click or when clicking near the start point (0.06m radius)
canvas.addEventListener('dblclick', () => {
    if (!isDrawing || isSelectionMode) return;
    if (currentLine.length >= 3) {
        saveState(); // Save state before closing the polygon (this is a global action)
        allPolygons.push([...currentLine]);
        updatePolygonListUI();
        currentLine = [];
        drawingHistory = []; // Clear drawing history when polygon is complete
        isDrawing = false;
        canvas.style.cursor = 'grab';
        selectedPolygonIndex = -1;
        selectedPolygonsIndices = []; // Clear multi-selection
        redraw();
    }
});

canvas.addEventListener('click', (e) => {
  if (isSelectionMode) return;
  if (isDrawing) {
    const pt = screenToWorld(e);
    const snappedPt = snapToGrid(pt);

    // If close enough to the first point, close polygon
    if (currentLine.length >= 3) {
      const start = currentLine[0];
      const distToStart = Math.hypot(snappedPt.x - start.x, snappedPt.y - start.y);
      if (distToStart <= 0.06) {
        saveState(); // Save state before closing the polygon (this is a global action)
        allPolygons.push([...currentLine]); // Add to allPolygons
        updatePolygonListUI();
        currentLine = [];
        drawingHistory = []; // Clear drawing history when polygon is complete
        isDrawing = false;
        canvas.style.cursor = 'grab';
        selectedPolygonIndex = -1; // Deselect after drawing new polygon
        redraw();
        return;
      }
    }

    currentLine.push(snappedPt);
    drawingHistory.push([...currentLine]); // Save currentLine state to drawing history
    redraw();
  } else {
    // Handle polygon selection
    const clickPt = screenToWorld(e);
    selectedPolygonIndex = -1; // Deselect by default

    // Iterate in reverse to select the topmost (last drawn) overlapping polygon
    for (let i = allPolygons.length - 1; i >= 0; i--) {
      if (pointInPolygon(clickPt, allPolygons[i])) {
        selectedPolygonIndex = i;
        break; // Found a polygon, select it and stop
      }
    }
    redraw(); // Redraw to show selection highlight
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isSelectionMode && selectionBox) {
    const pt = screenToWorld(e);
    selectionBox.x2 = pt.x;
    selectionBox.y2 = pt.y;
    redraw();
    return;
  }
  if (isSelectionMode) return;
  if (isPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    transform.offsetX = panOffsetStart.x + dx;
    transform.offsetY = panOffsetStart.y + dy;
    redraw();
    return;
  }

  if (!isDrawing || isSelectionMode) return;

  const pt = screenToWorld(e);
  const snappedPt = snapToGrid(pt);
  redraw(snappedPt);
});

canvas.addEventListener('mousedown', (e) => {
  if (isSelectionMode && e.button === 0) {
    const pt = screenToWorld(e);
    selectionBox = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
    return;
  }
  if (!isDrawing && !isSelectionMode && canvas.style.cursor === 'grab') { // Only pan if not drawing or selecting
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    panOffsetStart = { x: transform.offsetX, y: transform.offsetY };
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (isSelectionMode && selectionBox) {
    const xMin = Math.min(selectionBox.x1, selectionBox.x2);
    const xMax = Math.max(selectionBox.x1, selectionBox.x2);
    const yMin = Math.min(selectionBox.y1, selectionBox.y2);
    const yMax = Math.max(selectionBox.y1, selectionBox.y2);

    // selectedPolygonsIndices = []; // Commented out to allow additive selection

    allPolygons.forEach((poly, index) => {
      const inside = poly.every(pt =>
        pt.x >= xMin && pt.x <= xMax && pt.y >= yMin && pt.y <= yMax
      );
      if (inside && !selectedPolygonsIndices.includes(index)) { // Added check for duplicates
          selectedPolygonsIndices.push(index);
      }
    });

    selectionBox = null;
    redraw();
    return;
  }
  if (isSelectionMode) return;
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = 'grab';
  }
});

canvas.addEventListener('mouseleave', () => {
  if (isSelectionMode) return;
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = 'grab';
  }
});



// Buttons

function startDrawing() {
    saveState(); // Save the state *before* starting a new drawing (e.g., if there were existing polygons)
    isDrawing = true;
    currentLine = [];
    updatePolygonListUI();
    drawingHistory = []; // Clear drawing history for new drawing
    selectedPolygonIndex = -1;
    selectedPolygonsIndices = []; // Clear multi-selection as well
    connections = [];
    visibilityLines = [];
    connectivityLines = [];
    showVisibility = false;
    showConnectivity = false;
    showHeatmap = false;
    canvas.style.cursor = 'default';
    redraw();
  }

function undoLastPoint() {
    if (isSelectionMode) return;
  if (isDrawing) {
        if (drawingHistory.length > 1) {
            // Undo a point in the current drawing
            drawingHistory.pop(); // Remove the last point snapshot
            currentLine = [...drawingHistory[drawingHistory.length - 1]]; // Restore currentLine from previous snapshot
            redraw();
        } else if (drawingHistory.length === 1) {
            // This means only the initial point is left, so clear the drawing
            currentLine = [];
            drawingHistory = [];
            isDrawing = false;
            canvas.style.cursor = 'grab'; // Restore cursor to grab
            redraw();
        } else {
            // If drawing is active but drawingHistory is empty, it means we just started and clicked once.
            // In this case, simply exit drawing mode.
            currentLine = [];
            drawingHistory = [];
            isDrawing = false;
            canvas.style.cursor = 'grab';
            redraw();
            showMessageBox('No drawing points to undo, exiting drawing mode.');
        }
    } else if (historyPointer > 0) {
        historyPointer--;
        const prevState = history[historyPointer];
        applyState(prevState);
        redraw();
        // console.log('Undo successful. History length:', history.length, 'Pointer:', historyPointer); // For debugging
    } else {
        
    }
}

function moveLargestPolygon(dx, dy) {
    const largestPoly = getLargestPolygon();
    if (!largestPoly || largestPoly.length === 0) {
      showMessageBox('Please draw at least one polygon first to move.');
      return;
    }

    // Find the index of the largest polygon to modify it in allPolygons
    const largestPolyIndex = allPolygons.findIndex(poly => poly === largestPoly);

    for (let i = 0; i < largestPoly.length; i++) {
      largestPoly[i] = {
        x: largestPoly[i].x + dx,
        y: largestPoly[i].y + dy
      };
    }
    // The connections, visibility, and connectivity lines will be regenerated
    // when their respective toggles are activated or `generateConnections` is called.
    // So we clear them here to avoid stale lines.
    connections = [];
    visibilityLines = [];
    connectivityLines = [];

    redraw();
  }
  
  
  function saveState() {
    if (historyPointer < history.length - 1) {
        history.splice(historyPointer + 1);
    }
    const currentState = {
        allPolygons: JSON.parse(JSON.stringify(allPolygons)),
        // currentLine and isDrawing status should NOT be saved in global history for strict separation
        // because their undo is managed by drawingHistory.
        // We ensure they are reset/cleared when a global state is saved.
        currentLine: [], // Always empty in global history
        isDrawing: false, // Always false in global history snapshots
        selectedPolygonIndex: selectedPolygonIndex,
        selectedPolygonsIndices: JSON.parse(JSON.stringify(selectedPolygonsIndices)),
        connections: [],
        visibilityLines: [],
        connectivityLines: [],
        showVisibility: false,
        showConnectivity: false,
        showHeatmap: false,
        analysisGrid: [],
        maxCrossingCount: 0,
        drawingHistory: [] // Always clear drawing history when saving a global state
    };
    history.push(currentState);
    historyPointer++;
    if (history.length > MAX_HISTORY_STATES) {
        history.shift(); // Remove the oldest state
        historyPointer--;
    }
    // console.log('State saved. History length:', history.length, 'Pointer:', historyPointer); // For debugging
}

function applyState(state) {
    allPolygons = JSON.parse(JSON.stringify(state.allPolygons));
    updatePolygonListUI();
    // When applying a global state, reset drawing-specific variables
    currentLine = [];
    drawingHistory = [];
    isDrawing = false; // Always set to false when applying a global history state
    selectedPolygonIndex = state.selectedPolygonIndex;
    selectedPolygonsIndices = JSON.parse(JSON.stringify(state.selectedPolygonsIndices));

    // Reset analysis states when loading a historical state
    connections = [];
    visibilityLines = [];
    connectivityLines = [];
    showVisibility = false;
    showConnectivity = false;
    showHeatmap = false;
    analysisGrid = [];
    maxCrossingCount = 0;

    // Cursor should default to 'grab' after applying a global state
    canvas.style.cursor = 'grab';
}

let polygonsVisible = true; // State for polygon visibility
let isMoveMode = false; // This variable is no longer needed but kept for minimal change impact if referenced elsewhere.
let selectedPolygonsIndices = []; // Array to hold indices of selected polygons

// --- Save/Load Functions ---
function saveMap() {
    const data = {
        allPolygons: allPolygons,
        transform: transform
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spacesyntax_map.ssn';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessageBox('Map saved as spacesyntax_map.ssn');
}

function loadMap(event) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ssn';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const loadedData = JSON.parse(e.target.result);

                // --- MODIFICATION START ---
                // Do NOT clear history and allPolygons here if you want to add
                // We will append to allPolygons later
                // history = [];
                // historyPointer = -1;
                // --- MODIFICATION END ---

                if (loadedData.allPolygons) {
                    // Append new polygons to the existing ones
                    const newPolygons = loadedData.allPolygons.map(poly => poly.map(p => ({ x: p.x, y: p.y })));
                    allPolygons = allPolygons.concat(newPolygons); // <--- This is the key change
                }
                // No else needed here, if loadedData.allPolygons is empty, nothing will be added.

                // Apply transform if saved (optional, but good for consistency)
                // You might want to consider if you want to apply the loaded transform
                // or keep the current one when adding polygons. For now, it will apply.
                if (loadedData.transform) {
                    transform.scale = loadedData.transform.scale;
                    transform.offsetX = loadedData.transform.offsetX;
                    transform.offsetY = loadedData.transform.offsetY;
                }

                // These should still be cleared/reset as they relate to current drawing state, not saved polygons
                isDrawing = false;
                currentLine = [];
                drawingHistory = []; // Clear drawing history on map load
                connections = [];
                visibilityLines = [];
                connectivityLines = [];
                showVisibility = false;
                showConnectivity = false;
                showHeatmap = false;
                selectedPolygonsIndices = [];
                canvas.style.cursor = 'grab';

                saveState(); // Save the newly combined state
                updatePolygonListUI();
                redraw();
                showMessageBox('Map loaded successfully, polygons added to existing ones!'); // Updated message
            } catch (error) {
                showMessageBox('Error loading map: Invalid SSN file.');
                console.error('Error loading SSN file:', error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- Toggle Polygons Visibility ---
// Override the drawPolygon function to conditionally draw polygons
const originalDrawPolygon = drawPolygon;
drawPolygon = function(poly, color = 'red', index = -1) {
    if (polygonsVisible) {
        originalDrawPolygon(poly, color, index);
        // Removed original drawLengths call here, as it's now conditionally called inside the updated drawPolygon in draw1.js
    }
}

// Modify redraw to also consider polygon visibility when drawing lengths and selection
const originalRedrawForVisibility = redraw;
redraw = function(mouseWorld = null) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.offsetX, transform.offsetY);

    drawGrid();
    
    // Draw all completed polygons using the overridden drawPolygon
    allPolygons.forEach((poly, index) => {
        let polyColor = 'rgba(255,0,0,1)';
        if (selectedPolygonsIndices.includes(index)) {
            polyColor = 'rgba(0,0,255,1)'; // Blue for selected polygons
        }
        drawPolygon(poly, polyColor, index);
    });

    drawCurrent(mouseWorld);
    drawConnections();

    if (showVisibility) drawVisibilityLines();
    if (showConnectivity) drawConnectivityLines();
    
    // Call the rest of the original redraw logic, specifically for heatmap or other future extensions
    if (showHeatmap && analysisGrid.length > 0) {
        analysisGrid.forEach(cell => {
            let percentage = 0;
            if (maxCrossingCount > 0) {
                percentage = (cell.count / maxCrossingCount) * 100;
            }
            ctx.fillStyle = '#88e4ec'; 
            if (percentage >= 0 && percentage <= 2) {
                ctx.fillStyle = '#b4e1fa';
            } else if (percentage >= 3 && percentage <= 15) {
                ctx.fillStyle = '#88e4ec';
            } else if (percentage >= 16 && percentage <= 25) {
                ctx.fillStyle = '#37e1bc';
            } else if (percentage >= 26 && percentage <= 35) {
                ctx.fillStyle = '#83e230';
            } else if (percentage >= 36 && percentage <= 45) {
                ctx.fillStyle = '#d1d438';
            } else if (percentage >= 46 && percentage <= 100) {
                ctx.fillStyle = '#db3025';
            }
            ctx.fillRect(cell.x, cell.y, 0.1, 0.1);
        });
    }

    
  if (isSelectionMode && selectionBox) {
    const screenStart = worldToScreen({ x: selectionBox.x1, y: selectionBox.y1 });
    const screenEnd = worldToScreen({ x: selectionBox.x2, y: selectionBox.y2 });

    const left = Math.min(screenStart.x, screenEnd.x);
    const top = Math.min(screenStart.y, screenEnd.y);
    const width = Math.abs(screenEnd.x - screenStart.x);
    const height = Math.abs(screenEnd.y - screenStart.y);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(left, top, width, height);
    ctx.restore();
  }

  updateStats();
};

function togglePolygonsVisibility() {
    polygonsVisible = !polygonsVisible;
    redraw(); // Redraw the canvas to apply visibility change
    // Removed showMessageBox call as requested.
}

function toggleLengthsVisibility() {
    showLengths = !showLengths;
    redraw();
}

// New: Function to delete the selected polygon
function deleteSelectedPolygon() {
    if (selectedPolygonsIndices.length > 0) {
        saveState(); // Save state before deleting selected polygons
        selectedPolygonsIndices.sort((a, b) => b - a);
        for (const index of selectedPolygonsIndices) {
            allPolygons.splice(index, 1);
        }
        selectedPolygonsIndices = [];
        connections = [];
        visibilityLines = [];
        connectivityLines = [];
        showVisibility = false;
        showConnectivity = false;
        showHeatmap = false;
        analysisGrid = [];
        maxCrossingCount = 0;
        redraw();
        showMessageBox('Selected polygons deleted!');
    } else if (allPolygons.length > 0) {
        saveState(); // Save state before deleting the last polygon (fallback)
        allPolygons.pop();
        updatePolygonListUI();
        connections = [];
        visibilityLines = [];
        connectivityLines = [];
        showVisibility = false;
        showConnectivity = false;
        showHeatmap = false;
        analysisGrid = [];
        maxCrossingCount = 0;
        redraw();
        showMessageBox('Last polygon deleted!');
    } else {
        showMessageBox('No polygons to delete!');
    }
}


// Helper function to calculate the centroid of a set of polygons
function calculateMultiPolygonCentroid(polygons) {
    let totalX = 0;
    let totalY = 0;
    let totalPoints = 0;

    polygons.forEach(poly => {
        poly.forEach(point => {
            totalX += point.x;
            totalY += point.y;
            totalPoints++;
        });
    });

    if (totalPoints === 0) {
        return { x: 0, y: 0 }; // Or handle as an error
    }

    return {
        x: totalX / totalPoints,
        y: totalY / totalPoints
    };
}

// New function to mirror selected polygons
function mirrorSelectedPolygons() {
    if (selectedPolygonsIndices.length === 0) {
        showMessageBox('Please select at least one polygon to mirror.');
        return;
    }

    const mirrorAxis = document.getElementById('mirrorAxis').value; // 'x' or 'y'

    // Get the actual polygon objects for the selected indices
    const polygonsToMirror = selectedPolygonsIndices.map(index => allPolygons[index]);

    // Calculate the collective centroid of the selected polygons
    const collectiveCentroid = calculateMultiPolygonCentroid(polygonsToMirror);

    saveState(); // Save state before modifying polygons

    for (const index of selectedPolygonsIndices) {
        const poly = allPolygons[index];
        for (let i = 0; i < poly.length; i++) {
            if (mirrorAxis === 'x') {
                // Mirror across a vertical line (constant X)
                poly[i].x = collectiveCentroid.x - (poly[i].x - collectiveCentroid.x);
            } else { // mirrorAxis === 'y'
                // Mirror across a horizontal line (constant Y)
                poly[i].y = collectiveCentroid.y - (poly[i].y - collectiveCentroid.y);
            }
        }
    }

    // Clear analysis data as polygon geometry has changed
    connections = [];
    visibilityLines = [];
    connectivityLines = [];
    showVisibility = false;
    showConnectivity = false;
    showHeatmap = false;
    analysisGrid = [];
    maxCrossingCount = 0;

    redraw();
    showMessageBox(`Selected polygons mirrored across the ${mirrorAxis}-axis.`);
}


// New function to rotate selected polygons
function rotateSelectedPolygons() {
    if (selectedPolygonsIndices.length === 0) {
        showMessageBox('Please select at least one polygon to rotate.');
        return;
    }

    let angleDegrees = parseFloat(document.getElementById('rotateAngle').value);
    if (isNaN(angleDegrees)) {
        showMessageBox('Please enter a valid numerical value for the rotation angle.');
        return;
    }

    saveState(); // Save state before modifying polygons

    // Calculate the bottom-most point of all selected polygons
    let rotationCenterX = 0;
    let rotationCenterY = -Infinity; // Initialize with a very small number

    selectedPolygonsIndices.forEach(index => {
        const poly = allPolygons[index];
        poly.forEach(point => {
            if (point.y > rotationCenterY) { // Assuming Y-axis increases downwards
                rotationCenterY = point.y;
            }
        });
    });

    // Find the X-coordinate that corresponds to the minimum X-value at the calculated rotationCenterY
    let minXAtBottom = Infinity;
    selectedPolygonsIndices.forEach(index => {
        const poly = allPolygons[index];
        poly.forEach(point => {
            // Check if the point's Y-coordinate is close to rotationCenterY to find a relevant X
            if (Math.abs(point.y - rotationCenterY) < 0.001) { // Use a small tolerance for float comparison
                if (point.x < minXAtBottom) {
                    minXAtBottom = point.x;
                }
            }
        });
    });
    rotationCenterX = minXAtBottom;

    const angleRadians = angleDegrees * (Math.PI / 180); // Convert degrees to radians

    for (const index of selectedPolygonsIndices) {
        const poly = allPolygons[index];
        for (let i = 0; i < poly.length; i++) {
            const p = poly[i];
            const translatedX = p.x - rotationCenterX;
            const translatedY = p.y - rotationCenterY;

            const rotatedX = translatedX * Math.cos(angleRadians) - translatedY * Math.sin(angleRadians);
            const rotatedY = translatedX * Math.sin(angleRadians) + translatedY * Math.cos(angleRadians);

            poly[i].x = rotatedX + rotationCenterX;
            poly[i].y = rotatedY + rotationCenterY;
        }
    }

    // Clear analysis data as polygon geometry has changed
    connections = [];
    visibilityLines = [];
    connectivityLines = [];
    showVisibility = false;
    showConnectivity = false;
    showHeatmap = false;
    analysisGrid = [];
    maxCrossingCount = 0;

    redraw();
    showMessageBox(`Selected polygons rotated by ${angleDegrees} degrees.`);
    document.getElementById('rotateAngle').value = '0'; // Reset the angle input
}

// --- Apply Move to Selected Polygons Functionality ---
function applyMoveToSelectedPolygons() {
    if (selectedPolygonsIndices.length === 0) {
        showMessageBox('Please select at least one polygon to move.');
        return;
    }

    let dx = parseFloat(document.getElementById('moveX').value);
    let dy = parseFloat(document.getElementById('moveY').value);

    if (isNaN(dx) || isNaN(dy)) {
        showMessageBox('Please enter valid numerical values for X and Y.');
        return;
    }

    dx = parseFloat(dx.toFixed(1));
    dy = parseFloat(dy.toFixed(1));

    // Check if there's an actual movement before saving state
    if (dx !== 0 || dy !== 0) {
        saveState(); // Save state before applying the move
    }

    for (const index of selectedPolygonsIndices) {
        const poly = allPolygons[index];
        for (let i = 0; i < poly.length; i++) {
            poly[i].x += dx;
            poly[i].y += dy;
        }
    }

    connections = [];
    visibilityLines = [];
    connectivityLines = [];
    showVisibility = false;
    showConnectivity = false;
    showHeatmap = false;
    analysisGrid = [];
    maxCrossingCount = 0;

    redraw();
    showMessageBox(`Moved selected polygons by X: ${dx}, Y: ${dy}`);

    document.getElementById('moveX').value = '0.0';
    document.getElementById('moveY').value = '0.0';
}


// --- Apply Scale to Selected Polygons Functionality ---
function scaleSelectedPolygon() {
  if (!selectedPolygonsIndices || selectedPolygonsIndices.length === 0) {
    showMessageBox("No polygons selected for scaling.");
    return;
  }

  const scaleX = parseFloat(document.getElementById("moveX").value);
  const scaleY = parseFloat(document.getElementById("moveY").value);

  if (isNaN(scaleX) || isNaN(scaleY)) {
    showMessageBox("Invalid scaling values.");
    return;
  }

  saveState(); // Backup before modifying polygons

  for (const index of selectedPolygonsIndices) {
    const poly = allPolygons[index];
    const centroid = calculatePolygonCentroid(poly);

    for (let i = 0; i < poly.length; i++) {
      poly[i] = {
        x: centroid.x + (poly[i].x - centroid.x) * (1 + scaleX),
        y: centroid.y + (poly[i].y - centroid.y) * (1 + scaleY),
      };
    }
  }

  // Reset inputs just like the move function does
  document.getElementById("moveX").value = "0.0";
  document.getElementById("moveY").value = "0.0";

  redraw();
  showMessageBox("Selected polygons scaled.");
}


// --- General Multi-Selection (Shift Key) ---
canvas.onclick = (e) => { // Renamed from addEventListener('click') in original code
    // ... (existing selection logic - keep as is) ...
    if (!isDrawing && !isPanning) {
        const clickPt = screenToWorld(e);
        let clickedOnPolygon = false;
        let clickedPolygonIndex = -1;

        for (let i = allPolygons.length - 1; i >= 0; i--) {
            if (pointInPolygon(clickPt, allPolygons[i])) {
                clickedPolygonIndex = i;
                clickedOnPolygon = true;
                break;
            }
        }

        if (isSelectionMode || e.shiftKey) {
            if (clickedOnPolygon) {
                const indexInSelection = selectedPolygonsIndices.indexOf(clickedPolygonIndex);
                if (indexInSelection > -1) {
                    selectedPolygonsIndices.splice(indexInSelection, 1);
                } else {
                    selectedPolygonsIndices.push(clickedPolygonIndex);
                }
            }
        } else {
            if (clickedOnPolygon) {
                selectedPolygonsIndices = [clickedPolygonIndex];
            } else {
                selectedPolygonsIndices = [];
            }
        }
        redraw();
        return;
    }

    if (isSelectionMode) return;
  if (isDrawing) {
        // saveState(); // This saveState is moved to the top of the isDrawing block in canvas.addEventListener('click')
        const pt = screenToWorld(e);
        const snappedPt = snapToGrid(pt);

        if (currentLine.length >= 3) {
            const start = currentLine[0];
            const distToStart = Math.hypot(snappedPt.x - start.x, snappedPt.y - start.y);
            if (distToStart <= 0.06) {
                allPolygons.push([...currentLine]);
                updatePolygonListUI();
                currentLine = [];
                isDrawing = false;
                canvas.style.cursor = 'grab';
                selectedPolygonsIndices = [];
                redraw();
                return;
            }
        }
        currentLine.push(snappedPt);
        redraw();
        return;
    }
};


// --- Mouse Event Listeners (Pan and Draw) ---
canvas.onmousedown = (e) => {
  if (isSelectionMode) return;
    if (e.button === 0) { // Left click
        if (!isDrawing) { // Default pan logic when not drawing
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            panOffsetStart = { x: transform.offsetX, y: transform.offsetY };
            canvas.style.cursor = 'grabbing';
        }
    }
};

canvas.onmousemove = (e) => {
    const mouseWorld = screenToWorld(e);

    if (isSelectionMode) return;
  if (isSelectionMode) return;
  if (isPanning) { // Pan logic
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        transform.offsetX = panOffsetStart.x + dx;
        transform.offsetY = panOffsetStart.y + dy;
        redraw();
        return; // Stop processing if panning
    } else if (isSelectionMode) return;
  if (isDrawing) { // Drawing preview
        const snappedPt = snapToGrid(mouseWorld);
        redraw(snappedPt);
        return; // Stop processing if drawing
    }

    // Default behavior if nothing else applies (e.g., just mouse movement without dragging)
    redraw(mouseWorld); // Update mouse position display
};

canvas.onmouseup = (e) => {
    if (isSelectionMode) return;
  if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'grab'; // Default cursor
        redraw(); // Redraw to finalize pan
        return; // Stop processing if panning just ended
    }
};

canvas.onmouseleave = () => {
    // If mouse leaves canvas, stop any active dragging/panning
    if (isSelectionMode) return;
  if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'grab';
        redraw();
    }
    // If drawing, clear preview
    if (isSelectionMode) return;
  if (isDrawing) {
        redraw();
    }
};

// Update deletePolygon function to delete selected polygons or last polygon
// This function assumes a global `deletePolygon` is already callable from a button.
// If it's not, you'd need to add a button like: <button onclick="deletePolygon()">Delete</button>
function deletePolygon() {
    if (selectedPolygonsIndices.length > 0) {
        // Sort indices in descending order to avoid issues when splicing
        selectedPolygonsIndices.sort((a, b) => b - a);
        for (const index of selectedPolygonsIndices) {
            allPolygons.splice(index, 1);
        }
        selectedPolygonsIndices = []; // Clear selection after deletion
        connections = []; // Clear analysis lines
        visibilityLines = [];
        connectivityLines = [];
        showVisibility = false;
        showConnectivity = false;
        showHeatmap = false;
        analysisGrid = [];
        maxCrossingCount = 0;
        redraw();
        showMessageBox('Selected polygons deleted!');
    } else if (allPolygons.length > 0) { // Fallback to deleting last polygon if no selection
        allPolygons.pop();
        updatePolygonListUI();
        connections = []; // Clear analysis lines
        visibilityLines = [];
        connectivityLines = [];
        showVisibility = false;
        showConnectivity = false;
        showHeatmap = false;
        analysisGrid = [];
        maxCrossingCount = 0;
        redraw();
        showMessageBox('Last polygon deleted!');
    } else {
        showMessageBox('No polygons to delete!');
    }
}

function clearAll() {
    saveState(); // Save state before clearing everything
    allPolygons = [];
    updatePolygonListUI();
    currentLine = [];
    drawingHistory = []; // Clear drawing history
    isDrawing = false;
    connections = [];
    visibilityLines = [];
    connectivityLines = [];
    showVisibility = false;
    showConnectivity = false;
    showHeatmap = false;
    selectedPolygonIndex = -1;
    selectedPolygonsIndices = [];
    canvas.style.cursor = 'grab';
    redraw();
}

// --- Print Function ---
function printPage() {
    // Simply print the current window without any DOM manipulation
    window.print();
}


function clearCurrentDrawing() {
  // Clears only the currently drawn line, not completed polygons
  isDrawing = false;
  currentLine = [];
  drawingHistory = []; // Clear drawing history
  selectedPolygonIndex = -1; // Deselect any polygon
  canvas.style.cursor = 'grab';
  redraw();
}


// Zoom In and Out
function zoomIn() {
  transform.scale *= 1.1;
  redraw();
}

function zoomOut() {
  transform.scale /= 1.1;
  redraw();
} 

// Zoom handling via mouse wheel
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();

  const scaleFactor = 1.1;
  const mousePos = screenToWorld(e);

  if (e.deltaY < 0) {
    transform.scale *= scaleFactor;
  } else {
    transform.scale /= scaleFactor;
  }

  // Adjust offset so zoom centers on mouse pointer
  transform.offsetX = e.clientX - mousePos.x * transform.scale;
  transform.offsetY = e.clientY - mousePos.y * transform.scale;

  redraw();
}, { passive: false });

//Pan Controls
function panCanvas(dx, dy) {
  transform.offsetX += dx;
  transform.offsetY += dy;
  redraw();
}


// Custom Message Box (replaces alert())
function showMessageBox(message) {
// Create overlay
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
overlay.style.zIndex = '1000';
overlay.style.display = 'flex';
overlay.style.justifyContent = 'center';
overlay.style.alignItems = 'center';
overlay.style.fontFamily = 'Arial, sans-serif';

// Create message box
const msgBox = document.createElement('div');
msgBox.style.backgroundColor = '#fff';
msgBox.style.padding = '20px';
msgBox.style.borderRadius = '8px';
msgBox.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
msgBox.style.textAlign = 'center';
msgBox.style.maxWidth = '300px';

// Message text
const msgText = document.createElement('p');
msgText.textContent = message;
msgText.style.marginBottom = '15px';

// OK button
const okButton = document.createElement('button');
okButton.textContent = 'OK';
okButton.style.padding = '8px 20px';
okButton.style.backgroundColor = '#007bff';
okButton.style.color = '#fff';
okButton.style.border = 'none';
okButton.style.borderRadius = '5px';
okButton.style.cursor = 'pointer';
okButton.onclick = () => document.body.removeChild(overlay);

msgBox.appendChild(msgText);
msgBox.appendChild(okButton);
overlay.appendChild(msgBox);
document.body.appendChild(overlay);
}


function toggleSelectionMode() {
  isSelectionMode = !isSelectionMode;
  canvas.style.cursor = isSelectionMode ? 'crosshair' : 'grab';
  selectionBox = null;
  redraw();
}


function undoGlobalAction() {
  if (!isDrawing && historyPointer > 0) {
    historyPointer--;
    const prevState = history[historyPointer];
    applyState(prevState);
    redraw();
  } else {
    showMessageBox('Nothing to undo.');
  }
}

function redoGlobalAction() {
  if (!isDrawing && historyPointer < history.length - 1) {
    historyPointer++;
    const nextState = history[historyPointer];
    applyState(nextState);
    redraw();
  } else {
    showMessageBox('Nothing to redo.');
  }
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    if (isDrawing) {
      undoLastPoint();
    } else {
      undoGlobalAction();
    }
  } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
    e.preventDefault();
    redoGlobalAction();
  }
});

function unionSelectedPolygons() {
    if (selectedPolygonsIndices.length < 2) {
        showMessageBox("Select at least two polygons for union.");
        return;
    }

    if (typeof martinez === 'undefined' && typeof polygonClipping === 'undefined') {
        showMessageBox("Polygon boolean library not loaded.");
        return;
    }

    function closeAndRound(poly) {
        const result = poly.map(p => [parseFloat(p.x.toFixed(6)), parseFloat(p.y.toFixed(6))]);
        if (result.length > 2 && (result[0][0] !== result[result.length - 1][0] || result[0][1] !== result[result.length - 1][1])) {
            result.push([...result[0]]);
        }
        return result;
    }

    saveState();

    const polys = selectedPolygonsIndices.map(i => [[closeAndRound(allPolygons[i])]]);
    const lib = typeof martinez !== 'undefined' ? martinez : polygonClipping;
    const result = lib.union(...polys);

    if (result && result.length > 0) {
        selectedPolygonsIndices.sort((a, b) => b - a).forEach(i => allPolygons.splice(i, 1));
        for (const polyGroup of result) {
            for (const ring of polyGroup) {
                if (ring.length > 2) {
                    allPolygons.push(ring.map(p => ({ x: p[0], y: p[1] })));
                }
            }
        }
        selectedPolygonsIndices = [];
        updatePolygonListUI();
        redraw();
        showMessageBox("Polygons unioned successfully.");
    } else {
        showMessageBox("Union failed.");
    }
}

function subtractSelectedPolygons() {
    if (selectedPolygonsIndices.length < 2) {
        showMessageBox("Select two or more polygons (first one is minuend).");
        return;
    }

    if (typeof martinez === 'undefined' && typeof polygonClipping === 'undefined') {
        showMessageBox("Polygon boolean library not loaded.");
        return;
    }

    function closeAndRound(poly) {
        const result = poly.map(p => [parseFloat(p.x.toFixed(6)), parseFloat(p.y.toFixed(6))]);
        if (result.length > 2 && (result[0][0] !== result[result.length - 1][0] || result[0][1] !== result[result.length - 1][1])) {
            result.push([...result[0]]);
        }
        return result;
    }

    saveState();

    const baseIndex = selectedPolygonsIndices[0];
    let result = [[closeAndRound(allPolygons[baseIndex])]];
    const subtractPolys = selectedPolygonsIndices.slice(1).map(i => [[closeAndRound(allPolygons[i])]]);
    const lib = typeof martinez !== 'undefined' ? martinez : polygonClipping;

    for (const poly of subtractPolys) {
        result = lib.diff(result, poly);
        if (!result) break;
    }

    if (result && Array.isArray(result) && result.length > 0) {
        selectedPolygonsIndices.sort((a, b) => b - a).forEach(i => allPolygons.splice(i, 1));
        for (const polyGroup of result) {
            for (const ring of polyGroup) {
                if (ring.length > 2) {
                    allPolygons.push(ring.map(p => ({ x: p[0], y: p[1] })));
                }
            }
        }
        selectedPolygonsIndices = [];
        updatePolygonListUI();
        redraw();
        showMessageBox("Subtraction completed.");
    } else {
        showMessageBox("Subtraction failed.");
    }
}

function trimSelectedPolygonEdges() {
    if (selectedPolygonsIndices.length !== 1) {
        showMessageBox("Select a single polygon to trim.");
        return;
    }

    const index = selectedPolygonsIndices[0];
    const poly = allPolygons[index];

    if (poly.length <= 3) {
        showMessageBox("Polygon is already minimal and cannot be trimmed.");
        return;
    }

    // Ask user which lines (edges) to remove
    let edgeInfo = "Enter indices of edges to trim (0 to " + (poly.length - 1) + "), separated by commas:";
    let input = prompt(edgeInfo);
    if (!input) return;

    let indices = input.split(',').map(s => parseInt(s.trim())).filter(i => !isNaN(i) && i >= 0 && i < poly.length);
    if (indices.length === 0) {
        showMessageBox("No valid edges provided.");
        return;
    }

    saveState(); // backup

    // Remove both points that form each selected edge
    let keep = new Array(poly.length).fill(true);
    for (let idx of indices) {
        keep[idx] = false;
        keep[(idx + 1) % poly.length] = false;
    }

    const newPoly = [];
    for (let i = 0; i < poly.length; i++) {
        if (keep[i]) {
            newPoly.push(poly[i]);
        }
    }

    if (newPoly.length < 3) {
        showMessageBox("Trimming removed too many points to form a valid polygon.");
        return;
    }

    allPolygons[index] = newPoly;
    selectedPolygonsIndices = [index];
    updatePolygonListUI();
    redraw();
    showMessageBox("Trim completed and polygon closed.");
}

// --- Trim Mode State ---
let isTrimMode = false;
let trimSelectionBox = null;

function toggleTrimMode() {
    isTrimMode = !isTrimMode;
    trimSelectionBox = null;
    canvas.style.cursor = isTrimMode ? 'crosshair' : 'grab';
    showMessageBox(isTrimMode ? "Trim Mode: Activated" : "Trim Mode: Deactivated");
    redraw();
}

function enableGrabMode() {
    isDrawing = false;
    currentLine = [];
    drawingHistory = [];
    canvas.style.cursor = 'grab';
    redraw();
}

// Extend mouse events for trim selection
canvas.addEventListener('mousedown', (e) => {
    if (isTrimMode && e.button === 0) {
        const pt = screenToWorld(e);
        trimSelectionBox = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
        return;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isTrimMode && trimSelectionBox) {
        const pt = screenToWorld(e);
        trimSelectionBox.x2 = pt.x;
        trimSelectionBox.y2 = pt.y;
        redraw();
        return;
    }
});

canvas.addEventListener('mouseup', () => {
    if (isTrimMode && trimSelectionBox) {
        if (selectedPolygonsIndices.length !== 1) {
            showMessageBox("Select one polygon before trimming.");
            trimSelectionBox = null;
            return;
        }

        const index = selectedPolygonsIndices[0];
        const poly = allPolygons[index];
        const xMin = Math.min(trimSelectionBox.x1, trimSelectionBox.x2);
        const xMax = Math.max(trimSelectionBox.x1, trimSelectionBox.x2);
        const yMin = Math.min(trimSelectionBox.y1, trimSelectionBox.y2);
        const yMax = Math.max(trimSelectionBox.y1, trimSelectionBox.y2);

        const keep = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            if (!(midX >= xMin && midX <= xMax && midY >= yMin && midY <= yMax)) {
                keep.push(a);
            }
        }

        if (keep.length >= 3) {
            saveState();
            allPolygons[index] = keep;
            updatePolygonListUI();
            showMessageBox("Trimmed selected edge(s).");
        } else {
            showMessageBox("A polygon needs at least 3 points.");
        }

        trimSelectionBox = null;
        redraw();
    }
});

// Extend redraw to show trim box
const originalRedrawTrim = redraw;
redraw = function(mouseWorld = null) {
    originalRedrawTrim(mouseWorld);
    if (isTrimMode && trimSelectionBox) {
        const screenStart = worldToScreen({ x: trimSelectionBox.x1, y: trimSelectionBox.y1 });
        const screenEnd = worldToScreen({ x: trimSelectionBox.x2, y: trimSelectionBox.y2 });
        const left = Math.min(screenStart.x, screenEnd.x);
        const top = Math.min(screenStart.y, screenEnd.y);
        const width = Math.abs(screenEnd.x - screenStart.x);
        const height = Math.abs(screenEnd.y - screenStart.y);

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(left, top, width, height);
        ctx.restore();
    }
}

// Update pan handling to disable panning during trim mode
canvas.addEventListener('mousedown', (e) => {
    if (isTrimMode && e.button === 0) {
        const pt = screenToWorld(e);
        trimSelectionBox = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
        return;
    }
    if (!isTrimMode && !isDrawing && !isSelectionMode && canvas.style.cursor === 'grab') {
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        panOffsetStart = { x: transform.offsetX, y: transform.offsetY };
        canvas.style.cursor = 'grabbing';
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isTrimMode && trimSelectionBox) {
        const pt = screenToWorld(e);
        trimSelectionBox.x2 = pt.x;
        trimSelectionBox.y2 = pt.y;
        redraw();
        return;
    }
    if (isTrimMode) return;
    if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        transform.offsetX = panOffsetStart.x + dx;
        transform.offsetY = panOffsetStart.y + dy;
        redraw();
        return;
    }
});

// Updated onmousedown: disable grab during trim mode
canvas.onmousedown = (e) => {
  if (isTrimMode) {
    if (e.button === 0) {
      const pt = screenToWorld(e);
      trimSelectionBox = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
    }
    return; // Prevent pan logic from executing
  }
  if (e.button === 0 && !isDrawing && !isSelectionMode) {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    panOffsetStart = { x: transform.offsetX, y: transform.offsetY };
    canvas.style.cursor = 'grabbing';
  }
};

// Updated onmousemove: handle trim box separately
canvas.onmousemove = (e) => {
  if (isTrimMode && trimSelectionBox) {
    const pt = screenToWorld(e);
    trimSelectionBox.x2 = pt.x;
    trimSelectionBox.y2 = pt.y;
    redraw();
    return;
  }
  if (isTrimMode) return;

  if (isPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    transform.offsetX = panOffsetStart.x + dx;
    transform.offsetY = panOffsetStart.y + dy;
    redraw();
    return;
  }

  if (isDrawing) {
    const pt = screenToWorld(e);
    const snappedPt = snapToGrid(pt);
    redraw(snappedPt);
    return;
  }

  redraw();
};

canvas.addEventListener('mouseup', () => {
    if (isTrimMode && trimSelectionBox) {
        if (selectedPolygonsIndices.length !== 1) {
            showMessageBox("Select one polygon before trimming.");
            trimSelectionBox = null;
            return;
        }

        const index = selectedPolygonsIndices[0];
        const poly = allPolygons[index];
        const xMin = Math.min(trimSelectionBox.x1, trimSelectionBox.x2);
        const xMax = Math.max(trimSelectionBox.x1, trimSelectionBox.x2);
        const yMin = Math.min(trimSelectionBox.y1, trimSelectionBox.y2);
        const yMax = Math.max(trimSelectionBox.y1, trimSelectionBox.y2);

        const keep = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];

            // Only trim if both endpoints of the edge are inside the selection box
            const aInside = a.x >= xMin && a.x <= xMax && a.y >= yMin && a.y <= yMax;
            const bInside = b.x >= xMin && b.x <= xMax && b.y >= yMin && b.y <= yMax;

            if (!(aInside && bInside)) {
                keep.push(a); // Only add the start point of the edge if it is to be kept
            }
        }

        if (keep.length >= 3) {
            saveState();
            allPolygons[index] = keep;
            updatePolygonListUI();
            showMessageBox("Trimmed edges fully inside the box.");
        } else {
            showMessageBox("Trimmed too much. A polygon needs at least 3 points.");
        }

        trimSelectionBox = null;
        redraw();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isTrimMode && trimSelectionBox) {
        if (selectedPolygonsIndices.length !== 1) {
            showMessageBox("Select one polygon before trimming.");
            trimSelectionBox = null;
            return;
        }

        const index = selectedPolygonsIndices[0];
        const poly = allPolygons[index];
        const xMin = Math.min(trimSelectionBox.x1, trimSelectionBox.x2);
        const xMax = Math.max(trimSelectionBox.x1, trimSelectionBox.x2);
        const yMin = Math.min(trimSelectionBox.y1, trimSelectionBox.y2);
        const yMax = Math.max(trimSelectionBox.y1, trimSelectionBox.y2);

        const keep = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];

            // Only keep if both points are not inside the trim box
            const aInside = a.x >= xMin && a.x <= xMax && a.y >= yMin && a.y <= yMax;
            const bInside = b.x >= xMin && b.x <= xMax && b.y >= yMin && b.y <= yMax;

            if (!(aInside && bInside)) {
                keep.push(a);
            }
        }

        saveState();

        if (keep.length < 3) {
            allPolygons.splice(index, 1);
            selectedPolygonsIndices = [];
            updatePolygonListUI();
            showMessageBox("Polygon deleted after trimming left fewer than 3 points.");
        } else {
            allPolygons[index] = keep;
            updatePolygonListUI();
            showMessageBox("Trimmed edges fully inside the box.");
        }

        trimSelectionBox = null;
        redraw();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isTrimMode && trimSelectionBox) {
        if (selectedPolygonsIndices.length !== 1) {
            showMessageBox("Select one polygon before trimming.");
            trimSelectionBox = null;
            return;
        }

        const index = selectedPolygonsIndices[0];
        const poly = allPolygons[index];
        const xMin = Math.min(trimSelectionBox.x1, trimSelectionBox.x2);
        const xMax = Math.max(trimSelectionBox.x1, trimSelectionBox.x2);
        const yMin = Math.min(trimSelectionBox.y1, trimSelectionBox.y2);
        const yMax = Math.max(trimSelectionBox.y1, trimSelectionBox.y2);

        // Remove only points fully inside the selection box
        const filtered = poly.filter(p => !(p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax));

        saveState();

        if (filtered.length < 3) {
            allPolygons.splice(index, 1);
            selectedPolygonsIndices = [];
            updatePolygonListUI();
            showMessageBox("Polygon deleted: fewer than 3 points remained after trimming.");
        } else {
            allPolygons[index] = filtered;
            updatePolygonListUI();
            showMessageBox("Trimmed points inside the box.");
        }

        trimSelectionBox = null;
        redraw();
    }
});