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
