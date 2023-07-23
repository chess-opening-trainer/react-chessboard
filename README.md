### useChessboard
A React hook which provides a chessboard component and a chess game engine. Uses LiChess Chessground and Chess.js.

```npm install react-use-chessboard```

```javascript
import { useEffect } from 'react';
import { useChessboard } from 'react-use-chessboard';

// Import the chessground styles
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

const App = () => {
  const { chess, board } = useChessboard({movable: {color: 'both'}}); // options are optional

  // Make a random move in response to the user making a move
  useEffect(() => {
    const makeRandomMove = () => {
      const moves = chess.moves();
      const move = moves[Math.floor(Math.random() * moves.length)];
      chess.move(move);
    };

    chess.on("move", makeRandomMove);
    return () => {
      chess.off("move", makeRandomMove);
    };
  }, [])

  return (
    <div>
      {board}
    </div>
  );
};
```