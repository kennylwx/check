import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Chess, START_FEN } from './chess.js';
import { modelInput } from './input.js';
import { JevClient } from './jev.js';
import { Stockfish } from './stockfish.js';
import { render } from './ui.js';

const HELP = `check — terminal chess

Usage: check [--elo 1350] [--color white|black] [--fen FEN]
             [--stockfish PATH] [--depth 12]
             [--jev-api-key KEY] [--jev-base-url URL] [--jev-model jev]

Moves accept UCI (e2e4), SAN (Nf3), or free text ("move the queen up by 1").
Free text uses TypeSafe's JEV model and requires TYPESAFE_API_KEY.
Commands: fen, fen <position>, undo, help, quit`;

export async function run(args:string[]):Promise<void> {
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); return; }
  const get = (name:string, fallback:string|undefined):string|undefined => { const index = args.indexOf(name); return index < 0 ? fallback : (args[index + 1] ?? fallback); };
  const elo = Number(get('--elo', '1350'));
  const human = get('--color', 'white')!.toLowerCase().startsWith('b') ? 'b' : 'w';
  const depth = Number(get('--depth', '12'));
  if (!Number.isInteger(elo) || elo < 1320 || elo > 3190) throw new Error('ELO must be an integer from 1320 to 3190 (Stockfish UCI range).');

  const chess = new Chess(get('--fen', START_FEN)!);
  const engine = new Stockfish(get('--stockfish', process.env.STOCKFISH_PATH || 'stockfish')!);
  const jev = new JevClient({
    apiKey: get('--jev-api-key', process.env.TYPESAFE_API_KEY),
    baseUrl: get('--jev-base-url', process.env.TYPESAFE_BASE_URL || 'https://api.typesafe.ai/v1')!,
    model: get('--jev-model', process.env.TYPESAFE_MODEL || 'jev')!,
  });
  const rl = createInterface({ input: stdin, output: stdout });
  let last:number[]|null = null;
  console.log(`\n♟  CHECK  ·  You are ${human === 'w' ? 'White' : 'Black'}  ·  Stockfish ${elo} ELO\n`);
  await engine.start(elo);

  try {
    while (true) {
      console.log(render(chess, { perspective: human, last }));
      const status = chess.status();
      if (status) { console.log(status); break; }
      if (chess.turn !== human) {
        stdout.write('Stockfish is thinking… ');
        const move = await engine.bestMove(chess.fen(), depth);
        const side = chess.turn;
        const san = chess.play(move);
        const played = chess.history.at(-1)!.move;
        last = [played.from, played.to];
        console.log(`${side === 'w' ? 'White' : 'Black'} plays ${san}\n`);
        continue;
      }

      const raw = await rl.question(`${chess.fullmove}${chess.turn === 'b' ? '…' : '.'} your move › `);
      let intent;
      try { intent = await modelInput(raw, chess, jev); }
      catch (error) { console.log(`\n${message(error)}\n`); continue; }
      if (intent.type === 'quit') break;
      if (intent.type === 'help') { console.log(`\n${HELP}\n`); continue; }
      if (intent.type === 'show-fen') { console.log(`\n${chess.fen()}\n`); continue; }
      if (intent.type === 'load-fen') {
        try { chess.load(intent.value); last = null; } catch (error) { console.log(`\n${message(error)}\n`); }
        continue;
      }
      if (intent.type === 'undo') { chess.undo(); if (chess.turn !== human) chess.undo(); last = null; continue; }
      if (intent.type === 'empty') continue;
      try {
        const san = chess.play(intent.value);
        const move = chess.history.at(-1)!.move;
        last = [move.from, move.to];
        if (intent.source === 'jev') console.log(`\nJEV chose ${san}${intent.explanation ? ` — ${intent.explanation}` : ''}\nFEN: ${chess.fen()}\n`);
      } catch (error) { console.log(`\n${message(error)}. Try e2e4, Nf3, or describe the move naturally.\n`); }
    }
  } finally { engine.close(); rl.close(); }
}

export { HELP };
const message = (error:unknown):string => error instanceof Error ? error.message : String(error);
