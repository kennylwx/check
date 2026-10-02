import { Chess, squareName } from '@check/chess';
declare global { interface ImportMeta { readonly env: Record<string,string|undefined> } }
const API=(import.meta.env.VITE_CHECK_SERVER_URL as string|undefined)||'http://localhost:8000';
const chess=new Chess(); let busy=false;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const glyphs:Record<string,string>={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
function render(){const board=$('board');board.innerHTML='';chess.board.forEach((piece,index)=>{const cell=document.createElement('div');cell.className=`square ${(Math.floor(index/8)+index%8)%2?'dark':'light'}`;cell.textContent=piece?glyphs[piece]:'';cell.title=squareName(index);board.append(cell);});$('fen').textContent=chess.fen();$('status').textContent=chess.status()||(!busy?'Your move':'Thinking…');}
async function post(path:string,body:unknown){const response=await fetch(API+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text());return response.json() as Promise<{move:string;fen:string;explanation:string}>;}
async function turn(instruction:string){if(busy)return;busy=true;render();try{const human=await post('/api/resolve',{instruction,fen:chess.fen()});const humanSan=chess.play(human.move);$('log').textContent=`You: ${humanSan} — ${human.explanation}`;render();if(chess.status())return;const engine=await post('/api/engine',{fen:chess.fen(),elo:Number(($('elo') as HTMLInputElement).value),depth:12});const san=chess.play(engine.move);$('log').textContent+=`\nStockfish: ${san}`;}catch(error){$('log').textContent=error instanceof Error?error.message:String(error);}finally{busy=false;render();}}
$('move-form').addEventListener('submit',event=>{event.preventDefault();const input=$('move') as HTMLInputElement;const value=input.value.trim();if(value){input.value='';void turn(value);}});
$('elo').addEventListener('input',()=>{$('elo-value').textContent=($('elo') as HTMLInputElement).value;});
$('new').addEventListener('click',()=>{chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');$('log').textContent='New game. Your move.';render();});render();
