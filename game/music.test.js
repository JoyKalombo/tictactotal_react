import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusic} from '../src/music.js';

class FakeContext {
  static latest;
  currentTime=0;destination={};voices=[];gains=[];resumeCount=0;suspendCount=0;closed=false;
  constructor(){FakeContext.latest=this;}
  createGain(){const gain={value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};const node={gain,connect(){},disconnect(){}};this.gains.push(node);return node;}
  createOscillator(){const node={frequency:{value:0},connect(){},disconnect(){},start(){},stop(at){this.stops??=[];this.stops.push(at);}};this.voices.push(node);return node;}
  resume(){this.resumeCount++;return Promise.resolve();}
  suspend(){this.suspendCount++;return Promise.resolve();}
  close(){this.closed=true;return Promise.resolve();}
}

test('music uses a quiet master volume and repeat play does not layer voices',async()=>{
 const music=createMusic(FakeContext),context=FakeContext.latest;
 try{
  await music.play();const voiceCount=context.voices.length;
  assert.ok(context.gains[0].gain.value<=0.05);
  assert.ok(voiceCount>0);assert.ok(context.voices.every(v=>v.type==='sine'));
  await music.play();assert.equal(context.voices.length,voiceCount);
  await music.pause();assert.ok(context.voices.every(v=>v.stops.at(-1)===undefined));assert.equal(context.suspendCount,1);
  await music.play();assert.ok(context.voices.length>voiceCount);
 }finally{await music.dispose();}
 assert.equal(context.closed,true);
});
test('muting cancels a pending audio resume so it cannot restart music afterward',async()=>{
 let resolveResume;
 class PendingContext extends FakeContext {resume(){return new Promise(resolve=>{resolveResume=resolve;});}}
 const music=createMusic(PendingContext),context=FakeContext.latest;
 const starting=music.play();await music.pause();resolveResume();await starting;
 assert.equal(context.voices.length,0);
 await music.dispose();
});
test('disposing during resume cancels notes and prevents future playback',async()=>{
 let resolveResume;
 class PendingContext extends FakeContext {resume(){return new Promise(resolve=>{resolveResume=resolve;});}}
 const music=createMusic(PendingContext),context=FakeContext.latest;
 const starting=music.play();await music.dispose();resolveResume();await starting;await music.play();
 assert.equal(context.voices.length,0);assert.equal(context.closed,true);
});
