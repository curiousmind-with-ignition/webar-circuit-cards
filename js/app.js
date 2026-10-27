// Wait until the scene has loaded, then connect card events to the simulations
var scene = document.querySelector('a-scene');

function setup() {
  var targets = document.querySelectorAll('[mindar-image-target]');
  var capTarget = targets[1];                 // targetIndex 1 = capacitor
  var capSim = document.querySelector('#cap-sim');

  capTarget.addEventListener('targetFound', function () {
    capSim.components['sim-capacitor'].reset();       // restart from 0 V
  });

  capTarget.addEventListener('targetLost', function () {
    capSim.components['sim-capacitor'].running = false; // pause
  });
}

if (scene.hasLoaded) {
  setup();
} else {
  scene.addEventListener('loaded', setup);
}