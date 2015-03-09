var assert = require('assert');
var v = require('../flyview');
var flyd = require('flyd');
var stream = flyd.stream;

it('returns an elment of proper tag', function() {
  var elm = v('div');
  assert.equal(elm.tagName, 'DIV');
  elm = v('a');
  assert.equal(elm.tagName, 'A');
});

describe('class handling', function() {
  it('adds classes in string', function() {
    var elm = v('div', {class: 'add these classes'});
    assert(elm.classList.contains('add'));
    assert(elm.classList.contains('these'));
    assert(elm.classList.contains('classes'));
  });
});

describe('styles', function() {
  it('applies constant styles', function() {
    var elm = v('div', {
      style: {color: 'black', textAlign: 'center'},
    });
    assert.equal(elm.style.color, 'black');
    assert.equal(elm.style.textAlign, 'center');
  });
  it('applies styles from stream', function() {
    var color = stream('black');
    var textAlign = stream('center');
    var elm = v('div', {
      style: {color: color, textAlign: textAlign},
    });
    assert.equal(elm.style.color, 'black');
    assert.equal(elm.style.textAlign, 'center');
    color('red');
    assert.equal(elm.style.color, 'red');
  });
});

describe('event listeners', function() {
  it('triggers event listeners', function() {
    var called = 0;
    var clicks = function() { called++; };
    var elm = v('div', { on: {click: clicks} });
    elm.click();
    elm.click();
    elm.click();
    assert.equal(called, 3);
  });
});

describe('content', function() {
  var string = 'The slow fox rolled under the lazy cat';
  var string2 = 'The crazy dog flew through the window';
  it('sets content if string is passed', function() {
    var elm = v('div', {}, string);
    assert.equal(elm.firstChild.textContent, string);
  });
  it('sets content if stream is passed', function() {
    var stringStream = stream(string);
    var elm = v('div', {}, stringStream);
    assert.equal(elm.firstChild.textContent, string);
  });
  it('adds elements as children', function() {
    var child1 = document.createElement('div');
    var child2 = document.createElement('span');
    var child3 = document.createElement('a');
    var elm = v('div', {}, [child1, child2, child3]);
    assert.equal(elm.children.length, 3);
    assert.equal(elm.children[0].tagName, 'DIV');
    assert.equal(elm.children[1].tagName, 'SPAN');
    assert.equal(elm.children[2].tagName, 'A');
  });
  it('both strings and elements', function() {
    var child1 = document.createElement('div');
    var child2 = "I'm a text";
    var child3 = document.createElement('a');
    var elm = v('div', {}, [child1, child2, child3]);
    assert.equal(elm.children.length, 2);
    assert.equal(elm.innerHTML, "<div></div>I'm a text<a></a>");
  });
});

describe('map', function() {
  it('adds elements from mapper', function() {
    var names = stream(['1', '2']);
    function nameElm(name) {
      return v('span', {}, name);
    }
    var elm = v('div', {}, v.map(names, nameElm));
    assert.equal(elm.children.length, 2);
    assert.equal(elm.children[0].innerHTML, '1');
    assert.equal(elm.children[1].innerHTML, '2');
  });
  it('updates elments from mapper', function() {
    var names = stream(['1', '2']);
    function nameElm(name) {
      return v('span', {}, name);
    }
    var elm = v('div', {}, v.map(names, nameElm));
    names(['1', '2', '3']);
    assert.equal(elm.children.length, 3);
    assert.equal(elm.children[0].innerHTML, '1');
    assert.equal(elm.children[1].innerHTML, '2');
    assert.equal(elm.children[2].innerHTML, '3');
  });
});