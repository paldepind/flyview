var v = flyview;
var stream = flyd.stream;

var toggleStream = function(s, val) {
  return function() {
    return s(!s.val);
  };
};

var reverseItems = function(state) {
  return function() {
    var startTime = Date.now();
    state.items(state.items().reverse());
    state.time(Date.now() - startTime);
  };
};

var move = function(list, elm, delta) {
  var l = list();
  var i = l.indexOf(elm);
  var tmp = l[i];
  l[i] = l[i + delta];
  l[i + delta] = tmp;
  list(l);
};

var createItemView = function(i, list) {
  return v('li', [
    'Item #' + i.value,
    v('a', {on: {click: move.bind(null, list, i, -1)}}, 'Up'),
    v('a', {on: {click: move.bind(null, list, i, 1)}}, 'Down'),
  ]);
};

var createMainView = function(state) {
  return v('div', [
    v('h1', 'Performance'),
    v('button', {on: {click: reverseItems(state)}}, 'Reverse list'),
    flyd.map(state.time, function(t) {
      if (t) return v('p', 'Reversing took ' + t + 'ms');
    }),
    v('ul', v.map(state.items, createItemView, 'value')),
  ]);
};

document.addEventListener('DOMContentLoaded', function() {
  var itemsArr = [];
  for(var i = 0; i < 10000; i++) {
    itemsArr.push({value: i});
  }
  var state = {
    items: stream(itemsArr),
    time: stream(),
  };
  document.body.appendChild(createMainView(state));
});
