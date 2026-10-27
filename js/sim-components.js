// ---------- Shared helpers ----------
function setStatus(id, message) {
  var el = document.querySelector(id);
  if (el) { el.setAttribute('text', 'value', message); }
}

// A dark tank with a coloured fill box inside it
function makeBar(parent, color, W, H, bottomY) {
  var tank = document.createElement('a-box');
  tank.setAttribute('color', '#1e293b');
  tank.setAttribute('scale', W + ' ' + H + ' 0.01');
  tank.setAttribute('position', '0 ' + (bottomY + H / 2) + ' 0');
  parent.appendChild(tank);

  var fill = document.createElement('a-box');
  fill.setAttribute('color', color);
  parent.appendChild(fill);

  return { fill: fill, W: W, H: H, bottomY: bottomY };
}

// A box scales about its centre, so move it up by half its height
function setBar(bar, level) {
  var h = bar.H * Math.max(level, 0.001);
  bar.fill.setAttribute('scale', (bar.W - 0.02) + ' ' + h + ' 0.02');
  bar.fill.setAttribute('position', '0 ' + (bar.bottomY + h / 2) + ' 0.01');
}

// ---------- Card 0: Resistor, V = I x R ----------
AFRAME.registerComponent('sim-resistor', {
  init: function () {
    this.I = 1;                 // fixed current, mA
    this.steps = [1, 2, 4];     // R in kohm, so V = 1, 2, 4 V
    this.maxV = 4;              // full bar = 4 V
    this.idx = 0;
    this.level = 0.25;          // what is drawn (eases towards the target)
    this.running = false;
    this.bar = makeBar(this.el, '#f59e0b', 0.5, 0.28, -0.14);
    setBar(this.bar, this.level);
  },
  reset: function () {
    this.idx = 0;
    this.level = this.steps[0] * this.I / this.maxV;
    this.running = true;
    setBar(this.bar, this.level);
    setStatus('#res-status', this.getStatus());
  },
  setMode: function (modeName) {
    if (modeName === 'r-up') { this.idx = Math.min(this.idx + 1, this.steps.length - 1); }
    if (modeName === 'r-down') { this.idx = Math.max(this.idx - 1, 0); }
    this.running = true;
    setStatus('#res-status', this.getStatus());
  },
  getStatus: function () {
    var R = this.steps[this.idx];
    var V = this.I * R;         // mA x kohm = V
    return 'R = ' + R + ' kohm, I = ' + this.I + ' mA, V = ' + V.toFixed(1) + ' V';
  },
  tick: function (time, delta) {
    if (!this.running) { return; }
    var target = this.steps[this.idx] * this.I / this.maxV;
    this.level += (target - this.level) * Math.min(1, delta / 150); // smooth step
    setBar(this.bar, this.level);
  }
});

