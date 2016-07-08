export const gameStateDisplay = (state) => {
  var rows = [];
  for (var i = 0; i < 8; i++) {
    var row = [];
    for (var j = 0; j < 16; j++) {
      row.push(('   ' + state[i*16+j].toString(10)).slice(-3));
    }
    rows.push(row.join(' '));
  }
  return rows.join('\n');
};

var assert = require('chai').assert;

export class Plan {
  constructor(count, done) {
    this.done = done;
    this.count = count;
  }

  ok() {
    if (this.count === 0) {
      assert(false, 'Too many assertions called');
    } else {
      this.count--;
    }
    if (this.count === 0) {
      this.done();
    }
  }
}
