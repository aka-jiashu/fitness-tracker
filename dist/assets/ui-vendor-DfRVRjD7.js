import{r as B}from"./db-vendor-BOWjZvwI.js";/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=c=>c==null?void 0:c.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */function na(c,t,M=[]){if(t==null)throw new Error("[lucide]: iconNode is required when icon name is used");return{name:ta(c),size:24,node:t,...M.length>0?{aliases:M}:{}}}/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ra=c=>{let t="",M=!1;for(const f of c){if(f==="-"||f==="_"||f<=" "){M=t.length>0;continue}t.length===0?t+=f.toLowerCase():t+=M?f.toUpperCase():f,M=!1}return t};/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oa=c=>{const t=ra(c);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X=(...c)=>c.filter((t,M,f)=>!!t&&t.trim()!==""&&f.indexOf(t)===M).join(" ").trim();/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */function Q(c){return c!=null}function sa(c,t={}){var R,F;const M=t.attributeNames??{},f=w=>M[w]??w,C=c.size??c.width??N.width,A=c.size??c.height??N.height,P=((R=c.aliases)==null?void 0:R.filter(w=>typeof w=="string"&&w.trim()!=="").map(w=>`lucide-${w}`))??[],$=[...c.name?[`lucide-${c.name}`]:[],...P],_=((F=t.className)==null?void 0:F.split(" ").filter(Boolean))??[],T=t.includeDefaultClasses===!1?X(..._):X("lucide",...$,..._),j=t.absoluteStrokeWidth?Number(t.strokeWidth??N["stroke-width"])*Number(c.size??c.width??N.width)/Number(t.size??t.width??N.width):t.strokeWidth??N["stroke-width"];return["svg",{...Object.entries(N).reduce((w,[I,m])=>(w[f(I)]=m,w),{}),..."color"in t&&t.color&&{[f("stroke")]:t.color},..."size"in t&&Q(t.size)&&{[f("width")]:t.size,[f("height")]:t.size},..."width"in t&&Q(t.width)&&{[f("width")]:t.width},..."height"in t&&Q(t.height)&&{[f("height")]:t.height},[f("stroke-width")]:j,...T&&{[f("class")]:T},[f("viewBox")]:`0 0 ${C} ${A}`,...t.hasA11yProp===!1?{[f("aria-hidden")]:"true"}:{},..."attributes"in t&&t.attributes},c.node.map(w=>{const[I,m,q]=w,O=t.nonScalingStroke?{[f("vector-effect")]:"non-scaling-stroke",...m}:m;return q?[I,O,q]:[I,O]})]}/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */function ia(c,t={}){return sa(c,{...t,attributeNames:{...t.attributeNames,class:"className","stroke-width":"strokeWidth","stroke-linecap":"strokeLinecap","stroke-linejoin":"strokeLinejoin","vector-effect":"vectorEffect"}})}/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ca=c=>{for(const t in c)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1},la=B.createContext({}),da=()=>B.useContext(la),ha=B.forwardRef(({color:c,size:t,width:M,height:f,strokeWidth:C,absoluteStrokeWidth:A,nonScalingStroke:P,className:$="",children:_,iconNode:T=[],icon:j={node:T,aliases:[],size:24},...E},R)=>{const{size:F=24,strokeWidth:w=2,absoluteStrokeWidth:I=!1,nonScalingStroke:m=!1,color:q="currentColor",className:O=""}=da()??{},W=!!_||ca(E),[V,H,U=[]]=ia(j,{color:c??q,width:M??t??F,height:f??t??F,strokeWidth:C??w,absoluteStrokeWidth:A??I,nonScalingStroke:P??m,className:X(O,$),hasA11yProp:W,attributes:E});return B.createElement(V,{ref:R,...H},[...U.map(([Z,K])=>B.createElement(Z,K)),...Array.isArray(_)?_:[_]])});/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */function h(c,t=[],M=[]){const f=typeof c=="string"?na(c,t,M):c,C=B.forwardRef(({className:A,...P},$)=>B.createElement(ha,{ref:$,icon:f,className:A,...P}));return f.name&&(C.displayName=oa(f.name)),C}/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const se={name:"activity",size:24,node:[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]};se.node;const fa=h(se);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie={name:"book-open",size:24,node:[["path",{d:"M12 5v16",key:"1f6ucr"}],["path",{d:"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z",key:"1fyvmf"}]]};ie.node;const ma=h(ie);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ce={name:"calendar",size:24,node:[["path",{d:"M8 2v3",key:"1ioesn"}],["path",{d:"M16 2v3",key:"otl347"}],["rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",key:"h1oib"}],["path",{d:"M3 9h18",key:"1pudct"}]]};ce.node;const ya=h(ce);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const le={name:"check",size:24,node:[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]};le.node;const pa=h(le);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const de={name:"chevron-right",size:24,node:[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]};de.node;const va=h(de);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const he={name:"circle-check",size:24,node:[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m16 9-5.5 5.5L8 12",key:"xofnsj"}]],aliases:["check-circle-2"]};he.node;const ka=h(he);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ue={name:"clock",size:24,node:[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]};ue.node;const Ma=h(ue);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fe={name:"download",size:24,node:[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]};fe.node;const ga=h(fe);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const me={name:"dumbbell",size:24,node:[["path",{d:"M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z",key:"9m4mmf"}],["path",{d:"m2.5 21.5 1.4-1.4",key:"17g3f0"}],["path",{d:"m20.1 3.9 1.4-1.4",key:"1qn309"}],["path",{d:"M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z",key:"1t2c92"}],["path",{d:"m9.6 14.4 4.8-4.8",key:"6umqxw"}]]};me.node;const wa=h(me);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ye={name:"flame",size:24,node:[["path",{d:"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",key:"1slcih"}]]};ye.node;const ba=h(ye);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pe={name:"layers",size:24,node:[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],aliases:["layers-3"]};pe.node;const Ca=h(pe);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ve={name:"minus",size:24,node:[["path",{d:"M5 12h14",key:"1ays0h"}]]};ve.node;const za=h(ve);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ke={name:"play",size:24,node:[["path",{d:"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",key:"10ikf1"}]]};ke.node;const xa=h(ke);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Me={name:"plus",size:24,node:[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]};Me.node;const _a=h(Me);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ge={name:"rotate-ccw",size:24,node:[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]};ge.node;const Da=h(ge);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const we={name:"ruler",size:24,node:[["path",{d:"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z",key:"icamh8"}],["path",{d:"m14.5 12.5 2-2",key:"inckbg"}],["path",{d:"m11.5 9.5 2-2",key:"fmmyf7"}],["path",{d:"m8.5 6.5 2-2",key:"vc6u1g"}],["path",{d:"m17.5 15.5 2-2",key:"wo5hmg"}]]};we.node;const Sa=h(we);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const be={name:"scale",size:24,node:[["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"m19 8 3 8a5 5 0 0 1-6 0zV7",key:"zcdpyk"}],["path",{d:"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1",key:"1yorad"}],["path",{d:"m5 8 3 8a5 5 0 0 1-6 0zV7",key:"eua70x"}],["path",{d:"M7 21h10",key:"1b0cd5"}]]};be.node;const Aa=h(be);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ce={name:"search",size:24,node:[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]};Ce.node;const Pa=h(Ce);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ze={name:"shield-check",size:24,node:[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]};ze.node;const Ta=h(ze);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xe={name:"skip-forward",size:24,node:[["path",{d:"M21 4v16",key:"7j8fe9"}],["path",{d:"M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z",key:"zs4d6"}]]};xe.node;const Ia=h(xe);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _e={name:"slash",size:24,node:[["path",{d:"M22 2 2 22",key:"y4kqgn"}]]};_e.node;const $a=h(_e);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const De={name:"sparkles",size:24,node:[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],aliases:["stars"]};De.node;const ja=h(De);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Se={name:"sticky-note",size:24,node:[["path",{d:"M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z",key:"1dfntj"}],["path",{d:"M15 3v5a1 1 0 0 0 1 1h5",key:"6s6qgf"}]]};Se.node;const Ea=h(Se);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ae={name:"sun",size:24,node:[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]};Ae.node;const Fa=h(Ae);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pe={name:"timer",size:24,node:[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]};Pe.node;const La=h(Pe);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Te={name:"trash",size:24,node:[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],aliases:["trash-2"]};Te.node;const Na=h(Te);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ie={name:"trending-up",size:24,node:[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]]};Ie.node;const Ba=h(Ie);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $e={name:"triangle-alert",size:24,node:[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],aliases:["alert-triangle"]};$e.node;const Ra=h($e);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const je={name:"trophy",size:24,node:[["path",{d:"M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2",key:"pwuv1l"}],["path",{d:"M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2",key:"1y54w1"}],["path",{d:"M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3",key:"e30mpu"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z",key:"1mhfuq"}],["path",{d:"M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3",key:"i0yafy"}]]};je.node;const qa=h(je);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ee={name:"upload",size:24,node:[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]]};Ee.node;const Oa=h(Ee);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fe={name:"user-check",size:24,node:[["path",{d:"m16 11 2 2 4-4",key:"9rsbq5"}],["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]};Fe.node;const Wa=h(Fe);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Le={name:"volume-2",size:24,node:[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["path",{d:"M16 9a5 5 0 0 1 0 6",key:"1q6k2b"}],["path",{d:"M19.364 18.364a9 9 0 0 0 0-12.728",key:"ijwkga"}]]};Le.node;const Va=h(Le);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ne={name:"wifi-off",size:24,node:[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}],["path",{d:"M5 12.859a10 10 0 0 1 5.17-2.69",key:"1dl1wf"}],["path",{d:"M19 12.859a10 10 0 0 0-2.007-1.523",key:"4k23kn"}],["path",{d:"M2 8.82a15 15 0 0 1 4.177-2.643",key:"1grhjp"}],["path",{d:"M22 8.82a15 15 0 0 0-11.288-3.764",key:"z3jwby"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]};Ne.node;const Ha=h(Ne);/**
 * @license lucide-react v1.61.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Be={name:"x",size:24,node:[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]};Be.node;const Ua=h(Be);var Y={};(function c(t,M,f,C){var A=!!(t.Worker&&t.Blob&&t.Promise&&t.OffscreenCanvas&&t.OffscreenCanvasRenderingContext2D&&t.HTMLCanvasElement&&t.HTMLCanvasElement.prototype.transferControlToOffscreen&&t.URL&&t.URL.createObjectURL),P=typeof Path2D=="function"&&typeof DOMMatrix=="function",$=(function(){if(!t.OffscreenCanvas)return!1;try{var a=new OffscreenCanvas(1,1),e=a.getContext("2d");e.fillRect(0,0,1,1);var n=a.transferToImageBitmap();e.createPattern(n,"no-repeat")}catch{return!1}return!0})();function _(){}function T(a){var e=M.exports.Promise,n=e!==void 0?e:t.Promise;return typeof n=="function"?new n(a):(a(_,_),null)}var j=(function(a,e){return{transform:function(n){if(a)return n;if(e.has(n))return e.get(n);var o=new OffscreenCanvas(n.width,n.height),s=o.getContext("2d");return s.drawImage(n,0,0),e.set(n,o),o},clear:function(){e.clear()}}})($,new Map),E=(function(){var a=Math.floor(16.666666666666668),e,n,o={},s=0;return typeof requestAnimationFrame=="function"&&typeof cancelAnimationFrame=="function"?(e=function(i){var l=Math.random();return o[l]=requestAnimationFrame(function r(d){s===d||s+a-1<d?(s=d,delete o[l],i()):o[l]=requestAnimationFrame(r)}),l},n=function(i){o[i]&&cancelAnimationFrame(o[i])}):(e=function(i){return setTimeout(i,a)},n=function(i){return clearTimeout(i)}),{frame:e,cancel:n}})(),R=(function(){var a,e,n={};function o(s){function i(l,r){s.postMessage({options:l||{},callback:r})}s.init=function(r){var d=r.transferControlToOffscreen();s.postMessage({canvas:d},[d])},s.fire=function(r,d,y){if(e)return i(r,null),e;var v=Math.random().toString(36).slice(2);return e=T(function(p){function k(g){g.data.callback===v&&(delete n[v],s.removeEventListener("message",k),e=null,j.clear(),y(),p())}s.addEventListener("message",k),i(r,v),n[v]=k.bind(null,{data:{callback:v}})}),e},s.reset=function(){s.postMessage({reset:!0});for(var r in n)n[r](),delete n[r]}}return function(){if(a)return a;if(!f&&A){var s=["var CONFETTI, SIZE = {}, module = {};","("+c.toString()+")(this, module, true, SIZE);","onmessage = function(msg) {","  if (msg.data.options) {","    CONFETTI(msg.data.options).then(function () {","      if (msg.data.callback) {","        postMessage({ callback: msg.data.callback });","      }","    });","  } else if (msg.data.reset) {","    CONFETTI && CONFETTI.reset();","  } else if (msg.data.resize) {","    SIZE.width = msg.data.resize.width;","    SIZE.height = msg.data.resize.height;","  } else if (msg.data.canvas) {","    SIZE.width = msg.data.canvas.width;","    SIZE.height = msg.data.canvas.height;","    CONFETTI = module.exports.create(msg.data.canvas);","  }","}"].join(`
`);try{a=new Worker(URL.createObjectURL(new Blob([s])))}catch(i){return typeof console<"u"&&typeof console.warn=="function"&&console.warn("🎊 Could not load worker",i),null}o(a)}return a}})(),F={particleCount:50,angle:90,spread:45,startVelocity:45,decay:.9,gravity:1,drift:0,ticks:200,x:.5,y:.5,shapes:["square","circle"],zIndex:100,colors:["#26ccff","#a25afd","#ff5e7e","#88ff5a","#fcff42","#ffa62d","#ff36ff"],disableForReducedMotion:!1,scalar:1};function w(a,e){return e?e(a):a}function I(a){return a!=null}function m(a,e,n){return w(a&&I(a[e])?a[e]:F[e],n)}function q(a){return a<0?0:Math.floor(a)}function O(a,e){return Math.floor(Math.random()*(e-a))+a}function W(a){return parseInt(a,16)}function V(a){return a.map(H)}function H(a){var e=String(a).replace(/[^0-9a-f]/gi,"");return e.length<6&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]),{r:W(e.substring(0,2)),g:W(e.substring(2,4)),b:W(e.substring(4,6))}}function U(a){var e=m(a,"origin",Object);return e.x=m(e,"x",Number),e.y=m(e,"y",Number),e}function Z(a){a.width=document.documentElement.clientWidth,a.height=document.documentElement.clientHeight}function K(a){var e=a.getBoundingClientRect();a.width=e.width,a.height=e.height}function Re(a){var e=document.createElement("canvas");return e.style.position="fixed",e.style.top="0px",e.style.left="0px",e.style.pointerEvents="none",e.style.zIndex=a,e}function qe(a,e,n,o,s,i,l,r,d){a.save(),a.translate(e,n),a.rotate(i),a.scale(o,s),a.arc(0,0,1,l,r,d),a.restore()}function Oe(a){var e=a.angle*(Math.PI/180),n=a.spread*(Math.PI/180);return{x:a.x,y:a.y,wobble:Math.random()*10,wobbleSpeed:Math.min(.11,Math.random()*.1+.05),velocity:a.startVelocity*.5+Math.random()*a.startVelocity,angle2D:-e+(.5*n-Math.random()*n),tiltAngle:(Math.random()*(.75-.25)+.25)*Math.PI,color:a.color,shape:a.shape,tick:0,totalTicks:a.ticks,decay:a.decay,drift:a.drift,random:Math.random()+2,tiltSin:0,tiltCos:0,wobbleX:0,wobbleY:0,gravity:a.gravity*3,ovalScalar:.6,scalar:a.scalar,flat:a.flat}}function We(a,e){e.x+=Math.cos(e.angle2D)*e.velocity+e.drift,e.y+=Math.sin(e.angle2D)*e.velocity+e.gravity,e.velocity*=e.decay,e.flat?(e.wobble=0,e.wobbleX=e.x+10*e.scalar,e.wobbleY=e.y+10*e.scalar,e.tiltSin=0,e.tiltCos=0,e.random=1):(e.wobble+=e.wobbleSpeed,e.wobbleX=e.x+10*e.scalar*Math.cos(e.wobble),e.wobbleY=e.y+10*e.scalar*Math.sin(e.wobble),e.tiltAngle+=.1,e.tiltSin=Math.sin(e.tiltAngle),e.tiltCos=Math.cos(e.tiltAngle),e.random=Math.random()+2);var n=e.tick++/e.totalTicks,o=e.x+e.random*e.tiltCos,s=e.y+e.random*e.tiltSin,i=e.wobbleX+e.random*e.tiltCos,l=e.wobbleY+e.random*e.tiltSin;if(a.fillStyle="rgba("+e.color.r+", "+e.color.g+", "+e.color.b+", "+(1-n)+")",a.beginPath(),P&&e.shape.type==="path"&&typeof e.shape.path=="string"&&Array.isArray(e.shape.matrix))a.fill(He(e.shape.path,e.shape.matrix,e.x,e.y,Math.abs(i-o)*.1,Math.abs(l-s)*.1,Math.PI/10*e.wobble));else if(e.shape.type==="bitmap"){var r=Math.PI/10*e.wobble,d=Math.abs(i-o)*.1,y=Math.abs(l-s)*.1,v=e.shape.bitmap.width*e.scalar,p=e.shape.bitmap.height*e.scalar,k=new DOMMatrix([Math.cos(r)*d,Math.sin(r)*d,-Math.sin(r)*y,Math.cos(r)*y,e.x,e.y]);k.multiplySelf(new DOMMatrix(e.shape.matrix));var g=a.createPattern(j.transform(e.shape.bitmap),"no-repeat");g.setTransform(k),a.globalAlpha=1-n,a.fillStyle=g,a.fillRect(e.x-v/2,e.y-p/2,v,p),a.globalAlpha=1}else if(e.shape==="circle")a.ellipse?a.ellipse(e.x,e.y,Math.abs(i-o)*e.ovalScalar,Math.abs(l-s)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI):qe(a,e.x,e.y,Math.abs(i-o)*e.ovalScalar,Math.abs(l-s)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI);else if(e.shape==="star")for(var u=Math.PI/2*3,b=4*e.scalar,z=8*e.scalar,x=e.x,S=e.y,L=5,D=Math.PI/L;L--;)x=e.x+Math.cos(u)*z,S=e.y+Math.sin(u)*z,a.lineTo(x,S),u+=D,x=e.x+Math.cos(u)*b,S=e.y+Math.sin(u)*b,a.lineTo(x,S),u+=D;else a.moveTo(Math.floor(e.x),Math.floor(e.y)),a.lineTo(Math.floor(e.wobbleX),Math.floor(s)),a.lineTo(Math.floor(i),Math.floor(l)),a.lineTo(Math.floor(o),Math.floor(e.wobbleY));return a.closePath(),a.fill(),e.tick<e.totalTicks}function Ve(a,e,n,o,s){var i=e.slice(),l=a.getContext("2d"),r,d,y=T(function(v){function p(){r=d=null,l.clearRect(0,0,o.width,o.height),j.clear(),s(),v()}function k(){f&&!(o.width===C.width&&o.height===C.height)&&(o.width=a.width=C.width,o.height=a.height=C.height),!o.width&&!o.height&&(n(a),o.width=a.width,o.height=a.height),l.clearRect(0,0,o.width,o.height),i=i.filter(function(g){return We(l,g)}),i.length?r=E.frame(k):p()}r=E.frame(k),d=p});return{addFettis:function(v){return i=i.concat(v),y},canvas:a,promise:y,reset:function(){r&&E.cancel(r),d&&d()}}}function ee(a,e){var n=!a,o=!!m(e||{},"resize"),s=!1,i=m(e,"disableForReducedMotion",Boolean),l=A&&!!m(e||{},"useWorker"),r=l?R():null,d=n?Z:K,y=a&&r?!!a.__confetti_initialized:!1,v=typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion)").matches,p;function k(u,b,z){for(var x=m(u,"particleCount",q),S=m(u,"angle",Number),L=m(u,"spread",Number),D=m(u,"startVelocity",Number),Ke=m(u,"decay",Number),Ge=m(u,"gravity",Number),Je=m(u,"drift",Number),te=m(u,"colors",V),Qe=m(u,"ticks",Number),ne=m(u,"shapes"),Xe=m(u,"scalar"),Ye=!!m(u,"flat"),re=U(u),oe=x,J=[],ea=a.width*re.x,aa=a.height*re.y;oe--;)J.push(Oe({x:ea,y:aa,angle:S,spread:L,startVelocity:D,color:te[oe%te.length],shape:ne[O(0,ne.length)],ticks:Qe,decay:Ke,gravity:Ge,drift:Je,scalar:Xe,flat:Ye}));return p?p.addFettis(J):(p=Ve(a,J,d,b,z),p.promise)}function g(u){var b=i||m(u,"disableForReducedMotion",Boolean),z=m(u,"zIndex",Number);if(b&&v)return T(function(D){D()});n&&p?a=p.canvas:n&&!a&&(a=Re(z),document.body.appendChild(a)),o&&!y&&d(a);var x={width:a.width,height:a.height};r&&!y&&r.init(a),y=!0,r&&(a.__confetti_initialized=!0);function S(){if(r){var D={getBoundingClientRect:function(){if(!n)return a.getBoundingClientRect()}};d(D),r.postMessage({resize:{width:D.width,height:D.height}});return}x.width=x.height=null}function L(){p=null,o&&(s=!1,t.removeEventListener("resize",S)),n&&a&&(document.body.contains(a)&&document.body.removeChild(a),a=null,y=!1)}return o&&!s&&(s=!0,t.addEventListener("resize",S,!1)),r?r.fire(u,x,L):k(u,x,L)}return g.reset=function(){r&&r.reset(),p&&p.reset()},g}var G;function ae(){return G||(G=ee(null,{useWorker:!0,resize:!0})),G}function He(a,e,n,o,s,i,l){var r=new Path2D(a),d=new Path2D;d.addPath(r,new DOMMatrix(e));var y=new Path2D;return y.addPath(d,new DOMMatrix([Math.cos(l)*s,Math.sin(l)*s,-Math.sin(l)*i,Math.cos(l)*i,n,o])),y}function Ue(a){if(!P)throw new Error("path confetti are not supported in this browser");var e,n;typeof a=="string"?e=a:(e=a.path,n=a.matrix);var o=new Path2D(e),s=document.createElement("canvas"),i=s.getContext("2d");if(!n){for(var l=1e3,r=l,d=l,y=0,v=0,p,k,g=0;g<l;g+=2)for(var u=0;u<l;u+=2)i.isPointInPath(o,g,u,"nonzero")&&(r=Math.min(r,g),d=Math.min(d,u),y=Math.max(y,g),v=Math.max(v,u));p=y-r,k=v-d;var b=10,z=Math.min(b/p,b/k);n=[z,0,0,z,-Math.round(p/2+r)*z,-Math.round(k/2+d)*z]}return{type:"path",path:e,matrix:n}}function Ze(a){var e,n=1,o="#000000",s='"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';typeof a=="string"?e=a:(e=a.text,n="scalar"in a?a.scalar:n,s="fontFamily"in a?a.fontFamily:s,o="color"in a?a.color:o);var i=10*n,l=""+i+"px "+s,r=new OffscreenCanvas(i,i),d=r.getContext("2d");d.font=l;var y=d.measureText(e),v=Math.ceil(y.actualBoundingBoxRight+y.actualBoundingBoxLeft),p=Math.ceil(y.actualBoundingBoxAscent+y.actualBoundingBoxDescent),k=2,g=y.actualBoundingBoxLeft+k,u=y.actualBoundingBoxAscent+k;v+=k+k,p+=k+k,r=new OffscreenCanvas(v,p),d=r.getContext("2d"),d.font=l,d.fillStyle=o,d.fillText(e,g,u);var b=1/n;return{type:"bitmap",bitmap:r.transferToImageBitmap(),matrix:[b,0,0,b,-v*b/2,-p*b/2]}}M.exports=function(){return ae().apply(this,arguments)},M.exports.reset=function(){ae().reset()},M.exports.create=ee,M.exports.shapeFromPath=Ue,M.exports.shapeFromText=Ze})((function(){return typeof window<"u"?window:typeof self<"u"?self:this||{}})(),Y,!1);const Za=Y.exports;Y.exports.create;export{fa as A,ma as B,va as C,wa as D,ba as F,Ca as L,za as M,xa as P,Da as R,ja as S,qa as T,Oa as U,Va as V,Ha as W,Ua as X,_a as a,Ma as b,Za as c,Fa as d,ka as e,pa as f,Ea as g,Ra as h,$a as i,Na as j,ya as k,Ba as l,Pa as m,Aa as n,Sa as o,Ta as p,ga as q,La as r,Ia as s,Wa as t};
