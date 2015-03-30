var assert = require('assert');
var fakeRaf = require('fake-raf');
var v = require('../flyview');
var flyd = require('flyd');
var stream = flyd.stream;

fakeRaf.use();

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
  it('adds classes in object', function() {
    var elm = v('div', {class: {add: true, these: true, classes: true}});
    assert(elm.classList.contains('add'));
    assert(elm.classList.contains('these'));
    assert(elm.classList.contains('classes'));
  });
  it('toggles classes based on streams with raf', function() {
    var c1 = stream(true), c2 = stream(false), c3 = stream(true);
    var elm = v('div', {
      class: {add: c1, these: c2, classes: c3}
    });
    fakeRaf.step();
    assert(elm.classList.contains('add'));
    assert(!elm.classList.contains('these'));
    assert(elm.classList.contains('classes'));
    c2(true);
    assert(!elm.classList.contains('these'));
    fakeRaf.step();
    assert(elm.classList.contains('these'));
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
  it('applies styles from stream with raf', function() {
    var color = stream('black');
    var textAlign = stream('center');
    var elm = v('div', {
      style: {color: color, textAlign: textAlign},
    });
    fakeRaf.step();
    assert.equal(elm.style.color, 'black');
    assert.equal(elm.style.textAlign, 'center');
    color('red');
    assert.equal(elm.style.color, 'black');
    fakeRaf.step();
    assert.equal(elm.style.color, 'red');
  });
});

