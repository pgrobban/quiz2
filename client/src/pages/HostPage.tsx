import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  SkipNext as SkipNextIcon,
  Movie as MovieIcon,
  Flag as FlagIcon,
  StopCircle as StopCircleIcon,
} from "@mui/icons-material";
import type {
  GameRound,
  LetterSubmission,
  Question,
  QuestionBankItem,
  RoomState,
} from "../../../shared/types";
import { socket } from "../lib/socket";
import LetterReveal from "../components/LetterReveal";
import CountdownBar from "../components/CountdownBar";

type ConnectionState = "connecting" | "ready" | "error";

const ROUND_OPTIONS: { id: GameRound; label: string }[] = [
  { id: "quiz", label: "Standard Quiz" },
  { id: "letters", label: "Letters Round" },
  { id: "matching", label: "Matching Round" },
  { id: "math", label: "Math Round" },
  { id: "associations", label: "Associations Round" },
];

export default function HostPage() {
  const navigate = useNavigate();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);

  // Letters round state.
  const [activeLetters, setActiveLetters] = useState<string[] | null>(null);
  const [lettersRevealed, setLettersRevealed] = useState<{
    submissions: LetterSubmission[];
    topWords: string[];
  } | null>(null);

  // Round/question selection (host-only, not part of shared room state).
  const [availableQuestions, setAvailableQuestions] = useState<
    QuestionBankItem[] | null
  >(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    socket.connect();

    function onConnect() {
      socket.emit("host:create-room", (response) => {
        if (response.ok) {
          setRoom(response.room);
          setConnectionState("ready");
        } else {
          setErrorMessage(response.error);
          setConnectionState("error");
        }
      });
    }

    function onRoomUpdate(updatedRoom: RoomState) {
      setRoom(updatedRoom);
    }

    function onQuestion(payload: { question: Question }) {
      setQuestion(payload.question);
      setCorrectIndex(null);
    }

    function onReveal(payload: { correctIndex: number }) {
      setCorrectIndex(payload.correctIndex);
    }

    function onLettersStarted(payload: { letters: string[] }) {
      setActiveLetters(payload.letters);
      setLettersRevealed(null);
    }

    function onLettersRevealed(payload: {
      submissions: LetterSubmission[];
      topWords: string[];
    }) {
      setLettersRevealed(payload);
    }

    function onRoundEnded() {
      setQuestion(null);
      setCorrectIndex(null);
      setActiveLetters(null);
      setLettersRevealed(null);
      setAvailableQuestions(null);
      setSelectedQuestionIds([]);
    }

    function onConnectError() {
      setErrorMessage("Could not connect to the game server.");
      setConnectionState("error");
    }

    socket.on("connect", onConnect);
    socket.on("room:update", onRoomUpdate);
    socket.on("game:question", onQuestion);
    socket.on("game:reveal", onReveal);
    socket.on("letters:started", onLettersStarted);
    socket.on("letters:revealed", onLettersRevealed);
    socket.on("game:round-ended", onRoundEnded);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:update", onRoomUpdate);
      socket.off("game:question", onQuestion);
      socket.off("game:reveal", onReveal);
      socket.off("letters:started", onLettersStarted);
      socket.off("letters:revealed", onLettersRevealed);
      socket.off("game:round-ended", onRoundEnded);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, []);

  const handleSelectRound = (round: GameRound) => {
    if (!room) return;
    socket.emit("host:select-round", { code: room.code, round }, (response) => {
      if (response.ok) {
        setRoom(response.room);
        setAvailableQuestions(response.availableQuestions);
        setSelectedQuestionIds(response.availableQuestions.map((q) => q.id));
      } else {
        setErrorMessage(response.error);
      }
    });
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const handleConfirmQuestions = () => {
    if (!room) return;
    socket.emit(
      "host:select-question",
      { code: room.code, questionIds: selectedQuestionIds },
      (response) => {
        if (response.ok) {
          setRoom(response.room);
        } else {
          setErrorMessage(response.error);
        }
      }
    );
  };

  const handleChangeRound = () => {
    setAvailableQuestions(null);
    setSelectedQuestionIds([]);
    if (room) setRoom({ ...room, round: null, roundInfo: null, totalQuestions: 0 });
  };

  const handleShowTutorial = () => {
    if (!room) return;
    socket.emit("host:show-tutorial", { code: room.code }, (response) => {
      if (!response.ok) setErrorMessage(response.error);
    });
  };

  const handleStartQuestions = () => {
    if (!room) return;
    socket.emit("host:start-question", { code: room.code });
  };

  const handleRevealAnswer = () => {
    if (!room) return;
    socket.emit("host:reveal-answer", { code: room.code });
  };

  const handleNextQuestion = () => {
    if (!room) return;
    socket.emit("host:next-question", { code: room.code });
  };

  const handleEndRound = () => {
    if (!room) return;
    socket.emit("host:end-round", { code: room.code });
  };

  const handleFinishGame = () => {
    if (!room) return;
    socket.emit("host:finish-game", { code: room.code });
  };

  const handleLeave = () => {
    navigate("/");
  };

  const sortedPlayers = room
    ? [...room.players].sort((a, b) => b.score - a.score)
    : [];

  const isLastQuestion =
    !!room && room.currentQuestionIndex >= room.totalQuestions - 1;

  const roundChosenButNoQuestions =
    !!room && room.phase === "lobby" && !!room.round && room.totalQuestions === 0;
  const readyToPlay =
    !!room && room.phase === "lobby" && !!room.round && room.totalQuestions > 0;

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

        {connectionState === "connecting" && (
          <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
            <CircularProgress />
            <Typography>Setting up your game room...</Typography>
          </Stack>
        )}

        {connectionState === "error" && (
          <Alert severity="error">{errorMessage}</Alert>
        )}

        {connectionState === "ready" && room && (
          <>
            <Paper
              elevation={3}
              sx={{ p: 3, textAlign: "center", borderRadius: 3 }}
            >
              <Typography variant="body2" color="text.secondary">
                Room Code
              </Typography>
              <Typography
                variant="h3"
                sx={{ letterSpacing: 8, fontFamily: "monospace" }}
              >
                {room.code}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Players join at /join · Audience spectates at /spectate
              </Typography>
            </Paper>

            {errorMessage && (
              <Alert severity="error" onClose={() => setErrorMessage(null)}>
                {errorMessage}
              </Alert>
            )}

            {room.phase === "lobby" && (
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="h6">Players</Typography>
                  <Chip label={`${room.players.length} / 4`} color="primary" />
                </Stack>

                {room.players.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Waiting for players to join...
                  </Typography>
                ) : (
                  <List dense>
                    {room.players.map((player) => (
                      <ListItem key={player.id}>
                        <ListItemAvatar>
                          <Avatar>{player.name.charAt(0).toUpperCase()}</Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={player.name} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            )}

            {room.phase === "lobby" && !room.round && (
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Choose a Round
                </Typography>
                <Grid container spacing={1.5}>
                  {ROUND_OPTIONS.map((option) => (
                    <Grid item xs={6} key={option.id}>
                      <Card variant="outlined">
                        <CardActionArea onClick={() => handleSelectRound(option.id)}>
                          <CardContent sx={{ textAlign: "center", py: 3 }}>
                            <Typography variant="subtitle1">
                              {option.label}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {roundChosenButNoQuestions && availableQuestions && (
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="h6">
                    {room.roundInfo?.title}: Pick Questions
                  </Typography>
                  <Button size="small" onClick={handleChangeRound}>
                    Change Round
                  </Button>
                </Stack>
                <List dense>
                  {availableQuestions.map((q) => (
                    <ListItem key={q.id} disablePadding>
                      <FormControlLabel
                        sx={{ px: 1, width: "100%" }}
                        control={
                          <Checkbox
                            checked={selectedQuestionIds.includes(q.id)}
                            onChange={() => toggleQuestion(q.id)}
                          />
                        }
                        label={q.text}
                      />
                    </ListItem>
                  ))}
                </List>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={selectedQuestionIds.length === 0}
                  onClick={handleConfirmQuestions}
                  sx={{ mt: 1 }}
                >
                  Confirm {selectedQuestionIds.length} Question
                  {selectedQuestionIds.length === 1 ? "" : "s"}
                </Button>
              </Paper>
            )}

            {readyToPlay && (
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3, textAlign: "center" }}>
                <Typography variant="h6">{room.roundInfo?.title}</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {room.totalQuestions} question
                  {room.totalQuestions === 1 ? "" : "s"} selected
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Button size="small" onClick={handleChangeRound}>
                    Change Round
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<MovieIcon />}
                    onClick={handleShowTutorial}
                  >
                    Show Tutorial
                  </Button>
                </Stack>
              </Paper>
            )}

            {room.phase === "introduction" && room.roundInfo && (
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3, textAlign: "center" }}>
                <Typography variant="h5">{room.roundInfo.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  {room.roundInfo.description}
                </Typography>
                <Box
                  component="img"
                  src={room.roundInfo.tutorial.url}
                  alt={`${room.roundInfo.title} tutorial`}
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    bgcolor: "background.default",
                    mb: 2,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStartQuestions}
                >
                  Start Questions
                </Button>
              </Paper>
            )}

            {(room.phase === "question" || room.phase === "reveal") &&
              question && (
                <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      {room.roundInfo?.title} · Question{" "}
                      {room.currentQuestionIndex + 1} of {room.totalQuestions}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${room.answeredCount} / ${room.players.length} answered`}
                    />
                  </Stack>
                  {room.phaseDeadline !== null && (
                    <Box sx={{ mb: 2 }}>
                      <CountdownBar deadline={room.phaseDeadline} totalSeconds={15} />
                    </Box>
                  )}
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {question.text}
                  </Typography>
                  <Stack spacing={1}>
                    {question.options.map((option, index) => {
                      const isCorrect =
                        correctIndex !== null && index === correctIndex;
                      return (
                        <Paper
                          key={index}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: isCorrect
                              ? "rgba(74, 222, 128, 0.18)"
                              : "rgba(244, 244, 246, 0.04)",
                            borderColor: isCorrect
                              ? "success.main"
                              : "rgba(244, 244, 246, 0.16)",
                            borderWidth: isCorrect ? 2 : 1,
                          }}
                        >
                          {option}
                        </Paper>
                      );
                    })}
                  </Stack>
                </Paper>
              )}

            {(room.phase === "question" || room.phase === "reveal") &&
              room.round === "letters" &&
              activeLetters && (
                <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Letters Round
                    </Typography>
                    <Chip
                      size="small"
                      label={`${room.answeredCount} / ${room.players.length} locked in`}
                    />
                  </Stack>

                  {room.phaseDeadline !== null && (
                    <Box sx={{ mb: 2 }}>
                      <CountdownBar deadline={room.phaseDeadline} totalSeconds={60} />
                    </Box>
                  )}

                  <Box sx={{ py: 2 }}>
                    <LetterReveal letters={activeLetters} />
                  </Box>

                  {lettersRevealed && (
                    <>
                      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                        Player Words
                      </Typography>
                      {lettersRevealed.submissions.length === 0 ? (
                        <Typography color="text.secondary">
                          No one locked in a word.
                        </Typography>
                      ) : (
                        <List dense>
                          {lettersRevealed.submissions.map((sub) => (
                            <ListItem key={sub.playerId}>
                              <ListItemText
                                primary={`${sub.playerName}: ${sub.word}`}
                                secondary={
                                  sub.valid
                                    ? `Valid - +${sub.points} pts`
                                    : "Not a valid word"
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}

                      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                        Best Possible Words
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {lettersRevealed.topWords.map((word) => (
                          <Chip key={word} label={word.toUpperCase()} color="success" />
                        ))}
                      </Stack>
                    </>
                  )}
                </Paper>
              )}

            {room.phase === "finished" && (
              <Paper elevation={1} sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
                <Typography variant="h5">Game Over!</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Final scores below
                </Typography>
              </Paper>
            )}

            {room.phase !== "lobby" && (
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Scoreboard
                </Typography>
                <List dense>
                  {sortedPlayers.map((player, index) => (
                    <ListItem key={player.id}>
                      <ListItemAvatar>
                        <Avatar>{index + 1}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={player.name}
                        secondary={`${player.score} pts`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {room.phase === "question" && (
              <Button
                variant="contained"
                size="large"
                startIcon={<VisibilityIcon />}
                onClick={handleRevealAnswer}
              >
                Reveal Answer
              </Button>
            )}

            {room.phase === "reveal" && (
              <Button
                variant="contained"
                size="large"
                startIcon={<SkipNextIcon />}
                onClick={handleNextQuestion}
              >
                {isLastQuestion ? "End Round" : "Next Question"}
              </Button>
            )}

            {(room.phase === "question" || room.phase === "reveal") && (
              <Button
                variant="text"
                color="warning"
                startIcon={<StopCircleIcon />}
                onClick={handleEndRound}
              >
                End Round Early
              </Button>
            )}

            {room.phase === "lobby" && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FlagIcon />}
                onClick={handleFinishGame}
              >
                Finish Game
              </Button>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}
