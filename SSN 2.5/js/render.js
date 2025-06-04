
let analysisGrid = [];
let maxCrossingCount = 0;
let showHeatmap = false;

function renderAnalysis() {
    const mainPolygon = getLargestPolygon();
    if (!mainPolygon || mainPolygon.length < 3) {
        showMessageBox('Please draw at least one polygon first to perform analysis.');
        return;
    }

    if (showHeatmap) {
        analysisGrid = [];
        maxCrossingCount = 0;
        showHeatmap = false;
        connections = [];
        visibilityLines = [];
        connectivityLines = [];
        showVisibility = false;
        showConnectivity = false;
        redraw();
        return;
    }

    generateVisibilityLines();

    connections = [];
    connectivityLines = [];
    showConnectivity = false;

    analysisGrid = [];
    maxCrossingCount = 0;
    showHeatmap = true;

    const spacing = 0.1;

    const minX = Math.min(...mainPolygon.map(p => p.x));
    const maxX = Math.max(...mainPolygon.map(p => p.x));
    const minY = Math.min(...mainPolygon.map(p => p.y));
    const maxY = Math.max(...mainPolygon.map(p => p.y));

    const grid = {};

    for (let x = Math.floor(minX / spacing) * spacing; x <= maxX + spacing; x += spacing) {
        for (let y = Math.floor(minY / spacing) * spacing; y <= maxY + spacing; y += spacing) {
            const cellCenterX = x + spacing / 2;
            const cellCenterY = y + spacing / 2;
            const cellKey = `${x.toFixed(2)},${y.toFixed(2)}`;
            if (pointInPolygon({ x: cellCenterX, y: cellCenterY }, mainPolygon)) {
                grid[cellKey] = 0;
            }
        }
    }

    visibilityLines.forEach(([p1, p2]) => {
        const numSamples = Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / (spacing / 2));
        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            const sampleX = p1.x * (1 - t) + p2.x * t;
            const sampleY = p1.y * (1 - t) + p2.y * t;
            const cellX = Math.floor(sampleX / spacing) * spacing;
            const cellY = Math.floor(sampleY / spacing) * spacing;
            const cellKey = `${cellX.toFixed(2)},${cellY.toFixed(2)}`;
            if (grid.hasOwnProperty(cellKey)) {
                grid[cellKey]++;
            }
        }
    });

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

const originalRedrawForAnalysis = redraw;
redraw = function(mouseWorld = null) {
    originalRedrawForAnalysis(mouseWorld);

    if (showHeatmap && analysisGrid.length > 0) {
        const spacing = 0.1;

        // Step 1: draw heatmap normally
        analysisGrid.forEach(cell => {
            let percentage = 0;
            if (maxCrossingCount > 0) {
                percentage = (cell.count / maxCrossingCount) * 100;
            }

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
            } else {
                ctx.fillStyle = '#b4e1f'; // fallback
            }

            ctx.fillRect(cell.x, cell.y, spacing, spacing);
        });

        // Step 2: overlay white on cells in non-main polygons
        const mainPolygon = getLargestPolygon();
        const otherPolygons = allPolygons.filter(p => p !== mainPolygon);

        analysisGrid.forEach(cell => {
            const cx = cell.x + spacing / 2;
            const cy = cell.y + spacing / 2;
            const center = { x: cx, y: cy };


        });
    }
};
