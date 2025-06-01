document.addEventListener('keydown', (e) => {
  const isInputFocused = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
  if (isInputFocused) return;

  const isCtrlOrCmd = e.ctrlKey || e.metaKey;

  switch (e.key) {
    // Deletion
    case 'Backspace':
    case 'Delete':
      if (selectedPolygonIndex !== -1) {
        e.preventDefault();
        deleteSelectedPolygon();
      }
      break;

    // F-key Shortcuts
    case 'F1':
      e.preventDefault();
      showTutorialStep(1);
      break;
    case 'F2':
      e.preventDefault();
      togglePolygonsVisibility();
      break;
    case 'F3':
      e.preventDefault();
      toggleConnectivity();
      break;
    case 'F4':
      e.preventDefault();
      toggleVisibility();
      break;
    case 'F5':
      e.preventDefault();
      renderAnalysis();
      break;

    // Drawing and Movement
    case 'a':
    case 'A':
      e.preventDefault();
      startDrawing();
      break;

    // Undo and Save
    case 'z':
    case 'Z':
      if (isCtrlOrCmd) {
        e.preventDefault();
        undoLastPoint();
      }
      break;
    case 's':
    case 'S':
      if (isCtrlOrCmd) {
        e.preventDefault();
        saveMap();
      }
      break;

    // Zoom
    case '+':
    case '=': // Some keyboards use '=' as '+'
      if (isCtrlOrCmd) {
        e.preventDefault();
        zoomIn();
      }
      break;
    case '-':
      if (isCtrlOrCmd) {
        e.preventDefault();
        zoomOut();
      }
      break;

    // Arrow Keys → Panning
    case 'ArrowUp':
      e.preventDefault();
      panCanvas(0, 20);
      break;
    case 'ArrowDown':
      e.preventDefault();
      panCanvas(0, -20);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      panCanvas(20, 0);
      break;
    case 'ArrowRight':
      e.preventDefault();
      panCanvas(-20, 0);
      break;
  }
});