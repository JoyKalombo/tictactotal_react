export const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const TARGETS = {1:16,2:14};
export function evaluate(board) {
  const winning = LINES.flatMap(cells => {
    if(cells.some(i=>board[i]===null)) return [];
    const sum=cells.reduce((n,i)=>n+board[i],0);
    return sum===16||sum===14 ? [{cells,player:sum===16?1:2}] : [];
  });
  const players=new Set(winning.map(l=>l.player));
  return {status:players.size===2?'draw':players.size===1?`player${[...players][0]}`:board.every(n=>n!==null)?'draw':'playing',winning};
}
export function newGame(starter=1) {return {board:Array(9).fill(null),turn:starter,status:'playing',winning:[],history:[],round:1};}
export function move(game,player,index,number,round=game.round) {
  if(round!==game.round) throw Error('The round changed. Please try again.');
  if(game.status!=='playing') throw Error('This round is over.');
  if(player!==game.turn) throw Error('Wait for your turn.');
  if(!Number.isInteger(index)||index<0||index>8||game.board[index]!==null) throw Error('Choose an empty square.');
  if(!Number.isInteger(number)||number<1||number>9||game.board.includes(number)) throw Error('Choose an unused number.');
  const board=[...game.board];board[index]=number;
  const result=evaluate(board);
  return {...game,board,...result,turn:result.status==='playing'?3-player:player,history:[...game.history,{player,index,number}]};
}
export function nextRound(game) {return {...newGame(game.round%2===1?2:1),round:game.round+1};}
