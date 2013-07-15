var ever = require('ever')
  , vkey = require('vkey')
  , document = require('global/document')
  , raf = require('raf').polyfill
  , xtend = require('xtend/mutable')
  , EventEmitter = require('events').EventEmitter
  , max = Math.max

module.exports = function(el, bindings, opts) {
  if(bindings === undefined || !el.ownerDocument) {
    opts = bindings
    bindings = el
    el = document.body
  }

  opts = opts || {}
  if (typeof opts === 'function') {
    opts = { listener: opts }
  }

  var ee = ever(el)
    , measured = {}
    , enabled = true
    , state = new EventEmitter()

  if (opts.state) {
    xtend(state, opts.state)
  }

  // always initialize the state.
  for(var key in bindings) {
    if(bindings[key] === 'enabled' ||
       bindings[key] === 'enable' ||
       bindings[key] === 'disable' ||
       bindings[key] === 'destroy') {
      throw new Error(bindings[key]+' is reserved')
    }
    state[bindings[key]] = 0
    measured[key] = 1
  }

  ee.on('keyup', wrapped(onoff(kb, false)))
  ee.on('keydown', wrapped(onoff(kb, true)))
  ee.on('mouseup', wrapped(onoff(mouse, false)))
  ee.on('mousedown', wrapped(onoff(mouse, true)))

  state.enabled = function() {
    return enabled
  }

  state.enable = enable_disable(true)
  state.disable = enable_disable(false)
  state.destroy = function() {
    ee.removeAllListeners()
  }

  if (opts.listener) {
    raf(function loop() {
      opts.listener()
      raf(loop)
    })
  }

  return state

  function clear() {
    // always initialize the state.
    for(var key in bindings) {
      state[bindings[key]] = 0
      measured[key] = 1
    }
  }

  function enable_disable(on_or_off) {
    return function() {
      clear()
      enabled = on_or_off
      return this
    }
  }

  function wrapped(fn) {
    return function(ev) {
      if(enabled) {
        fn(ev)
      } else {
        return
      }
    }
  }

  function onoff(find, on_or_off) {
    return function(ev) {
      var key = find(ev)
        , binding = bindings[key]

      if(binding) {
        state[binding] += on_or_off ? max(measured[key]--, 0) : -(measured[key] = 1)

        if(!on_or_off && state[binding] < 0) {
          state[binding] = 0
        }
        if (!on_or_off) {
          state.emit(binding)
        }
      }
    }
  }

  function mouse(ev) {
    return '<mouse '+ev.which+'>'
  }

  function kb(ev) {
    return vkey[ev.keyCode] || ev.char
  }
}
