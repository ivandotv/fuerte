import e from"fast-deep-equal";import{makeObservable as t,action as o,observable as s,computed as i,autorun as r,reaction as n,runInAction as d}from"mobx";import{nanoid as a}from"nanoid/non-secure";class l extends Error{constructor(e){super(e),this.name="Identity Error"}}class h{get identityKey(){return this.constructor.identityKey}constructor(){this.collection=void 0,this.cid=void 0,this.errors={save:null,delete:null},this._isDeleted=!1,this._isSaving=!1,this._isDeleting=!1,this.ignoreChange=!1,this._isDestroyed=!1,this.payloadActionDisposer=void 0,this.initialized=!1,this.pendingSaveCall=void 0,this.lastSavedData=void 0,this.cid=a(),t(this,{init:o,_isDeleted:s,isDeleted:i,_isSaving:s,isSaving:i,_isDeleting:s,isDeleting:i,isDirty:i,_isDestroyed:s,isDestroyed:i,isSyncing:i,lastSavedData:s,isNew:i,computePayload:i.struct,payload:i,setIdentity:o,identity:i,hasErrors:i,errors:s,saveError:i,deleteError:i,_onAdded:o,_onRemoved:o,_onSaveStart:o,_onSaveSuccess:o,_onSaveError:o,_onDeleteError:o,_onDeleteStart:o,_onDeleteSuccess:o,destroy:o})}init(){this.initialized||(this.payloadActionDisposer=this.startPayloadCompute(),this.lastSavedData=this.payload,this.initialized=!0)}get payload(){return this.computePayload}get computePayload(){return this.serialize()}startPayloadCompute(){return r(()=>this.payload)}get hasErrors(){return!!this.errors.save||!!this.errors.delete}get saveError(){return this.errors.save}get deleteError(){return this.errors.delete}_onAdded(e,t){if(this.collection&&!t)throw new Error('Model can be in only one non "lite" collection');t||(this.collection=e),this.onAdded(e,t)}onAdded(e,t){}_onRemoved(e,t){this.onRemoved(e,t),e===this.collection&&(this.collection=void 0)}onRemoved(e,t){}get isDeleted(){return this._isDeleted}get isSyncing(){return this.isSaving||this.isDeleting}get isDeleting(){return this._isDeleting}get isSaving(){return this._isSaving}get isDestroyed(){return this._isDestroyed}_onSaveStart({config:e,transportConfig:t,token:o}){this._isSaving=!0,this.pendingSaveCall={token:o,state:"pending"},this.errors.save=void 0,this.onSaveStart({config:e,transportConfig:t})}onSaveStart(e){}_onSaveSuccess({response:e,config:t,transportConfig:o,savedData:s,token:i}){var r,n,d;if(i!==(null==(r=this.pendingSaveCall)?void 0:r.token)&&"pending"!==(null==(n=this.pendingSaveCall)?void 0:n.state)||(this.lastSavedData=s),i===(null==(d=this.pendingSaveCall)?void 0:d.token)&&(this._isSaving=!1,this.pendingSaveCall.state="resolved"),this.isNew&&this.constructor.setIdentityFromResponse){const s=this.extractIdentityValue(null==e?void 0:e.data,t,o);if(!s)throw new l(`Can't set identity key: ${this.identityKey}`);this.setIdentity(s),this.lastSavedData[this.identityKey]=this.identity}this.onSaveSuccess({config:t,transportConfig:o,response:e})}onSaveSuccess(e){}_onSaveError({error:e,config:t,transportConfig:o,token:s,dataToSave:i}){var r;(null==(r=this.pendingSaveCall)?void 0:r.token)===s&&(this._isSaving=!1,this.errors.save=e,this.pendingSaveCall.state="rejected"),this.onSaveError({error:e,config:t,transportConfig:o,dataToSave:i})}onSaveError(e){}extractIdentityValue(e,t,o){return e&&e[this.identityKey]}get identity(){return this[this.identityKey]}setIdentity(e){this[this.identityKey]=e}get isNew(){return this.modelIsNew()}modelIsNew(){return this.identity===this.cid||!this.identity}_onDeleteStart(e){this._isDeleting=!0,this.onDeleteStart(e)}onDeleteStart(e){}_onDeleteSuccess(e){this._isDeleting=!1,this.errors.delete=void 0,this._isDeleted=!0,this.onDeleteSuccess(e)}onDeleteSuccess(e){}_onDeleteError(e){this.errors.delete=e.error,this._isDeleting=!1,this._isDeleted=!1,this.onDeleteError(e)}onDeleteError(e){}get isDirty(){return this.modelIsDirty()}modelIsDirty(){return!e(this.lastSavedData,this.payload)}destroy(){this.onDestroy(),this._isDestroyed=!0,this.payloadActionDisposer()}onDestroy(){}}function c(){return c=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var o=arguments[t];for(var s in o)Object.prototype.hasOwnProperty.call(o,s)&&(e[s]=o[s])}return e},c.apply(this,arguments)}h.identityKey="cid",h.setIdentityFromResponse=!1;const v=["error"];function y(e){return Array.isArray(e)?[...e]:[e]}const u={PENDING:"PENDING",RESOLVED:"RESOLVED",REJECTED:"REJECTED",IDLE:"IDLE"};function m(e){if(e.error)throw e.error;return function(e,t){if(null==e)return{};var o,s,i={},r=Object.keys(e);for(s=0;s<r.length;s++)t.indexOf(o=r[s])>=0||(i[o]=e[o]);return i}(e,v)}class g extends class{constructor(e,r){this.factory=void 0,this._models=[],this.modelByCid=new Map,this.modelByIdentity=new Map,this.config=void 0,this.identityReactionByCid=new Map,this.factory=e,this.config={add:c({insertPosition:"end"},null!=r&&r.add?r.add:void 0),remove:c({destroy:!1},null!=r&&r.remove?r.remove:void 0),reset:c({destroy:!1},null!=r&&r.reset?r.reset:void 0)},t(this,{add:o,_models:s.shallow,modelByCid:s.shallow,modelByIdentity:s.shallow,addToCollection:o,removeFromCollection:o,destroy:o,syncing:i,deleting:i,saving:i,new:i,models:i})}getConfig(){return this.config}assertIsModel(e){if(!h.prototype.isPrototypeOf(e))throw new Error("model is not instance of Model class")}push(e){return this.add(e)}add(e){return this.addToCollection(e,{insertPosition:"end"})}unshift(e){return this.addToCollection(e,{insertPosition:"start"})}addAtIndex(e,t){return this.addToCollection(e,{insertPosition:t})}addToCollection(e,t){const o=y(e),s=c({},this.config.add,t),i=[];for(const e of o)this.assertIsModel(e),this.notPresent(e)&&(i.push(e),this.startTracking(e),this.notifyAdded(e),this.onAdded(e));if("end"===s.insertPosition)this._models.push(...i);else if("start"===s.insertPosition)this._models.unshift(...i);else{if(s.insertPosition>this._models.length||s.insertPosition<0)throw new Error("insertion index out of bounds");this._models.splice(s.insertPosition,0,...i)}return Array.isArray(e)?i:i[0]}notPresent(e){const t=!this.modelByCid.get(e.cid);let o=!1;const s=e.identity;return s&&(o=!!this.modelByIdentity.get(s)),t&&!o}startTracking(e){this.modelByCid.set(e.cid,e);const t=e.identity;t&&this.modelByIdentity.set(t,e);const o=n(()=>e.identity,t=>{this.modelByIdentity.set(t,e)},{name:`id-${e.cid}`});this.identityReactionByCid.set(e.cid,o)}stopTracking(e){this.modelByCid.delete(e.cid),this.modelByIdentity.delete(e.identity);const t=this.identityReactionByCid.get(e.cid);t&&t()}resolveModel(e){return this.modelByIdentity.get(e)||this.modelByCid.get(e)}resolveModels(e){const t=y(e),o=[];for(const e of t){const t=this.resolveModel(e);t&&o.push(t)}return o}create(e){const t=this.factory(e);var o;return(o=t)instanceof Promise||(e=>null!==e&&("object"==typeof e||"function"==typeof e))(o)&&"function"==typeof o.then&&"function"==typeof o.catch?t.then(e=>{e.init()}):t.init(),t}getById(e){return Array.isArray(e)?this.resolveModels(e):this.resolveModel(e)}get models(){return this._models}get new(){return this.models.filter(e=>e.isNew)}get deleted(){return this.models.filter(e=>e.isDeleted)}get syncing(){return this.deleting.concat(this.saving)}get deleting(){return this._models.filter(e=>e.isDeleting)}get saving(){return this._models.filter(e=>e.isSaving)}pop(e){if(this.models.length>0)return this.removeFromCollection(this.models[this.models.length-1],e)}shift(e){if(this.models.length>0)return this.removeFromCollection(this.models[0],e)}removeAtIndex(e,t){if(!(e<0||e>=this._models.length))return this.removeFromCollection(this._models[e],t)}remove(e,t){const o=this.resolveModels(e);let s=o;if(!Array.isArray(e)){if(!o.length)return;s=s[0]}return this.removeFromCollection(s,t)}removeFromCollection(e,t){const o=new Set(y(e).map(e=>e.cid)),s=[],i=this._models.length,r=e=>{s.push(e),this.stopTracking(e),this.notifyRemoved(e),null!=t&&t.destroy&&e.destroy(),this.onRemoved(e)};if(1===o.size)for(let e=0;e<i;e++){const t=this._models[e];if(this.assertIsModel(t),o.has(t.cid)){this._models.splice(e,1),r(t);break}}else{const e=[];for(let t=0;t<i;t++){const s=this._models[t];this.assertIsModel(s),o.has(s.cid)?r(s):e.push(s)}this._models=e}return Array.isArray(e)?s:s[0]}notifyRemoved(e){e._onRemoved(this,!0)}notifyAdded(e){e._onAdded(this,!0)}onRemoved(e){}onAdded(e){}serialize(){return c({models:this.serializeModels()},this.onSerialize())}serializeModels(){return this._models.reduce((e,t)=>{const o=t.payload;return o&&e.push(o),e},[])}onSerialize(){}async resetCollection(e,t){if(!e){const e=this.removeFromCollection(this._models,t);return this.onReset([],e),[[],e]}const o=[];for(const t of e){const e=this.onModelCreateData(t);if(!e)continue;const s=await this.factory(e);o.push(s)}const s=this.removeFromCollection(this._models,t),i=this.addToCollection(o,{insertPosition:"end"});return this.onReset(i,s),[i,s]}reset(e,t){return this.resetCollection(e,t)}onReset(e,t){}onModelCreateData(e){return e}destroy(){this.onDestroy(),this.identityReactionByCid.forEach(e=>e()),this._models.forEach(e=>{this.notifyRemoved(e)})}onDestroy(){}}{constructor(e,i,r){super(e,r),this.transport=void 0,this.loadError=void 0,this.loadStatus="IDLE",this._deleting=new Map,this._saving=new Map,this.transport=i,this.config=c({},this.config,{save:c({insertPosition:"end",addImmediately:!0,addOnError:!0},null!=r&&r.save?r.save:void 0),delete:c({remove:!0,destroyOnRemoval:!0,removeImmediately:!0,removeOnError:!1},null!=r&&r.delete?r.delete:void 0),load:c({duplicateModelStrategy:"KEEP_NEW",compareFn:()=>"KEEP_NEW",insertPosition:"end",destroyOnRemoval:!0,reset:!1,destroyOnReset:!1},null!=r&&r.load?r.load:void 0)}),t(this,{save:o,delete:o,load:o,_saving:s.shallow,_deleting:s.shallow,onSaveStart:o,onSaveSuccess:o,onSaveError:o,onDeleteStart:o,onDeleteSuccess:o,onDeleteError:o,onLoadStart:o,onLoadSuccess:o,onLoadError:o,loadStatus:s,loadError:s})}getConfig(){return this.config}getTransport(){return this.transport}async save(e,t,o){const s=c({},this.config.save,t);s.addImmediately?this.addToCollection(e,{insertPosition:s.insertPosition}):this.assertIsModel(e);const i={};d(()=>{this._saving.set(e.cid,{token:i,model:e})});const r=e.payload;try{this.onSaveStart({model:e,config:s,transportConfig:o}),e._onSaveStart({config:s,transportConfig:o,token:i});const t=await this.callTransportSave(e,o);return s.addImmediately||this.addToCollection(e,{insertPosition:s.insertPosition}),this.onSaveSuccess({model:e,response:t,config:s,transportConfig:o}),e._onSaveSuccess({response:t,config:s,transportConfig:o,savedData:r,token:i}),{response:t,model:e,error:void 0}}catch(t){return t instanceof l||s.addImmediately||!s.addOnError||this.addToCollection(e,{insertPosition:s.insertPosition}),this.onSaveError({model:e,error:t,config:s,transportConfig:o}),e._onSaveError({error:t,config:s,transportConfig:o,token:i,dataToSave:r}),{error:t,model:void 0,response:void 0}}finally{const t=this._saving.get(e.cid);(null==t?void 0:t.token)===i&&d(()=>{this._saving.delete(e.cid)})}}callTransportSave(e,t){return this.transport.save(e,t)}callTransportDelete(e,t){return this.transport.delete(e,t)}callTransportLoad(e){return this.transport.load(e)}onSaveStart(e){}onSaveSuccess(e){}onSaveError(e){}get deleting(){return[...this._deleting.values()]}get saving(){const e=[];return this._saving.forEach(t=>{e.push(t.model)}),e}async delete(e,t,o){const s=c({},this.config.delete,t),i=this.resolveModel(e);try{this.modelCanBeDeleted(i)}catch(e){return{error:e.message,response:void 0,model:void 0}}s.remove&&s.removeImmediately&&this.removeFromCollection(i,{destroy:s.destroyOnRemoval});try{this._deleting.set(i.cid,i),this.onDeleteStart({model:i,config:s,transportConfig:o}),i._onDeleteStart({config:s,transportConfig:o});const e=await this.callTransportDelete(i,o);return s.remove&&!s.removeImmediately&&this.removeFromCollection(i,{destroy:s.destroyOnRemoval}),this.onDeleteSuccess({model:i,response:e,config:s,transportConfig:o}),i._onDeleteSuccess({response:e,config:s,transportConfig:o}),{response:e,model:i,error:void 0}}catch(e){return s.remove&&!s.removeImmediately&&s.removeOnError&&this.removeFromCollection(i,{destroy:s.destroyOnRemoval}),this.onDeleteError({model:i,error:e,config:s,transportConfig:o}),i._onDeleteError({error:e,config:s,data:null==e?void 0:e.data,transportConfig:o}),{response:void 0,model:void 0,error:e}}finally{d(()=>{this._deleting.delete(i.cid)})}}modelCanBeDeleted(e){if(this.assertModelIsExists(e),e.isDeleted)throw new Error("Model is deleted");if(e.isDeleting)throw new Error("Model is in the process of deleting")}assertModelIsExists(e){if(!e)throw new Error("Model is not in the collection")}onDeleteStart(e){}onDeleteSuccess(e){}onDeleteError(e){}async load(e,t){this.loadError=void 0;const o=c({},this.config.load,e);try{this.loadStatus="PENDING",this.onLoadStart({config:o,transportConfig:t});const e=await this.callTransportLoad(t);if(d(()=>{this.loadStatus="RESOLVED"}),o.reset){const[s,i]=await this.resetCollection(e.data,{destroy:o.destroyOnReset});return this.onLoadSuccess({config:o,transportConfig:t,response:e,added:s,removed:i}),{response:e,added:s,removed:i,error:void 0}}const s=[],i=[];for(const t of e.data){const e=this.onModelCreateData(t);if(!e)continue;const r=await this.factory(e);if(this.notPresent(r))s.push(r);else{const e=this.modelByIdentity.get(r.identity),t=o.compareFn(r,e);switch(o.duplicateModelStrategy){case"KEEP_NEW":i.push(e.cid),s.push(r);break;case"COMPARE":switch(t){case"KEEP_NEW":s.push(r),i.push(e.cid);break;case"KEEP_OLD":break;case"KEEP_BOTH":if(!this.notPresent(r))throw new Error("New model has a non unique identity");s.push(r);break;default:throw new Error("Invalid compare result")}}}}const r=this.remove(i,{destroy:o.destroyOnRemoval}),n=this.addToCollection(s,{insertPosition:o.insertPosition});return this.onLoadSuccess({config:o,transportConfig:t,response:e,added:n,removed:r}),{response:e,added:n,removed:r,error:void 0}}catch(e){return d(()=>{this.loadError=e,this.loadStatus="REJECTED"}),this.onLoadError({config:o,transportConfig:t,error:e}),{error:e,response:void 0,added:void 0,removed:void 0}}}onLoadStart(e){}onLoadSuccess(e){}onLoadError(e){}notifyAdded(e){e._onAdded(this,!1)}notifyRemoved(e){e._onRemoved(this,!1)}destroy(){super.destroy(),this._models.forEach(e=>{e.destroy()}),this._models=[]}}class f{load(){return Promise.resolve({data:[]})}save(e){return Promise.resolve()}delete(){return Promise.resolve()}}export{u as ASYNC_STATUS,g as Collection,h as Model,f as StubTransport,m as unwrapResult};
//# sourceMappingURL=core.esm.js.map
