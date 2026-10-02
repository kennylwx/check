import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
type ChildProcess = ReturnType<typeof spawn>;
interface Waiter { test:(line:string)=>boolean; resolve:(line:string)=>void; reject:(error:Error)=>void }

export class Stockfish {
  private readonly command:string; private readonly waiters:Waiter[]=[]; private proc?:ChildProcess; private fail?:(error:Error)=>void;
  constructor(command='stockfish'){this.command=command;}
  async start(elo=1350):Promise<void>{
    const [cmd,...args]=this.command.split(/\s+/);this.proc=spawn(cmd,args,{stdio:['pipe','pipe','inherit']});this.proc.on('error',e=>this.fail?.(new Error(`Could not start Stockfish (${cmd}). Install it or pass --stockfish <path>. ${e.message}`)));
    createInterface({input:this.proc.stdout}).on('line',line=>{for(const w of [...this.waiters])if(w.test(line)){this.waiters.splice(this.waiters.indexOf(w),1);w.resolve(line);}});
    this.send('uci');await this.wait(/^uciok$/);this.send('setoption name UCI_LimitStrength value true');this.send(`setoption name UCI_Elo value ${elo}`);this.send('isready');await this.wait(/^readyok$/);
  }
  send(s:string):void{if(!this.proc)throw new Error('Stockfish is not running');this.proc.stdin.write(s+'\n');}
  wait(test:RegExp):Promise<string>{return new Promise((resolve,reject)=>{const w:Waiter={test:line=>test.test(line),resolve,reject};this.waiters.push(w);this.fail=reject;setTimeout(()=>{if(this.waiters.includes(w)){this.waiters.splice(this.waiters.indexOf(w),1);reject(new Error('Stockfish timed out'));}},15000);});}
  async bestMove(fen:string,depth=12):Promise<string>{this.send(`position fen ${fen}`);this.send(`go depth ${depth}`);const line=await this.wait(/^bestmove /);const move=line.split(' ')[1];if(!move)throw new Error('Stockfish returned no move');return move;}
  close():void{if(this.proc){this.send('quit');this.proc=undefined;}}
}
