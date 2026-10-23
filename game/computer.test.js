import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseComputerMove, legalMoves } from './computer.js';
import { newGame, move, evaluate } from './logic.js';

function position(board, turn=2) {return {...newGame(),board,turn,...evaluate(board)};}
test('easy can choose any legal cell/number pair',()=>{
 const game=position([8,null,null,null,null,null,null,null,null]);
 const actions=legalMoves(game.board);
 assert.equal(actions.length,64);
 assert.deepEqual(chooseComputerMove(game,'easy',()=>0),actions[0]);
 assert.deepEqual(chooseComputerMove(game,'easy',()=>.999),actions.at(-1));
});
test('medium and hard take an immediate 14 win, regardless of who placed the numbers',()=>{
 for(const level of ['medium','hard']){
  const game=position([8,1,null,null,null,null,null,null,null]);
  const action=chooseComputerMove(game,level);
  assert.equal(move(game,2,action.index,action.number).status,'player2');
 }
});
test('search supports either player target',()=>{
 const game=position([8,1,null,null,null,null,null,null,null],1);
 const action=chooseComputerMove(game,'hard');
 assert.equal(move(game,1,action.index,action.number).status,'player1');
});
test('medium and hard prevent an available immediate opponent win',()=>{
 for(const level of ['medium','hard']){
  const game=position([2,5,null,7,null,null,null,null,null]);
  const action=chooseComputerMove(game,level);
  const next=move(game,2,action.index,action.number);
  assert.notEqual(next.status,'player1');
  if(next.status==='playing')for(const reply of legalMoves(next.board)){
   assert.notEqual(move(next,1,reply.index,reply.number).status,'player1');
  }
 }
});
test('all levels return valid moves throughout complete games and stop at game over',()=>{
 for(const level of ['easy','medium','hard']){
  let game=newGame();
  while(game.status==='playing'){
   const action=chooseComputerMove(game,level,()=>.4);
   assert.ok(action);
   game=move(game,game.turn,action.index,action.number);
  }
  assert.equal(chooseComputerMove(game,level),null);
 }
});
test('hard sees a deeper trap that medium misses',()=>{
 const game=position([9,4,null,null,null,null,null,null,1]);
 // An independent exhaustive three-ply oracle checks the response tree.
 function guaranteedResult(g,depth){
  if(g.status!=='playing')return g.status==='player2'?1:g.status==='player1'?-1:0;
  if(!depth)return 0;
  const maximize=g.turn===2;let best=maximize?-1:1;
  for(const a of legalMoves(g.board)){
   const result=guaranteedResult(move(g,g.turn,a.index,a.number),depth-1);
   best=maximize?Math.max(best,result):Math.min(best,result);
   if(best===(maximize?1:-1))break;
  }
  return best;
 }
 const medium=chooseComputerMove(game,'medium'),hard=chooseComputerMove(game,'hard');
 assert.equal(guaranteedResult(move(game,2,medium.index,medium.number),3),-1);
 assert.ok(guaranteedResult(move(game,2,hard.index,hard.number),3)>=0);
});
