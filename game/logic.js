export const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const TARGETS = {1:16,2:14};
export const VARIANTS = {
  standard: {name:'Standard', range:'1–9', numbers:[1,2,3,4,5,6,7,8,9], targets:TARGETS},
  negatives: {name:'Positive & negative', range:'−4–4', numbers:[-4,-3,-2,-1,0,1,2,3,4], targets:{1:1,2:-1}},
  tens: {name:'Counting in tens', range:'10–90 in tens', numbers:[10,20,30,40,50,60,70,80,90], targets:{1:160,2:140}}
};
export function winningCombinations(numbers,target) {
  const combinations=[];
  for(let i=0;i<numbers.length;i++)for(let j=i+1;j<numbers.length;j++)for(let k=j+1;k<numbers.length;k++)
    if(numbers[i]+numbers[j]+numbers[k]===target)combinations.push([numbers[i],numbers[j],numbers[k]]);
  return combinations;
}
const bankCache=new Map();
function combinationCounts(ns,a,b) {
  let x=0,y=0;
  for(let i=0;i<7;i++)for(let j=i+1;j<8;j++)for(let k=j+1;k<9;k++){
    const sum=ns[i]+ns[j]+ns[k];if(sum===a)x++;if(sum===b)y++;
  }
  return [x,y];
}
// A fixed seed and work limit keep previews repeatable and inexpensive.
// Keep only equally sized winning sets, preferring more combinations.
function balancedBank(a,b) {
 let seed=((a+1000)*2003+b+1000)>>>0;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
 let candidates=new Set();for(const c of [Math.floor(a/3),Math.floor(b/3),Math.floor((a+b)/6)])for(let n=c-7;n<=c+7;n++)candidates.add(n);
 const c=(a+b)/6,d=Math.abs(a-b)/2;for(let k=-4;k<=4;k++){candidates.add(Math.floor(c+k*d));candidates.add(Math.ceil(c+k*d));}
 const pool=[...candidates];const scale=Math.max(Math.abs(a),Math.abs(b))+1,anchor=2*scale,spread=20*scale;
 let best=[anchor-spread,anchor,anchor+spread,a-2*anchor-spread,a-2*anchor,a-2*anchor+spread,b-2*anchor-spread,b-2*anchor,b-2*anchor+spread],bestcount=3;
 const score=counts=>100*Math.min(...counts)-18*Math.abs(counts[0]-counts[1]);
 for(let r=0;r<80;r++){
  let ns=[];while(ns.length<9){const n=pool[Math.floor(random()*pool.length)];if(!ns.includes(n))ns.push(n);}
  let counts=combinationCounts(ns,a,b),value=score(counts);
  for(let it=0;it<250;it++){
   if(counts[0]===counts[1]&&counts[0]>bestcount){best=[...ns];bestcount=counts[0];if(bestcount>=8)return {numbers:best.sort((a,b)=>a-b),combinations:bestcount};}
   const idx=Math.floor(random()*9),n=pool[Math.floor(random()*pool.length)];if(ns.includes(n))continue;
   let prev=ns[idx];ns[idx]=n;const nc=combinationCounts(ns,a,b),nv=score(nc);
   const temp=40*(1-it/250)+1;
   if(nv>=value||random()<Math.exp((nv-value)/temp)){counts=nc;value=nv;}else ns[idx]=prev;
  }
 }
 return {numbers:best.sort((a,b)=>a-b),combinations:bestcount};
}
export function customVariant(first,second) {
  if(!Number.isInteger(first)||!Number.isInteger(second)||Math.abs(first)>999||Math.abs(second)>999)
    throw Error('Choose whole-number targets from −999 to 999.');
  if(first===second) throw Error('Choose two different target totals.');
  const key=`${first}:${second}`;
  if(bankCache.has(key))return bankCache.get(key);
  let generated;
  if((first+second)%6===0){
    const centre=(first+second)/6,step=Math.abs(first-second)/2;
    generated={numbers:Array.from({length:9},(_,i)=>centre+(i-4)*step),combinations:8};
  }else generated=balancedBank(first,second);
  const bank=generated.numbers,counts=combinationCounts(bank,first,second);
  if(new Set(bank).size!==9||counts[0]!==counts[1]||counts[0]<3)throw Error('Could not generate a balanced number bank. Try different totals.');
  const result={name:'Custom targets',range:bank.join(', '),numbers:bank,targets:{1:first,2:second},combinations:counts[0]};
  if(bankCache.size>=64)bankCache.delete(bankCache.keys().next().value);
  bankCache.set(key,result);return result;
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
