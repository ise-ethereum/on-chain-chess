/**
 * This little script converts default_state.txt from
 * a 8x8 board layout into a 16x8 layout with
 * Solidity compatible array initialization.
 * Also prints Javascript version to add to tests.
 */
var fs = require('fs');
fs.readFile('default_state.txt', 'utf8', function (err, data) {
  var lines = data.split('\n');
  var arr = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.indexOf('#') === 0) {
      // Skip comments and empty lines
      continue;
    }
    var elements = line.split(/\s+/);
    arr = arr.concat(elements);
    arr = arr.concat([0,0,0,0,0,0,0,0]);
  }
  // Set Flags
  arr[123] = 116;
  arr[11] = 4;

  var out = arr.map(function(item) {
    return 'int8(' + item + ')';
  }).join(',');
  console.log('Solidity code:\n\n' + '[' + out + ']');
  console.log('\n\nJavascript code:\n\n' + '[' + arr + ']');
});
