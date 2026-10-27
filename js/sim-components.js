AFRAME.registerComponent('sim-capacitor', {
  init: function () {
    // Constants from the card spec
    this.Vs = 5;          // source voltage, volts
    this.tau = 1;         // R x C = 10 kohm x 100 uF = 1 second
    this.H = 0.28;        // tank height in card units
    this.W = 0.5;         // tank width in card units
    this.bottomY = -0.14; // bottom edge of the tank inside this entity

    // State
    this.t = 0;
    this.mode = 'charge';
    this.v0 = 0;          // voltage at the moment the mode started
    this.vc = 0;
    this.running = false; // stays false until a card is found
    this.acc = 0;         // time since the last status update, in ms

    // Tank background (dark box)
    this.tank = document.createElement('a-box');
    this.tank.setAttribute('color', '#1e293b');
    this.tank.setAttribute('scale', this.W + ' ' + this.H + ' 0.01');
    this.el.appendChild(this.tank);

    // Fill (blue box that grows upward)
    this.fill = document.createElement('a-box');
    this.fill.setAttribute('color', '#3b82f6');
    this.el.appendChild(this.fill);

    this.draw();
  },

  reset: function () {
    this.t = 0;
    this.mode = 'charge';
    this.v0 = 0;
    this.vc = 0;
    this.running = true;
    this.draw();
    this.writeStatus();
  },

  setMode: function (modeName) {
    // Start the new curve from wherever the voltage is right now
    this.v0 = this.vc;
    this.t = 0;
    this.mode = modeName;
    this.running = true;
  },

  getStatus: function () {
    var pct = Math.round((this.vc / this.Vs) * 100);
    var label = this.mode === 'charge' ? 'Charging' : 'Discharging';
    return label + ': Vc = ' + this.vc.toFixed(1) + ' V (' + pct +
           '%, t = ' + (this.t / this.tau).toFixed(1) + ' tau)';
  },

  computeVoltage: function () {
    var decay = Math.exp(-this.t / this.tau);
    if (this.mode === 'charge') {
      return this.Vs + (this.v0 - this.Vs) * decay; // = Vs(1 - e^(-t/tau)) when v0 = 0
    }
    return this.v0 * decay;                          // Vc = V0 e^(-t/tau)
  },

  draw: function () {
    var level = Math.max(this.vc / this.Vs, 0.001); // never exactly 0, so the box stays valid
    var h = this.H * level;
    this.fill.setAttribute('scale', (this.W - 0.02) + ' ' + h + ' 0.02');
    this.fill.setAttribute('position', '0 ' + (this.bottomY + h / 2) + ' 0.01');
  },

  writeStatus: function () {
    var statusEl = document.querySelector('#cap-status');
    if (statusEl) {
      statusEl.setAttribute('text', 'value', this.getStatus());
    }
  },

  tick: function (time, delta) {
    if (!this.running) { return; }
    this.t += delta / 1000;
    this.vc = this.computeVoltage();
    this.draw();

    this.acc += delta;
    if (this.acc >= 100) { // about 10 times per second
      this.acc = 0;
      this.writeStatus();
    }
  }
});