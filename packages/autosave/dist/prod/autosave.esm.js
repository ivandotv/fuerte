import{reaction as t}from"mobx";import{Collection as e}from"@fuerte/core";function a(){return a=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var a=arguments[e];for(var o in a)Object.prototype.hasOwnProperty.call(a,o)&&(t[o]=a[o])}return t},a.apply(this,arguments)}class o extends e{constructor(t,e,o){super(t,e,o),this.identityReactionByCid=new Map,this.saveReactionByCid=new Map,this.config.autoSave=a({enabled:!1,debounce:0},null!=o&&o.autoSave?o.autoSave:void 0)}getConfig(){return super.getConfig()}startTracking(t){super.startTracking(t),this.config.autoSave.enabled&&this.startAutoSave(t)}stopTracking(t){super.stopTracking(t);const e=this.identityReactionByCid.get(t.cid);e&&e(),this.stopAutoSave(t)}autoSave(t){this.save(t.model)}startAutoSave(e){const a=e?Array.isArray(e)?e:[e]:this._models,o=[];return a.forEach(e=>{if(!this.saveReactionByCid.get(e.cid)){o.push(e);const a=t(()=>({model:e,data:e.payload}),this.config.autoSave.debounce?function(t,e){let a;return(o,i,s)=>{clearTimeout(a),a=setTimeout(()=>t(o,i,s),e)}}(this.autoSave.bind(this),this.config.autoSave.debounce):this.autoSave.bind(this),{name:`save-${e.cid}`});this.saveReactionByCid.set(e.cid,a)}}),o.length&&this.onStartAutoSave(o),!e||Array.isArray(e)?o:o.length?o[0]:void 0}stopAutoSave(t){const e=t?Array.isArray(t)?t:[t]:this._models,a=[];return e.forEach(t=>{const e=this.saveReactionByCid.get(t.cid);e&&(e(),this.saveReactionByCid.delete(t.cid),a.push(t))}),a.length&&this.onStopAutoSave(a),!t||Array.isArray(t)?a:a.length?a[0]:void 0}onStopAutoSave(t){}onStartAutoSave(t){}destroy(){super.destroy(),this.stopAutoSave()}autoSaveEnabled(t){return!!this.saveReactionByCid.get(t)}}export{o as AutosaveCollection};
//# sourceMappingURL=autosave.esm.js.map
