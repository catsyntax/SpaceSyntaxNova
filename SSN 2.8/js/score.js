// score.js (Updated Code)

let scorePanel = null;
let isDraggingScorePanel = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function showScorePanel() {
  if (!scorePanel) createScorePanel();
  calculateAndDisplayScore();
  scorePanel.style.display = 'block';
  exportCanvasImage();
}

function createScorePanel() {
  scorePanel = document.createElement('div');
  scorePanel.id = 'score-panel';
  scorePanel.className = 'floating-box';
  scorePanel.innerHTML = `
   <div id="score-header">
  <div class="score-title"><b>Score Report</b></div>
  <div class="score-controls">
    <button class="control-button" id="minimize-score-btn">–</button>
    <button class="control-button" onclick="printScorePanel()">🖨️</button>
    <button class="control-button" onclick="scorePanel.style.display='none'">X</button>
  </div>
</div>
    <div id="score-content">
      <canvas id="score-chart" width="360" height="140"></canvas>
<table>
        <thead><tr><th>Metric</th><th>Score</th><th>Interpretation</th></tr></thead>
        <tbody id="score-table-body"></tbody>
      </table>
      
<div style="display: flex; gap: 10px; margin-top: 10px;">
  </div>
<div id="score-summary"></div>
    </div>
  `;
  document.body.appendChild(scorePanel);

  const header = scorePanel.querySelector('#score-header');
  header.addEventListener('mousedown', (e) => {
    isDraggingScorePanel = true;
    dragOffsetX = e.clientX - scorePanel.getBoundingClientRect().left;
    dragOffsetY = e.clientY - scorePanel.getBoundingClientRect().top;
    scorePanel.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDraggingScorePanel) return;
    const x = Math.max(0, e.clientX - dragOffsetX);
    const y = Math.max(0, e.clientY - dragOffsetY);
    scorePanel.style.left = `${x}px`;
    scorePanel.style.top = `${y}px`;
  });

  document.addEventListener('mouseup', () => {
    isDraggingScorePanel = false;
    if (scorePanel) scorePanel.style.cursor = 'grab';
  });

  const minimizeBtn = scorePanel.querySelector('#minimize-score-btn');
  minimizeBtn.addEventListener('click', () => {
    scorePanel.classList.toggle('minimized');
    minimizeBtn.textContent = scorePanel.classList.contains('minimized') ? '+' : '–';
  });
}

