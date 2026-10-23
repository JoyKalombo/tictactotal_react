import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {io} from 'socket.io-client';
import {newGame,move,nextRound,VARIANTS,getVariant,customVariant} from '../game/logic.js';
import {chooseComputerMove} from '../game/computer.js';
import './style.css';
import {useMusic} from './music.js';
function App(){
 const music=useMusic();
 const initialCode=new URLSearchParams(location.search).get('room')||'';
 const [mode,setMode]=useState('home'),[code,setCode]=useState(initialCode),[name,setName]=useState(''),[room,setRoom]=useState(null),[seat,setSeat]=useState(null),[game,setGame]=useState(newGame),[selected,setSelected]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[connected,setConnected]=useState(false),[notice,setNotice]=useState(''),[difficulty,setDifficulty]=useState('medium'),[variant,setVariant]=useState('standard'),[target1,setTarget1]=useState('25'),[target2,setTarget2]=useState('20');
 let customPreview=null,customError='';
 if(variant==='custom'){try{customPreview=customVariant(target1.trim()===''?NaN:Number(target1),target2.trim()===''?NaN:Number(target2));}catch(e){customError=e.message;}}
 const chosenVariant=variant==='custom'?{type:'custom',targets:{1:Number(target1),2:Number(target2)}}:variant;
 const [setup,setSetup]=useState(initialCode?'online':null),[onlineAction,setOnlineAction]=useState(initialCode?'join':'create');
 const setupHeading=useRef(null);
 useEffect(()=>{if(setup){setupHeading.current?.focus();window.scrollTo(0,0);}},[setup]);
 function chooseMode(value){setSetup(value);setError('');setNotice('');}
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
 useEffect(()=>{
   if(mode!=='computer'||game.status!=='playing'||game.turn!==2)return;
   let worker;
   const apply=action=>{if(action)setGame(g=>g===game?move(g,2,action.index,action.number):g);};
   const timer=setTimeout(()=>{
     try {
       worker=new Worker(new URL('./computer.worker.js',import.meta.url),{type:'module'});
       worker.onmessage=event=>apply(event.data);
       worker.onerror=()=>{worker.terminate();apply(chooseComputerMove(game,'easy'));};
       worker.postMessage({game,difficulty});
     } catch {apply(chooseComputerMove(game,'easy'));}
   },450);
   return()=>{clearTimeout(timer);worker?.terminate();};
 },[mode,game,difficulty]);
 async function request(event,data){
   setError('');setBusy(true);
   try{
     const s=socket.current;if(!s.connected){s.connect();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off('connect',onConnect);reject(Error('Cannot reach the game server. Try again in a moment.'));},20000);function onConnect(){clearTimeout(timer);resolve();}s.once('connect',onConnect);});}
     return await new Promise((resolve,reject)=>s.timeout(10000).emit(event,data,(err,res)=>err?reject(Error('The server did not respond. Please try again.')):res?.error?reject(Error(res.error)):resolve(res)));
   }catch(e){setError(e.message);return null;}finally{setBusy(false);}
 }
 async function enter(event){
   if(event==='create'&&customError){setError(customError);return;}
   if(event==='join'&&!/^[a-f0-9]{6}$/i.test(code.trim())){setError('Enter the six-character room code.');return;}
   let saved=null;try{saved=JSON.parse(sessionStorage.getItem(`ttt:${code.trim().toUpperCase()}`));}catch{}
   const result=await request(event,{code:code.trim().toUpperCase(),name,variant:chosenVariant,token:saved?.token});
   if(!result)return;
   membership.current={code:result.code,token:result.token,name};
   try{sessionStorage.setItem(`ttt:${result.code}`,JSON.stringify(membership.current));}catch{}
   setRoom(result.state);setSeat(result.player);setMode('online');setSelected(null);
   history.replaceState(null,'',`?room=${result.code}`);
 }
 function local(nextMode='local'){if(customError){setError(customError);return;}socket.current.disconnect();membership.current=null;setGame(newGame(1,chosenVariant));setMode(nextMode);setSelected(null);setError('');history.replaceState(null,'',location.pathname);}
 function home(){socket.current.disconnect();membership.current=null;setMode('home');setSetup(null);setOnlineAction('create');setRoom(null);setSeat(null);setSelected(null);setError('');setNotice('');history.replaceState(null,'',location.pathname);}
 const current=mode==='online'?room?.game:game;
 const activeVariant=mode==='home'?(variant==='custom'?customPreview||VARIANTS.standard:getVariant(variant)):getVariant(current?.variant);
 const players=mode==='online'?room?.players:mode==='computer'?[{name:name.trim()||'You',connected:true},{name:'Computer',connected:true}]:[{name:'Player 1',connected:true},{name:'Player 2',connected:true}];
 const both=players?.every(p=>p?.connected);
 const canPlay=current?.status==='playing'&&!busy&&(mode==='local'||mode==='computer'&&current.turn===1||connected&&both&&current.turn===seat);
 async function place(index){if(!canPlay||selected===null)return;
   if(mode==='local'||mode==='computer'){try{setGame(move(game,game.turn,index,selected));setSelected(null);setError('');}catch(e){setError(e.message);}}
   else await request('move',{index,number:selected,round:current.round});
 }
 async function copy(){const link=`${location.origin}${location.pathname}?room=${room.code}`;try{await navigator.clipboard.writeText(link);setNotice('Invite link copied!');}catch{setNotice(`Share this link: ${link}`);}}
 const result=current?.status==='draw'?'A draw. Well played!':current?.status?.startsWith('player')?mode==='computer'&&current.status==='player1'&&!name.trim()?'You win!':`${players?.[Number(current.status.slice(-1))-1]?.name||'Player'} wins!`:null;
 let status=result|| (mode==='computer'?(game.turn===2?'Computer is thinking…':'Your turn'):mode==='online'&&!connected?'Reconnecting…':mode==='online'&&!both?room?.players[1]?'Your friend disconnected. Waiting for them…':'Waiting for your friend to join…':`${players?.[current?.turn-1]?.name || 'Player'}’s turn`);
 return <main>
  <header><a href={location.pathname} onClick={e=>{e.preventDefault();home();}} className="brand"><span className="brand-icon">#</span>Tic Tac Total<span className="brand-dot">.</span></a><div className="header-actions"><span className="top-note">A little grid. A big numbers battle.</span><button className="music-toggle" onClick={music.toggle} aria-pressed={music.enabled&&music.available} disabled={!music.available} aria-label={music.available?(music.enabled?'Turn background music off':'Turn background music on'):'Background music unavailable'} title="Gentle background music · starts after your first tap"><span aria-hidden="true">{music.enabled&&music.available?'♫':'♪'}</span> {music.available?(music.enabled?'Music on':'Music off'):'Music unavailable'}</button></div></header>
  {mode==='home'?<section className="welcome">
   {!setup?<>
    <div className="welcome-heading"><div className="eyebrow">A LITTLE GRID. A BIG NUMBERS BATTLE.</div><h1>How would you like to play?</h1><p>Choose your opponent, then your numbers.</p></div>
    <div className="mode-choices" role="group" aria-label="Choose how to play">
     <button className="mode-choice" onClick={()=>chooseMode('online')}><span className="mode-symbol" aria-hidden="true">↗</span><span><b>Play with a friend online</b><small>Separate devices · room code or invite link</small></span><span aria-hidden="true">→</span></button>
     <button className="mode-choice" onClick={()=>chooseMode('local')}><span className="mode-symbol" aria-hidden="true">⇄</span><span><b>Play on the same device</b><small>Take turns together on one screen</small></span><span aria-hidden="true">→</span></button>
     <button className="mode-choice" onClick={()=>chooseMode('computer')}><span className="mode-symbol" aria-hidden="true">#</span><span><b>Play against the computer</b><small>Solo play · easy, medium or hard</small></span><span aria-hidden="true">→</span></button>
    </div>
    <section className="how-to" aria-labelledby="how-to-heading"><h2 id="how-to-heading">How to play</h2><ol><li><b>Pick a number.</b> Take turns choosing an unused number from the shared bank.</li><li><b>Place it.</b> Choose an empty square in the 3 × 3 grid.</li><li><b>Make your total.</b> A row, column or diagonal adding up to your target wins—even if the other player completes it.</li></ol><div className="rule-example"><span>Classic example</span><b>8 + 1 + 7 = 16</b><span>Player 1 wins</span></div><p>Both targets in one move, or a full board with neither? It’s a draw.</p></section>
   </>:<>
    <button className="text-button setup-back" disabled={busy} onClick={()=>{setSetup(null);setError('');window.scrollTo(0,0);}}>← Change play mode</button>
    <div className="welcome-heading"><div className="eyebrow">{setup==='online'?'WITH A FRIEND ONLINE':setup==='local'?'ON THE SAME DEVICE':'AGAINST THE COMPUTER'}</div><h1 ref={setupHeading} tabIndex={-1}>Set up your game.</h1></div>
    <div className="setup-card">
     {setup==='online'&&<div className="difficulty online-actions" role="group" aria-label="Online room options"><button aria-pressed={onlineAction==='create'} onClick={()=>{setOnlineAction('create');setError('');}} disabled={busy}>Create a room</button><button aria-pressed={onlineAction==='join'} onClick={()=>{setOnlineAction('join');setError('');}} disabled={busy}>Join a room</button></div>}
     {setup==='online'&&onlineAction==='join'?<form onSubmit={e=>{e.preventDefault();enter('join');}}><h2>Join your friend.</h2><p>Your friend’s room sets the numbers and target totals.</p><label htmlFor="room-code">Room code<input id="room-code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="A1B2C3" autoCapitalize="characters" spellCheck="false"/></label><label>Your name <span>(optional)</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={24} placeholder="What should we call you?" autoComplete="nickname"/></label><button className="primary" disabled={busy}>{busy?'Joining…':'Join game →'}</button></form>:<>
      <fieldset className="game-options"><legend>Choose your number set</legend><div className="variant-choices">{[...Object.entries(VARIANTS),['custom',{name:'Custom totals',range:'Choose your own',targets:null}]].map(([id,v])=><label key={id} className={`variant-choice ${variant===id?'chosen':''}`}><input type="radio" name="number-set" value={id} checked={variant===id} onChange={()=>{setVariant(id);setError('');}} disabled={busy}/><span><b>{id==='standard'?'Classic':id==='negatives'?'−4 to 4':id==='tens'?'Tens':v.name}</b><small>{id==='custom'?'Choose both target totals':`${v.range} · targets ${v.targets[1]} & ${v.targets[2]}`}</small></span></label>)}</div></fieldset>
      {variant==='custom'&&<div className="custom-options"><div className="custom-targets"><label>Player 1 target<input type="number" min="-999" max="999" step="1" value={target1} onChange={e=>{setTarget1(e.target.value);setError('');}} disabled={busy}/></label><label>Player 2 target<input type="number" min="-999" max="999" step="1" value={target2} onChange={e=>{setTarget2(e.target.value);setError('');}} disabled={busy}/></label></div>{customError?<p role="alert">{customError}</p>:<><p><b>Your number bank</b></p><div className="custom-bank">{customPreview.numbers.map(n=><span key={n}>{n}</span>)}</div><p>{customPreview.combinations} winning combinations for each player. Zero and negative numbers may be included.</p></>}</div>}
      {setup==='computer'&&<fieldset className="game-options"><legend>Choose computer difficulty</legend><div className="difficulty" role="group" aria-label="Computer difficulty">{['easy','medium','hard'].map(level=><button key={level} aria-pressed={difficulty===level} onClick={()=>setDifficulty(level)} disabled={busy}>{level[0].toUpperCase()+level.slice(1)}</button>)}</div><p className="difficulty-help">{difficulty==='easy'?'Relaxed play with random moves.':difficulty==='medium'?'Looks ahead, takes wins and avoids traps.':'Plans further ahead for a tougher challenge.'}</p></fieldset>}
      {setup==='online'&&<label>Your name <span>(optional)</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={24} placeholder="What should we call you?" autoComplete="nickname"/></label>}
      <button className="primary" disabled={busy||!!customError} onClick={()=>setup==='online'?enter('create'):local(setup)}>{busy?'Creating room…':setup==='online'?'Create room & invite friend →':setup==='computer'?'Start computer game →':'Start same-device game →'}</button>
      {setup==='online'&&<p className="setup-note">Next, share your room code or invite link with your friend.</p>}
      <details className="setup-rules"><summary>How to play · {activeVariant.name}</summary><Rules variant={activeVariant}/></details>
     </>}
    </div>
   </>}
  </section>:<section className="play">
   <div className="game-heading"><div><div className="eyebrow">{mode==='online'?'ONLINE WITH A FRIEND':mode==='computer'?`VS COMPUTER · ${difficulty.toUpperCase()}`:'PASS & PLAY'} · ROUND {current?.round} · {activeVariant.name.toUpperCase()}</div><h1>Your next move.</h1></div><button className="text-button" onClick={home}>← Leave game</button></div>
   {mode==='online'&&room&&<div className="room-bar"><div>ROOM <strong>{room.code}</strong><span className={connected?'online-dot':'offline-dot'}>{connected?'Connected':'Offline'}</span></div><button className="secondary" onClick={copy}>Copy invite link ↗</button></div>}
   <div className="game-layout"><div className="board-card"><div className="player-row">{[1,2].map(p=><div key={p} className={`player player-${p} ${current?.turn===p&&current.status==='playing'?'active':''}`}><span>{players?.[p-1]?.name||'Waiting for player…'}{mode==='online'&&seat===p?' (you)':''}</span><b>{activeVariant.targets[p]}</b><small>target total{mode==='online'&&players?.[p-1]&&!players[p-1].connected?' · offline':''}</small></div>)}</div><div className="status" role="status"><h2>{status}</h2><p>{result?current.winning.length===0?'All nine numbers played. No target line.':current.status==='draw'?'Both targets landed in the same move.':'A complete line hit the target total.':canPlay?selected===null?'Choose a number, then an empty square.':`Place ${selected} in an empty square.`:mode==='computer'?'Planning the next move…':mode==='online'&&!room?.players[1]?'Share your room code or invite link to start.':'The board will update as soon as your friend plays.'}</p></div><div className="board" aria-label="Game board">{current?.board.map((n,i)=>{const wins=current.winning.filter(l=>l.cells.includes(i));return <button key={i} className={`cell ${wins.length?`win-${wins.length>1?'both':wins[0].player}`:''}`} aria-label={`Row ${Math.floor(i/3)+1}, column ${i%3+1}${n!==null?`, number ${n}`:', empty'}`} disabled={!canPlay||n!==null||selected===null} onClick={()=>place(i)}>{n??<span>+</span>}</button>;})}</div><div className="number-label">{result?'ROUND COMPLETE':'YOUR NUMBER BANK'}<span>{current?.board.filter(n=>n===null).length} left</span></div><div className={`number-bank ${activeVariant.numbers.some(n=>Math.abs(n)>99)?'wide-bank':''}`}>{activeVariant.numbers.map(n=>{const used=current?.board.includes(n);return <button key={n} className={used?'used':selected===n?'selected':''} disabled={!canPlay||used} aria-pressed={selected===n} aria-label={used?`Number ${n}, used`:`Select number ${n}`} onClick={()=>{setSelected(n);setError('');}}><span className="bank-value">{n}</span>{used&&<span className="used-label" aria-hidden="true">Used</span>}</button>;})}</div>{result&&<button className="primary rematch" disabled={busy||mode==='online'&&room.rematch.includes(seat)} onClick={()=>{if(mode==='local'||mode==='computer'){setGame(nextRound(game));setSelected(null);}else request('rematch',{});}}>{mode==='online'&&room.rematch.includes(seat)?'Waiting for your friend…':'Play another round →'}</button>}{mode==='online'&&room?.rematch.length===1&&!room.rematch.includes(seat)&&<p className="rematch-note">Your friend wants a rematch.</p>}</div>
   <aside><Rules variant={activeVariant}/><div className="history-card"><div className="eyebrow">THE STORY SO FAR</div><h3>Move history</h3>{!current?.history.length?<p>Every good game starts with a blank board.</p>:<ol>{current.history.map((m,i)=><li key={i}><span className={`move-dot p${m.player}`}>{i+1}</span><div><b>{players?.[m.player-1]?.name}</b><small>Row {Math.floor(m.index/3)+1}, column {m.index%3+1}</small></div><strong>{m.number}</strong></li>)}</ol>}</div></aside></div>
  </section>}
  {error&&<div className="feedback error" role="alert">{error}</div>}{notice&&<div className="feedback" role="status">{notice}</div>}
  <footer>Made for a little friendly competition.<span>Think ahead. Total it up.</span></footer>
 </main>;
}
function Rules({variant}){return <section className="rules"><div className="eyebrow">THE TWIST</div><h3>Same grid. Different game.</h3><p>Take turns choosing an unused number from <b>{variant.range}</b> and placing it in an empty square. Numbers stay where you put them.</p><p>A complete row, column or diagonal totalling <b>{variant.targets[1]}</b> wins for Player 1. A total of <b>{variant.targets[2]}</b> wins for Player 2 — whoever placed the numbers.</p><p>Make both totals in one move? It’s a draw. Fill the board without either? Also a draw.</p><div className="tip">A move can win the game for your opponent. Choose carefully.</div></section>}
createRoot(document.getElementById('root')).render(<App/>);
