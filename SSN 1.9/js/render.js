let analysisGrid = [];
let maxCrossingCount = 0;
// showHeatmap is already defined in the previous block,
// but ensuring its state is managed here.
let showHeatmap = false; // Initialize showHeatmap here if not already global

function renderAnalysis() {
    const mainPolygon = getLargestPolygon();
    if (!mainPolygon || mainPolygon.length < 3) {
        showMessageBox('Please draw at least one polygon first to perform analysis.');
        return;
    }

    // Toggle logic: If heatmap is already showing, turn it off.
    if (showHeatmap) {
        analysisGrid = [];
        maxCrossingCount = 0;
        showHeatmap = false;
        // Ensure other analysis lines are cleared when heatmap is turned off.
        connections = []; // Clear "Complex Nodes" lines
        visibilityLines = []; // Clear current visibility lines
        connectivityLines = []; // Clear current connectivity lines
        showVisibility = false; // Turn off their display state
        showConnectivity = false; // Turn off their display state
        redraw();
        return;
    }

    // If heatmap is not showing, generate and display it.
    // 1. Generate Visibility Lines (this will populate visibilityLines array)
    generateVisibilityLines(); 
    
    // Check if visibility lines were successfully generated
    // (This check is useful, but even if 0 lines, we still want to show the polygon's cells)
    // if (visibilityLines.length === 0) {
    //     showMessageBox('No visibility lines generated. Ensure the polygon is suitable for visibility analysis.');
    //     showHeatmap = false; // Make sure heatmap is off if no lines
    //     redraw();
    //     return;
    // }

    // Clear other analysis renderings and state that conflict with heatmap
    connections = []; // Turn off "Complex Nodes" lines
    connectivityLines = []; // Clear connectivity lines
    showConnectivity = false; // Turn off connectivity display state
    // We intentionally do NOT clear visibilityLines here, as they are the source for the heatmap
    // And we keep showVisibility = false, as the heatmap replaces the raw lines visual.

    // Prepare for heatmap calculation
    analysisGrid = [];
    maxCrossingCount = 0;
    showHeatmap = true; // Turn on heatmap display

    const spacing = 0.1; // 0.1 meters cell size

    // Determine the bounding box of the main polygon
    const minX = Math.min(...mainPolygon.map(p => p.x));
    const maxX = Math.max(...mainPolygon.map(p => p.x));
    const minY = Math.min(...mainPolygon.map(p => p.y));
    const maxY = Math.max(...mainPolygon.map(p => p.y));

    // Initialize grid for counting crossings, ensuring all cells within the polygon are included
    const grid = {}; 
    
    // First pass: Populate the grid with all cells inside the polygon, initialized to 0
    // Iterate over the bounding box with the defined spacing
    for (let x = Math.floor(minX / spacing) * spacing; x <= maxX + spacing; x += spacing) {
        for (let y = Math.floor(minY / spacing) * spacing; y <= maxY + spacing; y += spacing) {
            const cellCenterX = x + spacing / 2;
            const cellCenterY = y + spacing / 2;
            const cellKey = `${x.toFixed(2)},${y.toFixed(2)}`;

            if (pointInPolygon({ x: cellCenterX, y: cellCenterY }, mainPolygon)) {
                grid[cellKey] = 0; // Initialize count for cells inside the polygon
            }
        }
    }

    // Second pass: Iterate over each VISIBILITY line and increment counts for crossed cells
    visibilityLines.forEach(([p1, p2]) => {
        // Sample points along the line segment
        const numSamples = Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / (spacing / 2)); // Sample every half cell
        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            const sampleX = p1.x * (1 - t) + p2.x * t;
            const sampleY = p1.y * (1 - t) + p2.y * t;

            // Determine the cell coordinates
            const cellX = Math.floor(sampleX / spacing) * spacing;
            const cellY = Math.floor(sampleY / spacing) * spacing;
            const cellKey = `${cellX.toFixed(2)},${cellY.toFixed(2)}`;

            // Only increment if the cell is part of our grid (i.e., inside the mainPolygon)
            if (grid.hasOwnProperty(cellKey)) { // Check if the cell was initialized in the first pass
                grid[cellKey]++;
            }
        }
    });

    // Convert grid object to an array of objects and find the maximum
    for (const key in grid) {
        const [x, y] = key.split(',').map(Number);
        const count = grid[key];
        analysisGrid.push({ x, y, count });
        if (count > maxCrossingCount) {
            maxCrossingCount = count;
        }
    }

    redraw();    
}


// Extend the redraw function to draw the analysis grid
// This will override the existing redraw function if placed after it.
// It's important to chain it correctly.

// Store the *current* redraw function before extending it further.
const originalRedrawForAnalysis = redraw; 
redraw = function(mouseWorld = null) {
    originalRedrawForAnalysis(mouseWorld); // Call the base redraw logic first

    // Draw the analysis grid if it exists and showHeatmap is true
    if (showHeatmap && analysisGrid.length > 0) { // Removed maxCrossingCount > 0 check to allow for all zero heatmaps
        analysisGrid.forEach(cell => {
            let percentage = 0;
            if (maxCrossingCount > 0) { // Avoid division by zero
                percentage = (cell.count / maxCrossingCount) * 100;
            }
            
            ctx.fillStyle = '#88e4ec'; // Default to black for safety

            // Color scale for the heatmap - UPDATED PERCENTAGES
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
            
            ctx.fillRect(cell.x, cell.y, 0.1, 0.1); // Draw a square for the cell (0.1m x 0.1m)
        });
    }
};