function calculateAndDisplayScore() {
  if (!analysisGrid || analysisGrid.length === 0) {
    console.warn("No heatmap data available.");
    const zeroData = [
      { label: "Visibility", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Connectivity", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Integration", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Clustering", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Betweenness", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Weighted Conn.", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Isovist Score", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Total Score", value: 0, explain: "Very Poor – fragmented layout" }
    ];
    const tableBody = document.getElementById('score-table-body');
    tableBody.innerHTML = zeroData.map(row => `
      <tr><td>${row.label}</td><td>${Math.round(row.value)}/100</td><td>${row.explain}</td></tr>
    `).join('');
    document.getElementById('score-summary').innerHTML = `
      <p><b>Total Score:</b> 0/100</p>
      <p style="border-bottom: 1px solid; padding-bottom: 15px;"><b>Conclusion:</b> Very Poor – fragmented layout</p>
      <p><b>Metric Definitions:</b><br></p><p style="font-size: 12px">
        <b>Visibility:</b> How visually accessible the space is overall.<br>
        <b>Connectivity:</b> How many points can be reached within 2 steps.<br>
        <b>Integration:</b> How easily one can reach other spaces (radius-3).<br>
        <b>Clustering:</b> How interconnected each point’s neighbors are.<br>
        <b>Betweenness:</b> How central a point is on shortest paths.<br>
        <b>Weighted Conn.:</b> Connection strength, penalizing distance.<br>
        <b>Isovist Score:</b> How much can be seen from a point (360°).<br><br>
      </p>
    `;
    drawScoreChart(zeroData);
    return;
  }

  // Ensure connectivityLines are generated if not already
  if (!connectivityLines || connectivityLines.length === 0) {
    if (typeof generateConnectivityLines === 'function') {
      generateConnectivityLines();
    } else {
      console.warn("generateConnectivityLines() function not found. Connectivity metrics might be inaccurate.");
    }
  }

  if (!connectivityLines || connectivityLines.length === 0) {
    console.warn("No connectivity lines available for graph analysis.");
    const zeroData = [
      { label: "Visibility", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Connectivity", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Integration", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Clustering", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Betweenness", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Weighted Conn.", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Isovist Score", value: 0, explain: "Very Poor – fragmented layout" },
      { label: "Total Score", value: 0, explain: "Very Poor – fragmented layout" }
    ];
    const tableBody = document.getElementById('score-table-body');
    tableBody.innerHTML = zeroData.map(row => `
      <tr><td>${row.label}</td><td>${Math.round(row.value)}/100</td><td>${row.explain}</td></tr>
    `).join('');
    document.getElementById('score-summary').innerHTML = `
      <p><b>Total Score:</b> 0/100</p>
      <p style="border-bottom: 1px solid; padding-bottom: 15px;"><b>Conclusion:</b> Very Poor – fragmented layout</p>
      <p><b>Metric Definitions:</b><br></p><p style="font-size: 12px">
        <b>Visibility:</b> How visually accessible the space is overall.<br>
        <b>Connectivity:</b> How many points can be reached within 2 steps.<br>
        <b>Integration:</b> How easily one can reach other spaces (radius-3).<br>
        <b>Clustering:</b> How interconnected each point’s neighbors are.<br>
        <b>Betweenness:</b> How central a point is on shortest paths.<br>
        <b>Weighted Conn.:</b> Connection strength, penalizing distance.<br>
        <b>Isovist Score:</b> How much can be seen from a point (360°).<br><br>
      </p>
    `;
    drawScoreChart(zeroData);
    return;
  }

  // --- Visibility Score Calculation ---
  let maxCrossingCount = 0;
  if (analysisGrid && analysisGrid.length > 0) {
    maxCrossingCount = Math.max(...analysisGrid.map(cell => cell.count));
    if (maxCrossingCount === 0) { // Prevent division by zero if all counts are 0
        maxCrossingCount = 1;
    }
  }

  const scores = [];
  for (const cell of analysisGrid) {
    const pct = maxCrossingCount > 0 ? (cell.count / maxCrossingCount) : 0; // pct now 0-1
    let visibilityScore = pct * 100 * 2; // Directly scale to 0-100
    scores.push(Math.min(visibilityScore * 5, 100)); // Cap at 100
  }
  const visibility = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // --- Connectivity Score Calculation ---
  const pointConnectivity = new Map();
  connectivityLines.forEach(([a, b]) => {
    const keyA = `${a.x.toFixed(3)},${a.y.toFixed(3)}`;
    const keyB = `${b.x.toFixed(3)},${b.y.toFixed(3)}`;
    pointConnectivity.set(keyA, (pointConnectivity.get(keyA) || 0) + 1);
    pointConnectivity.set(keyB, (pointConnectivity.get(keyB) || 0) + 1);
  });

  const totalBoxes = pointConnectivity.size;
  let totalConnections = 0;

  pointConnectivity.forEach(count => {
    totalConnections += count;
  });

  const avgConnectivity = totalBoxes > 0 ? totalConnections / totalBoxes : 0;
  // Adjusted divisor for connectivity to allow for more variance in open spaces.
  // Assuming max possible connections for a node is around 8.
  const connectivity = Math.min((avgConnectivity / 7.5) * 100 * 0.9, 100); 

  // --- Graph Analysis for Integration, Clustering, Betweenness ---
  const graph = new Map();
  connectivityLines.forEach(([a, b]) => {
    const keyA = `${a.x.toFixed(3)},${a.y.toFixed(3)}`;
    const keyB = `${b.x.toFixed(3)},${b.y.toFixed(3)}`;
    if (!graph.has(keyA)) graph.set(keyA, []);
    if (!graph.has(keyB)) graph.set(keyB, []);
    graph.get(keyA).push(keyB);
    graph.get(keyB).push(keyA);
  });

  // Global Integration
  let integrationScoreSum = 0;
  let nodesConsideredForIntegration = 0;

  graph.forEach((_, start) => {
    const visited = new Set();
    const queue = [[start, 0]];
    let totalDepth = 0;
    let reachableNodesCount = 0;

    while (queue.length > 0) {
      const [current, depth] = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      if (current !== start) {
        totalDepth += depth;
        reachableNodesCount++;
      }
      const neighbors = graph.get(current) || [];
      neighbors.forEach(n => {
        if (!visited.has(n)) queue.push([n, depth + 1]);
      });
    }

    if (reachableNodesCount > 0) {
      const meanDepth = totalDepth / reachableNodesCount;
      integrationScoreSum += (1 / meanDepth);
      nodesConsideredForIntegration++;
    }
  });

  const globalIntegration = nodesConsideredForIntegration > 0 ?
    Math.min((integrationScoreSum / nodesConsideredForIntegration) * 400 * 3, 100) : 0; 

  // Clustering Coefficient
  let clusteringSum = 0;
  graph.forEach((neighbors, node) => {
    if (neighbors.length < 2) return;
    let links = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const ni = neighbors[i];
        const nj = neighbors[j];
        if ((graph.get(ni) || []).includes(nj)) {
          links++;
        }
      }
    }
    const maxLinks = (neighbors.length * (neighbors.length - 1)) / 2;
    if (maxLinks > 0) {
        clusteringSum += links / maxLinks;
    }
  });

  const clusteringCoefficient = graph.size > 0 ? (clusteringSum / graph.size) * 100 * 1.5: 0;

  // Betweenness Centrality
  const nodeList = Array.from(graph.keys());
  const betweennessScores = new Map();
  nodeList.forEach(n => betweennessScores.set(n, 0));

  for (const s of nodeList) {
    const S = [];
    const P = new Map();
    nodeList.forEach(n => P.set(n, []));
    const sigma = new Map();
    nodeList.forEach(n => sigma.set(n, 0));
    sigma.set(s, 1);
    const d = new Map();
    nodeList.forEach(n => d.set(n, -1));
    d.set(s, 0);

    const Q = [s];
    while (Q.length > 0) {
      const v = Q.shift();
      S.push(v);
      for (const w of (graph.get(v) || [])) {
        if (d.get(w) < 0) {
          d.set(w, d.get(v) + 1);
          Q.push(w);
        }
        if (d.get(w) === d.get(v) + 1) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          P.get(w).push(v);
        }
      }
    }

    const delta = new Map();
    nodeList.forEach(n => delta.set(n, 0));

    while (S.length > 0) {
      const w = S.pop();
      for (const v of P.get(w)) {
        delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
      }
      if (w !== s) {
        betweennessScores.set(w, betweennessScores.get(w) + delta.get(w));
      }
    }
  }

  let totalNormalizedBetweenness = 0;
  const numNodes = nodeList.length;
  if (numNodes > 2) {
    nodeList.forEach(node => {
      const rawBetweenness = betweennessScores.get(node);
      const maxPossibleForSingleNode = ((numNodes - 1) * (numNodes - 2)) / 2;
      if (maxPossibleForSingleNode > 0) {
        totalNormalizedBetweenness += (rawBetweenness / maxPossibleForSingleNode);
      }
    });
    var betweennessCentrality = (totalNormalizedBetweenness / numNodes) * 500 * 5; 
  } else {
    var betweennessCentrality = 0;
  }
  betweennessCentrality = Math.min(betweennessCentrality, 100);

  // Weighted Connectivity
  let weightedConnectivitySum = 0;
  let weightedConnectionCount = 0;

  connectivityLines.forEach(([a, b]) => {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const weight = 1 / (dist + 0.001);
    weightedConnectivitySum += weight;
    weightedConnectionCount++;
  });

  const weightedConnectivity = weightedConnectionCount > 0 ? (weightedConnectivitySum / weightedConnectionCount) * 45 : 0;
  const weightedConnectivityClamped = Math.min(weightedConnectivity, 100);

  // Isovist Score 
  const isovistScores = new Map();
  const resolution = 16;
  const radius = 1.5;

  graph.forEach((_, node) => {
    const [x, y] = node.split(',').map(Number);
    let visibleRays = 0;
    for (let i = 0; i < resolution; i++) {
      const angle = (i / resolution) * 2 * Math.PI;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      const end = { x: x + dx, y: y + dy };
      if (typeof crossesAnyPolygonEdge === 'function' && !crossesAnyPolygonEdge({ x, y }, end)) {
        visibleRays++;
      } else if (typeof crossesAnyPolygonEdge !== 'function') {
        console.warn("crossesAnyPolygonEdge() function not found. Isovist score might be inaccurate.");
        visibleRays = resolution;
      }
    }
    isovistScores.set(node, visibleRays / resolution);
  });

  const avgIsovist = isovistScores.size > 0 ? Array.from(isovistScores.values()).reduce((a, b) => a + b, 0) / isovistScores.size : 0;
  const isovistScore = avgIsovist * 100; 

  // Total Score (weighting is subjective, keeping original weights)
  const total = Math.round(
    (visibility * 0.2) +
    (connectivity * 0.2) +
    (globalIntegration * 0.2) +
    (clusteringCoefficient * 0.2) +
    (betweennessCentrality * 0.1) +
    (weightedConnectivityClamped * 0.05) +
    (isovistScore * 0.05)
  );

  const interpret = (score) => {
    if (score >= 80) return "Excellent – highly integrated layout";
    if (score >= 60) return "Good – mostly open and accessible";
    if (score >= 40) return "Moderate – partially connected";
    if (score >= 20) return "Poor – visual or spatial limitations";
    return "Very Poor – fragmented layout";
  };

  const data = [
    { label: "Visibility", value: visibility, explain: interpret(visibility) },
    { label: "Connectivity", value: connectivity, explain: interpret(connectivity) },
    { label: "Integration", value: globalIntegration, explain: interpret(globalIntegration) },
    { label: "Clustering", value: clusteringCoefficient, explain: interpret(clusteringCoefficient) },
    { label: "Betweenness", value: betweennessCentrality, explain: interpret(betweennessCentrality) },
    { label: "Weighted Conn.", value: weightedConnectivityClamped, explain: interpret(weightedConnectivityClamped) },
    { label: "Isovist Score", value: isovistScore, explain: interpret(isovistScore) },
    { label: "Total Score", value: total, explain: interpret(total) }
  ];

  const tableBody = document.getElementById('score-table-body');
  tableBody.innerHTML = data.map(row => `
    <tr><td>${row.label}</td><td>${Math.round(row.value)}/100</td><td>${row.explain}</td></tr>
  `).join('');

  document.getElementById('score-summary').innerHTML = `
    <p><b>Total Score:</b> ${total}/100</p>
    <p style="border-bottom: 1px solid; padding-bottom: 15px;"><b>Conclusion:</b> ${interpret(total)}</p>
    
      <p><b>Metric Definitions:</b><br></p><p style="font-size: 12px">
        <b>Visibility:</b> How visually accessible the space is overall.<br>
        <b>Connectivity:</b> How many points can be reached within 2 steps.<br>
        <b>Integration:</b> How easily one can reach other spaces (radius-3).<br>
        <b>Clustering:</b> How interconnected each point’s neighbors are.<br>
        <b>Betweenness:</b> How central a point is on shortest paths.<br>
        <b>Weighted Conn.:</b> Connection strength, penalizing distance.<br>
        <b>Isovist Score:</b> How much can be seen from a point (360°).<br><br>
      </p>
  `;

  drawScoreChart(data);
}

