import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreBar, scoreKey } from "../src/features/practice/notation";
import type { Note } from "../src/features/practice/types";

test("notation preserves overlapping voices as tied chord segments and fills rests", () => {
  const notes: Note[] = [{pitch:60,start:0,duration:3,hand:"right"},{pitch:64,start:1,duration:1,hand:"right"}];
  const events=scoreBar(notes,0,4,"right");
  assert.equal(events.reduce((sum,n)=>sum+n.duration,0),4);
  assert.deepEqual(events.map(n=>n.pitches),[[60],[60,64],[60],[]]);
  assert.deepEqual(events.map(n=>n.ties),[[],[60],[60],[]]);
  assert.deepEqual(scoreBar(notes,0,4,"left").map(n=>n.pitches),[[]]);
});

test("notation continues held notes across bar lines and retains repeated attacks", () => {
  const notes: Note[] = [{pitch:60,start:3,duration:2,hand:"left"},{pitch:60,start:5,duration:1,hand:"left"}];
  const events=scoreBar(notes,1,4,"left");
  assert.deepEqual(events[0].ties,[60]);
  assert.deepEqual(events[1].ties,[]);
  assert.equal(events.reduce((sum,n)=>sum+n.duration,0),4);
});

test("notation rounds performance timing, keeps short notes, and handles compound meter", () => {
  const notes: Note[] = [{pitch:61,start:0.03,duration:0.04,hand:"right"},{pitch:67,start:2.48,duration:0.49,hand:"right"}];
  const events=scoreBar(notes,0,3,"right");
  assert.equal(events[0].duration,0.25);
  assert.equal(events.reduce((sum,n)=>sum+n.duration,0),3);
  assert.equal(scoreKey(61),"c#/4");
  assert.equal(scoreKey(36),"c/2");
});
