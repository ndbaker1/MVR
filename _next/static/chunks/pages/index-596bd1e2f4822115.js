(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{8312:function(e,n,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return r(1472)}])},1472:function(e,n,r){"use strict";r.r(n),r.d(n,{default:function(){return T}});var t=r(7568),o=r(603),i=r(4051),s=r.n(i),a=r(5893),c=r(7294),u=r(9604),l=r(8254),d=r(7707),p=r(6772),f=r(7564),h=r(7841),w=r(6137),v=r(4078),x=r(966),y=r(9814),g=r(9834),m=r(5477),S=r(8393),j=r(9513),k=r(9477),b=r(7011),E=r(1438),Z=r(1799);function A(e){var n=e.path,r=e.host,t=e.closeCallback,o=e.errorCallback,i=e.openCallback,s=location.protocol.includes("https")?"wss":"ws",a="".concat(s,"://").concat(r).concat(n);if(!a.startsWith("ws"))throw Error("bad url");var c=new WebSocket(a);return c.addEventListener("close",(function(e){return t?t(e):console.log(JSON.stringify(e))})),c.addEventListener("error",(function(e){return o?o(e):console.error(JSON.stringify(e))})),c.addEventListener("open",(function(e){return i?i(e):console.log(JSON.stringify(e))})),c}function L(e){return C.apply(this,arguments)}function C(){return(C=(0,t.Z)(s().mark((function e(n){var r,t;return s().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r=new AbsoluteOrientationSensor({frequency:60,referenceFrame:"device"}),e.next=3,Promise.all([navigator.permissions.query({name:"accelerometer"}),navigator.permissions.query({name:"magnetometer"}),navigator.permissions.query({name:"gyroscope"})]);case 3:return t=e.sent,r.addEventListener("reading",(function(){try{n({type:"Rotation",data:r.quaternion})}catch(e){console.error(e),r.stop()}})),r.addEventListener("error",console.log),t.every((function(e){return"granted"===e.state}))?r.start():console.log("No permissions to use AbsoluteOrientationSensor."),e.abrupt("return",(function(){return r.stop()}));case 8:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function O(e){return N.apply(this,arguments)}function N(){return(N=(0,t.Z)(s().mark((function e(n){var r;return s().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return(r=new LinearAccelerationSensor({frequency:60})).addEventListener("reading",(function(){try{n({type:"Acceleration",data:[r.x,r.y,r.z]})}catch(e){console.error(e),r.stop()}})),r.addEventListener("error",console.log),r.start(),e.abrupt("return",(function(){return r.stop()}));case 5:case"end":return e.stop()}}),e)})))).apply(this,arguments)}var _,z,q,P,D=function(){function e(n,r,t){if((0,E.Z)(this,e),this.id=n,!("LinearAccelerationSensor"in window))throw alert("LinearAccelerationSensor not supported");if(!("AbsoluteOrientationSensor"in window))throw alert("AbsoluteOrientationSensor not supported");this.ws=A((0,Z.Z)({host:r,path:"/racket/".concat(n)},t))}return e.prototype.initSensors=function(){var e=this;return(0,t.Z)(s().mark((function n(){var r,t;return s().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return r=function(n){if(e.ws.readyState===e.ws.CLOSING||e.ws.readyState===e.ws.CLOSED)throw Error("connection closed");e.ws.readyState===e.ws.OPEN&&e.ws.send(JSON.stringify(n))},n.next=3,O(r);case 3:return n.t0=n.sent,n.next=6,L(r);case 6:n.t1=n.sent,t=[n.t0,n.t1],e.ws.addEventListener("error",(function(){return t.forEach((function(e){return e()}))})),e.ws.addEventListener("close",(function(){return t.forEach((function(e){return e()}))}));case 10:case"end":return n.stop()}}),n)})))()},e}(),M=function(){function e(n,r,t){(0,E.Z)(this,e),this.id=n,this.ws=A((0,Z.Z)({host:r,path:"/observer/".concat(n)},t))}return e.asPlayerData=function(e){if("string"===typeof e)return JSON.parse(e);throw Error("invalid data")},e}(),H=r(3454),J=null!==(q=null===H||void 0===H||null===(_=H.env)||void 0===_?void 0:"phone-pong-production.up.railway.app")&&void 0!==q?q:"localhost:42069",R=null!==(P=null===H||void 0===H||null===(z=H.env)||void 0===z?void 0:"/phone-pong")&&void 0!==P?P:"";var T=function(){var e=(0,o.Z)(c.useState(!1),2),n=e[0],r=e[1],t=(0,o.Z)(c.useState(!1),2),i=t[0],s=t[1],k=(0,o.Z)(c.useState(G),2),b=k[0],E=k[1];c.useEffect((function(){window.debug=function(){return r(!0)}}),[]);var Z=(0,o.Z)(c.useState(),2),A=Z[0],L=Z[1],C=(0,o.Z)(c.useState(!1),2),O=C[0],N=C[1],_=(0,o.Z)(c.useState(),2),z=_[0],q=_[1],P=(0,o.Z)(c.useState(!1),2),H=P[0],R=P[1],T=function(e){var n=(0,o.Z)(c.useState(""),2),r=n[0],t=n[1],i=(r||e).replaceAll(/.*:\/\/|\/$/gi,"");return{host:r,setHost:t,webSocketHost:i}}(J),W=T.host,F=T.setHost,I=T.webSocketHost;return(0,a.jsxs)("div",{id:"app",children:[(0,a.jsx)(p.V,{opened:!0,size:"min(90vw, 30rem)",children:(0,a.jsxs)(f.K,{children:[n?(0,a.jsx)(h.z,{onClick:function(){return s(!0)},children:"Show Editor"}):(0,a.jsx)(a.Fragment,{}),(0,a.jsxs)(w.Z,{grow:!0,children:[(0,a.jsxs)(v.v,{shadow:"md",children:[(0,a.jsx)(v.v.Target,{children:(0,a.jsx)(h.z,{children:H?(0,a.jsx)(x.a,{color:"white",size:"sm"}):z?"Observer ".concat(z.id):"Connect Observer"})}),(0,a.jsx)(v.v.Dropdown,{children:(0,a.jsx)(y.M,{cols:3,children:Array(9).fill(0).map((function(e,n){return(0,a.jsx)(w.Z,{grow:!0,children:(0,a.jsx)(g.A,{size:"xl",onClick:function(){R(!0);var e=function(){var e=new M(n,I,{});!function(e,n){X.apply(this,arguments)}({code:b},e),q(e),R(!1)};z?(z.ws.addEventListener("close",e),z.ws.close()):e()},children:n})},n)}))})})]}),(0,a.jsxs)(v.v,{shadow:"md",children:[(0,a.jsx)(v.v.Target,{children:(0,a.jsx)(h.z,{children:O?(0,a.jsx)(x.a,{color:"white",size:"sm"}):A?"Racket ".concat(A.id):"Connect Racket"})}),(0,a.jsx)(v.v.Dropdown,{children:(0,a.jsx)(y.M,{cols:3,children:Array(9).fill(0).map((function(e,n){return(0,a.jsx)(w.Z,{grow:!0,children:(0,a.jsx)(g.A,{size:"xl",onClick:function(){N(!0);var e=function(){var e=new D(n,I,{});e.initSensors(),L(e),N(!1)};A?(A.ws.addEventListener("close",e),A.ws.close()):e()},children:n})},n)}))})})]})]}),(0,a.jsx)(w.Z,{grow:!0,children:(0,a.jsx)(m.o,{icon:(0,a.jsx)(l.Z,{}),rightSection:(0,a.jsx)(S.u,{label:"paste",children:(0,a.jsx)(g.A,{onClick:function(){return navigator.clipboard.readText().then(F)},children:(0,a.jsx)(d.Z,{})})}),placeholder:J,onChange:function(e){return F(e.target.value)},width:"100%",value:W})})]})}),(0,a.jsx)(j.d,{position:"right",size:"60vw",opened:i,onClose:function(){return s(!1)},children:(0,a.jsx)(u.ZP,{value:b,onChange:function(e){return E(null!==e&&void 0!==e?e:"")},language:"javascript",theme:"vs-dark"})}),(0,a.jsx)("main",{id:"screen"})]})};function W(){return F.apply(this,arguments)}function F(){return(F=(0,t.Z)(s().mark((function e(){var n,r,t,o;return s().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n=new b.L,e.next=3,n.loadAsync("".concat(R,"/assets/phone-pong.obj"));case 3:return r=e.sent,(t=r.children[1]).material=new k.RSm,(o=r.children[0]).material=new k.RSm,e.abrupt("return",{racketMesh:t,ballMesh:o});case 9:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function X(){return X=(0,t.Z)(s().mark((function e(n,r){var t,i,a,c,u,l,d,p,f,h;return s().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return h=function(e){l.render(t,i)},t=new k.xsS,(i=new k.cPb(80,window.innerWidth/window.innerHeight,.1,1e4)).position.set(-1e3,0,0),i.lookAt(0,0,0),e.next=7,W();case 7:if(a=e.sent,a.ballMesh,c=a.racketMesh,u=new Map,(l=new k.CP7).setSize(window.innerWidth,window.innerHeight),l.setAnimationLoop(h),!(d=document.querySelector('main[id="screen"]'))){e.next=19;break}d.replaceChildren(l.domElement),e.next=20;break;case 19:throw Error("failed to replace screen with renderer.");case 20:p=n.code?new Function("playerData","racket",n.code):function(e,n){n.quaternion.fromArray(e.rotation),n.position.fromArray(e.position)},f=function(e){Object.entries(e).forEach((function(e){var n=(0,o.Z)(e,2),r=n[0],i=n[1];if(!u.has(r)){var s=c.clone();u.set(r,s),t.add(s)}p(i,u.get(r))}))},r.ws.addEventListener("message",(function(e){var n=e.data;return f(M.asPlayerData(n))}));case 24:case"end":return e.stop()}}),e)}))),X.apply(this,arguments)}var G="\nracket.quaternion.fromArray(playerData.rotation)\nracket.position.fromArray(playerData.position)\n"}},function(e){e.O(0,[737,13,774,888,179],(function(){return n=8312,e(e.s=n);var n}));var n=e.O();_N_E=n}]);