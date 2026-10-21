import {useEffect,useRef,useState} from 'react';

const preferenceKey='ttt:music';
const chords=[ [261.63,329.63,392,493.88], [220,261.63,329.63,392], [174.61,220,261.63,329.63], [196,246.94,293.66,329.63] ];

// An original, quiet synthesised loop: no downloads or external music service.
export function createMusic(AudioContextClass) {
  const context=new AudioContextClass();
  const output=context.createGain();output.gain.value=0.045;output.connect(context.destination);
  let timer=null,nextTime=0,beat=0,disposed=false,revision=0;
  const voices=new Set();
  function note(frequency,at,duration,volume){
    const oscillator=context.createOscillator(),envelope=context.createGain();
    oscillator.type='sine';oscillator.frequency.value=frequency;
    envelope.gain.setValueAtTime(0,at);
    envelope.gain.linearRampToValueAtTime(volume,at+0.3);
    envelope.gain.exponentialRampToValueAtTime(0.001,at+duration);
    oscillator.connect(envelope);envelope.connect(output);voices.add(oscillator);
    oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
    oscillator.start(at);oscillator.stop(at+duration+0.05);
  }
  function schedule(){
    while(nextTime<context.currentTime+0.4){
      const chord=chords[Math.floor(beat/4)%chords.length];
      if(beat%4===0)chord.forEach(frequency=>note(frequency/2,nextTime,6,0.13));
      note(chord[beat%4],nextTime,2.5,0.18);
      nextTime+=1.5;beat++;
    }
  }
  async function play(){
    if(disposed||timer!==null)return;
    const request=revision;
    await context.resume();
    if(disposed||request!==revision||timer!==null)return;
    nextTime=context.currentTime+0.08;schedule();timer=setInterval(schedule,150);
  }
  function pause(){
    revision++;clearInterval(timer);timer=null;
    // Stop queued voices as well, so toggling or hiding the tab never layers loops.
    for(const voice of voices){try{voice.stop();}catch{}}
    voices.clear();
    return context.suspend().catch(()=>{});
  }
  function dispose(){disposed=true;pause();return context.close().catch(()=>{});}
  return {play,pause,dispose};
}

export function useMusic(){
  const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem(preferenceKey)!=='off';}catch{return true;}});
  const [available,setAvailable]=useState(true);
  const enabledRef=useRef(enabled),engine=useRef(null),started=useRef(false);
  useEffect(()=>{
    let alive=true;
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass){setAvailable(false);return;}
    function play(){
      if(!enabledRef.current||document.hidden||!alive)return;
      try{
        engine.current??=createMusic(AudioContextClass);
        engine.current.play().catch(()=>{});
      }catch{setAvailable(false);}
    }
    function interact(event){
      if(event.target instanceof Element&&event.target.closest('.music-toggle'))return;
      if(event.type==='keydown'&&(event.repeat||event.metaKey||event.ctrlKey||event.altKey))return;
      started.current=true;play();
    }
    function visibility(){if(document.hidden)engine.current?.pause();else if(started.current)play();}
    window.addEventListener('pointerdown',interact);
    window.addEventListener('keydown',interact);
    document.addEventListener('visibilitychange',visibility);
    return()=>{alive=false;window.removeEventListener('pointerdown',interact);window.removeEventListener('keydown',interact);document.removeEventListener('visibilitychange',visibility);engine.current?.dispose();engine.current=null;};
  },[]);
  function toggle(){
    const next=!enabledRef.current;enabledRef.current=next;setEnabled(next);
    try{localStorage.setItem(preferenceKey,next?'on':'off');}catch{}
    if(!next){engine.current?.pause();return;}
    started.current=true;
    try{
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass){setAvailable(false);return;}
      engine.current??=createMusic(AudioContextClass);
      engine.current.play().catch(()=>{});
    }catch{setAvailable(false);}
  }
  return {enabled,available,toggle};
}
