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
 * Supports basic <path>, <polygon>, <rect>, and <circle> elements.
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

                const importedPolygons = [];

                // Define a scaling factor: 1 SVG unit = 1/28.35 meters
                // This assumes the SVG was designed where 28.35 units represent 1 meter.
                const svgToMeterScaleFactor = 1 / 28.35;

                // Helper function to apply transformations to a set of points
                const applyTransformations = (points, transformAttribute) => {
                    if (!transformAttribute) return points;

                    let transformedPoints = [...points];

                    // Parse individual transform functions (e.g., translate(x,y) rotate(a))
                    const transformFunctions = transformAttribute.match(/(\w+\s*\([^)]+\))/g);
                    if (!transformFunctions) return transformedPoints;

                    transformFunctions.forEach(func => {
                        if (func.startsWith("translate(")) {
                            const match = func.match(/translate\(([^)]+)\)/);
                            if (match) {
                                const values = match[1].split(/[,\\s]+/).map(Number);
                                const tx = (values[0] || 0) * svgToMeterScaleFactor;
                                const ty = (values[1] || 0) * svgToMeterScaleFactor; // ty is optional, defaults to 0

                                transformedPoints = transformedPoints.map(point => ({
                                    x: point.x + tx,
                                    y: point.y + ty
                                }));
                            }
                        } else if (func.startsWith("rotate(")) {
                            const match = func.match(/rotate\(([^)]+)\)/);
                            if (match) {
                                const rotateValues = match[1].split(/[,\\s]+/).map(Number);
                                const angle = rotateValues[0] * Math.PI / 180; // Convert to radians
                                // For rotation, we need a center of rotation.
                                // If not provided, it's usually (0,0) or the element's local origin.
                                // Here, we'll try to use the bounding box center for a more intuitive rotation.
                                // This is a simplification and might not perfectly match SVG's behavior for all cases.
                                let cx, cy;
                                if (rotateValues[1] !== undefined && rotateValues[2] !== undefined) {
                                    cx = rotateValues[1] * svgToMeterScaleFactor;
                                    cy = rotateValues[2] * svgToMeterScaleFactor;
                                } else {
                                    // Calculate approximate center for rotation if not specified
                                    const minX = Math.min(...transformedPoints.map(p => p.x));
                                    const minY = Math.min(...transformedPoints.map(p => p.y));
                                    const maxX = Math.max(...transformedPoints.map(p => p.x));
                                    const maxY = Math.max(...transformedPoints.map(p => p.y));
                                    cx = minX + (maxX - minX) / 2;
                                    cy = minY + (maxY - minY) / 2;
                                }

                                transformedPoints = transformedPoints.map(point => {
                                    const translatedX = point.x - cx;
                                    const translatedY = point.y - cy;
                                    const rotatedX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
                                    const rotatedY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);
                                    return { x: rotatedX + cx, y: rotatedY + cy };
                                });
                            }
                        }
                        // TODO: Implement scale, skewX, skewY, matrix if needed for more complex transformations
                    });

                    return transformedPoints;
                };

                // Handle <path> elements
                const paths = svgDoc.querySelectorAll("path");
                paths.forEach(path => {
                    const dAttribute = path.getAttribute("d");
                    const transformAttribute = path.getAttribute("transform");
                    if (dAttribute) {
                        const points = [];
                        const commands = dAttribute.match(/[MLZ][^MLZ]*/g);

                        commands.forEach(cmd => {
                            const type = cmd[0];
                            const values = cmd.substring(1).trim().split(/[,\\s]+/).map(Number);

                            if (type === 'M' || type === 'L') {
                                for (let i = 0; i < values.length; i += 2) {
                                    points.push({ x: values[i] * svgToMeterScaleFactor, y: values[i + 1] * svgToMeterScaleFactor });
                                }
                            }
                        });

                        let processedPoints = points;
                        if (transformAttribute) {
                            processedPoints = applyTransformations(points, transformAttribute);
                        }

                        if (processedPoints.length >= 3) {
                            importedPolygons.push(processedPoints);
                        }
                    }
                });

                // Handle <polygon> elements
                const polygons = svgDoc.querySelectorAll("polygon");
                polygons.forEach(polygon => {
                    const pointsAttribute = polygon.getAttribute("points");
                    const transformAttribute = polygon.getAttribute("transform");
                    if (pointsAttribute) {
                        const points = pointsAttribute.trim().split(/[,\\s]+/).map(Number);
                        const polygonPoints = [];
                        for (let i = 0; i < points.length; i += 2) {
                            polygonPoints.push({ x: points[i] * svgToMeterScaleFactor, y: points[i + 1] * svgToMeterScaleFactor });
                        }

                        let processedPoints = polygonPoints;
                        if (transformAttribute) {
                            processedPoints = applyTransformations(polygonPoints, transformAttribute);
                        }

                        if (processedPoints.length >= 3) {
                            importedPolygons.push(processedPoints);
                        }
                    }
                });

                // Handle <rect> elements
                const rects = svgDoc.querySelectorAll("rect");
                rects.forEach(rect => {
                    const x = parseFloat(rect.getAttribute("x") || 0) * svgToMeterScaleFactor;
                    const y = parseFloat(rect.getAttribute("y") || 0) * svgToMeterScaleFactor;
                    const width = parseFloat(rect.getAttribute("width") || 0) * svgToMeterScaleFactor;
                    const height = parseFloat(rect.getAttribute("height") || 0) * svgToMeterScaleFactor;
                    const transformAttribute = rect.getAttribute("transform");

                    let rectPoints = [
                        { x: x, y: y },
                        { x: x + width, y: y },
                        { x: x + width, y: y + height },
                        { x: x, y: y + height }
                    ];

                    if (transformAttribute) {
                        rectPoints = applyTransformations(rectPoints, transformAttribute);
                    }
                    if (rectPoints.length >= 3) {
                        importedPolygons.push(rectPoints);
                    }
                });

                // Handle <circle> elements (approximated as a polygon)
                const circles = svgDoc.querySelectorAll("circle");
                circles.forEach(circle => {
                    const cx = parseFloat(circle.getAttribute("cx") || 0) * svgToMeterScaleFactor;
                    const cy = parseFloat(circle.getAttribute("cy") || 0) * svgToMeterScaleFactor;
                    const r = parseFloat(circle.getAttribute("r") || 0) * svgToMeterScaleFactor;
                    const transformAttribute = circle.getAttribute("transform");

                    if (r > 0) {
                        const segments = 32;
                        const circlePoints = [];
                        for (let i = 0; i < segments; i++) {
                            const angle = (i / segments) * 2 * Math.PI;
                            const x = cx + r * Math.cos(angle);
                            const y = cy + r * Math.sin(angle);
                            circlePoints.push({ x: x, y: y });
                        }

                        let processedPoints = circlePoints;
                        if (transformAttribute) {
                            processedPoints = applyTransformations(circlePoints, transformAttribute);
                        }

                        if (processedPoints.length >= 3) {
                            importedPolygons.push(processedPoints);
                        }
                    }
                });


                if (importedPolygons.length > 0) {
                    saveState();
                    allPolygons = importedPolygons;
                    updatePolygonListUI();
                    redraw();
                    showMessageBox(`Successfully imported ${importedPolygons.length} polygons from SVG!`);
                } else {
                    showMessageBox("No valid polygons found in the SVG file.");
                }

            } catch (error) {
                console.error("Error parsing SVG:", error);
                showMessageBox("Failed to import SVG. Please ensure it's a valid SVG file with paths, polygons, rectangles, or circles.");
            }
        };
        reader.readAsText(file);
    };

    input.click();
}