function drawScoreChart(data) {
  const container = document.getElementById('score-chart');
  if (!container) return;

  // Clear the canvas and replace it with a styled HTML container
  const parent = container.parentElement;
  container.remove();

  const newDiv = document.createElement('div');
  newDiv.id = 'score-chart';
  newDiv.style.display = 'flex';
  newDiv.style.flexDirection = 'column';
  newDiv.style.gap = '10px';
  newDiv.style.marginBottom = '15px';

  data.slice(0, 7).forEach(d => {
    const barContainer = document.createElement('div');
    barContainer.style.width = '100%';
    barContainer.style.background = '#eee';
    barContainer.style.borderRadius = '8px';
    barContainer.style.position = 'relative';
    barContainer.style.height = '22px';

    const bar = document.createElement('div');
    bar.style.width = `${Math.round(d.value)}%`;
    bar.style.height = '100%';
    const gradients = {
  "Visibility": "linear-gradient(to right, #00c8ff, #0045ff",
  "Connectivity": "linear-gradient(to right, #00c8ff, #0045ff",
  "Integration": "linear-gradient(to right, #00c8ff, #0045ff",
  "Clustering": "linear-gradient(to right, #00c8ff, #0045ff",
  "Betweenness": "linear-gradient(to right, #00c8ff, #0045ff",
  "Weighted Conn.": "linear-gradient(to right, #00c8ff, #0045ff",
  "Isovist Score": "linear-gradient(to right, #00c8ff, #0045ff"
};

bar.style.background = gradients[d.label] || "linear-gradient(to right, #4b6cb7, #182848)";

    bar.style.borderRadius = '999px';

    const label = document.createElement('span');
    label.textContent = `${d.label}`;
    label.style.position = 'absolute';
    label.style.left = '10px';
    label.style.top = '50%';
    label.style.transform = 'translateY(-50%)';
    label.style.fontSize = '12px';
    label.style.color = '#000';

    const valueTag = document.createElement('div');
    valueTag.textContent = `${Math.round(d.value)}%`;
    valueTag.style.position = 'absolute';
    valueTag.style.right = '10px';
    valueTag.style.top = '50%';
    valueTag.style.transform = 'translateY(-50%)';
    valueTag.style.background = '#000';
    valueTag.style.color = '#fff';
    valueTag.style.padding = '2px 6px';
    valueTag.style.borderRadius = '4px';
    valueTag.style.fontSize = '12px';

    barContainer.appendChild(bar);
    barContainer.appendChild(label);
    barContainer.appendChild(valueTag);
    newDiv.appendChild(barContainer);
  });

  parent.insertBefore(newDiv, parent.firstChild);
}

function printScorePanel() {
  const win = window.open('', '_blank');
  win.document.write('<html><head><title>SSN Score Report</title><style>');
  win.document.write(`
    body { font-family: Arial; margin: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid black; padding: 8px; text-align: center; }
    h3 { margin-top: 0; }
  `);
  win.document.write('</style></head><body>');
  win.document.write(scorePanel.innerHTML);
  win.document.write('</body></html>');
  win.document.close();
  win.print();
}

function exportCanvasImage() {
  if (typeof redraw === 'function' && typeof canvas !== 'undefined') {
    redraw(null, true);
    requestAnimationFrame(() => {
      const dataURL = canvas.toDataURL('image/png');
      const img = document.createElement('img');
      img.src = dataURL;
      img.style.maxWidth = '100%';
      img.style.border = '1px solid #ccc';
      img.style.marginTop = '10px';
      const scoreContent = document.getElementById('score-content');
      if (scoreContent) {
        const existing = scoreContent.querySelector('img');
        if (existing) existing.remove();
        scoreContent.appendChild(img);
      }
      redraw();
    });
  } else {
    console.warn("Canvas or redraw function not found for image export.");
  }
}