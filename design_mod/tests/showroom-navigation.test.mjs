import test from 'node:test';
import assert from 'node:assert/strict';
import {Showroom} from '../src/fix-viewer.js';

test('Actual showroom pan/move methods advance one numeric slot and clamp to the available range',()=>{
  // Numeric state only: no extra assets are installed or rendered.
  const state={spacing:6.4,destination:0,index:0,entries:Array.from({length:5},()=>({vehicle:null})),onFocus(){},pan:Showroom.prototype.pan};
  const move=delta=>Showroom.prototype.move.call(state,delta);
  move(1);assert.equal(state.destination,6.4);
  move(1);assert.equal(state.destination,12.8);
  move(-1);assert.equal(state.destination,6.4);
  move(20);assert.equal(state.destination,25.6);
  move(-20);assert.equal(state.destination,0);
  state.entries.length=1;move(1);assert.equal(state.destination,0);move(-1);assert.equal(state.destination,0);
});
