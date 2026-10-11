export const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const TARGETS = {1:16,2:14};
export const VARIANTS = {
  standard: {name:'Standard', range:'1–9', numbers:[1,2,3,4,5,6,7,8,9], targets:TARGETS},
  negatives: {name:'Positive & negative', range:'−4–4', numbers:[-4,-3,-2,-1,0,1,2,3,4], targets:{1:1,2:-1}},
  tens: {name:'Counting in tens', range:'10–90 in tens', numbers:[10,20,30,40,50,60,70,80,90], targets:{1:160,2:140}}
};
// Build two distinct-number triples, then fill a compact nine-number bank.
// Only targets are accepted from clients; the server regenerates the bank.
export function customVariant(first,second) {
  if(!Number.isInteger(first)||!Number.isInteger(second)||Math.abs(first)>999||Math.abs(second)>999)
    throw Error('Choose whole-number targets from −999 to 999.');
  if(first===second) throw Error('Choose two different target totals.');
  const numbers=new Set(),centres=[first,second].map(total=>Math.floor(total/3));
  [first,second].forEach((total,i)=>{
    const c=centres[i],remainder=total-3*c;
    const triple=remainder===0?[c-1,c,c+1]:remainder===1?[c-1,c,c+2]:[c-1,c+1,c+2];
    triple.forEach(n=>numbers.add(n));
  });
  for(let distance=0;numbers.size<9;distance++){
    for(const c of centres)for(const n of [c-distance,c+distance])if(numbers.size<9)numbers.add(n);
  }
  const bank=[...numbers].sort((a,b)=>a-b);
  return {name:'Custom targets',range:bank.join(', '),numbers:bank,targets:{1:first,2:second}};
}
const customCache=new WeakMap();
export function getVariant(id='standard') {
  if(id&&typeof id==='object'&&id.type==='custom') {
    const first=id.targets?.[1],second=id.targets?.[2],cached=customCache.get(id);
    if(cached&&cached.targets[1]===first&&cached.targets[2]===second)return cached;
    const generated=customVariant(first,second);customCache.set(id,generated);return generated;
  }
  if(!Object.hasOwn(VARIANTS,id)) throw Error('Choose a valid number set.');
  return VARIANTS[id];
}
export function evaluate(board,variant='standard') {
  const targets=getVariant(variant).targets;
  const winning = LINES.flatMap(cells => {
    if(cells.some(i=>board[i]===null)) return [];
    const sum=cells.reduce((n,i)=>n+board[i],0);
    return sum===targets[1]||sum===targets[2] ? [{cells,player:sum===targets[1]?1:2}] : [];
  });
  const players=new Set(winning.map(l=>l.player));
  return {status:players.size===2?'draw':players.size===1?`player${[...players][0]}`:board.every(n=>n!==null)?'draw':'playing',winning};
}
export function newGame(starter=1,variant='standard') {getVariant(variant);return {variant,board:Array(9).fill(null),turn:starter,status:'playing',winning:[],history:[],round:1};}
export function move(game,player,index,number,round=game.round) {
  if(round!==game.round) throw Error('The round changed. Please try again.');
  if(game.status!=='playing') throw Error('This round is over.');
  if(player!==game.turn) throw Error('Wait for your turn.');
  if(!Number.isInteger(index)||index<0||index>8||game.board[index]!==null) throw Error('Choose an empty square.');
  if(!Number.isInteger(number)||!getVariant(game.variant).numbers.includes(number)||game.board.includes(number)) throw Error('Choose an unused number.');
  const board=[...game.board];board[index]=number;
  const result=evaluate(board,game.variant);
  return {...game,board,...result,turn:result.status==='playing'?3-player:player,history:[...game.history,{player,index,number}]};
}
export function nextRound(game) {return {...newGame(game.round%2===1?2:1,game.variant),round:game.round+1};}
