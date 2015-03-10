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
      oldElms = {};
  st.map(function(vals) {
    var i, key, oldElm, elm, newElms = {},
        parent = container.parentNode, next,
        frag = document.createDocumentFragment();
    if (parent !== null) {
      parent.removeChild(container);
      next = container.nextSibling;
    }
    for (i = 0; i < vals.length; ++i) {
      key = keyProp !== undefined ? vals[i][keyProp] : vals[i];
      oldElm = oldElms[key];
      elm = oldElm ? oldElm : fn(vals[i]);
      newElms[key] = elm;
      frag.appendChild(elm);
    }
    container.appendChild(frag);
    if (next !== undefined) {
      parent.insertBefore(container, next);
    } else if (parent !== null) {
      parent.appendChild(container);
    }
    oldElms = newElms;
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

}));
