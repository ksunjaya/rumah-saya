// Lightweight DOM contract checks. These do not replace visual browser testing.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Element {
  constructor(){this.value='';this.children=[];this.dataset={};this.innerHTML='';this.textContent='';this.hidden=false;this.handlers={};}
  set value(v){this._value=String(v)} get value(){return this._value}
  append(...items){this.children.push(...items)} replaceChildren(...items){this.children=items}
  setAttribute(k,v){this[k]=v} checkValidity(){return true}
  addEventListener(k,v){this.handlers[k]=v}
  querySelector(){return this.svg||(this.svg=new Element())}
  click(){} remove(){}
}
const elements={};
const html=fs.readFileSync(__dirname+'/index.html','utf8');
for(const match of html.matchAll(/id="([^"]+)"/g)){assert.ok(!elements[match[1]],'duplicate ID');elements[match[1]]=new Element();}
elements.valueBasis.value='nominal'; elements.chartMonth.value='1'; elements.theme.value='auto';
const store=new Map(); let blob;
const context=vm.createContext({console,Intl,Date,Math,Number,JSON,Array,Set,Object,String,setTimeout:fn=>fn(),
  document:{getElementById:id=>{assert.ok(elements[id],`missing DOM element ${id}`);return elements[id]},querySelectorAll:()=>[],createElement:()=>new Element(),documentElement:new Element(),body:new Element()},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  Blob:class{constructor(parts){blob=parts.join('')}},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}}});
vm.runInContext(fs.readFileSync(__dirname+'/engine.js','utf8'),context);
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),context);
assert.equal(elements.errors.hidden,true); assert.match(elements.timeSaved.textContent,/Payoff:/);
elements.strategy.value='contract';elements.years.value='15';elements.settings.handlers.input();
assert.equal(elements.payoff.textContent,'15y 0m');
elements.strategy.value='budget';elements.salary.value='0';elements.settings.handlers.input();
assert.match(elements.payoff.textContent,/Not repaid/);assert.match(elements.warnings.textContent,/interest/);
elements.export.onclick(); assert.match(blob,/Paid off,false/);assert.match(blob,/month,date,salary/);
elements.startDate.value='';elements.settings.handlers.input();assert.equal(elements.resultContent.hidden,true);
elements.reset.onclick();elements.pin.onclick();elements.save.onclick();
const saved=JSON.parse(store.get('ruang-mortgage-v2'));assert.equal(saved.config.strategy,'budget');assert.equal(saved.pins.length,1);
elements.monthly.onclick();assert.match(elements.schedule.innerHTML,/Oct 2026/);
elements.valueBasis.value='real';elements.valueBasis.onchange();assert.match(elements.schedule.innerHTML,/today/);
console.log('PASS UI wiring: rendering, strategies, unpaid state, CSV, validation, reset, comparison, save, schedule and inflation');
