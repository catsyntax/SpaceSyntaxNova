
document.addEventListener('DOMContentLoaded', () => {
  updatePolygonListUI();
});

// Make polygon list box draggable and minimizable
const polygonListBox = document.getElementById('polygon-list-box');
const polygonListHeader = document.getElementById('polygon-list-header');
const minimizePolygonListBtn = document.getElementById('minimize-polygon-list');

let isDraggingPolygonBox = false;
let dragPolygonOffsetX = 0;
let dragPolygonOffsetY = 0;

polygonListHeader.addEventListener('mousedown', (e) => {
  isDraggingPolygonBox = true;
  dragPolygonOffsetX = e.clientX - polygonListBox.getBoundingClientRect().left;
  dragPolygonOffsetY = e.clientY - polygonListBox.getBoundingClientRect().top;
  polygonListBox.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (!isDraggingPolygonBox) return;
  const newX = e.clientX - dragPolygonOffsetX;
  const newY = e.clientY - dragPolygonOffsetY;
  const maxX = window.innerWidth - polygonListBox.offsetWidth;
  const maxY = window.innerHeight - polygonListBox.offsetHeight;
  polygonListBox.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
  polygonListBox.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
});

document.addEventListener('mouseup', () => {
  isDraggingPolygonBox = false;
  polygonListBox.style.cursor = 'grab';
});

minimizePolygonListBtn.addEventListener('click', () => {
  polygonListBox.classList.toggle('minimized');
  minimizePolygonListBtn.textContent = polygonListBox.classList.contains('minimized') ? '+' : '–';
});

// Main UI logic for updating the polygon list
function updatePolygonListUI() {
  const polygonList = document.getElementById('polygon-list');
  const polygonCountSpan = document.getElementById('polygon-count');
  polygonList.innerHTML = '';

  allPolygons.forEach((poly, index) => {
    const li = document.createElement('li');

    const titleWrapper = document.createElement('div');
    titleWrapper.style.display = 'flex';
    titleWrapper.style.flexWrap = 'wrap';
    titleWrapper.style.alignItems = 'center';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'polygon-name';
    nameSpan.textContent = `Polygon ${index + 1}`;

    if (selectedPolygonsIndices.includes(index)) {
      nameSpan.classList.add('selected');
    }

    nameSpan.onclick = (e) => {
      if (e.shiftKey) {
        const pos = selectedPolygonsIndices.indexOf(index);
        if (pos === -1) {
          selectedPolygonsIndices.push(index);
        } else {
          selectedPolygonsIndices.splice(pos, 1);
        }
      } else {
        selectedPolygonsIndices = [index];
      }
      redraw();
      updatePolygonListUI();
    };

    const separator = document.createElement('span');
    separator.textContent = ' | ';
    separator.style.margin = '0 10px';

    const deleteLink = document.createElement('span');
    deleteLink.textContent = 'Delete';
    deleteLink.style.color = 'red';
    deleteLink.style.cursor = 'pointer';
    deleteLink.onclick = (e) => {
      e.stopPropagation(); // Don't trigger selection
      saveState(); // Backup
      allPolygons.splice(index, 1);
      selectedPolygonsIndices = selectedPolygonsIndices
        .filter(i => i !== index)
        .map(i => (i > index ? i - 1 : i));
      redraw();
      updatePolygonListUI();
    };

    const detailSpan = document.createElement('span');
    detailSpan.className = 'polygon-details';
    const perimeter = polygonPerimeter(poly).toFixed(2);
    const area = polygonArea(poly).toFixed(2);
    detailSpan.textContent = `Perimeter: ${perimeter} m, Area: ${area} m²`;

    titleWrapper.appendChild(nameSpan);
    titleWrapper.appendChild(separator);
    titleWrapper.appendChild(deleteLink);

    li.appendChild(titleWrapper);
    li.appendChild(detailSpan);
    polygonList.appendChild(li);
  });

  polygonCountSpan.textContent = `(${allPolygons.length})`;
}
