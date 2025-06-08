
document.addEventListener('keydown', (e) => {
  const isInputFocused = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
  if (isInputFocused) return;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

  // --- Ctrl/Cmd + A: Select all polygons ---
  if ((e.key === 'a' || e.key === 'A') && isCtrlOrCmd) {
    e.preventDefault();
    selectedPolygonsIndices = allPolygons.map((_, i) => i);
    redraw();
    return;
  }

  if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (isDrawing) {
      undoLastPoint();
    } else {
      undoGlobalAction();
    }
    return;
  }

  if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    redoGlobalAction();
    return;
  }

  switch (e.key) {
    // Deletion
    case 'Backspace':
    case 'Delete':
      if (selectedPolygonIndex !== -1 || (selectedPolygonsIndices && selectedPolygonsIndices.length > 0)) {
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
    case 'F6':
      e.preventDefault();
      toggleLengthsVisibility();
      break;

    // Drawing and Movement
    case 'a':
    case 'A':
      e.preventDefault();
      startDrawing();
      break;

    case 's':
    case 'S':
      if (isCtrlOrCmd) {
        e.preventDefault();
        exportToDXF()
      }
      break;
      
    // Zoom
    case '+':
    case '=':
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
