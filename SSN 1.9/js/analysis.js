

  // Point-in-polygon test (ray casting)
  function pointInPolygon(point, vs) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].x, yi = vs[i].y;
      let xj = vs[j].x, yj = vs[j].y;

      let intersect = ((yi > y) != (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Check if two line segments intersect
  function doLinesIntersect(p1, p2, p3, p4) {
    function ccw(a,b,c) {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }
    return (ccw(p1,p3,p4) != ccw(p2,p3,p4)) && (ccw(p1,p2,p3) != ccw(p1,p2,p4));
  }

  function generateConnections() {
    const mainPolygon = getLargestPolygon();
    if (!mainPolygon || mainPolygon.length < 3) {
      // Using a custom message box instead of alert()
      showMessageBox('Please draw at least one polygon first.');
      return;
    }

    // Clear other analysis lines when "Complex Nudes" is generated
    visibilityLines = [];
    connectivityLines = [];
    showVisibility = false;
    showConnectivity = false;

    const minX = Math.min(...mainPolygon.map(p => p.x));
    const maxX = Math.max(...mainPolygon.map(p => p.x));
    const minY = Math.min(...mainPolygon.map(p => p.y));
    const maxY = Math.max(...mainPolygon.map(p => p.y));

    const spacing = 0.1;
    const points = [];

    for (let x = minX; x <= maxX; x += spacing) {
      for (let y = minY; y <= maxY; y += spacing) {
        const pt = { x, y };
        if (pointInPolygon(pt, mainPolygon)) points.push(pt);
      }
    }

    connections = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        let a = points[i];
        let b = points[j];
        
        // Check against all polygon edges
        if (!crossesAnyPolygonEdge(a, b)) {
          connections.push([a, b]);
        }
      }
    }
    redraw();
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

