!(function (t, e) {
  'object' == typeof exports && 'undefined' != typeof module
    ? e(exports, require('mobx'), require('@fuerte/core'))
    : 'function' == typeof define && define.amd
    ? define(['exports', 'mobx', '@fuerte/core'], e)
    : e(((t || self).autosave = {}), t.mobx, t.core)
})(this, function (t, e, o) {
  function n() {
    return (
      (n =
        Object.assign ||
        function (t) {
          for (var e = 1; e < arguments.length; e++) {
            var o = arguments[e]
            for (var n in o)
              Object.prototype.hasOwnProperty.call(o, n) && (t[n] = o[n])
          }

          return t
        }),
      n.apply(this, arguments)
    )
  }
  function i(t, e) {
    return (
      (i =
        Object.setPrototypeOf ||
        function (t, e) {
          return (t.__proto__ = e), t
        }),
      i(t, e)
    )
  }
  t.AutosaveCollection = /*#__PURE__*/ (function (t) {
    var o, a
    function r(e, o, i) {
      var a

      return (
        ((a = t.call(this, e, o, i) || this).identityReactionByCid = new Map()),
        (a.saveReactionByCid = new Map()),
        (a.config.autoSave = n(
          { enabled: !1, debounce: 0 },
          null != i && i.autoSave ? i.autoSave : void 0
        )),
        a
      )
    }
    ;(a = t),
      ((o = r).prototype = Object.create(a.prototype)),
      (o.prototype.constructor = o),
      i(o, a)
    var u = r.prototype

    return (
      (u.getConfig = function () {
        return t.prototype.getConfig.call(this)
      }),
      (u.startTracking = function (e) {
        t.prototype.startTracking.call(this, e),
          this.config.autoSave.enabled && this.startAutoSave(e)
      }),
      (u.stopTracking = function (e) {
        t.prototype.stopTracking.call(this, e)
        var o = this.identityReactionByCid.get(e.cid)
        o && o(), this.stopAutoSave(e)
      }),
      (u.autoSave = function (t) {
        this.save(t.model)
      }),
      (u.startAutoSave = function (t) {
        var o = this,
          n = t ? (Array.isArray(t) ? t : [t]) : this._models,
          i = []

        return (
          n.forEach(function (t) {
            var n, a, r
            if (!o.saveReactionByCid.get(t.cid)) {
              i.push(t)
              var u = e.reaction(
                function () {
                  return { model: t, data: t.payload }
                },
                o.config.autoSave.debounce
                  ? ((n = o.autoSave.bind(o)),
                    (a = o.config.autoSave.debounce),
                    function (t, e, o) {
                      clearTimeout(r),
                        (r = setTimeout(function () {
                          return n(t, e, o)
                        }, a))
                    })
                  : o.autoSave.bind(o),
                { name: 'save-' + t.cid }
              )
              o.saveReactionByCid.set(t.cid, u)
            }
          }),
          i.length && this.onStartAutoSave(i),
          !t || Array.isArray(t) ? i : i.length ? i[0] : void 0
        )
      }),
      (u.stopAutoSave = function (t) {
        var e = this,
          o = t ? (Array.isArray(t) ? t : [t]) : this._models,
          n = []

        return (
          o.forEach(function (t) {
            var o = e.saveReactionByCid.get(t.cid)
            o && (o(), e.saveReactionByCid.delete(t.cid), n.push(t))
          }),
          n.length && this.onStopAutoSave(n),
          !t || Array.isArray(t) ? n : n.length ? n[0] : void 0
        )
      }),
      (u.onStopAutoSave = function (t) {}),
      (u.onStartAutoSave = function (t) {}),
      (u.destroy = function () {
        t.prototype.destroy.call(this), this.stopAutoSave()
      }),
      (u.autoSaveEnabled = function (t) {
        return !!this.saveReactionByCid.get(t)
      }),
      r
    )
  })(o.Collection)
})
//# sourceMappingURL=autosave.umd.js.map
