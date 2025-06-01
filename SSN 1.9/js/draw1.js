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

    if (isDrawing) {
      const edges = currentLine.length > 1 ? currentLine.length - 1 : 0;
      let perimeter = 0;
      for (let i = 0; i < currentLine.length - 1; i++) {
        perimeter += Math.hypot(currentLine[i+1].x - currentLine[i].x, currentLine[i+1].y - currentLine[i].y);
      }
      statsText += `Drawing: Edges: ${edges}, Perimeter: ${perimeter.toFixed(2)} m. `;
    }

    const largestPoly = getLargestPolygon();
    if (largestPoly) {
      const edges = largestPoly.length;
      const perimeter = polygonPerimeter(largestPoly);
      const area = polygonArea(largestPoly);
      statsText += `Largest Polygon: Edges: ${edges}, Perimeter: ${perimeter.toFixed(2)} m, Area: ${area.toFixed(2)} m². `;
    } else if (allPolygons.length > 0) {
      // If no single "largest" is highlighted, but there are polygons
      statsText += `Number of Polygons: ${allPolygons.length}. `;
    }
    if (selectedPolygonIndex !== -1 && allPolygons[selectedPolygonIndex]) {
      statsText += `Selected: Polygon ${selectedPolygonIndex + 1}.`;
    }


    statsDisplay.textContent = statsText.trim();
  }

  // Close polygon on double-click or when clicking near the start point (0.06m radius)
canvas.addEventListener('dblclick', () => {
    if (!isDrawing) return;
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
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      transform.offsetX = panOffsetStart.x + dx;
      transform.offsetY = panOffsetStart.y + dy;
      redraw();
      return;
    }

    if (!isDrawing) return;

    const pt = screenToWorld(e);
    const snappedPt = snapToGrid(pt);
    redraw(snappedPt);
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!isDrawing && canvas.style.cursor === 'grab') { // Only pan if not drawing
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      panOffsetStart = { x: transform.offsetX, y: transform.offsetY };
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = 'grab';
    }
  });

  canvas.addEventListener('mouseleave', () => {
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

