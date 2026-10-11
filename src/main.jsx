import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {io} from 'socket.io-client';
import {newGame,move,nextRound,TARGETS} from '../game/logic.js';
import './style.css';
function App(){
 const initialCode=new URLSearchParams(location.search).get('room')||'';
 const [mode,setMode]=useState('home'),[code,setCode]=useState(initialCode),[name,setName]=useState(''),[room,setRoom]=useState(null),[seat,setSeat]=useState(null),[game,setGame]=useState(newGame),[selected,setSelected]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[connected,setConnected]=useState(false),[notice,setNotice]=useState('');
 const socket=useRef(null),membership=useRef(null);
 useEffect(()=>{
   const s=io({autoConnect:false});socket.current=s;
   s.on('connect',()=>{
     setConnected(true);
     if(membership.current){const m=membership.current;s.timeout(10000).emit('join',m,(err,res)=>{if(err||res?.error){setError(res?.error||'Could not reconnect.');membership.current=null;setRoom(null);setSeat(null);setMode('home');}else {setRoom(res.state);setSeat(res.player);setMode('online');}});}
   });
   s.on('disconnect',()=>setConnected(false));
   s.on('state',state=>{setRoom(state);setSelected(null);});
   if(initialCode){try{const saved=JSON.parse(sessionStorage.getItem(`ttt:${initialCode.toUpperCase()}`));if(saved?.token){membership.current=saved;s.connect();}}catch{}}
   return()=>s.disconnect();
 },[]);
 async function request(event,data){
   setError('');setBusy(true);
   try{
     const s=socket.current;if(!s.connected){s.connect();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off('connect',onConnect);reject(Error('Cannot reach the game server. Try again in a moment.'));},20000);function onConnect(){clearTimeout(timer);resolve();}s.once('connect',onConnect);});}
     return await new Promise((resolve,reject)=>s.timeout(10000).emit(event,data,(err,res)=>err?reject(Error('The server did not respond. Please try again.')):res?.error?reject(Error(res.error)):resolve(res)));
   }catch(e){setError(e.message);return null;}finally{setBusy(false);}
 }
 async function enter(event){
   if(event==='join'&&!/^[a-f0-9]{6}$/i.test(code.trim())){setError('Enter the six-character room code.');return;}
   let saved=null;try{saved=JSON.parse(sessionStorage.getItem(`ttt:${code.trim().toUpperCase()}`));}catch{}
   const result=await request(event,{code:code.trim().toUpperCase(),name,token:saved?.token});
   if(!result)return;
   membership.current={code:result.code,token:result.token,name};
   try{sessionStorage.setItem(`ttt:${result.code}`,JSON.stringify(membership.current));}catch{}
   setRoom(result.state);setSeat(result.player);setMode('online');setSelected(null);
   history.replaceState(null,'',`?room=${result.code}`);
 }
 function local(){socket.current.disconnect();membership.current=null;setGame(newGame());setMode('local');setSelected(null);setError('');history.replaceState(null,'',location.pathname);}
 function home(){socket.current.disconnect();membership.current=null;setMode('home');setRoom(null);setSeat(null);setSelected(null);setError('');setNotice('');history.replaceState(null,'',location.pathname);}
 const current=mode==='online'?room?.game:game;
 const players=mode==='online'?room?.players:[{name:'Player 1',connected:true},{name:'Player 2',connected:true}];
 const both=players?.every(p=>p?.connected);
 const canPlay=current?.status==='playing'&&!busy&&(mode==='local'||connected&&both&&current.turn===seat);
 async function place(index){if(!canPlay||selected===null)return;
   if(mode==='local'){try{setGame(move(game,game.turn,index,selected));setSelected(null);setError('');}catch(e){setError(e.message);}}
   else await request('move',{index,number:selected,round:current.round});
 }
 async function copy(){const link=`${location.origin}${location.pathname}?room=${room.code}`;try{await navigator.clipboard.writeText(link);setNotice('Invite link copied!');}catch{setNotice(`Share this link: ${link}`);}}
 const result=current?.status==='draw'?'A draw. Well played!':current?.status?.startsWith('player')?`${players?.[Number(current.status.slice(-1))-1]?.name||'Player'} wins!`:null;
 let status=result|| (mode==='online'&&!connected?'Reconnecting…':mode==='online'&&!both?room?.players[1]?'Your friend disconnected. Waiting for them…':'Waiting for your friend to join…':`${players?.[current?.turn-1]?.name || 'Player'}’s turn`);
 return <main>
  <header><a href={location.pathname} onClick={e=>{e.preventDefault();home();}} className="brand"><span className="brand-icon">#</span>Tic Tac Total<span className="brand-dot">.</span></a><span className="top-note">A little grid. A big numbers battle.</span></header>
  {mode==='home'?<section className="home">
   <div className="intro"><div className="eyebrow">TWO PLAYERS · NINE NUMBERS · ONE WINNER</div><h1>Make your<br/>numbers <em>count.</em></h1><p>A clever twist on noughts and crosses. Build a line that adds up to your target — and try not to hand your friend a win.</p><div className="targets"><span><b>16</b> Player 1’s target</span><span><b>14</b> Player 2’s target</span></div><div className="mini-grid" aria-hidden="true">{[8,1,7,3,'?',6,4,9,2].map((n,i)=><span key={i}>{n}</span>)}</div></div>
   <div className="start-card"><div className="eyebrow">LET’S PLAY</div><h2>Bring a friend.</h2><p>Across the room or across the world.</p><label>Your name <span>(optional)</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={24} placeholder="What should we call you?" autoComplete="nickname"/></label><button className="primary" onClick={()=>enter('create')} disabled={busy}>{busy?'Connecting…':'Create an online room'} <span>↗</span></button><div className="divider">or join your friend</div><form onSubmit={e=>{e.preventDefault();enter('join');}}><label htmlFor="room-code">Room code</label><div className="join-row"><input id="room-code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="A1B2C3" autoCapitalize="characters" spellCheck="false"/><button className="secondary" disabled={busy}>Join →</button></div></form><button className="local-button" onClick={local} disabled={busy}>Play together on this device <span>→</span></button><small>No account needed. Just a little friendly rivalry.</small></div>
  </section>:<section className="play">
   <div className="game-heading"><div><div className="eyebrow">{mode==='online'?'ONLINE WITH A FRIEND':'PASS & PLAY'} · ROUND {current?.round}</div><h1>Your next move.</h1></div><button className="text-button" onClick={home}>← Leave game</button></div>
   {mode==='online'&&room&&<div className="room-bar"><div>ROOM <strong>{room.code}</strong><span className={connected?'online-dot':'offline-dot'}>{connected?'Connected':'Offline'}</span></div><button className="secondary" onClick={copy}>Copy invite link ↗</button></div>}
   <div className="game-layout"><div className="board-card"><div className="player-row">{[1,2].map(p=><div key={p} className={`player player-${p} ${current?.turn===p&&current.status==='playing'?'active':''}`}><span>{players?.[p-1]?.name||'Waiting for player…'}{mode==='online'&&seat===p?' (you)':''}</span><b>{TARGETS[p]}</b><small>target total{mode==='online'&&players?.[p-1]&&!players[p-1].connected?' · offline':''}</small></div>)}</div><div className="status" role="status"><h2>{status}</h2><p>{result?current.winning.length===0?'All nine numbers played. No target line.':current.status==='draw'?'Both targets landed in the same move.':'A complete line hit the target total.':canPlay?selected===null?'Choose a number, then an empty square.':`Place ${selected} in an empty square.`:mode==='online'&&!room?.players[1]?'Share your room code or invite link to start.':'The board will update as soon as your friend plays.'}</p></div><div className="board" aria-label="Game board">{current?.board.map((n,i)=>{const wins=current.winning.filter(l=>l.cells.includes(i));return <button key={i} className={`cell ${wins.length?`win-${wins.length>1?'both':wins[0].player}`:''}`} aria-label={`Row ${Math.floor(i/3)+1}, column ${i%3+1}${n!==null?`, number ${n}`:', empty'}`} disabled={!canPlay||n!==null||selected===null} onClick={()=>place(i)}>{n??<span>+</span>}</button>;})}</div><div className="number-label">{result?'ROUND COMPLETE':'YOUR NUMBER BANK'}<span>{current?.board.filter(n=>n===null).length} left</span></div><div className="number-bank">{Array.from({length:9},(_,i)=>i+1).map(n=><button key={n} className={selected===n?'selected':''} disabled={!canPlay||current?.board.includes(n)} aria-pressed={selected===n} aria-label={`Select number ${n}`} onClick={()=>{setSelected(n);setError('');}}>{n}</button>)}</div>{result&&<button className="primary rematch" disabled={busy||mode==='online'&&room.rematch.includes(seat)} onClick={()=>{if(mode==='local'){setGame(nextRound(game));setSelected(null);}else request('rematch',{});}}>{mode==='online'&&room.rematch.includes(seat)?'Waiting for your friend…':'Play another round →'}</button>}{mode==='online'&&room?.rematch.length===1&&!room.rematch.includes(seat)&&<p className="rematch-note">Your friend wants a rematch.</p>}</div>
   <aside><Rules/><div className="history-card"><div className="eyebrow">THE STORY SO FAR</div><h3>Move history</h3>{!current?.history.length?<p>Every good game starts with a blank board.</p>:<ol>{current.history.map((m,i)=><li key={i}><span className={`move-dot p${m.player}`}>{i+1}</span><div><b>{players?.[m.player-1]?.name}</b><small>Row {Math.floor(m.index/3)+1}, column {m.index%3+1}</small></div><strong>{m.number}</strong></li>)}</ol>}</div></aside></div>
  </section>}
  {error&&<div className="feedback error" role="alert">{error}</div>}{notice&&<div className="feedback" role="status">{notice}</div>}
  {mode==='home'&&<Rules/>}<footer>Made for a little friendly competition.<span>Think ahead. Total it up.</span></footer>
 </main>;
}
function Rules(){return <section className="rules"><div className="eyebrow">THE TWIST</div><h3>Same grid. Different game.</h3><p>Take turns choosing an unused number from <b>1–9</b> and placing it in an empty square. Numbers stay where you put them.</p><p>A complete row, column or diagonal totalling <b>16</b> wins for Player 1. A total of <b>14</b> wins for Player 2 — whoever placed the numbers.</p><p>Make both totals in one move? It’s a draw. Fill the board without either? Also a draw.</p><div className="tip">A move can win the game for your opponent. Choose carefully.</div></section>}
createRoot(document.getElementById('root')).render(<App/>);
