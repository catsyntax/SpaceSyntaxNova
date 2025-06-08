  let currentTutorialStep = 1;

  function showTutorialStep(stepNumber) {
    document.querySelectorAll('.tutorial-step').forEach(step => {
      step.classList.add('hidden');
    });
    document.getElementById(`tutorial-step-${stepNumber}`).classList.remove('hidden');
    document.getElementById('tutorial-overlay').style.display = 'flex';
  }

  function nextTutorialStep(nextStepNumber) {
    if (document.getElementById(`tutorial-step-${nextStepNumber}`)) {
      currentTutorialStep = nextStepNumber;
      showTutorialStep(currentTutorialStep);
    }
  }

  function endTutorial() {
    document.getElementById('tutorial-overlay').style.display = 'none';
  }

  // To start the tutorial when the page loads, you can call showTutorialStep(1)
  // For example, within your existing DOMContentLoaded listener or a new one:
  document.addEventListener('DOMContentLoaded', () => {
    // Other existing DOMContentLoaded code...
    // showTutorialStep(1); // Start the tutorial on page load
  });