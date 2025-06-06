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

