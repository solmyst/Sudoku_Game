import React, { useState, useEffect, useCallback } from 'react';
import './SudokuGame.css';

const SudokuGame = () => {
  // Game state
  const [matrix, setMatrix] = useState([]);
  const [solution, setSolution] = useState([]);
  const [domMatrix, setDomMatrix] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState({ row: null, col: null });
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [gameStatus, setGameStatus] = useState('difficulty'); // 'difficulty', 'playing', 'completed', 'gameover'
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [difficulty, setDifficulty] = useState(null);

  // Game configuration
  const difficultyLevels = [
    { level: "Easy", numbers: 40 },
    { level: "Medium", numbers: 30 },
    { level: "Hard", numbers: 20 }
  ];

  // Create initial sudoku matrix
  const createMatrix = useCallback(() => {
    let newMatrix = Array(9).fill().map(() => Array(9).fill(0));

    // Fill with initial pattern
    for (let rowCounter = 0; rowCounter < 9; rowCounter++) {
      for (let colCounter = 0; colCounter < 9; colCounter++) {
        let number = colCounter + 1 + (rowCounter * 3) + Math.floor(rowCounter / 3) % 3;
        if (number > 9) number = number % 9;
        if (number === 0) number = 9;
        newMatrix[rowCounter][colCounter] = number;
      }
    }

    // Switching rows
    for (let no = 0; no < 9; no += 3) {
      for (let no2 = 0; no2 < 3; no2++) {
        let row1 = Math.floor(Math.random() * 3) + no;
        let row2 = Math.floor(Math.random() * 3) + no;
        while (row2 === row1) {
          row2 = Math.floor(Math.random() * 3) + no;
        }

        let tmpMatrix = [...newMatrix[row1]];
        newMatrix[row1] = [...newMatrix[row2]];
        newMatrix[row2] = tmpMatrix;
      }
    }

    // Switching columns
    for (let no = 0; no < 9; no += 3) {
      for (let no2 = 0; no2 < 3; no2++) {
        let col1 = Math.floor(Math.random() * 3) + no;
        let col2 = Math.floor(Math.random() * 3) + no;
        while (col2 === col1) {
          col2 = Math.floor(Math.random() * 3) + no;
        }

        for (let no3 = 0; no3 < 9; no3++) {
          let tmpValue = newMatrix[no3][col1];
          newMatrix[no3][col1] = newMatrix[no3][col2];
          newMatrix[no3][col2] = tmpValue;
        }
      }
    }

    // Create a deep copy of the solution
    const newSolution = newMatrix.map(row => [...row]);
    setSolution(newSolution);

    // Set up the DOM matrix with empty/filled cells based on difficulty
    let newDomMatrix = Array(9).fill().map(() => Array(9).fill({ value: 0, isInitial: false, isCorrect: false, isIncorrect: false, isHint: false, notes: Array(9).fill(false) }));

    // Keep track of filled cells
    let filledCells = [];
    let items = difficulty;

    while (items > 0) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      const cellKey = `${row}-${col}`;

      if (!filledCells.includes(cellKey)) {
        newDomMatrix[row][col] = {
          value: newMatrix[row][col],
          isInitial: true,
          isCorrect: false,
          isIncorrect: false,
          isHint: false,
          notes: Array(9).fill(false)
        };
        filledCells.push(cellKey);
        items--;
      }
    }

    setMatrix(newMatrix);
    setDomMatrix(newDomMatrix);

    // Start the timer
    setGameTime(0);
    setTimerActive(true);
    setGameStatus('playing');
  }, [difficulty]);

  // Set up timer effect
  useEffect(() => {
    let interval = null;

    if (timerActive && !isPaused && gameStatus === 'playing') {
      interval = setInterval(() => {
        setGameTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [timerActive, isPaused, gameStatus]);

  // Format time display
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Handle cell selection
  const handleCellClick = (row, col) => {
    if (isPaused || gameStatus !== 'playing') return;

    // Only allow selection of empty cells or user-filled cells
    if (!domMatrix[row][col].isInitial) {
      setSelectedCell({ row, col });
      setSelectedPosition({ row, col });
    }
  };

  // Determine if a cell is in the same box as the selected cell
  const isInSameBox = (row, col) => {
    if (selectedPosition.row === null) return false;

    const boxStartRow = Math.floor(selectedPosition.row / 3) * 3;
    const boxStartCol = Math.floor(selectedPosition.col / 3) * 3;
    const cellBoxStartRow = Math.floor(row / 3) * 3;
    const cellBoxStartCol = Math.floor(col / 3) * 3;

    return boxStartRow === cellBoxStartRow && boxStartCol === cellBoxStartCol;
  };

  // Handle number input
  const handleNumberInput = (num) => {
    if (isPaused || !selectedCell || gameStatus !== 'playing') return;

    const { row, col } = selectedCell;

    // Don't modify initial numbers
    if (domMatrix[row][col].isInitial) return;

    const newDomMatrix = [...domMatrix];

    if (isNoteMode) {
      // Toggle note
      const newNotes = [...newDomMatrix[row][col].notes];
      newNotes[num - 1] = !newNotes[num - 1];

      newDomMatrix[row][col] = {
        ...newDomMatrix[row][col],
        notes: newNotes,
        value: 0 // Clear any value when adding notes
      };
    } else {
      // Clear notes when placing a number
      const correctNumber = solution[row][col];

      if (num === correctNumber) {
        newDomMatrix[row][col] = {
          value: num,
          isInitial: false,
          isCorrect: true,
          isIncorrect: false,
          isHint: false,
          notes: Array(9).fill(false)
        };
      } else {
        newDomMatrix[row][col] = {
          value: num,
          isInitial: false,
          isCorrect: false,
          isIncorrect: true,
          isHint: false,
          notes: Array(9).fill(false)
        };

        // Increment mistakes
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);

        // Check for game over
        if (newMistakes >= 3) {
          setGameStatus('gameover');
          setTimerActive(false);
        }

        // Reset incorrect flag after a delay
        setTimeout(() => {
          const updatedMatrix = [...domMatrix];
          if (updatedMatrix[row][col].isIncorrect) {
            updatedMatrix[row][col] = {
              ...updatedMatrix[row][col],
              isIncorrect: false
            };
            setDomMatrix(updatedMatrix);
          }
        }, 1000);
      }
    }

    setDomMatrix(newDomMatrix);

    // Check for completion
    checkCompletion(newDomMatrix);
  };

  // Erase the selected cell
  const handleErase = () => {
    if (isPaused || !selectedCell || gameStatus !== 'playing') return;

    const { row, col } = selectedCell;

    // Don't erase initial numbers
    if (domMatrix[row][col].isInitial) return;

    const newDomMatrix = [...domMatrix];
    newDomMatrix[row][col] = {
      value: 0,
      isInitial: false,
      isCorrect: false,
      isIncorrect: false,
      isHint: false,
      notes: Array(9).fill(false)
    };

    setDomMatrix(newDomMatrix);
  };

  // Toggle note mode
  const toggleNoteMode = () => {
    setIsNoteMode(!isNoteMode);
  };

  // Check if the puzzle is completed
  const checkCompletion = (currentDomMatrix) => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = currentDomMatrix[row][col];
        if (cell.value !== solution[row][col]) {
          return;
        }
      }
    }

    // If we get here, the puzzle is complete
    setGameStatus('completed');
    setTimerActive(false);
  };

  // Give a hint to the player
  const giveHint = () => {
    if (hintsRemaining <= 0 || isPaused || gameStatus !== 'playing') return;

    // Find empty or incorrect cells
    const emptyCells = [];

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!domMatrix[row][col].isInitial && domMatrix[row][col].value !== solution[row][col]) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length > 0) {
      // Pick a random empty cell
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const { row, col } = emptyCells[randomIndex];

      // Fill with correct value
      const newDomMatrix = [...domMatrix];
      newDomMatrix[row][col] = {
        value: solution[row][col],
        isInitial: false,
        isCorrect: false,
        isIncorrect: false,
        isHint: true,
        notes: Array(9).fill(false)
      };

      setDomMatrix(newDomMatrix);

      // Reset hint flag after a delay
      setTimeout(() => {
        const updatedMatrix = [...domMatrix];
        updatedMatrix[row][col] = {
          ...updatedMatrix[row][col],
          isHint: false,
          isCorrect: true
        };
        setDomMatrix(updatedMatrix);

        // Check for completion
        checkCompletion(updatedMatrix);
      }, 1500);

      // Decrement hints
      setHintsRemaining(hintsRemaining - 1);
    }
  };

  // Toggle game pause state
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  // Restart game
  const restartGame = () => {
    setSelectedCell(null);
    setSelectedPosition({ row: null, col: null });
    setHintsRemaining(3);
    setMistakes(0);
    setGameTime(0);
    setIsPaused(false);
    setIsNoteMode(false);
    setGameStatus('difficulty');
  };

  // Start new game with selected difficulty
  const startNewGame = (difficultyLevel) => {
    setDifficulty(difficultyLevel);
  };

  // Effect to create matrix when difficulty changes
  useEffect(() => {
    if (difficulty !== null) {
      createMatrix();
    }
  }, [difficulty, createMatrix]);

  // Render the notes in a cell
  const renderNotes = (notes) => {
    return (
        <div className="sdk-notes">
          {notes.map((isActive, index) => (
              <span key={index} className="sdk-note">
            {isActive ? index + 1 : ''}
          </span>
          ))}
        </div>
    );
  };

  // Render game based on status
  const renderGame = () => {
    switch (gameStatus) {
      case 'difficulty':
        return (
            <div className="sdk-picker">
              <h2>Select Difficulty</h2>
              <div className="sdk-difficulty-buttons">
                {difficultyLevels.map((level, index) => (
                    <button
                        key={index}
                        className="sdk-level-btn"
                        onClick={() => startNewGame(level.numbers)}
                    >
                      {level.level}
                    </button>
                ))}
              </div>
            </div>
        );

      case 'playing':
        return (
            <>
              <div className="sdk-header">
                <div className="sdk-timer">{formatTime(gameTime)}</div>
                <div className="sdk-mistakes">Mistakes: {mistakes}/3</div>
                <div className="sdk-controls">
                  <button className="sdk-hint-btn" onClick={giveHint} disabled={hintsRemaining <= 0}>
                    Hint ({hintsRemaining})
                  </button>
                  <button className="sdk-restart-btn" onClick={restartGame}>
                    Restart
                  </button>
                  <button className="sdk-theme-btn" onClick={toggleTheme}>
                    {isDarkTheme ? '☀️' : '🌙'}
                  </button>
                  <button className="sdk-pause-btn" onClick={togglePause}>
                    {isPaused ? '▶️' : '⏸️'}
                  </button>
                </div>
              </div>

              <div className="sdk-table">
                {domMatrix.map((row, rowIndex) => (
                    <div
                        key={rowIndex}
                        className={`sdk-row ${rowIndex === 2 || rowIndex === 5 ? 'sdk-border-bottom' : ''}`}
                    >
                      {row.map((cell, colIndex) => (
                          <div
                              key={colIndex}
                              className={`sdk-col ${colIndex === 2 || colIndex === 5 ? 'sdk-border-right' : ''} ${
                                  selectedPosition.row === rowIndex && selectedPosition.col === colIndex ? 'sdk-selected' : ''
                              } ${
                                  selectedPosition.row === rowIndex ? 'sdk-same-row' : ''
                              } ${
                                  selectedPosition.col === colIndex ? 'sdk-same-col' : ''
                              } ${
                                  isInSameBox(rowIndex, colIndex) ? 'sdk-same-box' : ''
                              } ${
                                  selectedPosition.row !== null && cell.value !== 0 && domMatrix[selectedPosition.row][selectedPosition.col].value === cell.value ? 'sdk-same-number' : ''
                              }`}
                              onClick={() => handleCellClick(rowIndex, colIndex)}
                          >
                            {cell.value !== 0 ? (
                                <div className={`sdk-solution ${
                                    cell.isInitial ? 'sdk-initial' :
                                        cell.isCorrect ? 'sdk-correct' :
                                            cell.isIncorrect ? 'sdk-incorrect' :
                                                cell.isHint ? 'sdk-hint' : ''
                                }`}>
                                  {cell.value}
                                </div>
                            ) : cell.notes.some(note => note) ? (
                                renderNotes(cell.notes)
                            ) : null}
                          </div>
                      ))}
                    </div>
                ))}
              </div>

              <div className="sdk-number-pad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        className="sdk-num-btn"
                        onClick={() => handleNumberInput(num)}
                    >
                      {num}
                    </button>
                ))}
                <button
                    className="sdk-num-btn sdk-erase-btn"
                    onClick={handleErase}
                >
                  ✖
                </button>
                <button
                    className={`sdk-num-btn sdk-note-btn ${isNoteMode ? 'sdk-active' : ''}`}
                    onClick={toggleNoteMode}
                >
                  📝
                </button>
              </div>

              {isPaused && (
                  <div className="sdk-pause-overlay">
                    <div>Game Paused</div>
                  </div>
              )}
            </>
        );

      case 'completed':
        return (
            <div className="sdk-completion-overlay">
              <div className="sdk-completion-message">
                <h2>Puzzle Completed!</h2>
                <p>
                  Congratulations! You completed the puzzle in {formatTime(gameTime)} with {mistakes} mistakes.
                </p>
                <button className="sdk-new-game-btn" onClick={restartGame}>
                  New Game
                </button>
              </div>
            </div>
        );

      case 'gameover':
        return (
            <div className="sdk-gameover-overlay">
              <div className="sdk-gameover-message">
                <h2>Game Over</h2>
                <p>You made too many mistakes!</p>
                <button className="sdk-new-game-btn" onClick={restartGame}>
                  New Game
                </button>
              </div>
            </div>
        );

      default:
        return null;
    }
  };

  return (
      <div className={`sudoku-container ${isDarkTheme ? 'sdk-dark-theme' : ''}`}>
        <h1 className="sudoku-title">Modern Sudoku</h1>
        <div className="sdk-game">
          {renderGame()}
        </div>
      </div>
  );
};

export default SudokuGame;