describe('event listeners', function() {
  it('triggers event listeners in on object', function() {
    var called = 0;
    var clicks = function() { called++; };
    var elm = v('div', { on: {click: clicks} });
    elm.click();
    elm.click();
    elm.click();
    assert.equal(called, 3);
  });
  it('triggers event listeners attached with on*', function() {
    var called = 0;
    var clicks = function() { called++; };
    var elm = v('div', {onclick: clicks});
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
  it('props can be left out', function() {
    var elm = v('div', string);
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
  it('handles both strings and elements', function() {
    var child1 = document.createElement('div');
    var child2 = "I'm a text";
    var child3 = document.createElement('a');
    var elm = v('div', {}, [child1, child2, child3]);
    assert.equal(elm.children.length, 2);
    assert.equal(elm.innerHTML, "<div></div>I'm a text<a></a>");
  });
});

describe('stream content', function() {
  var string = 'The slow fox rolled under the lazy cat';
  it('sets content with raf if stream of strings is passed', function() {
    var stringStream = stream(string);
    var elm = v('div', stringStream);
    assert.equal(elm.firstChild.textContent, '');
    fakeRaf.step();
    assert.equal(elm.firstChild.textContent, string);
    stringStream('Hello');
    assert.equal(elm.firstChild.textContent, string);
    fakeRaf.step();
    assert.equal(elm.firstChild.textContent, 'Hello');
  });
  it('handles string stream among other children', function() {
    var stringStream = stream(string);
    var elm = v('div', {}, ['Foo ', stringStream]);
    assert.equal('Foo ', elm.innerHTML);
    fakeRaf.step();
    assert.equal('Foo ' + stringStream(), elm.innerHTML);
  });
  it('handles string stream among other children', function() {
    var stringStream = stream('foobar');
    var elm = v('div', {}, ['foo', stringStream, 'bar']);
    fakeRaf.step();
    assert.equal('foo' + stringStream() + 'bar', elm.innerHTML);
    stringStream('ooo');
    fakeRaf.step();
    assert.equal('foo' + stringStream() + 'bar', elm.innerHTML);
  });
  it('adds elements from streams', function() {
    var elmStream = stream(v('div', {}, 'Hello, Element!'));
    var elm = v('div', {}, ['foo', elmStream, 'bar']);
    fakeRaf.step();
    assert.equal(elm.children.length, 1);
    assert.equal('foo<div>Hello, Element!</div>bar', elm.innerHTML);
    elmStream(v('b', {}, 'ooo'));
    fakeRaf.step();
    assert.equal('foo<b>ooo</b>bar', elm.innerHTML);
  });
  it('adds elements from streams', function() {
    var elmStream = stream(undefined);
    var elm = v('div', {}, ['foo', elmStream, 'bar']);
    fakeRaf.step();
    assert.equal(elm.children.length, 0);
    assert.equal('foobar', elm.innerHTML);
    elmStream(v('b', {}, 'ooo'));
    fakeRaf.step();
    assert.equal('foo<b>ooo</b>bar', elm.innerHTML);
    elmStream(undefined);
    fakeRaf.step();
    assert.equal('foobar', elm.innerHTML);
    elmStream('ooo');
    fakeRaf.step();
    assert.equal('fooooobar', elm.innerHTML);
  });
});

describe('map', function() {
  it('adds elements from mapper', function() {
    var names = stream(['1', '2']);
    function nameElm(name) {
      return v('span', {}, name);
    }
    var elm = v('div', {}, v.map(names, nameElm));
    assert.equal(elm.children.length, 0);
    fakeRaf.step();
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
    fakeRaf.step();
    assert.equal(elm.children.length, 3);
    assert.equal(elm.children[0].innerHTML, '1');
    assert.equal(elm.children[1].innerHTML, '2');
    assert.equal(elm.children[2].innerHTML, '3');
  });
  it('removes elements', function() {
    var numbers = stream(['1', '2', '3']);
    function numberElm(number) {
      return v('span', {}, number);
    }
    var elm = v('div', {}, v.map(numbers, numberElm));
    fakeRaf.step();
    assert.equal(elm.children.length, 3);
    assert.equal(elm.children[0].innerHTML, '1');
    assert.equal(elm.children[1].innerHTML, '2');
    assert.equal(elm.children[2].innerHTML, '3');
    numbers(['1', '3']);
    fakeRaf.step();
    assert.equal(elm.children.length, 2);
    assert.equal(elm.children[0].innerHTML, '1');
    assert.equal(elm.children[1].innerHTML, '3');
  });
  it('swaps element', function() {
    var numbers = stream(['1', '2', '3']);
    function numberElm(number) {
      return v('span', {}, number);
    }
    var elm = v('div', {}, v.map(numbers, numberElm));
    fakeRaf.step();
    assert.equal(elm.children.length, 3);
    assert.equal(elm.children[0].innerHTML, '1');
    assert.equal(elm.children[1].innerHTML, '2');
    assert.equal(elm.children[2].innerHTML, '3');
    numbers(['1', '3']);
    fakeRaf.step();
    assert.equal(elm.children.length, 2);
    assert.equal(elm.children[0].innerHTML, '1');
    assert.equal(elm.children[1].innerHTML, '3');
  });
  it('preserves element before', function() {
    var numbers = stream([1, 2, 3]);
    function numberElm(number) {
      return v('span', {}, number);
    }
    var elm = v('div', {}, [
      numberElm(0),
      v.map(numbers, numberElm),
    ]);
    fakeRaf.step();
    assert.equal(elm.children.length, 4);
    assert.equal(elm.children[0].innerHTML, '0');
    assert.equal(elm.children[1].innerHTML, '1');
    assert.equal(elm.children[2].innerHTML, '2');
    assert.equal(elm.children[3].innerHTML, '3');
    numbers([2, 1]);
    fakeRaf.step();
    assert.equal(elm.children.length, 3);
    assert.equal(elm.children[0].innerHTML, '0');
    assert.equal(elm.children[1].innerHTML, '2');
    assert.equal(elm.children[2].innerHTML, '1');
  });
  it('preserves elements before and after', function() {
    var numbers = stream([1, 2, 3]);
    function numberElm(number) {
      return v('span', {}, number);
    }
    var elm = v('div', {}, [
      numberElm(0),
      v.map(numbers, numberElm),
      numberElm(4),
    ]);
    fakeRaf.step();
    assert.equal(elm.children.length, 5);
    assert.equal(elm.children[0].innerHTML, '0');
    assert.equal(elm.children[1].innerHTML, '1');
    assert.equal(elm.children[2].innerHTML, '2');
    assert.equal(elm.children[3].innerHTML, '3');
    assert.equal(elm.children[4].innerHTML, '4');
    numbers([2, 1]);
    fakeRaf.step();
    assert.equal(elm.children.length, 4);
    assert.equal(elm.children[0].innerHTML, '0');
    assert.equal(elm.children[1].innerHTML, '2');
    assert.equal(elm.children[2].innerHTML, '1');
    assert.equal(elm.children[3].innerHTML, '4');
  });
});
