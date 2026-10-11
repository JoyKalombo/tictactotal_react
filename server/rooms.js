import {randomBytes} from 'node:crypto';
import {newGame,move,nextRound} from '../game/logic.js';
export class Rooms {
  rooms=new Map();
  create(name) {
    if(this.rooms.size>=500) throw Error('Rooms are busy. Please try again later.');
    let code;do{code=randomBytes(3).toString('hex').toUpperCase()}while(this.rooms.has(code));
    const token=randomBytes(24).toString('hex');
    const room={code,players:[{name:this.name(name),token,connections:new Set()},null],game:newGame(),rematch:[],updated:Date.now()};
    this.rooms.set(code,room);return {room,player:1,token};
  }
  name(value){return typeof value==='string'?value.trim().slice(0,24)||'Player':'Player';}
  join(code,name,token) {
    const room=this.rooms.get(typeof code==='string'?code.toUpperCase():'');
    if(!room) throw Error('Room not found. Ask your friend for a new code.');
    const existing=room.players.findIndex(p=>p&&p.token===token);
    if(existing!==-1) return {room,player:existing+1,token};
    if(room.players[1]) throw Error('This room already has two players.');
    token=randomBytes(24).toString('hex');room.players[1]={name:this.name(name),token,connections:new Set()};
    room.updated=Date.now();return {room,player:2,token};
  }
  play(room,player,index,number,round){
    if(!room.players.every(p=>p&&p.connections.size)) throw Error('Wait for both players to connect.');
    room.game=move(room.game,player,index,number,round);room.updated=Date.now();
  }
  rematch(room,player){
    if(room.game.status==='playing') throw Error('Finish this round first.');
    if(!room.rematch.includes(player))room.rematch.push(player);
    if(room.rematch.length===2){room.game=nextRound(room.game);room.rematch=[];}
    room.updated=Date.now();
  }
  view(room){return {code:room.code,players:room.players.map(p=>p?{name:p.name,connected:p.connections.size>0}:null),game:room.game,rematch:room.rematch};}
  cleanup(){for(const [code,r]of this.rooms)if(!r.players.some(p=>p?.connections.size)&&Date.now()-r.updated>2*60*60*1000)this.rooms.delete(code);}
}