// ---------- Card 1: Capacitor, charging and discharging ----------
AFRAME.registerComponent('sim-capacitor', {
  init: function () {
    this.Vs = 5;
    this.tau = 1;               // 10 kohm x 100 uF = 1 s
    this.t = 0;
    this.mode = 'charge';
    this.v0 = 0;
    this.vc = 0;
    this.running = false;
    this.acc = 0;
    this.bar = makeBar(this.el, '#3b82f6', 0.5, 0.28, -0.14);
    setBar(this.bar, 0);
  },
  reset: function () {
    this.t = 0;
    this.mode = 'charge';
    this.v0 = 0;
    this.vc = 0;
    this.running = true;
    setBar(this.bar, 0);
    setStatus('#cap-status', this.getStatus());
  },
  setMode: function (modeName) {
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
  tick: function (time, delta) {
    if (!this.running) { return; }
    this.t += delta / 1000;
    var decay = Math.exp(-this.t / this.tau);
    if (this.mode === 'charge') {
      this.vc = this.Vs + (this.v0 - this.Vs) * decay;   // Vs(1 - e^(-t/tau))
    } else {
      this.vc = this.v0 * decay;                          // V0 e^(-t/tau)
    }
    setBar(this.bar, this.vc / this.Vs);
    this.acc += delta;
    if (this.acc >= 100) {
      this.acc = 0;
      setStatus('#cap-status', this.getStatus());
    }
  }
});

// ---------- Card 2: Inductor, V = L di/dt ----------
AFRAME.registerComponent('sim-inductor', {
  init: function () {
    this.Vs = 5;
    this.R = 10;                // ohm
    this.L = 10;                // henry (unrealistic on purpose, so the ramp is visible)
    this.tau = this.L / this.R; // 1 s
    this.Imax = this.Vs / this.R; // 0.5 A
    this.t = 0;
    this.mode = 'on';
    this.i0 = 0;
    this.i = 0;
    this.running = false;
    this.acc = 0;
    this.bar = makeBar(this.el, '#22c55e', 0.5, 0.28, -0.14);
    setBar(this.bar, 0);

    // Required label on the overlay
    var note = document.createElement('a-text');
    note.setAttribute('value', 'time scaled for display');
    note.setAttribute('position', '0 -0.29 0');
    note.setAttribute('width', '0.6');
    note.setAttribute('align', 'center');
    note.setAttribute('color', '#94a3b8');
    this.el.appendChild(note);
  },
  reset: function () {
    this.t = 0;
    this.mode = 'on';
    this.i0 = 0;
    this.i = 0;
    this.running = true;
    setBar(this.bar, 0);
    setStatus('#ind-status', this.getStatus());
  },
  setMode: function (modeName) {
    this.i0 = this.i;
    this.t = 0;
    this.mode = modeName;       // 'on' or 'off'
    this.running = true;
  },
  getStatus: function () {
    var pct = Math.round((this.i / this.Imax) * 100);
    var label = this.mode === 'on' ? 'Switch ON' : 'Switch OFF';
    return label + ': i = ' + this.i.toFixed(2) + ' A (' + pct +
           '%, t = ' + (this.t / this.tau).toFixed(1) + ' tau)';
  },
  tick: function (time, delta) {
    if (!this.running) { return; }
    this.t += delta / 1000;
    var decay = Math.exp(-this.t / this.tau);
    if (this.mode === 'on') {
      this.i = this.Imax + (this.i0 - this.Imax) * decay; // (Vs/R)(1 - e^(-t/tau))
    } else {
      this.i = this.i0 * decay;                            // I0 e^(-t/tau)
    }
    setBar(this.bar, this.i / this.Imax);
    this.acc += delta;
    if (this.acc >= 100) {
      this.acc = 0;
      setStatus('#ind-status', this.getStatus());
    }
  }
});

// ---------- Card 3: Diode, one-way current ----------
AFRAME.registerComponent('sim-diode', {
  init: function () {
    this.Vs = 5;
    this.Vf = 0.7;
    this.R = 1000;              // ohm
    this.mode = 'forward';
    this.running = false;
    this.offset = 0;
    this.speed = 0.25;          // card units per second
    this.n = 8;
    this.spacing = 0.1;         // n x spacing = 0.8 = width of the track

    var line = document.createElement('a-box');
    line.setAttribute('color', '#475569');
    line.setAttribute('scale', '0.8 0.01 0.01');
    this.el.appendChild(line);

    this.dots = [];
    for (var k = 0; k < this.n; k++) {
      var d = document.createElement('a-sphere');
      d.setAttribute('radius', '0.025');
      d.setAttribute('color', '#a855f7');
      this.el.appendChild(d);
      this.dots.push(d);
    }

    this.barrier = document.createElement('a-box');
    this.barrier.setAttribute('color', '#ef4444');
    this.barrier.setAttribute('scale', '0.03 0.24 0.02');
    this.barrier.setAttribute('position', '0 0 0.02');
    this.barrier.setAttribute('visible', false);
    this.el.appendChild(this.barrier);

    this.placeDots();
  },
  placeDots: function () {
    var span = this.n * this.spacing;
    for (var k = 0; k < this.n; k++) {
      var x = -span / 2 + ((this.offset + k * this.spacing) % span);
      this.dots[k].setAttribute('position', x + ' 0 0.01');
    }
  },
  applyMode: function () {
    var fwd = this.mode === 'forward';
    this.barrier.setAttribute('visible', !fwd);
    for (var k = 0; k < this.n; k++) {
      this.dots[k].setAttribute('color', fwd ? '#a855f7' : '#64748b');
    }
    setStatus('#dio-status', this.getStatus());
  },
  reset: function () {
    this.mode = 'forward';
    this.offset = 0;
    this.running = true;
    this.placeDots();
    this.applyMode();
  },
  setMode: function (modeName) {
    this.mode = modeName;       // 'forward' or 'reverse'
    this.running = true;
    this.applyMode();
  },
  getStatus: function () {
    if (this.mode === 'forward') {
      var mA = ((this.Vs - this.Vf) / this.R) * 1000;
      return 'Forward: I = ' + mA.toFixed(1) + ' mA';
    }
    return 'Reverse: blocked, I ~ 0 mA';
  },
  tick: function (time, delta) {
    if (!this.running || this.mode !== 'forward') { return; }
    this.offset += this.speed * delta / 1000;
    this.placeDots();
  }
});