(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory); // AMD. Register as an anonymous module.
  } else if (typeof exports === 'object') {
    module.exports = factory(); // NodeJS
  } else { // Browser globals (root is window)
  root.flyview = factory();
  }
}(this, function () {

function isStream(obj) {
  return typeof obj === 'function' || false;
}

function isString(s) {
  return typeof s === 'string';
}

function isPrimitive(v) {
  return typeof v === 'string' || typeof v === 'number';
}

var isArray = Array.isArray;

// Constants
var MOVE = 0, ADD = 1, REMOVE = 2;

function Mapper(stream, createFn, keyProp) {
  this.stream = stream;
  this.container = null;
  this.createFn = createFn;
  this.keyProp = keyProp;
  this.oldList = [];
  this.oldKeyToElm = {};
  this.firstElm = null;
  this.nrOfChildren = null;
}

Mapper.prototype.attach = function(container, s) {
  this.container = container;
  this.stream.map(this.update.bind(this));
};

Mapper.prototype.getKey = function(v) {
  return isString(this.keyProp) ? v[this.keyProp] : v;
};

Mapper.prototype.insertFrag = function(frag, before) {
  if (this.firstElm === before || this.firstElm === null) {
    this.firstElm = frag.children[0];
  }
  this.container.insertBefore(frag, before);
};

Mapper.prototype.update = function(list) {
  var i, container = this.container,
      parent = container.parentNode, placeholder,
      frag = document.createDocumentFragment(),
      children = [],
      lastAppendedTo, // Index of last appended to
      actions = this.diff(list),
      child = this.firstElm;
  for (i = 0; i < this.nrOfChildren; ++i) {
    children.push(child);
    child = child.nextSibling;
  }
  if (parent !== null && actions.length * 5 > children.length) {
    placeholder = document.createComment('');
    parent.replaceChild(placeholder, container);
  }
  for (i = 0; i < actions.length; ++i) {
    var a = actions[i];
    if (a.type === REMOVE) {
      this.nrOfChildren--;
      container.removeChild(children[a.idx]);
    } else {
      if (lastAppendedTo === undefined) {
        lastAppendedTo = a.to;
      } else if (a.to !== lastAppendedTo) {
        this.insertFrag(frag, children[lastAppendedTo]);
        lastAppendedTo = a.to;
      }
      if (a.type === ADD) {
        this.nrOfChildren++;
        frag.appendChild(this.createFn(list[a.elm], this.stream));
      } else {
        frag.appendChild(children[a.from]);
      }
    }
  }
  if (frag.children.length > 0) {
    this.insertFrag(frag, children[lastAppendedTo]);
  }
  if (placeholder !== undefined) {
    parent.replaceChild(container, placeholder);
  }
  return actions;
};

Mapper.prototype.diff = function(list) {
  var aIdx = this.oldKeyToElm,
      bIdx = {},
      a = this.oldList,
      b = [],
      actions = [],
      i, j;
  for (i = 0; i < list.length; ++i) {
    b.push(this.getKey(list[i]));
  }
  // Create a mapping from keys to their position in the new list
  for (i = 0; i < b.length; i++) {
    bIdx[b[i]] = i;
  }
  for (i = j = 0; i !== a.length || j !== b.length;) {
    var aElm = a[i], bElm = b[j];
    if (aElm === null) {
      // This is a element that has been moved to earlier in the list
      i++;
    } else if (b.length <= j) {
      // No more elements in new, this is a delete
      actions.push({type: REMOVE, idx: i});
      i++;
    } else if (a.length <= i) {
      // No more elements in old, this is an addition
      actions.push({type: ADD, elm: j, to: i});
      j++;
    } else if (aElm === bElm) {
      // No difference, we move on
      i++; j++;
    } else {
      // Look for the current element at this location in the new list
      // This gives us the idx of where this element should be
      var curElmInNew = bIdx[aElm];
      // Look for the the wanted elment at this location in the old list
      // This gives us the idx of where the wanted element is now
      var wantedElmInOld = aIdx[bElm];
      if (curElmInNew === undefined) {
        // Current element is not in new list, it has been removed
        actions.push({type: REMOVE, idx: i});
        i++;
      } else if (wantedElmInOld === undefined) {
        actions.push({type: ADD, elm: j, to: i});
        j++;
      } else {
        // Element is in both lists, it has been moved
        actions.push({type: MOVE, from: wantedElmInOld, to: i});
        a[wantedElmInOld] = null;
        j++;
      }
    }
  }
  this.oldKeyToElm = bIdx;
  this.oldList = b;
  return actions;
};

function addListeners(elm, lists) {
  for (var key in lists) {
    elm.addEventListener(key, lists[key]);
  }
}

function updateProperty(str, obj, key) {
  str.map(function(s) {
    obj[key] = s;
  });
}

function applyStyles(elm, styles) {
  for (var key in styles) {
    var style = styles[key];
    if (isStream(style)) {
      updateProperty(style, elm.style, key);
    } else {
      elm.style[key] = style;
    }
  }
}

function handleClass(elm, cls) {
  var list = elm.classList;
  if (typeof cls === 'string') {
    cls.split(' ').forEach(function(c) {
      list.add(c);
    });
  } else {
    for (var key in cls) {
      if (isStream(cls[key])) {
        cls[key].map(list.toggle.bind(list, key));
      } else {
        list.toggle(key, cls[key]);
      }
    }
  }
}

function handleStream(container, s) {
  var elm = document.createTextNode('');
  container.appendChild(elm);
  s.map(function(v) {
    if (v instanceof Element) {
      elm.parentNode.replaceChild(v, elm);
      elm = v;
    } else {
      if (!(elm instanceof Text)) {
        var nElm = document.createTextNode('');
        elm.parentNode.replaceChild(nElm, elm);
        elm = nElm;
      }
      if (isPrimitive(v)) {
        elm.textContent = v;
      }
    }
  });
}

function handleContent(elm, content) {
  if (content instanceof Element) {
    elm.appendChild(content);
  } else if (isPrimitive(content)) { // Content is string or number.
    content = document.createTextNode(content);
    elm.appendChild(content);
  } else if (isStream(content)) {
    handleStream(elm, content);
  } else if (content instanceof Mapper) {
    content.attach(elm);
  } else if (isArray(content)) {
    for (i = 0; i < content.length; ++i) {
      handleContent(elm, content[i]);
    }
  }
}

function v(name, props, content) {
  var i, key, elm = document.createElement(name);
  if (content === undefined && (isPrimitive(props) ||
      isStream(props) || isArray(props) || props instanceof Mapper)) {
    content = props;
    props = undefined;
  }
  // Handle properties
  for (key in props) {
    if (key === 'on') {
      addListeners(elm, props.on);
    } else if (key === 'style') {
      applyStyles(elm, props.style);
    } else if (key === 'class') {
      handleClass(elm, props.class);
    } else if (typeof props[key] === 'function') {
      updateProperty(props[key], elm, key);
    } else {
      elm[key] = props[key];
    }
  }
  if (content === undefined) {
    return elm;
  }
  handleContent(elm, content);
  return elm;
}

v.map = function(s, f, p) {
  return new Mapper(s, f, p);
};

return v;

}));
