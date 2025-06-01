// --- Floating Button Descriptions Box Functionality ---
const buttonDescriptionsBox = document.getElementById('button-box');
const buttonDescriptionsHeader = document.getElementById('button-descriptions-header');
const minimizeButtonDescriptionsBtn = document.getElementById('minimize-button-descriptions');

let isDraggingDescriptionsBox = false;
let dragDescriptionsOffsetX, dragDescriptionsOffsetY;

// Draggable functionality for the button descriptions box
buttonDescriptionsHeader.addEventListener('mousedown', (e) => {
  isDraggingDescriptionsBox = true;
  dragDescriptionsOffsetX = e.clientX - buttonDescriptionsBox.getBoundingClientRect().left;
  dragDescriptionsOffsetY = e.clientY - buttonDescriptionsBox.getBoundingClientRect().top;
  buttonDescriptionsBox.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (!isDraggingDescriptionsBox) return;
  // Ensure the box stays within viewport boundaries
  const newX = e.clientX - dragDescriptionsOffsetX;
  const newY = e.clientY - dragDescriptionsOffsetY;

  const maxX = window.innerWidth - buttonDescriptionsBox.offsetWidth;
  const maxY = window.innerHeight - buttonDescriptionsBox.offsetHeight;

  buttonDescriptionsBox.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
  buttonDescriptionsBox.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
});

document.addEventListener('mouseup', () => {
  isDraggingDescriptionsBox = false;
  buttonDescriptionsBox.style.cursor = 'grab';
});

// Minimize/Maximize functionality for the button descriptions box
minimizeButtonDescriptionsBtn.addEventListener('click', () => {
  buttonDescriptionsBox.classList.toggle('minimized');
  if (buttonDescriptionsBox.classList.contains('minimized')) {
    minimizeButtonDescriptionsBtn.textContent = '+'; // Change button text to indicate expand
  } else {
    minimizeButtonDescriptionsBtn.textContent = '-'; // Change button text to indicate minimize
  }
});