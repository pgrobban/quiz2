import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import type { Player, Question, RoomState } from "../../../shared/types";
import { socket } from "../lib/socket";

type ViewState =
  | "form"
  | "joining"
  | "lobby"
  | "introduction"
  | "question"
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

  useEffect(() => {
    function onRoomUpdate(updatedRoom: RoomState) {
      setRoom(updatedRoom);
      if (updatedRoom.phase === "lobby") {
        setQuestion(null);
        setSelectedIndex(null);
        setWasCorrect(null);
        setCorrectIndex(null);
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
      setViewState("question");
    }

    function onReveal(payload: { correctIndex: number }) {
      setCorrectIndex(payload.correctIndex);
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
    socket.on("game:finished", onFinished);
    socket.on("room:closed", onRoomClosed);

    return () => {
      socket.off("room:update", onRoomUpdate);
      socket.off("game:question", onQuestion);
      socket.off("game:reveal", onReveal);
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
    if (!room || selectedIndex !== null) return;
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
                      disabled={selectedIndex !== null}
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
