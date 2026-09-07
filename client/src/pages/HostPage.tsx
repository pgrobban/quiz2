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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import type { Question, RoomState } from "../../../shared/types";
import { socket } from "../lib/socket";

type ConnectionState = "connecting" | "ready" | "error";

export default function HostPage() {
  const navigate = useNavigate();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);

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

    function onConnectError() {
      setErrorMessage("Could not connect to the game server.");
      setConnectionState("error");
    }

    socket.on("connect", onConnect);
    socket.on("room:update", onRoomUpdate);
    socket.on("game:question", onQuestion);
    socket.on("game:reveal", onReveal);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:update", onRoomUpdate);
      socket.off("game:question", onQuestion);
      socket.off("game:reveal", onReveal);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, []);

  const handleStartGame = () => {
    if (!room) return;
    socket.emit("host:start-game", { code: room.code });
  };

  const handleRevealAnswer = () => {
    if (!room) return;
    socket.emit("host:reveal-answer", { code: room.code });
  };

  const handleNextQuestion = () => {
    if (!room) return;
    socket.emit("host:next-question", { code: room.code });
  };

  const handleLeave = () => {
    navigate("/");
  };

  const sortedPlayers = room
    ? [...room.players].sort((a, b) => b.score - a.score)
    : [];

  const isLastQuestion =
    !!room && room.currentQuestionIndex >= room.totalQuestions - 1;

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
                      Question {room.currentQuestionIndex + 1} of{" "}
                      {room.totalQuestions}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${room.answeredCount} / ${room.players.length} answered`}
                    />
                  </Stack>
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
                            borderColor: isCorrect ? "success.main" : undefined,
                            bgcolor: isCorrect
                              ? "rgba(76, 175, 80, 0.15)"
                              : undefined,
                          }}
                        >
                          {option}
                        </Paper>
                      );
                    })}
                  </Stack>
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

            {room.phase === "lobby" && (
              <Button
                variant="contained"
                size="large"
                startIcon={<PlayArrowIcon />}
                disabled={room.players.length === 0}
                onClick={handleStartGame}
              >
                Start Game
              </Button>
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
                {isLastQuestion ? "Show Final Results" : "Next Question"}
              </Button>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}
