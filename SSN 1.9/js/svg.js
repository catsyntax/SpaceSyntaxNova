/* --- SVG Import and Export Functions --- */

function exportToSVG() {
    if (allPolygons.length === 0) {
        alert("No polygons to export!");
        return;
    }

    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allPolygons.forEach(polygon => {
        polygon.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
    });

    const padding = 0.5;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    svg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    svg.setAttribute("width", `${width}m`);
    svg.setAttribute("height", `${height}m`);

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
        let d = "M ";
        polygon.forEach((point, i) => {
            if (i === 0) {
                d += `${point.x} ${point.y}`;
            } else {
                d += ` L ${point.x} ${point.y}`;
            }
        });
        d += " Z";

        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "red");
        path.setAttribute("stroke-width", "0.02");
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

                const svgToMeterScaleFactor = 1 / 28.35;

                const applyTransformations = (points, transformAttribute) => {
                    if (!transformAttribute) return points;

                    let transformedPoints = [...points];
                    const transformFunctions = transformAttribute.match(/(\w+\s*\([^)]+\))/g);
                    if (!transformFunctions) return transformedPoints;

                    transformFunctions.forEach(func => {
                        if (func.startsWith("translate(")) {
                            const match = func.match(/translate\(([^)]+)\)/);
                            if (match) {
                                const values = match[1].split(/[, ]+/).map(Number);
                                const tx = (values[0] || 0) * svgToMeterScaleFactor;
                                const ty = (values[1] || 0) * svgToMeterScaleFactor;

                                transformedPoints = transformedPoints.map(point => ({
                                    x: point.x + tx,
                                    y: point.y + ty
                                }));
                            }
                        } else if (func.startsWith("rotate(")) {
                            const match = func.match(/rotate\(([^)]+)\)/);
                            if (match) {
                                const rotateValues = match[1].split(/[, ]+/).map(Number);
                                const angle = rotateValues[0] * Math.PI / 180;
                                let cx, cy;
                                if (rotateValues.length === 3) {
                                    cx = rotateValues[1] * svgToMeterScaleFactor;
                                    cy = rotateValues[2] * svgToMeterScaleFactor;
                                } else {
                                    const minX = Math.min(...transformedPoints.map(p => p.x));
                                    const minY = Math.min(...transformedPoints.map(p => p.y));
                                    const maxX = Math.max(...transformedPoints.map(p => p.x));
                                    const maxY = Math.max(...transformedPoints.map(p => p.y));
                                    cx = minX + (maxX - minX) / 2;
                                    cy = minY + (maxY - minY) / 2;
                                }

                                transformedPoints = transformedPoints.map(point => {
                                    const dx = point.x - cx;
                                    const dy = point.y - cy;
                                    return {
                                        x: dx * Math.cos(angle) - dy * Math.sin(angle) + cx,
                                        y: dx * Math.sin(angle) + dy * Math.cos(angle) + cy
                                    };
                                });
                            }
                        }
                    });

                    return transformedPoints;
                };

                // --- New: Parse <style> block to map class selectors to inline styles ---
                const classStyleMap = {};
                const styleTags = svgDoc.querySelectorAll("style");

                styleTags.forEach(styleTag => {
                    const cssText = styleTag.textContent;
                    const regex = /\.([\w-]+)\s*{([^}]+)}/g;
                    let match;
                    while ((match = regex.exec(cssText)) !== null) {
                        const className = match[1];
                        const styles = match[2].trim();
                        classStyleMap[className] = styles;
                    }
                });

                // --- Helper to apply class styles as inline style attribute ---
                const applyClassStyles = (element) => {
                    const classAttr = element.getAttribute("class");
                    if (!classAttr) return;
                    const classNames = classAttr.split(/\s+/);
                    let combinedStyle = "";
                    classNames.forEach(cls => {
                        if (classStyleMap[cls]) {
                            combinedStyle += classStyleMap[cls] + "; ";
                        }
                    });
                    if (combinedStyle.trim()) {
                        element.setAttribute("style", combinedStyle.trim());
                    }
                };

                // Process polygons
                const polygons = svgDoc.querySelectorAll("polygon");
                polygons.forEach(polygon => {
                    applyClassStyles(polygon);
                    const pointsAttribute = polygon.getAttribute("points");
                    const transformAttribute = polygon.getAttribute("transform");
                    if (pointsAttribute) {
                        const values = pointsAttribute.trim().split(/[\s,]+/).map(Number);
                        const polygonPoints = [];
                        for (let i = 0; i < values.length; i += 2) {
                            polygonPoints.push({ x: values[i] * svgToMeterScaleFactor, y: values[i + 1] * svgToMeterScaleFactor });
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

                // (Optional: Also extend <path>, <rect>, <circle> to support class styles in future)

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
