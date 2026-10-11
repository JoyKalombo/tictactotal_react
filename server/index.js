import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {fileURLToPath} from 'node:url';
import {Rooms} from './rooms.js';
const app=express();const server=createServer(app);const io=new Server(server,{maxHttpBufferSize:10000});const rooms=new Rooms();
app.get('/health',(_,res)=>res.json({ok:true}));
app.use(express.static(fileURLToPath(new URL('../dist',import.meta.url))));
app.get('*',(_,res)=>res.sendFile(fileURLToPath(new URL('../dist/index.html',import.meta.url))));
const broadcast=r=>io.to(r.code).emit('state',rooms.view(r));
io.on('connection',socket=>{
  let membership=null,count=0,windowStart=Date.now();
  const handler=(event,fn)=>socket.on(event,(data={},ack)=>{
    if(typeof ack!=='function')return;
    if(Date.now()-windowStart>10000){windowStart=Date.now();count=0;}
    if(++count>40)return ack({error:'Please slow down a little.'});
    try{if(!data||typeof data!=='object')throw Error('Invalid request.');ack({ok:true,...fn(data)});}catch(e){ack({error:e.message});}
  });
  function attach(m){
    if(membership){membership.room.players[membership.player-1].connections.delete(socket.id);socket.leave(membership.room.code);broadcast(membership.room);}
    membership=m;m.room.players[m.player-1].connections.add(socket.id);socket.join(m.room.code);m.room.updated=Date.now();broadcast(m.room);
    return {code:m.room.code,player:m.player,token:m.token,state:rooms.view(m.room)};
  }
  handler('create',d=>attach(rooms.create(d.name)));
  handler('join',d=>attach(rooms.join(d.code,d.name,d.token)));
  handler('move',d=>{if(!membership)throw Error('Join a room first.');rooms.play(membership.room,membership.player,d.index,d.number,d.round);broadcast(membership.room);});
  handler('rematch',()=>{if(!membership)throw Error('Join a room first.');rooms.rematch(membership.room,membership.player);broadcast(membership.room);});
  socket.on('disconnect',()=>{if(membership){membership.room.players[membership.player-1].connections.delete(socket.id);membership.room.updated=Date.now();broadcast(membership.room);}});
});
setInterval(()=>rooms.cleanup(),60000).unref();
server.listen(process.env.PORT||3001,'0.0.0.0',()=>console.log('Tic Tac Total server ready'));
