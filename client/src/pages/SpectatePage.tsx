import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  EmojiEvents as EmojiEventsIcon,
} from "@mui/icons-material";
import type {
  LetterSubmission,
  MathSubmission,
  MatchingPlayerResult,
  Player,
  Question,
  RoomState,
} from "../../../shared/types";
import { socket } from "../lib/socket";
import LetterReveal from "../components/LetterReveal";
import CountdownBar from "../components/CountdownBar";
import {
  MATH_SCRAMBLE_PER_TILE,
  generateTargetScrambleCandidates,
} from "../lib/mathScramble";
import { resolvePairColor } from "../lib/pairColors";

type ViewState = "form" | "joining" | "watching";

/**
 * The associations "wall" is laid out as 11 stacked rows forming an X shape:
 * rows 1-5 hold column A (left) / column B (right) - clues 1-4 then each
 * column's solution nearest the center; row 6 is the shared final solution;
 * rows 7-11 mirror the same pattern for columns C (left) / D (right). Each
 * row indents its two boxes slightly more than the last as it approaches
 * the center, instead of shrinking the boxes themselves.
 */
const ASSOCIATIONS_INDENT_STEP = 34; // px, how much each row shifts inward
const ASSOCIATIONS_BOX_WIDTH = 190; // px, fixed width - never shrinks
/** Returns the clue/solution cellIndex (0-3 clue, 4 solution) for a given row, or null for the center row. */
function associationsCellIndexForRow(row: number): number | null {
  if (row === 6) return null;
  return row <= 5 ? row - 1 : 11 - row;
}

