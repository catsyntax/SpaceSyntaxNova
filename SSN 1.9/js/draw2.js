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
        // Only draw lengths if polygons are visible
        drawLengths(poly);
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

    updateStats();
};

function togglePolygonsVisibility() {
    polygonsVisible = !polygonsVisible;
    redraw(); // Redraw the canvas to apply visibility change
    // Removed showMessageBox call as requested.
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

        if (e.shiftKey) {
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

    if (isPanning) { // Pan logic
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        transform.offsetX = panOffsetStart.x + dx;
        transform.offsetY = panOffsetStart.y + dy;
        redraw();
        return; // Stop processing if panning
    } else if (isDrawing) { // Drawing preview
        const snappedPt = snapToGrid(mouseWorld);
        redraw(snappedPt);
        return; // Stop processing if drawing
    }

    // Default behavior if nothing else applies (e.g., just mouse movement without dragging)
    redraw(mouseWorld); // Update mouse position display
};

canvas.onmouseup = (e) => {
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'grab'; // Default cursor
        redraw(); // Redraw to finalize pan
        return; // Stop processing if panning just ended
    }
};

canvas.onmouseleave = () => {
    // If mouse leaves canvas, stop any active dragging/panning
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'grab';
        redraw();
    }
    // If drawing, clear preview
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
