function importFromDXF() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".dxf";
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const parser = new window.DxfParser();
                const dxf = parser.parseSync(text);

                console.log("DXF entity count:", dxf.entities.length);
                console.log("All DXF entities:", dxf.entities);

                const polygons = [];

                dxf.entities.forEach(entity => {
                    if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
                        const points = entity.vertices.map(v => ({
                            x: v.x ,
                            y: v.y 
                        }));
                        if (points.length >= 2) polygons.push(points);
                    }

                    if (entity.type === "LINE") {
                        if (
                            typeof entity.x1 === "number" &&
                            typeof entity.y1 === "number" &&
                            typeof entity.x2 === "number" &&
                            typeof entity.y2 === "number"
                        ) {
                            polygons.push([
                                { x: entity.x1 , y: entity.y1  },
                                { x: entity.x2 , y: entity.y2  }
                            ]);
                        }
                    }

                    if (entity.type === "ARC") {
                        const startAngle = entity.startAngle;
                        const endAngle = entity.endAngle;
                        const radius = entity.radius ;
                        const cx = entity.center.x ;
                        const cy = entity.center.y ;

                        const segments = 8;
                        const arcPoints = [];

                        let normalizedStart = startAngle;
                        let normalizedEnd = endAngle;

                        if (normalizedEnd < normalizedStart) {
                            normalizedEnd += 2 * Math.PI;
                        }

                        const angleStep = (normalizedEnd - normalizedStart) / segments;

                        for (let i = 0; i <= segments; i++) {
                            const currentAngle = normalizedStart + i * angleStep;
                            const x = cx + radius * Math.cos(currentAngle);
                            const y = cy + radius * Math.sin(currentAngle);
                            arcPoints.push({ x, y });
                        }

                        if (arcPoints.length >= 2) {
                            polygons.push(arcPoints);
                        }
                    }

                    if (entity.type === "SPLINE") {
                        const allPoints = [];
                        const rawPoints = (entity.fitPoints?.length ? entity.fitPoints : [])
                            .concat(entity.controlPoints?.length ? entity.controlPoints : []);

                        rawPoints.forEach(p => {
                            if (typeof p.x === "number" && typeof p.y === "number") {
                                allPoints.push({ x: p.x , y: p.y  });
                            }
                        });

                        if (allPoints.length > 1) {
                            polygons.push(allPoints);
                        } else {
                            console.warn("SPLINE has too few usable points to form a polygon.");
                        }
                    }

                    if (!["LWPOLYLINE", "POLYLINE", "LINE", "ARC", "SPLINE"].includes(entity.type)) {
                        console.warn(`Unhandled DXF entity type: ${entity.type}`);
                    }
                });

                if (polygons.length > 0) {
                    console.log("Parsed polygons:", polygons);
                    saveState();
                    allPolygons = allPolygons.concat(polygons);
                    updatePolygonListUI();
                    redraw();
                    showMessageBox(`Imported ${polygons.length} DXF polygon(s)!`);
                } else {
                    showMessageBox("No polygons found in DXF.");
                }
            } catch (err) {
                console.error("DXF parsing failed:", err.message);
                showMessageBox("Failed to parse DXF.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}


function exportToDXF() {
    let dxfString = `0\nSECTION\n2\nENTITIES\n`;

    allPolygons.forEach(poly => {
        if (poly.length < 3) return; // Only export valid closed polygons

        dxfString += `0\nPOLYLINE\n8\n0\n66\n1\n70\n1\n`; // 70=1 means closed

        poly.forEach(p => {
            dxfString += `0\nVERTEX\n8\n0\n`;
            dxfString += `10\n${p.x.toFixed(6)}\n`;
            dxfString += `20\n${p.y.toFixed(6)}\n`;
            dxfString += `30\n0.0\n`; // Flat on Z
        });

        dxfString += `0\nSEQEND\n`;
    });

    dxfString += `0\nENDSEC\n0\nEOF`;

    const blob = new Blob([dxfString], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exported_map.dxf";
    link.click();
    URL.revokeObjectURL(url);
}
