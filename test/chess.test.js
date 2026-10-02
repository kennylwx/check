import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess, START_FEN } from '../dist/chess.js';
import { modelInput } from '../dist/input.js';
import { render } from '../dist/ui.js';

test('plays legal moves and exports FEN',()=>{const c=new Chess();assert.equal(c.moves().length,20);assert.equal(c.play('e2e4'),'e4');assert.equal(c.fen(),'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');});
test('detects fool mate',()=>{const c=new Chess();for(const m of ['f3','e5','g4','Qh4#'])c.play(m);assert.equal(c.status(),'Black wins by checkmate');});
test('keeps exact notation local',async()=>{const c=new Chess();assert.deepEqual(await modelInput('e2e4',c),{type:'move',value:'e2e4',source:'notation'});});
test('uses JEV for random text and returns its verified FEN',async()=>{const c=new Chess();let request;const jev={resolve:async(text)=>{request=text;const next=new Chess();next.play('d2d3');return{move:'d2d3',fen:next.fen(),explanation:'The queen is blocked, so this opens its file.'};}};const result=await modelInput('move the queen up by 1',c,jev);assert.equal(request,'move the queen up by 1');assert.equal(result.source,'jev');assert.equal(result.value,'d2d3');assert.match(result.fen,/3P4/);});
test('renders a complete board',()=>{const board=render(new Chess(START_FEN),{color:false});assert.match(board,/8 .*♜/);assert.match(board,/1 .*♖/);assert.match(board,/ a .* h /);});
