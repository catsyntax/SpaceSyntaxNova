// --- Floating Polygon List Box Functionality ---
const polygonListBox = document.getElementById('polygon-list-box');
const polygonListHeader = document.getElementById('polygon-list-header');
const polygonListContent = document.getElementById('polygon-list-content');
const minimizePolygonListBtn = document.getElementById('minimize-polygon-list');
const closePolygonListBtn = document.getElementById('close-polygon-list');
const polygonListUl = document.getElementById('polygon-list');
const polygonCountSpan = document.getElementById('polygon-count');

let isDraggingListBox = false;
let dragOffsetX, dragOffsetY;

// Update the polygon list in the floating box
function updatePolygonList() {
  polygonListUl.innerHTML = ''; // Clear existing list items
  polygonCountSpan.textContent = `(${allPolygons.length})`;

  allPolygons.forEach((polyObj, index) => { // polyObj is the { points: [], hidden: false } object
    const listItem = document.createElement('li');
    
    // Calculate details for each polygon
    const area = polygonArea(polyObj).toFixed(2); // Use the existing polygonArea function
    const perimeter = polygonPerimeter(polyObj).toFixed(2); // Use the existing polygonPerimeter function
    const edges = polyObj.points.length; // Number of edges is the number of points

    // Create a span for the polygon name
    const polygonNameSpan = document.createElement('span');
    polygonNameSpan.classList.add('polygon-name');
    polygonNameSpan.textContent = `Polygon ${index + 1}`;
    
    // Create a span for the polygon details
    const polygonDetailSpan = document.createElement('span');
    polygonDetailSpan.classList.add('polygon-details');
    polygonDetailSpan.textContent = `Area: ${area} m², Perim: ${perimeter} m, Edges: ${edges}`;

    // Add 'selected' class to the name span if the polygon is selected
    if (selectedPolygonsIndices.includes(index)) {
      polygonNameSpan.classList.add('selected');
    }

    // Attach click listener to the name span for selection
    polygonNameSpan.onclick = (e) => {
      // Allow multi-selection with Shift key from the list
      if (e.shiftKey) {
        const indexInSelection = selectedPolygonsIndices.indexOf(index);
        if (indexInSelection > -1) {
          selectedPolygonsIndices.splice(indexInSelection, 1);
        } else {
          selectedPolygonsIndices.push(index);
        }
      } else {
        selectedPolygonsIndices = [index]; // Single selection
      }
      redraw(); // Redraw to highlight selection on canvas and update list
    };

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('polygon-actions');

    const hideButton = document.createElement('button');
    hideButton.classList.add('hide-button');
    hideButton.textContent = polyObj.hidden ? 'Show' : 'Hide'; // Set initial text based on state
    hideButton.onclick = () => {
      polyObj.hidden = !polyObj.hidden; // Toggle the hidden state
      hideButton.textContent = polyObj.hidden ? 'Show' : 'Hide'; // Update button text
      redraw(); // Redraw the canvas to reflect the change
      // No need to call updatePolygonList() explicitly here as redraw() now calls it.
    };

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
      saveState(); // Save state before deletion
      allPolygons.splice(index, 1);
      // Remove this polygon's index from selectedPolygonsIndices if it was selected
      selectedPolygonsIndices = selectedPolygonsIndices.filter(selectedIndex => selectedIndex !== index);
      // Adjust other selected indices if they are higher than the deleted one
      selectedPolygonsIndices = selectedPolygonsIndices.map(selectedIndex => {
        if (selectedIndex > index) return selectedIndex - 1;
        return selectedIndex;
      });
      connections = [];
      visibilityLines = [];
      connectivityLines = [];
      showVisibility = false;
      showConnectivity = false;
      showHeatmap = false;
      analysisGrid = [];
      maxCrossingCount = 0;
      redraw(); // Refresh the list and canvas
      showMessageBox(`Polygon ${index + 1} deleted.`);
    };

    actionsDiv.appendChild(hideButton); 
    actionsDiv.appendChild(deleteButton);
    listItem.appendChild(polygonNameSpan); // Append the name span
    listItem.appendChild(polygonDetailSpan); // Append the detail span
    listItem.appendChild(actionsDiv); // Append the actions div
    polygonListUl.appendChild(listItem);
  });
}

// Draggable functionality
polygonListHeader.addEventListener('mousedown', (e) => {
  isDraggingListBox = true;
  dragOffsetX = e.clientX - polygonListBox.getBoundingClientRect().left;
  dragOffsetY = e.clientY - polygonListBox.getBoundingClientRect().top;
  polygonListBox.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (!isDraggingListBox) return;
  // Ensure the box stays within viewport boundaries
  const newX = e.clientX - dragOffsetX;
  const newY = e.clientY - dragOffsetY;

  const maxX = window.innerWidth - polygonListBox.offsetWidth;
  const maxY = window.innerHeight - polygonListBox.offsetHeight;

  polygonListBox.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
  polygonListBox.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
});

document.addEventListener('mouseup', () => {
  isDraggingListBox = false;
  polygonListBox.style.cursor = 'grab';
});

// Minimize/Maximize functionality
minimizePolygonListBtn.addEventListener('click', () => {
  polygonListBox.classList.toggle('minimized');
  if (polygonListBox.classList.contains('minimized')) {
    minimizePolygonListBtn.textContent = '+'; // Change button text to indicate expand
  } else {
    minimizePolygonListBtn.textContent = '-'; // Change button text to indicate minimize
  }
});

// Close functionality
// closePolygonListBtn.addEventListener('click', () => { // This button is not present in the HTML
//   polygonListBox.style.display = 'none';
// });

// Initial update of the list when the page loads
document.addEventListener('DOMContentLoaded', updatePolygonList);

function updatePolygonListUI() {
    const polygonList = document.getElementById('polygon-list');
    polygonList.innerHTML = ''; // Clear old list

    allPolygons.forEach((poly, index) => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'polygon-name';
        nameSpan.textContent = `Polygon ${index + 1}`;
        if (index === selectedPolygonIndex) {
            nameSpan.classList.add('selected');
        }

        const details = document.createElement('span');
        details.className = 'polygon-details';
        details.textContent = `Edges: ${poly.length}, Area: ${polygonArea(poly).toFixed(2)} m²`;

        const actions = document.createElement('div');
        actions.className = 'polygon-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
            allPolygons.splice(index, 1);
            updatePolygonListUI();
            redraw();
        };

        actions.appendChild(deleteBtn);
        li.appendChild(nameSpan);
        li.appendChild(details);
        li.appendChild(actions);
        polygonList.appendChild(li);
    });

    document.getElementById('polygon-count').textContent = `(${allPolygons.length})`;
}
