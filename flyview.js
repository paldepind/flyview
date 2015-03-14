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

function isMapper(o) {
  return o && o.s && o.f;
}

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

function handleMapper(container, mapper) {
  var st = mapper.s, fn = mapper.f, keyProp = mapper.p,
      keyToElm = {}, oldVals = [];
  function getKey(v) {
    return isStream(keyProp) ? v[keyProp] : v;
  }
  st.map(function(vals) {
    var i, key, oldElm, elm, newElms = {},
        parent = container.parentNode, next,
        frag = document.createDocumentFragment();

    var children = [];
    for (i = 0; i < container.children.length; ++i) {
      children.push(container.children[i]);
    }
    if (parent !== null) {
      parent.removeChild(container);
      next = container.nextSibling;
    }
    var lastAppendedTo; // Index of last appended to
    function addFrag() {
      container.insertBefore(frag, children[lastAppendedTo]);
    }
    diff({
      old: oldVals,
      cur: vals,
      extractKey: getKey,
      add: function(val, i) {
        if (lastAppendedTo === undefined) {
          lastAppendedTo = i;
        } else if (i !== lastAppendedTo) {
          addFrag();
          lastAppendedTo = i;
        }
        frag.appendChild(fn(val, st));
      },
      move: function(from, to) {
        if (lastAppendedTo === undefined) {
          lastAppendedTo = to;
        } else if (to !== lastAppendedTo) {
          addFrag();
          lastAppendedTo = to;
        }
        frag.appendChild(children[from]);
      },
      remove: function(i) {
        container.removeChild(children[i]);
      },
    });
    if (frag.children.length > 0) addFrag();
    if (next !== undefined) {
      parent.insertBefore(container, next);
    } else if (parent !== null) {
      parent.appendChild(container);
    }
    keyToElm = newElms;
    oldVals = vals.slice();
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
  } else if (isMapper(content)) {
    handleMapper(elm, content);
  } else if (isArray(content)) {
    for (i = 0; i < content.length; ++i) {
      handleContent(elm, content[i]);
    }
  }
}

function v(name, props, content) {
  var i, key, elm = document.createElement(name);
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
  return {s: s, f: f, p: p};
};

return v;

function diff(opts) {
  var aIdx = {},
      bIdx = {},
      a = opts.old,
      b = opts.cur,
      key = opts.extractKey,
      i, j;
  // Create a mapping from keys to their position in the old list
  for (i = 0; i < a.length; i++) {
    aIdx[key(a[i])] = i;
  }
  // Create a mapping from keys to their position in the new list
  for (i = 0; i < b.length; i++) {
    bIdx[key(b[i])] = i;
  }
  for (i = j = 0; i !== a.length || j !== b.length;) {
    var aElm = a[i], bElm = b[j];
    if (aElm === null) {
      // This is a element that has been moved to earlier in the list
      i++;
    } else if (b.length <= j) {
      // No more elements in new, this is a delete
      opts.remove(i);
      i++;
    } else if (a.length <= i) {
      // No more elements in old, this is an addition
      opts.add(bElm, i);
      j++;
    } else if (key(aElm) === key(bElm)) {
      // No difference, we move on
      i++; j++;
    } else {
      // Look for the current element at this location in the new list
      // This gives us the idx of where this element should be
      var curElmInNew = bIdx[key(aElm)];
      // Look for the the wanted elment at this location in the old list
      // This gives us the idx of where the wanted element is now
      var wantedElmInOld = aIdx[key(bElm)];
      if (curElmInNew === undefined) {
        // Current element is not in new list, it has been removed
        opts.remove(i);
        i++;
      } else if (wantedElmInOld === undefined) {
        // New element is not in old list, it has been added
        opts.add(bElm, i);
        j++;
      } else {
        // Element is in both lists, it has been moved
        opts.move(wantedElmInOld, i);
        a[wantedElmInOld] = null;
        j++;
      }
    }
  }
  return;
}

}));
