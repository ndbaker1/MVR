(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{8312:function(e,n,t){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return t(1472)}])},1472:function(e,n,t){"use strict";t.r(n),t.d(n,{default:function(){return J}});var r=t(7568),o=t(603),i=t(4051),a=t.n(i),s=t(5893),c=t(6772),u=t(7564),l=t(7841),d=t(6137),h=t(4078),p=t(966),f=t(9814),w=t(9834),v=t(5477),x=t(8393),y=t(9513),g=t(9604),m=t(1438),k=t(1799);function S(e){var n=e.path,t=e.host,r=e.closeCallback,o=e.errorCallback,i=e.openCallback,a=location.protocol.includes("https")?"wss":"ws",s="".concat(a,"://").concat(t).concat(n);if(!s.startsWith("ws"))throw Error("bad url");var c=new WebSocket(s);return c.addEventListener("close",(function(e){return r?r(e):console.log(JSON.stringify(e))})),c.addEventListener("error",(function(e){return o?o(e):console.error(JSON.stringify(e))})),c.addEventListener("open",(function(e){return i?i(e):console.log(JSON.stringify(e))})),c}function j(){return(j=(0,r.Z)(a().mark((function e(n){var t,r;return a().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t=new AbsoluteOrientationSensor({frequency:60,referenceFrame:"device"}),e.next=3,Promise.all([navigator.permissions.query({name:"accelerometer"}),navigator.permissions.query({name:"magnetometer"}),navigator.permissions.query({name:"gyroscope"})]);case 3:return r=e.sent,t.addEventListener("reading",(function(){try{n({type:"Rotation",data:t.quaternion})}catch(e){console.error(e),t.stop()}})),t.addEventListener("error",console.log),r.every((function(e){return"granted"===e.state}))?t.start():console.log("No permissions to use AbsoluteOrientationSensor."),e.abrupt("return",(function(){return t.stop()}));case 8:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function b(){return(b=(0,r.Z)(a().mark((function e(n){var t;return a().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return(t=new LinearAccelerationSensor({frequency:60})).addEventListener("reading",(function(){try{n({type:"Acceleration",data:[t.x,t.y,t.z]})}catch(e){console.error(e),t.stop()}})),t.addEventListener("error",console.log),t.start(),e.abrupt("return",(function(){return t.stop()}));case 5:case"end":return e.stop()}}),e)})))).apply(this,arguments)}var Z,E,A,C,z=function e(n,t,r){var o=this;if((0,m.Z)(this,e),this.id=n,!("LinearAccelerationSensor"in window))throw alert("LinearAccelerationSensor not supported");if(!("AbsoluteOrientationSensor"in window))throw alert("AbsoluteOrientationSensor not supported");this.ws=S((0,k.Z)({host:t,path:"/racket/".concat(n)},r));var i=function(e){if(o.ws.readyState===o.ws.CLOSING||o.ws.readyState===o.ws.CLOSED)throw Error("connection closed");o.ws.readyState===o.ws.OPEN&&o.ws.send(JSON.stringify(e))};!function(e){b.apply(this,arguments)}(i),function(e){j.apply(this,arguments)}(i)},O=function(){function e(n,t,r){(0,m.Z)(this,e),this.id=n,this.ws=S((0,k.Z)({host:t,path:"/observer/".concat(n)},r))}return e.asPlayerData=function(e){if("string"===typeof e)return JSON.parse(e);throw Error("invalid data")},e}(),L=t(7294),N=t(8254),q=t(7707),_=t(9477),M=t(7011),P=t(3454),D=null!==(A=null===P||void 0===P||null===(Z=P.env)||void 0===Z?void 0:"phone-pong-production.up.railway.app")&&void 0!==A?A:"localhost:42069",H=null!==(C=null===P||void 0===P||null===(E=P.env)||void 0===E?void 0:"/phone-pong")&&void 0!==C?C:"";var J=function(){var e=(0,o.Z)(L.useState(!1),2),n=e[0],t=e[1],r=(0,o.Z)(L.useState(!1),2),i=r[0],a=r[1],m=(0,o.Z)(L.useState(X),2),k=m[0],S=m[1];L.useEffect((function(){t(!!sessionStorage.getItem("debug"))}),[]);var j=(0,o.Z)(L.useState(),2),b=j[0],Z=j[1],E=(0,o.Z)(L.useState(!1),2),A=E[0],C=E[1],_=(0,o.Z)(L.useState(),2),M=_[0],P=_[1],H=(0,o.Z)(L.useState(!1),2),J=H[0],T=H[1],W=function(e){var n=(0,o.Z)(L.useState(""),2),t=n[0],r=n[1],i=(t||e).replaceAll(/.*:\/\/|\/$/gi,"");return{host:t,setHost:r,webSocketHost:i}}(D),F=W.host,I=W.setHost,Y=W.webSocketHost;return(0,s.jsxs)("div",{id:"app",children:[(0,s.jsx)(c.V,{opened:!0,size:"min(90vw, 30rem)",children:(0,s.jsxs)(u.K,{children:[n?(0,s.jsx)(l.z,{onClick:function(){return a(!0)},children:"Show Editor"}):(0,s.jsx)(s.Fragment,{}),(0,s.jsxs)(d.Z,{grow:!0,children:[(0,s.jsxs)(h.v,{shadow:"md",children:[(0,s.jsx)(h.v.Target,{children:(0,s.jsx)(l.z,{children:J?(0,s.jsx)(p.a,{color:"white",size:"sm"}):M?"Observer ".concat(M.id):"Connect Observer"})}),(0,s.jsx)(h.v.Dropdown,{children:(0,s.jsx)(f.M,{cols:3,children:Array(9).fill(0).map((function(e,n){return(0,s.jsx)(d.Z,{grow:!0,children:(0,s.jsx)(w.A,{size:"xl",onClick:function(){T(!0);var e=new O(n,Y,{openCallback:function(){P((function(n){return n&&n.ws.close(),function(e,n){R.apply(this,arguments)}({code:k},e),T(!1),e}))}})},children:n})},n)}))})})]}),(0,s.jsxs)(h.v,{shadow:"md",children:[(0,s.jsx)(h.v.Target,{children:(0,s.jsx)(l.z,{children:A?(0,s.jsx)(p.a,{color:"white",size:"sm"}):b?"Racket ".concat(b.id):"Connect Racket"})}),(0,s.jsx)(h.v.Dropdown,{children:(0,s.jsx)(f.M,{cols:3,children:Array(9).fill(0).map((function(e,n){return(0,s.jsx)(d.Z,{grow:!0,children:(0,s.jsx)(w.A,{size:"xl",onClick:function(){C(!0);var e=new z(n,Y,{openCallback:function(){Z((function(n){return n&&n.ws.close(),C(!1),e}))}})},children:n})},n)}))})})]})]}),(0,s.jsx)(d.Z,{grow:!0,children:(0,s.jsx)(v.o,{icon:(0,s.jsx)(N.Z,{}),rightSection:(0,s.jsx)(x.u,{label:"paste",children:(0,s.jsx)(w.A,{onClick:function(){return navigator.clipboard.readText().then(I)},children:(0,s.jsx)(q.Z,{})})}),placeholder:D,onChange:function(e){return I(e.target.value)},width:"100%",value:F})})]})}),(0,s.jsx)(y.d,{position:"right",size:"60vw",opened:i,onClose:function(){return a(!1)},children:(0,s.jsx)(g.ZP,{value:k,onChange:function(e){return S(null!==e&&void 0!==e?e:"")},language:"javascript",theme:"vs-dark"})}),(0,s.jsx)("main",{id:"screen"})]})};function T(){return W.apply(this,arguments)}function W(){return(W=(0,r.Z)(a().mark((function e(){var n,t,r,o;return a().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n=new M.L,e.next=3,n.loadAsync("".concat(H,"/assets/phone-pong.obj"));case 3:return t=e.sent,(r=t.children[1]).material=new _.RSm,o=t.children[0],e.abrupt("return",{racketMesh:r,ballMesh:o});case 8:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function R(){return R=(0,r.Z)(a().mark((function e(n,t){var r,i,s,c,u,l,d,h,p,f;return a().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return f=function(e){l.render(r,i)},r=new _.xsS,(i=new _.cPb(80,window.innerWidth/window.innerHeight,.1,1e4)).position.set(-500,0,0),i.lookAt(0,0,0),e.next=7,T();case 7:if(s=e.sent,s.ballMesh,c=s.racketMesh,u=new Map,(l=new _.CP7).setSize(window.innerWidth,window.innerHeight),l.setAnimationLoop(f),!(d=document.querySelector('main[id="screen"]'))){e.next=19;break}d.replaceChildren(l.domElement),e.next=20;break;case 19:throw Error("failed to replace screen with renderer.");case 20:p=new Function("id","playerData","rackets","racketMesh","scene",null!==(h=n.code)&&void 0!==h?h:""),t.ws.addEventListener("message",(function(e){var t=e.data,i=O.asPlayerData(t);Object.entries(i).forEach((function(e){var t=(0,o.Z)(e,2),i=t[0],a=t[1];if(n.code)p(i,a,u,c,r);else{if(!u.has(i)){var s=c.clone();u.set(i,s),r.add(s)}var l=u.get(i),d=(0,o.Z)(a.rotation,4),h=d[0],f=d[1],w=d[2],v=d[3],x=l.quaternion.fromArray([h,w,f,v]).invert();x.z*=-1,x.w*=-1;var y=(0,o.Z)(a.position.map((function(e){return 2e3*e})),3);y[0],y[1],y[2]}}))}));case 24:case"end":return e.stop()}}),e)}))),R.apply(this,arguments)}var X="\n// logic for adding new meshes when a new player connects\nif (!rackets.has(id)) {\n  const racket = racketMesh.clone()\n  rackets.set(id, racket)\n  scene.add(racket)\n}\nconst racket = rackets.get(id)\n\n{\n  const [x, y, z, w] = playerData.rotation\n  // flip y and z based on how we interpret them.\n  const quaternion = racket.quaternion.fromArray([x, z, y, w]).invert()\n  // reverse the X and Y rotation,\n  // which means mirror the XY plane (negation of the Z and W values).\n  quaternion.z *= -1\n  quaternion.w *= -1\n}\n\n{\n  const [x, y, z] = playerData.position.map(i => i * 2000)\n  // racket.position.fromArray([x, y, z])\n  // racket.position.fromArray([x, y, z])\n}\n"}},function(e){e.O(0,[737,13,774,888,179],(function(){return n=8312,e(e.s=n);var n}));var n=e.O();_N_E=n}]);