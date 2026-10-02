import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../dist/chess.js';
import { JevClient } from '../dist/jev.js';

test('calls the JEV model with FEN and legal moves',async()=>{
  let request;
  const chess=new Chess(), expected=new Chess();expected.play('e2e4');
  const client=new JevClient({apiKey:'test',baseUrl:'https://typesafe.test/v1',fetchImpl:async(url,options)=>{request={url,options,body:JSON.parse(options.body)};return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({move:'e2e4',fen:expected.fen(),explanation:'Advance the king pawn'})}}]})};}});
  const value=await client.resolve('do something bold',chess);
  assert.equal(request.url,'https://typesafe.test/v1/chat/completions');
  assert.equal(request.body.model,'jev');
  assert.match(request.body.messages[1].content,/current_fen/);
  assert.deepEqual(value,{move:'e2e4',fen:expected.fen(),explanation:'Advance the king pawn'});
});

test('rejects illegal JEV output',async()=>{
  const client=new JevClient({apiKey:'test',fetchImpl:async()=>({ok:true,json:async()=>({output:{move:'e2e5',fen:'invalid'}})})});
  await assert.rejects(()=>client.resolve('teleport a pawn',new Chess()),/illegal move/);
});
