import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Trainer} from '../src/engine.js';
const note=(pitch,start,duration=.5,hand='right')=>({pitch,start,duration,hand});
const game=notes=>{const t=new Trainer(notes,{mode:'game',bpm:120,hand:'both',end:32});t.beat=0;t.running=true;return t;};

test('timing grades, misses, wrong notes and combo reset are distinct',()=>{
 const t=game([note(60,0),note(62,1),note(64,2),note(65,3)]);
 t.options.hold=false;
 assert.equal(t.press(60).type,'perfect');t.release(60);assert.equal(t.combo,1);
 t.beat=1.2;assert.equal(t.press(62).type,'good');t.release(62);assert.equal(t.combo,2);
 t.beat=1.5;assert.equal(t.press(70).type,'wrong');assert.equal(t.combo,0);t.release(70);
 t.tick(.5);assert.equal(t.misses,1);assert.equal(t.notes[2].status,'miss');
 assert.equal(t.hits,2);assert.equal(t.wrong,1);assert.equal(t.bestCombo,2);
});
test('practice freezes at a chord until every different pitch has been pressed',()=>{
 const t=new Trainer([note(60,1),note(64,1),note(67,2)],{hand:'both'});t.running=true;t.tick(10);
 assert.equal(t.beat,1);assert.equal(t.waiting,true);t.press(60);t.tick(1);assert.equal(t.beat,1);
 assert.equal(t.press(60),null);t.press(64);t.tick(1);assert.equal(t.beat,2);assert.equal(t.misses,0);
});
test('positive latency compensates a delayed input',()=>{
 const t=game([note(60,1)]);t.options.latency=100;t.beat=1.2;
 assert.equal(t.press(60).type,'perfect');
});
test('early release breaks combo but does not create a second missed note',()=>{
 const t=game([note(60,0,2)]);t.press(60);t.tick(.1);t.release(60);
 assert.equal(t.short,1);assert.equal(t.misses,0);assert.equal(t.combo,0);
});
test('hand and fragment filters preserve only scored targets',()=>{
 const t=new Trainer([note(48,0,.5,'left'),note(60,1),note(62,8)],{hand:'right',start:0,end:4});
 assert.equal(t.notes.length,1);assert.equal(t.notes[0].pitch,60);
});
test('held duplicate messages cannot earn repeated points',()=>{
 const t=game([note(60,0),note(60,1)]);t.press(60);t.beat=1;assert.equal(t.press(60),null);assert.equal(t.hits,1);
 t.options.hold=false;t.release(60);t.press(60);assert.equal(t.hits,2);
});
test('pause and demonstration never produce judgments',()=>{
 const t=game([note(60,0)]);t.pause();t.press(66);assert.equal(t.wrong,0);t.release(66);
 t.options.mode='demo';t.running=true;t.press(66);t.tick(1);assert.equal(t.wrong,0);assert.equal(t.misses,0);
});
test('score multiplier rises only after a successful streak',()=>{
 const t=game(Array.from({length:12},(_,i)=>note(60,i,.1)));t.options.hold=false;
 for(let i=0;i<11;i++){t.beat=i;t.press(60);t.release(60);}
 assert.equal(t.score,12000);assert.equal(t.bestCombo,11);
});
