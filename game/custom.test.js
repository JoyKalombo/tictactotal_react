import test from 'node:test';
import assert from 'node:assert/strict';
import {customVariant,VARIANTS,winningCombinations,getVariant,newGame,move,nextRound,evaluate} from './logic.js';
import {chooseComputerMove} from './computer.js';
import {Rooms} from '../server/rooms.js';
const descriptor=(a,b)=>({type:'custom',targets:{1:a,2:b}});
function triples(numbers,total){return numbers.flatMap((a,i)=>numbers.slice(i+1).flatMap((b,j)=>numbers.slice(i+j+2).filter(c=>a+b+c===total).map(c=>[a,b,c])));}
test('custom banks preserve the standard pattern and eight ways per target',()=>{
 for(const centre of [-160,-4,-1,0,1,3,25,160])for(const step of [1,2,3,10,50]){
  const a=3*centre+step,b=3*centre-step;
  const v=customVariant(a,b);
  assert.equal(v.numbers.length,9);assert.equal(new Set(v.numbers).size,9);
  assert.ok(v.numbers.every(Number.isInteger));assert.equal(v.numbers[4],centre);
  for(let i=1;i<9;i++)assert.equal(v.numbers[i]-v.numbers[i-1],step);
  for(const target of [a,b])assert.equal(triples(v.numbers,target).length,8);
  assert.deepEqual(customVariant(a,b),v);assert.deepEqual(customVariant(b,a).numbers,v.numbers);
 }
 for(const v of Object.values(VARIANTS))assert.deepEqual(customVariant(v.targets[1],v.targets[2]).numbers,v.numbers);
});
test('arbitrary whole-number pairs have equally many winning combinations',()=>{
 const pairs=[[25,20],[-25,40],[0,1],[999,-999],[-999,998],[999,998],[1,100],[1,2],[1,4],[-4,4],[0,-2],[-999,-998]];
 for(let a=-12;a<=12;a+=3)for(let b=-11;b<=13;b+=3)if(a!==b)pairs.push([a,b]);
 for(const [a,b] of pairs){
  const v=customVariant(a,b),first=triples(v.numbers,a).length,second=triples(v.numbers,b).length;
  assert.equal(v.numbers.length,9);assert.equal(new Set(v.numbers).size,9);
  assert.ok(v.numbers.every(Number.isInteger));assert.ok(first>=3);
  assert.equal(first,second,`unbalanced ${a},${b}`);assert.equal(v.combinations,first);
  assert.deepEqual(customVariant(a,b),v);
 }
 assert.ok(customVariant(25,20).combinations>=7);
});
test('invalid custom targets cannot start local or online games',()=>{
 const rooms=new Rooms();
 for(const [a,b] of [[2,2],[1.5,2],[NaN,2],[Infinity,2],[1000,2],[-1000,2],['25',20]]){
  assert.throws(()=>newGame(1,descriptor(a,b)));
  assert.throws(()=>rooms.create('Host',descriptor(a,b)));
 }
 assert.equal(rooms.rooms.size,0);
});
test('server derives the bank, custom moves award the proper target, and rematches preserve it',()=>{
 const variant={...descriptor(25,20),numbers:[999],targets:{1:25,2:20}};
 const rooms=new Rooms(),{room}=rooms.create('Host',variant);rooms.join(room.code,'Guest');
 room.players.forEach(p=>p.connections.add('connection'));
 const config=getVariant(variant),triple=triples(config.numbers,20)[0];
 assert.throws(()=>rooms.play(room,1,0,999,1),/unused/);
 rooms.play(room,1,0,triple[0],1);rooms.play(room,2,1,triple[1],1);rooms.play(room,1,2,triple[2],1);
 assert.equal(room.game.status,'player2');assert.deepEqual(rooms.view(room).game.variant,variant);
 rooms.rematch(room,1);rooms.rematch(room,2);
 assert.deepEqual(getVariant(room.game.variant),config);assert.equal(room.game.turn,2);
 assert.deepEqual(getVariant(nextRound(newGame(1,variant)).variant),config);
});
test('all computer levels play legal custom numbers, search levels take a custom win',()=>{
 const variant=descriptor(-25,40),config=getVariant(variant),triple=triples(config.numbers,40)[0];
 const game={...newGame(2,variant),board:[triple[0],triple[1],null,null,null,null,null,null,null]};
 for(const difficulty of ['easy','medium','hard']){
  const action=chooseComputerMove(game,difficulty,()=>0.5),next=move(game,2,action.index,action.number);
  assert.ok(config.numbers.includes(action.number));
  if(difficulty!=='easy')assert.equal(next.status,'player2');
 }
 assert.equal(evaluate([triple[0],triple[1],null,null,null,null,null,null,null],variant).status,'playing');
});

test('all presets have eight distinct winning combinations for each player',()=>{
 for(const variant of Object.values(VARIANTS))for(const target of Object.values(variant.targets))
  assert.equal(winningCombinations(variant.numbers,target).length,8);
});