export default function SpectatePage() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>("form");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [lettersReveal, setLettersReveal] = useState<{
    submissions: LetterSubmission[];
    topWords: string[];
  } | null>(null);
  const [matchingRevealed, setMatchingRevealed] = useState<{
    correctPairs: { leftId: string; rightId: string }[];
    results: MatchingPlayerResult[];
  } | null>(null);
  const [mathRevealed, setMathRevealed] = useState<{
    target: number;
    submissions: MathSubmission[];
    closestSolution: { value: number; expression: string; distance: number } | null;
  } | null>(null);
  const [targetRevealed, setTargetRevealed] = useState(false);
  const targetScrambleCandidates = useMemo(
    () => generateTargetScrambleCandidates(),
    [room?.activeMathChallenge?.target]
  );

  useEffect(() => {
    function onRoomUpdate(updatedRoom: RoomState) {
      setRoom(updatedRoom);
      if (updatedRoom.phase === "lobby") {
        setQuestion(null);
        setCorrectIndex(null);
        setLettersReveal(null);
        setMatchingRevealed(null);
        setMathRevealed(null);
        setTargetRevealed(false);
      }
    }

    function onQuestion(payload: { question: Question }) {
      setQuestion(payload.question);
      setCorrectIndex(null);
    }

    function onReveal(payload: { correctIndex: number }) {
      setCorrectIndex(payload.correctIndex);
    }

    function onLettersRevealed(payload: {
      submissions: LetterSubmission[];
      topWords: string[];
    }) {
      setLettersReveal(payload);
    }

    function onMatchingRevealed(payload: {
      correctPairs: { leftId: string; rightId: string }[];
      results: MatchingPlayerResult[];
    }) {
      setMatchingRevealed(payload);
    }

    function onMathRevealed(payload: {
      target: number;
      submissions: MathSubmission[];
      closestSolution: { value: number; expression: string; distance: number } | null;
    }) {
      setMathRevealed(payload);
    }

    function onFinished() {
      setQuestion(null);
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
    socket.on("letters:revealed", onLettersRevealed);
    socket.on("matching:revealed", onMatchingRevealed);
    socket.on("math:revealed", onMathRevealed);
    socket.on("game:finished", onFinished);
    socket.on("room:closed", onRoomClosed);

    return () => {
      socket.off("room:update", onRoomUpdate);
      socket.off("game:question", onQuestion);
      socket.off("game:reveal", onReveal);
      socket.off("letters:revealed", onLettersRevealed);
      socket.off("matching:revealed", onMatchingRevealed);
      socket.off("math:revealed", onMathRevealed);
      socket.off("game:finished", onFinished);
      socket.off("room:closed", onRoomClosed);
    };
  }, []);

  // No dedicated "math/letters/matching round started" event here (Spectate
  // just reflects room state) - reset each round's local reveal/animation
  // state whenever a *new* round begins (currentQuestionIndex changes),
  // not just when returning to the lobby. Otherwise, when several rounds of
  // the same type are played back-to-back, the previous round's reveal
  // (e.g. "Best Possible Words") stays visible on top of the new round.
  useEffect(() => {
    setTargetRevealed(false);
    setLettersReveal(null);
    setMatchingRevealed(null);
    setMathRevealed(null);
  }, [room?.currentQuestionIndex]);

  const handleWatch = () => {
    const trimmedCode = code.trim();
    if (!/^\d{4}$/.test(trimmedCode)) {
      setErrorMessage("Room codes are 4 digits.");
      return;
    }

    setErrorMessage(null);
    setViewState("joining");

    const emitJoin = () => {
      socket.emit("spectator:join-room", { code: trimmedCode }, (response) => {
        if (response.ok) {
          setRoom(response.room);
          setQuestion(response.question);
          setCorrectIndex(response.correctIndex);
          setViewState("watching");
        } else {
          setErrorMessage(response.error);
          setViewState("form");
          socket.disconnect();
        }
      });
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once("connect", emitJoin);
      socket.connect();
    }
  };

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const gameInProgress =
    !!room && room.phase !== "lobby" && room.phase !== "finished";

  const handleLeave = () => {
    if (gameInProgress) {
      setShowLeaveConfirm(true);
      return;
    }
    socket.disconnect();
    navigate("/");
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    socket.disconnect();
    navigate("/");
  };

  const sortedPlayers: Player[] = room
    ? [...room.players].sort((a, b) => b.score - a.score)
    : [];

  return (
    <Container maxWidth="lg">
      <Box sx={{ minHeight: "100vh", py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleLeave}
          sx={{ mb: 2 }}
        >
          Back
        </Button>

        {viewState === "form" && (
          <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, mt: 8 }}>
              <Stack spacing={3}>
                <Typography variant="h4" textAlign="center">
                  Spectate
                </Typography>
                <Typography color="text.secondary" textAlign="center">
                  Enter the room code shown on the host's screen.
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
                <Button variant="contained" size="large" onClick={handleWatch}>
                  Watch
                </Button>
              </Stack>
            </Paper>
          </Container>
        )}

        {viewState === "joining" && (
          <Stack alignItems="center" spacing={2} sx={{ py: 12 }}>
            <CircularProgress />
            <Typography>Connecting to room...</Typography>
          </Stack>
        )}

        {viewState === "watching" && room && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  minHeight: 420,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 3 }}
                >
                  <Typography variant="h5" sx={{ fontFamily: "monospace" }}>
                    Room {room.code}
                  </Typography>
                  {room.phase !== "lobby" &&
                    room.phase !== "finished" &&
                    room.round !== "letters" &&
                    room.round !== "matching" &&
                    room.round !== "math" && (
                      <Chip
                        label={`Should I know this? ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                  {room.round === "letters" &&
                    room.phase !== "lobby" &&
                    room.phase !== "finished" && (
                      <Chip
                        label={`Letters · Round ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                  {room.round === "matching" &&
                    room.phase !== "lobby" &&
                    room.phase !== "finished" && (
                      <Chip
                        label={`Making connections · Board ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                  {room.round === "math" &&
                    room.phase !== "lobby" &&
                    room.phase !== "finished" && (
                      <Chip
                        label={`My Number · Round ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                  {room.round === "associations" &&
                    room.phase !== "lobby" &&
                    room.phase !== "finished" && (
                      <Chip
                        label={`Associations · Board ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                </Stack>

                {room.phase === "lobby" && (
                  <Stack
                    flexGrow={1}
                    alignItems="center"
                    justifyContent="center"
                    spacing={2}
                  >
                    <Typography variant="h4">Waiting to start...</Typography>
                    <Typography color="text.secondary">
                      {room.players.length} player
                      {room.players.length === 1 ? "" : "s"} ready
                    </Typography>
                  </Stack>
                )}

                {room.phase === "introduction" && room.roundInfo && (
                  <Stack
                    flexGrow={1}
                    alignItems="center"
                    justifyContent="center"
                    spacing={2}
                    textAlign="center"
                  >
                    <Typography variant="h4">{room.roundInfo.title}</Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 480 }}>
                      {room.roundInfo.description}
                    </Typography>
                    {room.roundInfo.tutorial.type === "video" ? (
                      <Box
                        component="video"
                        src={room.roundInfo.tutorial.url}
                        autoPlay
                        muted
                        playsInline
                        sx={{
                          width: "100%",
                          maxWidth: 640,
                          maxHeight: "55vh",
                          objectFit: "contain",
                          borderRadius: 2,
                        }}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={room.roundInfo.tutorial.url}
                        alt={`${room.roundInfo.title} tutorial`}
                        sx={{
                          width: "100%",
                          maxWidth: 640,
                          maxHeight: "55vh",
                          objectFit: "contain",
                          borderRadius: 2,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <Typography color="text.secondary" variant="body2">
                      Get ready - questions start shortly!
                    </Typography>
                  </Stack>
                )}

                {(room.phase === "question" || room.phase === "reveal") &&
                  room.round !== "letters" &&
                  room.round !== "matching" &&
                  room.round !== "math" &&
                  question && (
                    <Stack flexGrow={1} justifyContent="center" spacing={3}>
                      {room.phaseDeadline !== null && (
                        <Box sx={{ width: "100%" }}>
                          <CountdownBar deadline={room.phaseDeadline} totalSeconds={15} />
                        </Box>
                      )}
                      <Typography variant="h4" textAlign="center">
                        {question.text}
                      </Typography>
                      <Grid container spacing={2}>
                        {question.options.map((option, index) => {
                          const isCorrect =
                            correctIndex !== null && index === correctIndex;
                          return (
                            <Grid item xs={12} sm={6} key={index}>
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  textAlign: "center",
                                  fontSize: "1.1rem",
                                  borderColor: isCorrect
                                    ? "success.main"
                                    : "rgba(244, 244, 246, 0.16)",
                                  borderWidth: isCorrect ? 2 : 1,
                                  bgcolor: isCorrect
                                    ? "rgba(74, 222, 128, 0.18)"
                                    : "rgba(244, 244, 246, 0.04)",
                                  transition: "all 0.2s",
                                }}
                              >
                                {option}
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                      <Typography
                        textAlign="center"
                        color="text.secondary"
                        variant="body2"
                      >
                        {room.phase === "question"
                          ? `${room.answeredCount} / ${room.players.length} players have answered`
                          : "Answer revealed!"}
                      </Typography>
                    </Stack>
                  )}

                {(room.phase === "question" || room.phase === "reveal") &&
                  room.round === "letters" &&
                  room.activeLetters && (
                    <Stack flexGrow={1} justifyContent="center" spacing={3}>
                      {room.phaseDeadline !== null && (
                        <Box sx={{ width: "100%" }}>
                          <CountdownBar deadline={room.phaseDeadline} totalSeconds={60} />
                        </Box>
                      )}
                      <Box sx={{ py: 2 }}>
                        <LetterReveal letters={room.activeLetters} tileSize={48} />
                      </Box>

                      {!lettersReveal && (
                        <Typography
                          textAlign="center"
                          color="text.secondary"
                          variant="body2"
                        >
                          {room.answeredCount} / {room.players.length} players
                          have locked in a word
                        </Typography>
                      )}

                      {lettersReveal && (
                        <Stack spacing={2}>
                          <Typography variant="h6" textAlign="center">
                            Player Words
                          </Typography>
                          <Grid container spacing={1.5} justifyContent="center">
                            {lettersReveal.submissions.map((sub) => (
                              <Grid item key={sub.playerId}>
                                <Chip
                                  label={`${sub.playerName}: ${sub.word} ${sub.valid ? `(+${sub.points})` : "(invalid)"
                                    }`}
                                  color={sub.valid ? "success" : "default"}
                                />
                              </Grid>
                            ))}
                          </Grid>

                          <Typography
                            variant="h6"
                            textAlign="center"
                            sx={{ mt: 2 }}
                          >
                            Best Possible Words
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="center"
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {lettersReveal.topWords.map((word) => (
                              <Chip
                                key={word}
                                label={word.toUpperCase()}
                                color="success"
                              />
                            ))}
                          </Stack>
                        </Stack>
                      )}
                    </Stack>
                  )}

                {(room.phase === "question" || room.phase === "reveal") &&
                  room.round === "matching" &&
                  room.activeMatchingBoard && (
                    <Stack flexGrow={1} justifyContent="center" spacing={3}>
                      {room.phaseDeadline !== null && (
                        <Box sx={{ width: "100%" }}>
                          <CountdownBar deadline={room.phaseDeadline} totalSeconds={90} />
                        </Box>
                      )}

                      <Typography variant="h4" textAlign="center">
                        {room.activeMatchingBoard.title}
                      </Typography>

                      <Grid container spacing={3} justifyContent="center">
                        <Grid item xs={12} sm={6} md={4}>
                          <Stack spacing={1}>
                            {room.activeMatchingBoard.left.map((item) => {
                              const pairIndex = matchingRevealed
                                ? matchingRevealed.correctPairs.findIndex(
                                  (p) => p.leftId === item.id
                                )
                                : -1;
                              const rightText =
                                pairIndex !== -1
                                  ? room.activeMatchingBoard?.right.find(
                                    (r) => r.id === matchingRevealed?.correctPairs[pairIndex].rightId
                                  )?.text
                                  : undefined;
                              const color =
                                pairIndex !== -1 ? resolvePairColor(pairIndex, rightText) : null;
                              return (
                                <Paper
                                  key={item.id}
                                  variant="outlined"
                                  sx={{
                                    p: 1.5,
                                    textAlign: "center",
                                    borderColor: color ?? "rgba(244, 244, 246, 0.16)",
                                    borderWidth: color ? 2 : 1,
                                    bgcolor: color ? `${color}2e` : undefined,
                                    color: color ?? undefined,
                                    fontWeight: color ? 700 : 400,
                                    transition: "all 0.2s",
                                  }}
                                >
                                  {item.text}
                                </Paper>
                              );
                            })}
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Stack spacing={1}>
                            {room.activeMatchingBoard.right.map((item) => {
                              const pairIndex = matchingRevealed
                                ? matchingRevealed.correctPairs.findIndex(
                                  (p) => p.rightId === item.id
                                )
                                : -1;
                              const color =
                                pairIndex !== -1
                                  ? resolvePairColor(pairIndex, item.text)
                                  : null;
                              return (
                                <Paper
                                  key={item.id}
                                  variant="outlined"
                                  sx={{
                                    p: 1.5,
                                    textAlign: "center",
                                    borderColor: color ?? "rgba(244, 244, 246, 0.16)",
                                    borderWidth: color ? 2 : 1,
                                    bgcolor: color ? `${color}2e` : undefined,
                                    color: color ?? undefined,
                                    fontWeight: color ? 700 : 400,
                                    transition: "all 0.2s",
                                  }}
                                >
                                  {item.text}
                                </Paper>
                              );
                            })}
                          </Stack>
                        </Grid>
                      </Grid>

                      {!matchingRevealed && (
                        <Typography textAlign="center" color="text.secondary" variant="body2">
                          {room.answeredCount} / {room.players.length} players have
                          finished matching
                        </Typography>
                      )}

                      {matchingRevealed && room.activeMatchingBoard && (
                        <Stack spacing={2}>
                          <Typography variant="h6" textAlign="center">
                            Correct Pairs
                          </Typography>
                          <Stack spacing={0.5} alignItems="center">
                            {matchingRevealed.correctPairs.map((pair, index) => {
                              const leftText = room.activeMatchingBoard?.left.find(
                                (i) => i.id === pair.leftId
                              )?.text;
                              const rightText = room.activeMatchingBoard?.right.find(
                                (i) => i.id === pair.rightId
                              )?.text;
                              return (
                                <Typography
                                  key={pair.leftId}
                                  sx={{ color: resolvePairColor(index, rightText), fontWeight: 700 }}
                                >
                                  {leftText} ↔ {rightText}
                                </Typography>
                              );
                            })}
                          </Stack>

                          <Typography variant="h6" textAlign="center" sx={{ mt: 2 }}>
                            Player Results
                          </Typography>
                          <Grid container spacing={1.5} justifyContent="center">
                            {matchingRevealed.results.map((result) => (
                              <Grid item key={result.playerId}>
                                <Chip
                                  label={`${result.playerName}: ${result.correctCount}/${room.activeMatchingBoard?.left.length} (+${result.points})`}
                                  color={result.correctCount > 0 ? "success" : "default"}
                                />
                              </Grid>
                            ))}
                          </Grid>
                        </Stack>
                      )}
                    </Stack>
                  )}

                {(room.phase === "question" || room.phase === "reveal") &&
                  room.round === "math" &&
                  room.activeMathChallenge && (
                    <Stack flexGrow={1} justifyContent="center" spacing={3}>
                      {room.phaseDeadline !== null && (
                        <Box sx={{ width: "100%" }}>
                          <CountdownBar deadline={room.phaseDeadline} totalSeconds={90} />
                        </Box>
                      )}

                      <Typography variant="body1" color="text.secondary" textAlign="center">
                        Target
                      </Typography>
                      <Box sx={{ py: 1, display: "flex", justifyContent: "center" }}>
                        <LetterReveal
                          letters={[String(room.activeMathChallenge.target)]}
                          scrambleCandidatesPerTile={[targetScrambleCandidates]}
                          tileSize={80}
                          onComplete={() => setTargetRevealed(true)}
                        />
                      </Box>

                      {targetRevealed && (
                        <Box sx={{ py: 1 }}>
                          <LetterReveal
                            letters={room.activeMathChallenge.numbers.map(String)}
                            scrambleCharset={"0123456789".split("")}
                            scrambleCandidatesPerTile={MATH_SCRAMBLE_PER_TILE}
                            tileSize={56}
                          />
                        </Box>
                      )}

                      {!mathRevealed && (
                        <Typography textAlign="center" color="text.secondary" variant="body2">
                          {room.answeredCount} / {room.players.length} players have
                          locked in an answer
                        </Typography>
                      )}

                      {mathRevealed && (
                        <Stack spacing={2}>
                          {mathRevealed.closestSolution && (
                            <Typography textAlign="center" color="success.main" variant="h6">
                              Best possible: {mathRevealed.closestSolution.expression} ={" "}
                              {mathRevealed.closestSolution.value}
                              {mathRevealed.closestSolution.distance > 0
                                ? ` (${mathRevealed.closestSolution.distance} away)`
                                : " (exact!)"}
                            </Typography>
                          )}
                          <Typography variant="h6" textAlign="center">
                            Player Answers
                          </Typography>
                          <Grid container spacing={1.5} justifyContent="center">
                            {mathRevealed.submissions.map((sub) => (
                              <Grid item key={sub.playerId}>
                                <Chip
                                  label={
                                    sub.value !== null
                                      ? `${sub.playerName}: ${sub.expression} = ${sub.value} (+${sub.points})`
                                      : `${sub.playerName}: ${sub.expression} (invalid)`
                                  }
                                  color={sub.points > 0 ? "success" : "default"}
                                />
                              </Grid>
                            ))}
                          </Grid>
                        </Stack>
                      )}
                    </Stack>
                  )}

                {(room.phase === "question" || room.phase === "reveal") &&
                  room.round === "associations" &&
                  room.activeAssociationsBoard && (
                    <Stack flexGrow={1} justifyContent="center" spacing={2}>
                      <Typography variant="h4" textAlign="center">
                        {room.activeAssociationsBoard.title}
                      </Typography>

                      {room.associationsTurn && room.phase === "question" && (
                        <Typography
                          textAlign="center"
                          variant="h6"
                          color={
                            room.associationsTurn.mode === "guess-only"
                              ? "warning.main"
                              : "info.main"
                          }
                        >
                          {room.associationsTurn.finalists.find(
                            (p) => p.id === room.associationsTurn!.activePlayerId
                          )?.name ?? "?"}
                          's turn
                          {room.associationsTurn.mode === "guess-only"
                            ? " · guess only"
                            : ""}
                        </Typography>
                      )}

                      <Stack spacing={0.75} sx={{ width: "100%", maxWidth: 720, mx: "auto" }}>
                        {Array.from({ length: 11 }, (_, i) => i + 1).map((row) => {
                          const cellIndex = associationsCellIndexForRow(row);

                          if (cellIndex === null) {
                            // Center row: the shared final solution.
                            const finalSolved = room.activeAssociationsBoard!.finalSolved;
                            return (
                              <Box
                                key="final"
                                sx={{ display: "flex", justifyContent: "center" }}
                              >
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    width: ASSOCIATIONS_BOX_WIDTH * 1.4,
                                    minHeight: 56,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    p: 1,
                                    fontSize: { xs: "0.95rem", sm: "1.1rem", md: "1.25rem" },
                                    fontWeight: 700,
                                    borderColor: finalSolved
                                      ? "success.main"
                                      : "warning.main",
                                    borderWidth: 2,
                                    bgcolor: finalSolved
                                      ? "rgba(74, 222, 128, 0.18)"
                                      : "rgba(255, 193, 7, 0.12)",
                                    color: finalSolved ? "success.main" : "warning.main",
                                  }}
                                >
                                  {finalSolved
                                    ? room.activeAssociationsBoard!.finalSolution
                                    : "???"}
                                </Paper>
                              </Box>
                            );
                          }

                          const leftCol =
                            row <= 5
                              ? room.activeAssociationsBoard!.columns[0]
                              : room.activeAssociationsBoard!.columns[2];
                          const rightCol =
                            row <= 5
                              ? room.activeAssociationsBoard!.columns[1]
                              : room.activeAssociationsBoard!.columns[3];
                          const indent = cellIndex * ASSOCIATIONS_INDENT_STEP;
                          const isSolutionRow = cellIndex === 4;

                          const renderTile = (col: (typeof leftCol), side: "left" | "right") => {
                            if (isSolutionRow) {
                              return (
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    width: ASSOCIATIONS_BOX_WIDTH,
                                    minHeight: 56,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    p: 0.75,
                                    fontSize: { xs: "0.85rem", sm: "1rem", md: "1.1rem" },
                                    fontWeight: 700,
                                    ml: side === "left" ? `${indent}px` : 0,
                                    mr: side === "right" ? `${indent}px` : 0,
                                    borderColor: col.solved
                                      ? "success.main"
                                      : "rgba(244, 244, 246, 0.16)",
                                    borderWidth: col.solved ? 2 : 1,
                                    bgcolor: col.solved
                                      ? "rgba(74, 222, 128, 0.18)"
                                      : "rgba(244, 244, 246, 0.1)",
                                    color: col.solved ? "success.main" : undefined,
                                  }}
                                >
                                  {col.solved ? col.solution : col.label}
                                </Paper>
                              );
                            }
                            const clue = col.clues[cellIndex];
                            return (
                              <Paper
                                variant="outlined"
                                sx={{
                                  width: ASSOCIATIONS_BOX_WIDTH,
                                  minHeight: 56,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  textAlign: "center",
                                  p: 0.75,
                                  fontSize: { xs: "0.85rem", sm: "1rem", md: "1.1rem" },
                                  ml: side === "left" ? `${indent}px` : 0,
                                  mr: side === "right" ? `${indent}px` : 0,
                                  bgcolor: clue.text
                                    ? "rgba(244, 244, 246, 0.06)"
                                    : "rgba(0,0,0,0.25)",
                                  color: clue.text ? undefined : "text.secondary",
                                }}
                              >
                                {clue.text ?? clue.field}
                              </Paper>
                            );
                          };

                          return (
                            <Box
                              key={row}
                              sx={{ display: "flex", justifyContent: "space-between" }}
                            >
                              {renderTile(leftCol, "left")}
                              {renderTile(rightCol, "right")}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Stack>
                  )}

                {room.phase === "finished" && (
                  <Stack
                    flexGrow={1}
                    alignItems="center"
                    justifyContent="center"
                    spacing={2}
                  >
                    <EmojiEventsIcon sx={{ fontSize: 64 }} color="warning" />
                    <Typography variant="h4">Game Over!</Typography>
                    {sortedPlayers[0] && (
                      <Typography variant="h6" color="text.secondary">
                        🏆 {sortedPlayers[0].name} wins with{" "}
                        {sortedPlayers[0].score} points!
                      </Typography>
                    )}
                  </Stack>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Scoreboard
                </Typography>
                {sortedPlayers.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No players yet.
                  </Typography>
                ) : (
                  <List dense>
                    {sortedPlayers.map((player, index) => (
                      <ListItem key={player.id}>
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor:
                                index === 0 ? "warning.main" : undefined,
                            }}
                          >
                            {index + 1}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={player.name}
                          secondary={`${player.score} pts`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      <Dialog open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)}>
        <DialogTitle>Leave the game?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            A round is currently in progress. Are you sure you want to stop
            watching?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
          <Button color="error" onClick={handleConfirmLeave}>
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
