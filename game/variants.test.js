import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,move,nextRound,evaluate,VARIANTS} from './logic.js';
import {chooseComputerMove} from './computer.js';
import {Rooms} from '../server/rooms.js';

test('zero is a number, negative numbers are valid, and reuse is rejected',()=>{
 let game=move(newGame(1,'negatives'),1,0,0);
 assert.equal(game.board[0],0);
 assert.throws(()=>move(game,2,1,0),/unused/);
 assert.throws(()=>move(game,2,0,-4),/empty/);
 assert.throws(()=>move(game,2,1,5),/unused/);
 game=move(game,2,1,-4);
 assert.equal(game.board[1],-4);
 assert.equal(game.status,'playing');
});
test('each variant assigns target lines and simultaneous wins correctly',()=>{
 for(const [id,v] of Object.entries(VARIANTS)){
  const convert=n=>n===null?null:v.numbers[n-1];
  assert.equal(evaluate([8,1,7,null,null,null,null,null,null].map(convert),id).status,'player1');
  assert.equal(evaluate([8,1,5,null,null,null,null,null,null].map(convert),id).status,'player2');
  const result=evaluate([8,1,7,2,null,null,4,null,null].map(convert),id);
  assert.equal(result.status,'draw');
  assert.equal(result.winning.length,2);
  assert.equal(nextRound(newGame(1,id)).variant,id);
 }
});
test('computer uses each variant pool and finds the corresponding target',()=>{
 for(const id of ['negatives','tens']){
  const v=VARIANTS[id];
  for(const difficulty of ['easy','medium','hard']){
   const game={...newGame(2,id),board:[v.numbers[7],v.numbers[0],null,null,null,null,null,null,null]};
   const action=chooseComputerMove(game,difficulty,()=>0.5);
   const next=move(game,2,action.index,action.number);
   assert.ok(v.numbers.includes(action.number));
   if(difficulty!=='easy')assert.equal(next.status,'player2');
  }
 }
});
test('online room choice is authoritative, survives joining and rematches, and rejects unknown sets',()=>{
 const rooms=new Rooms();
 assert.throws(()=>rooms.create('Host','unknown'),/valid number set/);
 assert.equal(rooms.rooms.size,0);
 for(const id of ['negatives','tens']){
  const {room}=rooms.create('Host',id);
  rooms.join(room.code,'Guest');
  room.players.forEach((p,i)=>p.connections.add(String(i)));
  assert.equal(rooms.view(room).game.variant,id);
  assert.throws(()=>rooms.play(room,1,0,9,1),/unused/);
  rooms.play(room,1,0,VARIANTS[id].numbers[0],1);
  room.game.status='draw';
  rooms.rematch(room,1);rooms.rematch(room,2);
  assert.equal(room.game.variant,id);
  assert.equal(room.game.turn,2);
 }
});
