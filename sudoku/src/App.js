import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import './SudokuGame.css';
// Create memoized Cell component to reduce re-renders
const Cell = memo(({ cell, rowIndex, colIndex, selectedPosition, isInSameBox, onClick, domMatrix }) => {
  const isSameNumber = selectedPosition.row !== null &&
      cell.value !== 0 &&
      domMatrix[selectedPosition.row][selectedPosition.col].value === cell.value;

  return (
      <div
          className={`sdk-col ${colIndex === 2 || colIndex === 5 ? 'sdk-border-right' : ''} ${
              selectedPosition.row === rowIndex && selectedPosition.col === colIndex ? 'sdk-selected' : ''
          } ${
              selectedPosition.row === rowIndex ? 'sdk-same-row' : ''
          } ${
              selectedPosition.col === colIndex ? 'sdk-same-col' : ''
          } ${
              isInSameBox(rowIndex, colIndex) ? 'sdk-same-box' : ''
          } ${
              isSameNumber ? 'sdk-same-number' : ''
          }`}
          onClick={() => onClick(rowIndex, colIndex)}
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
            <div className="sdk-notes">
              {cell.notes.map((isActive, index) => (
                  <span key={index} className="sdk-note">
              {isActive ? index + 1 : ''}
            </span>
              ))}
            </div>
        ) : null}
      </div>
  );
});
const NumberPad = memo(({ handleNumberInput, handleErase }) => {
  return (
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
      </div>
  );
});

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
  const [isMistakeCounting, setIsMistakeCounting] = useState(true);

  // Game configuration
  const difficultyLevels = [
    { level: "Easy", numbers: 40, maxHints: 6, countMistakes: false },
    { level: "Medium", numbers: 30, maxHints: 3, countMistakes: true },
    { level: "Hard", numbers: 20, maxHints: 2, countMistakes: true }
  ];

  // Create initial sudoku matrix
  const createMatrix = useCallback(() => {
    // Create an empty matrix first
    let newMatrix = Array(9).fill().map(() => Array(9).fill(0));

    // Fill the matrix using a more efficient algorithm
    // This generates a valid Sudoku solution
    const fillMatrix = (matrix) => {
      for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;

        if (matrix[row][col] === 0) {
          // Shuffle the numbers 1-9
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => 0.5 - Math.random());

          for (let num of nums) {
            if (isValid(matrix, row, col, num)) {
              matrix[row][col] = num;

              // If we can fill the rest of the matrix, we're done
              if (i === 80 || fillMatrix(matrix)) {
                return true;
              }

              // If we can't fill the rest, backtrack
              matrix[row][col] = 0;
            }
          }

          return false;
        }
      }

      return true;
    };

    // Check if a number is valid in a given position
    const isValid = (matrix, row, col, num) => {
      // Check row
      for (let c = 0; c < 9; c++) {
        if (matrix[row][c] === num) return false;
      }

      // Check column
      for (let r = 0; r < 9; r++) {
        if (matrix[r][col] === num) return false;
      }

      // Check 3x3 box
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (matrix[boxRow + r][boxCol + c] === num) return false;
        }
      }

      return true;
    };

    fillMatrix(newMatrix);

    // Create a deep copy of the solution
    const newSolution = newMatrix.map(row => [...row]);
    setSolution(newSolution);

    // Set up the DOM matrix with empty/filled cells based on difficulty
    let newDomMatrix = Array(9).fill().map(() =>
        Array(9).fill().map(() => ({
          value: 0,
          isInitial: false,
          isCorrect: false,
          isIncorrect: false,
          isHint: false,
          notes: Array(9).fill(false)
        }))
    );

    // Keep track of filled cells
    let filledCells = [];
    let items = difficulty.numbers;  // Important fix from before

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
    setHintsRemaining(difficulty.maxHints);
    setIsMistakeCounting(difficulty.countMistakes);
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
  const handleCellClick = useCallback((row, col) => {
    if (isPaused || gameStatus !== 'playing') return;

    // Only allow selection of empty cells or user-filled cells
    if (!domMatrix[row][col].isInitial) {
      setSelectedCell({ row, col });
      setSelectedPosition({ row, col });
    }
  }, [isPaused, gameStatus, domMatrix]);

  // Determine if a cell is in the same box as the selected cell
  const isInSameBox = useCallback((row, col) => {
    if (selectedPosition.row === null) return false;

    const boxStartRow = Math.floor(selectedPosition.row / 3) * 3;
    const boxStartCol = Math.floor(selectedPosition.col / 3) * 3;
    const cellBoxStartRow = Math.floor(row / 3) * 3;
    const cellBoxStartCol = Math.floor(col / 3) * 3;

    return boxStartRow === cellBoxStartRow && boxStartCol === cellBoxStartCol;
  }, [selectedPosition]);

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


        if (isMistakeCounting) {
          const newMistakes = mistakes + 1;
          setMistakes(newMistakes);
          if (newMistakes >= 3) {
            setGameStatus('gameover');
            setTimerActive(false);
          }
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
    setHintsRemaining(difficulty.maxHints);

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
    setHintsRemaining(difficulty.maxHints);  // Use the difficulty's hint count
    setMistakes(0);
    setGameTime(0);
    setIsPaused(false);
    setIsNoteMode(false);
    createMatrix();
  };

  // Start new game with selected difficulty
  const startNewGame = (difficultyObj) => {
    setDifficulty(difficultyObj);
  };


  // Effect to create matrix when difficulty changes
  useEffect(() => {
    if (difficulty !== null) {
      createMatrix();
    }
  }, [difficulty, createMatrix]);

  const renderGameBoard = useMemo(() => {
    if (gameStatus !== 'playing' || domMatrix.length === 0) return null;

    return (
        <div className="sdk-table">
          {domMatrix.map((row, rowIndex) => (
              <div
                  key={rowIndex}
                  className={`sdk-row ${rowIndex === 2 || rowIndex === 5 ? 'sdk-border-bottom' : ''}`}
              >
                {row.map((cell, colIndex) => (
                    <Cell
                        key={colIndex}
                        cell={cell}
                        rowIndex={rowIndex}
                        colIndex={colIndex}
                        selectedPosition={selectedPosition}
                        isInSameBox={isInSameBox}
                        onClick={handleCellClick}
                        domMatrix={domMatrix}
                    />
                ))}
              </div>
          ))}
        </div>
    );
  }, [domMatrix, selectedPosition, gameStatus, isInSameBox, handleCellClick]);
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
  const getIconForDifficulty = (level) => {
    switch(level) {
      case 'Easy': return '🌱';
      case 'Medium': return '🔥';
      case 'Hard': return '⚡';
      default: return '🎮';
    }
  };

  const getDifficultyDescription = (level) => {
    switch(level) {
      case 'Easy': return 'Perfect for beginners or a quick game';
      case 'Medium': return 'A balanced challenge for regular players';
      case 'Hard': return 'Test your skills with complex puzzles';
      default: return 'Select your challenge level';
    }
  };

  const getAverageTime = (level) => {
    switch(level) {
      case 'Easy': return '5-10 min';
      case 'Medium': return '10-20 min';
      case 'Hard': return '20+ min';
      default: return 'Varies';
    }
  };
  // Render game based on status
  const renderGame = () => {
    switch (gameStatus) {
      case 'difficulty':
        return (
            <div className="sdk-welcome-screen">
              <div className="sdk-welcome-container">
                <h2 className="sdk-welcome-title">Welcome to Sudoku</h2>
                <p className="sdk-welcome-text">Challenge your mind with puzzles of varying difficulty</p>

                <div className="sdk-difficulty-cards">
                  {difficultyLevels.map((level, index) => (
                      <div
                          key={index}
                          className="sdk-difficulty-card"
                          onClick={() => startNewGame(level)}
                      >
                        <div className="sdk-card-badge">{level.level}</div>
                        <div className="sdk-card-content">
                          <div className="sdk-card-icon">{getIconForDifficulty(level.level)}</div>
                          <h3>{level.level}</h3>
                          <p>{getDifficultyDescription(level.level)}</p>
                          <div className="sdk-card-stats">

                            <div className="sdk-stat">
                              <span className="sdk-stat-label">Hints</span>
                              <span className="sdk-stat-value">{level.maxHints}</span>
                            </div>
                            <div className="sdk-stat">
                              <span className="sdk-stat-label">Avg. Time</span>
                              <span className="sdk-stat-value">{getAverageTime(level.level)}</span>
                            </div>

                          </div>
                          <button className="sdk-play-btn">Play Now</button>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            </div>
        );

      case 'playing':
        return (
            <>
              <div className="sdk-header">
                <div className="sdk-timer">{formatTime(gameTime)}</div>
                {isMistakeCounting && (
                    <div className="sdk-mistakes">Mistakes: {mistakes}/3</div>
                )}
                <div className="sdk-controls">
                  <button className="sdk-hint-btn" onClick={giveHint} disabled={hintsRemaining <= 0}>
                    Hint ({hintsRemaining})
                  </button>
                  <button className="sdk-restart-btn" onClick={restartGame}>
                    Restart
                  </button>
                  <button className="sdk-difficulty-btn" onClick={() => setGameStatus('difficulty')}>
                    Change
                  </button>
                  <button className="sdk-theme-btn" onClick={toggleTheme}>
                    {isDarkTheme ? '☀️' : '🌙'}
                  </button>
                  <button className="sdk-pause-btn" onClick={togglePause}>
                    {isPaused ? '▶️' : '⏸️'}
                  </button>
                </div>
              </div>

              {renderGameBoard}

              <NumberPad
                  handleNumberInput={handleNumberInput}
                  handleErase={handleErase}
              />

              {isPaused && (
                  <div className="sdk-pause-overlay">
                    <div className="sdk-pause-content">
                      <h2>Game Paused</h2>
                      <button className="sdk-resume-btn" onClick={togglePause}>▶️ Resume Game</button>
                    </div>
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
                <div className="sdk-completion-buttons">
                  <button className="sdk-new-game-btn" onClick={restartGame}>
                    New Game
                  </button>
                  <button className="sdk-difficulty-btn" onClick={() => setGameStatus('difficulty')}>
                    Change Difficulty
                  </button>
                </div>
              </div>
            </div>
        );

      case 'gameover':
        return (
            <div className="sdk-gameover-overlay">
              <div className="sdk-gameover-message">
                <h2>Game Over</h2>
                <p>You made too many mistakes!</p>
                <div className="sdk-gameover-buttons">
                  <button className="sdk-new-game-btn" onClick={restartGame}>
                    New Game
                  </button>
                  <button className="sdk-difficulty-btn" onClick={() => setGameStatus('difficulty')}>
                    Change Difficulty
                  </button>
                </div>
              </div>
            </div>
        );

      default:
        return null;
    }
  };

  return (
      <div className={`sudoku-container ${isDarkTheme ? 'sdk-dark-theme' : ''}`}>
        {/*<h1 className="sudoku-title">Modern Sudoku</h1>*/}
        <div className="sdk-game">
          {renderGame()}
        </div>
      </div>
  );
};

export default SudokuGame;