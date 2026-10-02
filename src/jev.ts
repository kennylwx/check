/** TypeSafe JEV client. Model output is validated before it can alter a game. */
import { Chess, type Move } from './chess.js';
export interface JevResult { move:string; fen:string; explanation:string }
export interface JevOptions { apiKey?:string; baseUrl?:string; model?:string; fetchImpl?:typeof fetch }
interface LegalMove { uci:string; san:string }
interface JevValue { move?:unknown; fen?:unknown; explanation?:unknown }
export class JevClient {
  private readonly apiKey?:string; private readonly baseUrl:string; private readonly model:string; private readonly fetch:typeof fetch;
  constructor({ apiKey = process.env.TYPESAFE_API_KEY, baseUrl = process.env.TYPESAFE_BASE_URL || 'https://api.typesafe.ai/v1', model = process.env.TYPESAFE_MODEL || 'jev', fetchImpl = globalThis.fetch }:JevOptions = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.fetch = fetchImpl;
  }

  async resolve(text:string, chess:Chess):Promise<JevResult> {
    if (!this.apiKey) throw new Error('Natural-language moves require TYPESAFE_API_KEY (or --jev-api-key)');
    const legal = chess.moves().map(move => ({ uci: uci(move), san: chess.san(move) }));
    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Convert informal chess instructions into one legal move. Return only JSON matching {"move": string, "fen": string, "explanation": string}. move must be one UCI value from legal_moves. fen must be the resulting position. Interpret directions from the player-to-move perspective; if ambiguous, choose the safest fitting move.' },
          { role: 'user', content: JSON.stringify({ instruction: text, current_fen: chess.fen(), legal_moves: legal }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`JEV request failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
    const payload = await response.json() as {choices?:Array<{message?:{content?:unknown}}>;output?:unknown};
    const content = payload.choices?.[0]?.message?.content ?? payload.output ?? payload;
    return validate(typeof content === 'string' ? parseJson(content) : content, chess, legal);
  }
}

function validate(value:JevValue, chess:Chess, legal:LegalMove[]):JevResult {
  if (!value || typeof value.move !== 'string') throw new Error('JEV returned no typed move');
  if (typeof value.fen !== 'string') throw new Error('JEV returned no typed FEN');
  const requestedMove = value.move;
  const selected = legal.find(({ uci: move }) => move === requestedMove.toLowerCase());
  if (!selected) throw new Error(`JEV returned an illegal move: ${value.move}`);
  const clone = Object.create(Object.getPrototypeOf(chess));
  Object.assign(clone, chess.snapshot(), { history: [] });
  clone.play(selected.uci);
  const fen = clone.fen();
  if (value.fen !== fen) throw new Error('JEV returned a FEN that does not match its move');
  return { move: selected.uci, fen, explanation: String(value.explanation || '') };
}

function parseJson(text:string):JevValue {
  try { return JSON.parse(text) as JevValue; } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JEV returned invalid JSON');
    try { return JSON.parse(match[0]) as JevValue; } catch { throw new Error('JEV returned invalid JSON'); }
  }
}

function uci(move:Move):string { return square(move.from) + square(move.to) + (move.promotion || ''); }
function square(index:number):string { return 'abcdefgh'[index % 8] + (8 - Math.floor(index / 8)); }
