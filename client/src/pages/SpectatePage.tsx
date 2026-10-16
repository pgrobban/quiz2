import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  EmojiEvents as EmojiEventsIcon,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import { getPlayerColor } from "../lib/playerColors";
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
import SpectatorSidebar, { type SpectatorResult } from "../components/SpectatorSidebar";
import MatchingPreview, { useMatchingPreview } from "../components/MatchingPreview";
import {
  MATH_SCRAMBLE_PER_TILE,
  generateTargetScrambleCandidates,
} from "../lib/mathScramble";
import { resolvePairColor } from "../lib/pairColors";
import { namedColor } from "../lib/pairColors";
import { tileSx, TILE_BACKGROUND, TILE_TEXT, inkOnColor } from "../lib/tileStyles";

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

    let settled = false;
    const cleanup = () => {
      clearTimeout(timeoutId);
      socket.off("connect", emitJoin);
      socket.off("connect_error", onConnectError);
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      setErrorMessage(message);
      setViewState("form");
      socket.disconnect();
    };

    const emitJoin = () => {
      socket.emit("spectator:join-room", { code: trimmedCode }, (response) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (response.ok) {
          setRoom(response.room);
          setQuestion(response.question);
          setCorrectIndex(response.correctIndex);
          setErrorMessage(null);
          setViewState("watching");
        } else {
          setErrorMessage(response.error);
          setViewState("form");
          socket.disconnect();
        }
      });
    };

    // Socket.IO retries automatically in the background (e.g. falling back
    // from websocket to polling on flaky mobile networks), so a single
    // connect_error isn't necessarily fatal - just surface it as a status
    // update, and only give up for real once the overall timeout below
    // elapses with no success at all.
    const onConnectError = () => {
      setErrorMessage("Having trouble connecting - still retrying...");
    };

    // Guard against hanging forever on "Connecting to room..." if the
    // connection (or the server's response) never arrives at all - e.g.
    // flaky mobile network conditions where neither "connect" nor a
    // response ever comes.
    const timeoutId = setTimeout(() => {
      fail("Timed out trying to reach the game server. Please try again.");
    }, 15000);

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once("connect", emitJoin);
      socket.on("connect_error", onConnectError);
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

  const sidebarResults = useMemo<SpectatorResult[]>(() => {
    if (room?.phase !== "reveal") return [];
    if (room.round === "letters" && lettersReveal) {
      return lettersReveal.submissions.map((sub) => ({
        playerId: sub.playerId, points: sub.points,
        text: `${sub.playerName}: ${sub.word} ${sub.valid ? `(+${sub.points})` : "(invalid)"}`,
      }));
    }
    if (room.round === "matching" && matchingRevealed) {
      return matchingRevealed.results.map((result) => ({
        playerId: result.playerId, points: result.points,
        text: `${result.playerName}: ${result.correctCount}/${room.activeMatchingBoard?.left.length} (+${result.points})`,
      }));
    }
    if (room.round === "math" && mathRevealed) {
      return mathRevealed.submissions.map((sub) => ({
        playerId: sub.playerId, points: sub.points,
        text: sub.value !== null
          ? `${sub.playerName}: ${sub.expression} = ${sub.value} (+${sub.points})`
          : `${sub.playerName}: ${sub.expression} (invalid)`,
      }));
    }
    return [];
  }, [room?.phase, room?.round, room?.activeMatchingBoard?.left.length,
    lettersReveal, matchingRevealed, mathRevealed]);

  // A scannable shortcut straight to /join with the room code prefilled, so
  // players don't have to type the 4-digit code in by hand.
  const joinUrl = room
    ? `${window.location.origin}/join?code=${room.code}`
    : "";

  const showMatchingPreview = useMatchingPreview(room);
  if (showMatchingPreview && room?.activeMatchingBoard) {
    return <MatchingPreview title={room.activeMatchingBoard.title} />;
  }

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
                  label="Room code"
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
            {errorMessage && (
              <Typography color="warning.main" variant="body2" textAlign="center">
                {errorMessage}
              </Typography>
            )}
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
                        label={`You took the words out of my mouth · Round ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                  {room.round === "matching" &&
                    room.phase !== "lobby" &&
                    room.phase !== "finished" && (
                      <Chip
                        label={`Will you be my match? · Board ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                  {room.round === "math" &&
                    room.phase !== "lobby" &&
                    room.phase !== "finished" && (
                      <Chip
                        label={`Let me give you my number · Round ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                  {room.round === "associations" &&
                    room.phase !== "lobby" &&
                    room.phase !== "finished" && (
                      <Chip
                        label={`Do we have a connection? · Board ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                </Stack>

                {room.phase === "lobby" && !room.gameStarted && (
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
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: "inline-flex",
                        borderRadius: 3,
                        bgcolor: "#fff",
                      }}
                    >
                      <QRCodeSVG value={joinUrl} size={320} marginSize={2} />
                    </Paper>
                    <Typography color="text.secondary" variant="body2">
                      Scan to join - or go to /join and enter code{" "}
                      <strong>{room.code}</strong>
                    </Typography>
                  </Stack>
                )}

                {room.phase === "lobby" && room.gameStarted && (
                  <Stack
                    flexGrow={1}
                    alignItems="center"
                    justifyContent="center"
                    spacing={2}
                  >
                    <Typography variant="h4">
                      Waiting for host to pick a round/questions
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
                          // Let the video keep its own aspect ratio instead
                          // of being forced to a fixed width - portrait
                          // clips (recorded on a phone) need height to be
                          // the dominant constraint, or they render tiny
                          // and letterboxed inside an oversized wide box.
                          width: "auto",
                          height: "auto",
                          maxWidth: "100%",
                          maxHeight: "75vh",
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
                          width: "auto",
                          height: "auto",
                          maxWidth: "100%",
                          maxHeight: "75vh",
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
                                  bgcolor: isCorrect ? "#4ade80" : TILE_BACKGROUND,
                                  color: TILE_TEXT,
                                  fontWeight: 700,
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
                                    bgcolor: pairIndex !== -1 ? namedColor(rightText ?? "") ?? TILE_BACKGROUND : TILE_BACKGROUND,
                                    color: inkOnColor(pairIndex !== -1 ? namedColor(rightText ?? "") ?? TILE_BACKGROUND : TILE_BACKGROUND),
                                    fontWeight: 700,
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
                                    bgcolor: pairIndex !== -1 ? namedColor(item.text) ?? TILE_BACKGROUND : TILE_BACKGROUND,
                                    color: inkOnColor(pairIndex !== -1 ? namedColor(item.text) ?? TILE_BACKGROUND : TILE_BACKGROUND),
                                    fontWeight: 700,
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
                        </Stack>
                      )}
                    </Stack>
                  )}

                {(room.phase === "question" || room.phase === "reveal") &&
                  room.round === "associations" &&
                  room.activeAssociationsBoard && (() => {
                    const finalists = room.associationsTurn?.finalists ?? [];
                    return (
                    <Stack flexGrow={1} justifyContent="center" spacing={2}>
                      <Typography variant="h4" textAlign="center">
                        {room.activeAssociationsBoard.title}
                      </Typography>

                      {finalists.length === 2 && (
                        <Stack direction="row" justifyContent="center" spacing={2}>
                          {finalists.map((p) => (
                            <Chip
                              key={p.id}
                              label={p.name}
                              sx={{
                                bgcolor: getPlayerColor(finalists, p.id),
                                color: "#000",
                                fontWeight: 700,
                              }}
                            />
                          ))}
                        </Stack>
                      )}

                      {room.associationsTurn && room.phase === "question" && (
                        <Typography
                          textAlign="center"
                          variant="h6"
                          sx={{
                            color: getPlayerColor(
                              finalists,
                              room.associationsTurn.activePlayerId,
                            ),
                          }}
                        >
                          {finalists.find(
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
                            const solverColor = getPlayerColor(
                              finalists,
                              room.activeAssociationsBoard!.finalSolvedBy,
                            );
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
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    p: 1,
                                    fontSize: { xs: "0.95rem", sm: "1.1rem", md: "1.25rem" },
                                    fontWeight: 700,
                                    borderColor: finalSolved
                                      ? (solverColor ?? "success.main")
                                      : "warning.main",
                                    borderWidth: 2,
                                    bgcolor: finalSolved
                                      ? (solverColor ?? TILE_BACKGROUND)
                                      : TILE_BACKGROUND,
                                    color: finalSolved
                                      ? inkOnColor(solverColor ?? TILE_BACKGROUND)
                                      : TILE_TEXT,
                                  }}
                                >
                                  {finalSolved
                                    ? room.activeAssociationsBoard!.finalSolution
                                    : "???"}
                                  {finalSolved && room.activeAssociationsBoard!.finalSolvedBy && (
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "inherit", fontWeight: 700 }}
                                    >
                                      solved by{" "}
                                      {finalists.find(
                                        (p) => p.id === room.activeAssociationsBoard!.finalSolvedBy
                                      )?.name}
                                    </Typography>
                                  )}
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
                              const solverColor = getPlayerColor(finalists, col.solvedBy);
                              return (
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    width: ASSOCIATIONS_BOX_WIDTH,
                                    minHeight: 56,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    p: 0.75,
                                    fontSize: { xs: "0.85rem", sm: "1rem", md: "1.1rem" },
                                    fontWeight: 700,
                                    ml: side === "left" ? `${indent}px` : 0,
                                    mr: side === "right" ? `${indent}px` : 0,
                                    borderColor: col.solved
                                      ? (solverColor ?? "success.main")
                                      : "rgba(244, 244, 246, 0.16)",
                                    borderWidth: col.solved ? 2 : 1,
                                    bgcolor: col.solved
                                      ? (solverColor ?? TILE_BACKGROUND)
                                      : TILE_BACKGROUND,
                                    color: inkOnColor(col.solved ? solverColor ?? TILE_BACKGROUND : TILE_BACKGROUND),
                                  }}
                                >
                                  {col.solved ? col.solution : col.label}
                                  {col.solved && col.solvedBy && (
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "inherit", fontWeight: 700 }}
                                    >
                                      {finalists.find((p) => p.id === col.solvedBy)?.name}
                                    </Typography>
                                  )}
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
                                  ...tileSx,
                                  ...(col.solved && getPlayerColor(finalists, col.solvedBy) && {
                                    bgcolor: getPlayerColor(finalists, col.solvedBy),
                                    color: inkOnColor(getPlayerColor(finalists, col.solvedBy)!),
                                  }),
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
                    );
                  })()}

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
              <SpectatorSidebar players={sortedPlayers} results={sidebarResults}
                resultKey={`${room.code}-${room.round}-${room.currentQuestionIndex}`} />
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
