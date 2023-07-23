import React, { useEffect, useRef, useState } from 'react';

import { Chessground } from 'chessground';
import { Config } from 'chessground/config';
import * as ch from 'chess.js';

import { Chess as Chessjs } from 'chess.js';
import * as cg from 'chessground/types';

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        } else {
          target[key] = Object.assign({}, target[key]);
        }
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

class Chess extends Chessjs {
  onEventListeners: Map<string, ((arg: any) => void)[]> = new Map();

  constructor(fen?: string) {
    super(fen);
  }

  // This move method is internal to the hook
  // and emits an external event when a move id
  // made in the gui
  _move(move: string | { from: string; to: string; promotion?: string }, { strict }: { strict?: boolean } = {}): ch.Move {
    let res = super.move(move, { strict });
    this.emit("move", res);
    this.emit("_move", res);
    return res
  }

  // This move method is extenral and does not
  // emit an external event. Just an internal one
  // to rerender the board
  move(move: string | { from: string; to: string; promotion?: string }, { strict }: { strict?: boolean } = {}): ch.Move {
    let res = super.move(move, { strict });
    this.emit("_move", res);
    return res;
  }

  on(event: string, callback: (arg: any) => void): void {
    const eventCallbacks = this.onEventListeners.get(event);
    if (!eventCallbacks) {
      this.onEventListeners.set(event, [callback]);
    } else {
      eventCallbacks.push(callback);
    }
  }

  async emit(event: string, arg: any): Promise<void> {
    const onEventCallbacks = this.onEventListeners.get(event);
    if (onEventCallbacks) {
      onEventCallbacks.forEach((callback) => callback(arg));
    }
  }

  off(event: string, callback: (arg: any) => void): void {
    const onEventCallbacks = this.onEventListeners.get(event);
    if (onEventCallbacks) {
      this.onEventListeners.set(event, onEventCallbacks.filter((cb) => cb !== callback));
    }
  }
}

const createKeyPair = (move: ch.Move): cg.KeyPair | [] => {
  if (!move) return [];
  const keyPair: cg.KeyPair = [
    move.from,
    move.to
  ]
  return keyPair;
}

const getAvailableMoves = (moves: ch.Move[]): cg.Dests => {
  const dests: cg.Dests = new Map();
  moves.forEach((move) => {
    if (dests.has(move.from)) {
      dests.get(move.from)?.push(move.to);
    } else {
      dests.set(move.from, [move.to]);
    }
  })

  return dests;
}

const useChessboard = (cgConfig?: Config) => {
  const chessboardRef = useRef<HTMLDivElement>(null);
  const [chess, _] = useState<Chess>(new Chess());
  const [reloaded, setReload] = useState(0);
  const reload = () => setReload(chess.history().length);

  useEffect(() => {
    chess.on("_move", reload);
    return () => {
      chess.off("_move", reload);
    }
  }, [chess])

  useEffect(() => {
    const history = chess.history({verbose: true});
    const config: Config = {
      fen: chess.fen(),
      orientation: 'white',
      turnColor: chess.turn() === 'w' ? 'white' : 'black',
      check: chess.inCheck(),
      lastMove: createKeyPair(history[history.length - 1]),
      autoCastle: true,
      highlight: {
        lastMove: true,
        check: true,
      },
      movable: {
        free: false,
        color: "both",
        showDests: true,
        dests: getAvailableMoves(chess.moves({verbose: true})),
        events: {
          after: (orig, dest) => {
            chess._move({from: orig, to: dest});
          }
        }
      },
      drawable: {
        enabled: true,
        visible: true,
        eraseOnClick: true,
        brushes: {
          green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
          red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
          blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
          yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
          purple: { key: 'p', color: '#800080', opacity: 1, lineWidth: 10 },
          paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
          paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
          paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
          paleGrey: { key: 'pgr', color: '#4a4a4a', opacity: 0.35, lineWidth: 15 },
          grey: { key: 'gr', color: '#4a4a4a', opacity: 1, lineWidth: 10 },
          paleBrown: { key: 'pbr', color: '#855f42', opacity: 0.4, lineWidth: 15 },
          brown: { key: 'br', color: '#855f42', opacity: 1, lineWidth: 10 },
          white: { key: 'w', color: '#fff', opacity: 1, lineWidth: 10 },
          black: { key: 'bl', color: '#000', opacity: 1, lineWidth: 10 },
        }
      },
    };

    // Override the defaults if props are specified
    mergeDeep(config, cgConfig);

    if (!chessboardRef.current) return;
    const ground = Chessground(chessboardRef.current, config);

    return () => {
      ground.destroy();
    }
  }, [chessboardRef.current, reloaded, cgConfig])

  const board = <div className = "w-full h-full" ref={chessboardRef} />

  return [chess, board] as const; 
}

export { useChessboard };