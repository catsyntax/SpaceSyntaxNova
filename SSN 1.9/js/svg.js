/* --- SVG Import and Export Functions --- */

/**
 * Exports all currently drawn polygons to an SVG file.
 */
function exportToSVG() {
    if (allPolygons.length === 0) {
        alert("No polygons to export!");
        return;
    }

    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");

    // Calculate bounding box for all polygons to determine SVG viewBox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allPolygons.forEach(polygon => {
        polygon.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
    });

    // Add some padding to the viewBox
    const padding = 0.5; // meters
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // Set viewBox attribute: "min-x min-y width height"
    // SVG's Y-axis is typically top-to-bottom, while canvas might be bottom-to-top.
    // We'll adjust the Y coordinates during path creation to match SVG's coordinate system.
    svg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    svg.setAttribute("width", `${width}m`); // Optional: set units for better display in some viewers
    svg.setAttribute("height", `${height}m`);

    // Add a comment for attribution
    const comment = document.createComment(`
Space Syntax Nova™ 1.8.1 © 2025
Designed by Hatef Jafari Sharami. All Rights Reserved.
For scientific and academic purposes only. Commercial use is prohibited.
Please attribute the source and designer when using.
Contact: hatef@sharami.me
`);
    svg.appendChild(comment);


    allPolygons.forEach((polygon, index) => {
        const path = document.createElementNS(svgNamespace, "path");
        let d = "M "; // Move to command

        polygon.forEach((point, i) => {
            if (i === 0) {
                d += `${point.x} ${point.y}`;
            } else {
                d += ` L ${point.x} ${point.y}`; // Line to command
            }
        });
        d += " Z"; // Close path

        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "red");
        path.setAttribute("stroke-width", "0.02"); // Adjust stroke width for meters

        // Add an ID for easier identification if needed
        path.setAttribute("id", `polygon-${index + 1}`);

        svg.appendChild(path);
    });

    const svgString = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "space-syntax-nova-export.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessageBox("Polygons exported to SVG!");
}


/**
 * Imports polygons from an SVG file.
 * Only supports basic <path> elements with 'M' and 'L' commands.
 */
function importFromSVG() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".svg";

    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const svgContent = e.target.result;
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
                const paths = svgDoc.querySelectorAll("path");

                const importedPolygons = [];

                paths.forEach(path => {
                    const dAttribute = path.getAttribute("d");
                    if (dAttribute) {
                        const points = [];
                        const commands = dAttribute.match(/[MLZ][^MLZ]*/g); // Split by commands M, L, Z

                        commands.forEach(cmd => {
                            const type = cmd[0];
                            const values = cmd.substring(1).trim().split(/[\s,]+/).map(Number);

                            if (type === 'M' || type === 'L') {
                                // Assume pairs of x, y coordinates
                                for (let i = 0; i < values.length; i += 2) {
                                    points.push({ x: values[i], y: values[i + 1] });
                                }
                            }
                            // 'Z' command closes the path, no points added
                        });

                        if (points.length >= 3) { // A polygon needs at least 3 points
                            importedPolygons.push(points);
                        }
                    }
                });

                if (importedPolygons.length > 0) {
                    saveState(); // Save current state before importing
                    allPolygons = importedPolygons; // Replace current polygons
                    updatePolygonListUI();
                    redraw();
                    showMessageBox(`Successfully imported ${importedPolygons.length} polygons from SVG!`);
                } else {
                    showMessageBox("No valid polygons found in the SVG file.");
                }

            } catch (error) {
                console.error("Error parsing SVG:", error);
                showMessageBox("Failed to import SVG. Please ensure it's a valid SVG file with paths.");
            }
        };
        reader.readAsText(file);
    };

    input.click();
}
