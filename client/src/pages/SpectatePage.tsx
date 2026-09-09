import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import type {
  LetterSubmission,
  Player,
  Question,
  RoomState,
} from "../../../shared/types";
import { socket } from "../lib/socket";
import LetterReveal from "../components/LetterReveal";
import CountdownBar from "../components/CountdownBar";

type ViewState = "form" | "joining" | "watching";

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

  useEffect(() => {
    function onRoomUpdate(updatedRoom: RoomState) {
      setRoom(updatedRoom);
      if (updatedRoom.phase === "lobby") {
        setQuestion(null);
        setCorrectIndex(null);
        setLettersReveal(null);
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
    socket.on("game:finished", onFinished);
    socket.on("room:closed", onRoomClosed);

    return () => {
      socket.off("room:update", onRoomUpdate);
      socket.off("game:question", onQuestion);
      socket.off("game:reveal", onReveal);
      socket.off("letters:revealed", onLettersRevealed);
      socket.off("game:finished", onFinished);
      socket.off("room:closed", onRoomClosed);
    };
  }, []);

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

  const handleLeave = () => {
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
                    room.round !== "letters" && (
                      <Chip
                        label={`Question ${room.currentQuestionIndex + 1} / ${room.totalQuestions}`}
                        color="secondary"
                      />
                    )}
                  {room.round === "letters" &&
                    room.phase !== "lobby" &&
                    room.phase !== "finished" && (
                      <Chip label="Letters Round" color="secondary" />
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
                    <Box
                      component="img"
                      src={room.roundInfo.tutorial.url}
                      alt={`${room.roundInfo.title} tutorial`}
                      sx={{ maxWidth: "100%", maxHeight: 260, borderRadius: 2 }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <Typography color="text.secondary" variant="body2">
                      Get ready - questions start shortly!
                    </Typography>
                  </Stack>
                )}

                {(room.phase === "question" || room.phase === "reveal") &&
                  room.round !== "letters" &&
                  question && (
                    <Stack flexGrow={1} justifyContent="center" spacing={3}>
                      {room.phaseDeadline !== null && (
                        <Box sx={{ maxWidth: 480, mx: "auto", width: "100%" }}>
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
                        <Box sx={{ maxWidth: 480, mx: "auto", width: "100%" }}>
                          <CountdownBar deadline={room.phaseDeadline} totalSeconds={60} />
                        </Box>
                      )}
                      <Box sx={{ py: 2 }}>
                        <LetterReveal letters={room.activeLetters} tileSize={56} />
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
                                  label={`${sub.playerName}: ${sub.word} ${
                                    sub.valid ? `(+${sub.points})` : "(invalid)"
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
    </Container>
  );
}
