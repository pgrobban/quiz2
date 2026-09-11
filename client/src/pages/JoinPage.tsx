import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import type {
  LetterSubmission,
  MatchingBoard,
  MatchingPlayerResult,
  Player,
  Question,
  RoomState,
} from "../../../shared/types";
import { socket } from "../lib/socket";
import LetterReveal from "../components/LetterReveal";
import CountdownBar from "../components/CountdownBar";

type ViewState =
  | "form"
  | "joining"
  | "lobby"
  | "introduction"
  | "question"
  | "letters"
  | "matching"
  | "finished";

export default function JoinPage() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>("form");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [finalPlayers, setFinalPlayers] = useState<Player[]>([]);
  const [timeExpired, setTimeExpired] = useState(false);

  // Letters round state.
  const [activeLetters, setActiveLetters] = useState<string[] | null>(null);
  const [revealAnimationDone, setRevealAnimationDone] = useState(false);
  /** Indices into `activeLetters`, in the order the player tapped them into the word box. */
  const [wordIndices, setWordIndices] = useState<number[]>([]);
  const [wordLocked, setWordLocked] = useState(false);
  const [lettersReveal, setLettersReveal] = useState<{
    submissions: LetterSubmission[];
    topWords: string[];
  } | null>(null);

  // Matching round state. Pairs are entirely local/editable until the timer
  // runs out, at which point the whole set is submitted to the server once.
  const [activeMatchingBoard, setActiveMatchingBoard] = useState<MatchingBoard | null>(null);
  const [stagedSide, setStagedSide] = useState<"left" | "right" | null>(null);
  const [stagedId, setStagedId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<{ leftId: string; rightId: string }[]>([]);
  const [matchingSubmitted, setMatchingSubmitted] = useState(false);
  const [matchingRevealed, setMatchingRevealed] = useState<{
    correctPairs: { leftId: string; rightId: string }[];
    results: MatchingPlayerResult[];
  } | null>(null);

  useEffect(() => {
    function onRoomUpdate(updatedRoom: RoomState) {
      setRoom(updatedRoom);
      if (updatedRoom.phase === "lobby") {
        setQuestion(null);
        setSelectedIndex(null);
        setWasCorrect(null);
        setCorrectIndex(null);
        setActiveLetters(null);
        setRevealAnimationDone(false);
        setWordIndices([]);
        setWordLocked(false);
        setLettersReveal(null);
        setTimeExpired(false);
        setActiveMatchingBoard(null);
        setStagedSide(null);
        setStagedId(null);
        setPairs([]);
        setMatchingSubmitted(false);
        setMatchingRevealed(null);
        setViewState("lobby");
      } else if (updatedRoom.phase === "introduction") {
        setViewState("introduction");
      }
    }

    function onQuestion(payload: { question: Question }) {
      setQuestion(payload.question);
      setSelectedIndex(null);
      setWasCorrect(null);
      setCorrectIndex(null);
      setTimeExpired(false);
      setViewState("question");
    }

    function onReveal(payload: { correctIndex: number }) {
      setCorrectIndex(payload.correctIndex);
    }

    function onLettersStarted(payload: { letters: string[] }) {
      setActiveLetters(payload.letters);
      setRevealAnimationDone(false);
      setWordIndices([]);
      setWordLocked(false);
      setLettersReveal(null);
      setTimeExpired(false);
      setViewState("letters");
    }

    function onLettersRevealed(payload: {
      submissions: LetterSubmission[];
      topWords: string[];
    }) {
      setLettersReveal(payload);
    }

    function onMatchingBoard(payload: { board: MatchingBoard }) {
      setActiveMatchingBoard(payload.board);
      setStagedSide(null);
      setStagedId(null);
      setPairs([]);
      setMatchingSubmitted(false);
      setMatchingRevealed(null);
      setTimeExpired(false);
      setViewState("matching");
    }

    function onMatchingRevealed(payload: {
      correctPairs: { leftId: string; rightId: string }[];
      results: MatchingPlayerResult[];
    }) {
      setMatchingRevealed(payload);
    }

    function onFinished(payload: { players: Player[] }) {
      setFinalPlayers(payload.players);
      setViewState("finished");
    }

    function onRoomClosed(payload: { reason: string }) {
      setErrorMessage(payload.reason);
      setViewState("form");
      setRoom(null);
      socket.disconnect();
    }

    socket.on("room:update", onRoomUpdate);
    socket.on("game:question", onQuestion);
    socket.on("game:reveal", onReveal);
    socket.on("letters:started", onLettersStarted);
    socket.on("letters:revealed", onLettersRevealed);
    socket.on("matching:board", onMatchingBoard);
    socket.on("matching:revealed", onMatchingRevealed);
    socket.on("game:finished", onFinished);
    socket.on("room:closed", onRoomClosed);

    return () => {
      socket.off("room:update", onRoomUpdate);
      socket.off("game:question", onQuestion);
      socket.off("game:reveal", onReveal);
      socket.off("letters:started", onLettersStarted);
      socket.off("letters:revealed", onLettersRevealed);
      socket.off("matching:board", onMatchingBoard);
      socket.off("matching:revealed", onMatchingRevealed);
      socket.off("game:finished", onFinished);
      socket.off("room:closed", onRoomClosed);
    };
  }, []);

  const handleJoin = () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!/^\d{4}$/.test(trimmedCode)) {
      setErrorMessage("Room codes are 4 digits.");
      return;
    }
    if (!trimmedName) {
      setErrorMessage("Please enter your name.");
      return;
    }

    setErrorMessage(null);
    setViewState("joining");

    const emitJoin = () => {
      socket.emit(
        "player:join-room",
        { code: trimmedCode, name: trimmedName },
        (response) => {
          if (response.ok) {
            setRoom(response.room);
            setViewState("lobby");
          } else {
            setErrorMessage(response.error);
            setViewState("form");
            socket.disconnect();
          }
        }
      );
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once("connect", emitJoin);
      socket.connect();
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (!room || selectedIndex !== null || timeExpired) return;
    setSelectedIndex(optionIndex);
    socket.emit(
      "player:submit-answer",
      { code: room.code, optionIndex },
      (response) => {
        if (response.ok) {
          setWasCorrect(response.correct);
        } else {
          setErrorMessage(response.error);
          setSelectedIndex(null);
        }
      }
    );
  };

  const handleLeave = () => {
    if (room) {
      socket.emit("player:leave-room", { code: room.code });
    }
    socket.disconnect();
    navigate("/");
  };

  const handleLockInWord = () => {
    if (!room || wordLocked || timeExpired || wordIndices.length === 0 || !activeLetters)
      return;
    const word = wordIndices.map((i) => activeLetters[i]).join("");
    socket.emit(
      "player:submit-word",
      { code: room.code, word },
      (response) => {
        if (response.ok) {
          setWordLocked(true);
        } else {
          setErrorMessage(response.error);
        }
      }
    );
  };

  /** Taps an available (not-yet-used) letter tile into the word box. */
  const handleTapPoolLetter = (index: number) => {
    if (!revealAnimationDone || wordLocked || timeExpired) return;
    if (wordIndices.includes(index)) return;
    setWordIndices((prev) => [...prev, index]);
  };

  /** Taps a letter already in the word box to send it back to the pool. */
  const handleTapBoxLetter = (position: number) => {
    if (wordLocked || timeExpired) return;
    setWordIndices((prev) => prev.filter((_, i) => i !== position));
  };

  // Once the timer runs out, submit whatever pairs the player has settled on
  // (even if incomplete) exactly once. Deliberately not deadline-gated
  // server-side, to avoid a network-latency race rejecting this.
  useEffect(() => {
    if (!timeExpired || !room || !activeMatchingBoard || matchingSubmitted) return;
    setMatchingSubmitted(true);
    socket.emit(
      "player:submit-matching-board",
      { code: room.code, pairs },
      (response) => {
        if (!response.ok) setErrorMessage(response.error);
      }
    );
    // Intentionally only re-run when timeExpired flips true; `pairs` is read
    // at that moment via closure (the player's final answer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeExpired]);

  /**
   * Taps an item in either matching column. Tapping an already-paired item
   * un-pairs it (so players can freely change their mind). Otherwise, the
   * first tap stages an item and the next tap (in the other column)
   * completes the pair - all purely local until time runs out.
   */
  const handleTapMatchingItem = (side: "left" | "right", id: string) => {
    if (timeExpired || matchingRevealed || matchingSubmitted) return;

    const existingIndex = pairs.findIndex((p) =>
      side === "left" ? p.leftId === id : p.rightId === id
    );
    if (existingIndex !== -1) {
      setPairs((prev) => prev.filter((_, i) => i !== existingIndex));
      return;
    }

    if (stagedSide === side) {
      // Tapping within the same column: toggle/switch the staged item.
      setStagedId((prev) => (prev === id ? null : id));
      setStagedSide((prev) => (stagedId === id ? null : prev));
      return;
    }

    if (stagedSide === null || stagedId === null) {
      setStagedSide(side);
      setStagedId(id);
      return;
    }

    // Opposite column tapped while something is staged: complete the pair.
    const leftId = side === "left" ? id : stagedId;
    const rightId = side === "right" ? id : stagedId;
    setStagedSide(null);
    setStagedId(null);
    setPairs((prev) => [...prev, { leftId, rightId }]);
  };

  const myScore = room?.players.find((p) => p.id === socket.id)?.score ?? 0;
  const sortedFinalPlayers = [...finalPlayers].sort((a, b) => b.score - a.score);
  const myRank =
    sortedFinalPlayers.findIndex((p) => p.id === socket.id) + 1 || null;

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          py: 4,
          gap: 3,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleLeave}
          sx={{ alignSelf: "flex-start" }}
        >
          Back
        </Button>

        {viewState === "form" && (
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h4" textAlign="center">
                Join Game
              </Typography>

              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

              <TextField
                label="Room Code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                inputProps={{ maxLength: 4, inputMode: "numeric" }}
                placeholder="1234"
                fullWidth
              />
              <TextField
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputProps={{ maxLength: 24 }}
                fullWidth
              />
              <Button variant="contained" size="large" onClick={handleJoin}>
                Join
              </Button>
            </Stack>
          </Paper>
        )}

        {viewState === "joining" && (
          <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
            <CircularProgress />
            <Typography>Joining room...</Typography>
          </Stack>
        )}

        {viewState === "lobby" && room && (
          <Paper elevation={3} sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
            <Typography variant="h5">You're in!</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Room {room.code}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Waiting for the host to start the next round...
            </Typography>
            <CircularProgress size={24} sx={{ mt: 2 }} />
          </Paper>
        )}

        {viewState === "introduction" && room?.roundInfo && (
          <Paper elevation={3} sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
            <Typography variant="h5">{room.roundInfo.title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {room.roundInfo.description}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Get ready - the host will start the questions shortly.
            </Typography>
          </Paper>
        )}

        {viewState === "question" && room && question && (
          <>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="overline" color="text.secondary">
                Question {room.currentQuestionIndex + 1} of{" "}
                {room.totalQuestions}
              </Typography>
              <Chip label={`${myScore} pts`} color="primary" size="small" />
            </Stack>

            <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
              {room.phaseDeadline !== null && (
                <Box sx={{ mb: 2 }}>
                  <CountdownBar
                    deadline={room.phaseDeadline}
                    totalSeconds={15}
                    onExpire={() => setTimeExpired(true)}
                  />
                </Box>
              )}
              <Typography variant="h6" sx={{ mb: 2 }}>
                {question.text}
              </Typography>
              <Stack spacing={1.5}>
                {question.options.map((option, index) => {
                  const isSelected = selectedIndex === index;
                  const isRevealedCorrect =
                    correctIndex !== null && index === correctIndex;
                  const isRevealedWrongSelection =
                    correctIndex !== null && isSelected && index !== correctIndex;

                  return (
                    <Button
                      key={index}
                      variant={isSelected ? "contained" : "outlined"}
                      color={
                        isRevealedCorrect
                          ? "success"
                          : isRevealedWrongSelection
                            ? "error"
                            : "primary"
                      }
                      size="large"
                      disabled={selectedIndex !== null || timeExpired}
                      onClick={() => handleAnswer(index)}
                      endIcon={
                        isRevealedCorrect ? (
                          <CheckCircleIcon />
                        ) : isRevealedWrongSelection ? (
                          <CancelIcon />
                        ) : undefined
                      }
                      sx={{ justifyContent: "space-between", py: 1.5 }}
                    >
                      {option}
                    </Button>
                  );
                })}
              </Stack>

              {selectedIndex !== null && correctIndex === null && (
                <Typography color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
                  Answer submitted! Waiting for the host to reveal...
                </Typography>
              )}
              {timeExpired && selectedIndex === null && correctIndex === null && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Time's up! You didn't answer in time.
                </Alert>
              )}
              {correctIndex !== null && (
                <Alert
                  severity={wasCorrect ? "success" : "error"}
                  sx={{ mt: 2 }}
                >
                  {wasCorrect ? "Correct! +100 points" : "Not quite this time."}
                </Alert>
              )}
            </Paper>
          </>
        )}

        {viewState === "letters" && room && activeLetters && (
          <>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="overline" color="text.secondary">
                Letters Round
              </Typography>
              <Chip label={`${myScore} pts`} color="primary" size="small" />
            </Stack>

            <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
              {room.phaseDeadline !== null && (
                <Box sx={{ mb: 2 }}>
                  <CountdownBar
                    deadline={room.phaseDeadline}
                    totalSeconds={60}
                    onExpire={() => setTimeExpired(true)}
                  />
                </Box>
              )}
              <Box sx={{ py: 1 }}>
                <LetterReveal
                  letters={activeLetters}
                  tileSize={44}
                  onComplete={() => setRevealAnimationDone(true)}
                  onTileClick={!wordLocked && !timeExpired ? handleTapPoolLetter : undefined}
                  usedIndices={wordIndices}
                />
              </Box>

              {!lettersReveal && (
                <Stack spacing={2} sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Your word (tap to undo)
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{
                      minHeight: 56,
                      p: 1,
                      borderRadius: 2,
                      border: "1px dashed rgba(244, 244, 246, 0.28)",
                    }}
                  >
                    {wordIndices.length === 0 && (
                      <Typography color="text.secondary" sx={{ py: 1, px: 0.5 }}>
                        {revealAnimationDone
                          ? "Tap letters above to build a word..."
                          : "Wait for all letters to appear..."}
                      </Typography>
                    )}
                    {wordIndices.map((letterIndex, position) => (
                      <Button
                        key={position}
                        variant="contained"
                        color="primary"
                        disabled={wordLocked || timeExpired}
                        onClick={() => handleTapBoxLetter(position)}
                        sx={{
                          minWidth: 44,
                          height: 44,
                          fontFamily: "monospace",
                          fontSize: "1.1rem",
                          fontWeight: 700,
                        }}
                      >
                        {activeLetters[letterIndex]}
                      </Button>
                    ))}
                  </Stack>

                  <Button
                    variant="contained"
                    size="large"
                    color="success"
                    disabled={
                      !revealAnimationDone ||
                      wordLocked ||
                      timeExpired ||
                      wordIndices.length === 0
                    }
                    onClick={handleLockInWord}
                  >
                    Lock In Word
                  </Button>
                  {wordLocked && (
                    <Typography color="text.secondary" textAlign="center">
                      Locked in "{wordIndices.map((i) => activeLetters[i]).join("")}" -
                      waiting for the host to reveal...
                    </Typography>
                  )}
                  {timeExpired && !wordLocked && (
                    <Alert severity="warning">
                      Time's up! You didn't lock in a word.
                    </Alert>
                  )}
                </Stack>
              )}

              {lettersReveal && (
                <Stack spacing={2} sx={{ mt: 3 }}>
                  {(() => {
                    const mine = lettersReveal.submissions.find(
                      (s) => s.playerId === socket.id
                    );
                    if (!mine) {
                      return (
                        <Alert severity="warning">
                          You didn't lock in a word this round.
                        </Alert>
                      );
                    }
                    return (
                      <Alert severity={mine.valid ? "success" : "error"}>
                        {mine.valid
                          ? `"${mine.word}" is valid! +${mine.points} points`
                          : `"${mine.word}" wasn't a valid word.`}
                      </Alert>
                    );
                  })()}

                  <Typography variant="subtitle2" color="text.secondary">
                    Best possible words:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {lettersReveal.topWords.map((word) => (
                      <Chip key={word} label={word.toUpperCase()} color="success" />
                    ))}
                  </Stack>
                </Stack>
              )}
            </Paper>
          </>
        )}

        {viewState === "matching" && room && activeMatchingBoard && (
          <>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="overline" color="text.secondary">
                Matching Round
              </Typography>
              <Chip label={`${myScore} pts`} color="primary" size="small" />
            </Stack>

            <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
              {room.phaseDeadline !== null && (
                <Box sx={{ mb: 2 }}>
                  <CountdownBar
                    deadline={room.phaseDeadline}
                    totalSeconds={90}
                    onExpire={() => setTimeExpired(true)}
                  />
                </Box>
              )}

              <Typography variant="h6" textAlign="center" sx={{ mb: 1 }}>
                {activeMatchingBoard.title}
              </Typography>

              <Typography color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                {matchingSubmitted
                  ? "Submitted!"
                  : `Paired ${pairs.length} / ${activeMatchingBoard.left.length} - tap a pair again to undo`}
              </Typography>

              <Stack direction="row" spacing={1.5}>
                <Stack spacing={1} flex={1}>
                  {activeMatchingBoard.left.map((item) => {
                    const pairIndex = pairs.findIndex((p) => p.leftId === item.id);
                    const isStaged = stagedSide === "left" && stagedId === item.id;
                    return (
                      <Badge
                        key={item.id}
                        badgeContent={pairIndex + 1}
                        invisible={pairIndex === -1}
                        color="secondary"
                        sx={{ width: "100%" }}
                      >
                        <Button
                          variant={
                            pairIndex !== -1 ? "contained" : isStaged ? "contained" : "outlined"
                          }
                          color={pairIndex !== -1 ? "secondary" : "primary"}
                          fullWidth
                          disabled={timeExpired || !!matchingRevealed || matchingSubmitted}
                          onClick={() => handleTapMatchingItem("left", item.id)}
                          sx={{ fontSize: "0.8rem", py: 1, textTransform: "none" }}
                        >
                          {item.text}
                        </Button>
                      </Badge>
                    );
                  })}
                </Stack>
                <Stack spacing={1} flex={1}>
                  {activeMatchingBoard.right.map((item) => {
                    const pairIndex = pairs.findIndex((p) => p.rightId === item.id);
                    const isStaged = stagedSide === "right" && stagedId === item.id;
                    return (
                      <Badge
                        key={item.id}
                        badgeContent={pairIndex + 1}
                        invisible={pairIndex === -1}
                        color="secondary"
                        sx={{ width: "100%" }}
                      >
                        <Button
                          variant={
                            pairIndex !== -1 ? "contained" : isStaged ? "contained" : "outlined"
                          }
                          color={pairIndex !== -1 ? "secondary" : "primary"}
                          fullWidth
                          disabled={timeExpired || !!matchingRevealed || matchingSubmitted}
                          onClick={() => handleTapMatchingItem("right", item.id)}
                          sx={{ fontSize: "0.8rem", py: 1, textTransform: "none" }}
                        >
                          {item.text}
                        </Button>
                      </Badge>
                    );
                  })}
                </Stack>
              </Stack>

              {matchingSubmitted && !matchingRevealed && (
                <Typography color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
                  Waiting for the host to reveal...
                </Typography>
              )}

              {matchingRevealed && (
                <Stack spacing={1} sx={{ mt: 3 }}>
                  {(() => {
                    const mine = matchingRevealed.results.find(
                      (r) => r.playerId === socket.id
                    );
                    if (!mine) return null;
                    return (
                      <Alert severity={mine.correctCount > 0 ? "success" : "info"}>
                        You matched {mine.correctCount} / {activeMatchingBoard.left.length}{" "}
                        correctly - +{mine.points} points
                      </Alert>
                    );
                  })()}
                </Stack>
              )}
            </Paper>
          </>
        )}

        {viewState === "finished" && (
          <Paper elevation={3} sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
            <Typography variant="h5">Game Over!</Typography>
            {myRank && (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                You finished #{myRank} with {myScore} points
              </Typography>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  );
}
