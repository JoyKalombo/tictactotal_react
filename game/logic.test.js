import test from 'node:test';import assert from 'node:assert/strict';import {evaluate,newGame,move,nextRound} from './logic.js';
test('16 and 14 award the corresponding player regardless of ownership',()=>{assert.equal(evaluate([8,1,7,null,null,null,null,null,null]).status,'player1');assert.equal(evaluate([8,1,5,null,null,null,null,null,null]).status,'player2');});
test('simultaneous target lines draw and preserve both highlights',()=>{const r=evaluate([8,1,7,2,null,null,4,null,null]);assert.equal(r.status,'draw');assert.equal(r.winning.length,2);});
test('a full board without targets draws',()=>assert.equal(evaluate([1,2,3,4,5,6,7,8,9]).status,'draw'));
test('partial lines do not win',()=>assert.equal(evaluate([9,7,null,null,null,null,null,null,null]).status,'playing'));
test('turns, occupancy, reuse, range, ended rounds and stale rounds are enforced',()=>{const g=move(newGame(),1,0,8);assert.equal(g.turn,2);assert.throws(()=>move(g,1,1,1));assert.throws(()=>move(g,2,0,1));assert.throws(()=>move(g,2,1,8));assert.throws(()=>move(g,2,10,1));assert.throws(()=>move(g,2,1,10));assert.throws(()=>move(g,2,1,1,9));assert.throws(()=>move({...g,status:'draw'},2,1,1));});
test('a move can give the opponent victory',()=>{let g=newGame();g=move(g,1,0,8);g=move(g,2,1,1);g=move(g,1,2,5);assert.equal(g.status,'player2');});
test('rematches alternate the starting player',()=>{const a=nextRound(newGame());assert.equal(a.turn,2);assert.equal(a.round,2);assert.equal(nextRound(a).turn,1);});
