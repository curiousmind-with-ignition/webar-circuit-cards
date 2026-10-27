var cards = [
  { target: '#target-0', sim: '#res-sim', comp: 'sim-resistor',  group: '#btns-0' },
  { target: '#target-1', sim: '#cap-sim', comp: 'sim-capacitor', group: '#btns-1' },
  { target: '#target-2', sim: '#ind-sim', comp: 'sim-inductor',  group: '#btns-2' },
  { target: '#target-3', sim: '#dio-sim', comp: 'sim-diode',     group: '#btns-3' }
];

var hint = document.querySelector('#hint');
var currentCard = -1;

function getSim(simSelector, compName) {
  return document.querySelector(simSelector).components[compName];
}

function hideAllGroups() {
  document.querySelectorAll('.btn-group').forEach(function (g) {
    g.classList.remove('visible');
  });
}

cards.forEach(function (card, i) {
  var targetEl = document.querySelector(card.target);
  var group = document.querySelector(card.group);

  targetEl.addEventListener('targetFound', function () {
    currentCard = i;
    getSim(card.sim, card.comp).reset();
    hint.style.display = 'none';
    hideAllGroups();
    group.classList.add('visible');
  });

  targetEl.addEventListener('targetLost', function () {
    getSim(card.sim, card.comp).running = false;
    group.classList.remove('visible');
    if (currentCard === i) {          // ignore a late "lost" from a card we already left
      currentCard = -1;
      hint.style.display = 'block';
    }
  });
});

document.querySelectorAll('#controls button').forEach(function (btn) {
  btn.addEventListener('click', function () {
    getSim(btn.dataset.sim, btn.dataset.comp).setMode(btn.dataset.mode);
  });
});