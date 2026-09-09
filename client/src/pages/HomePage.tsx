import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import {
  CastForEducation as CastForEducationIcon,
  Smartphone as SmartphoneIcon,
  Tv as TvIcon,
} from "@mui/icons-material";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 4,
        }}
      >
        <Typography variant="h3">Another Robban Quiz Game</Typography>
        <Typography variant="body1" color="text.secondary">
          Click on an option below to start
        </Typography>

        <Stack spacing={2} sx={{ width: "100%", maxWidth: 320 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<SmartphoneIcon />}
            onClick={() => navigate("/join")}
          >
            Join Game
          </Button>
          <Button
            variant="outlined"
            size="large"
            color="secondary"
            startIcon={<CastForEducationIcon />}
            onClick={() => navigate("/host")}
          >
            Host Game
          </Button>
          <Button
            variant="outlined"
            size="large"
            color="secondary"
            startIcon={<TvIcon />}
            onClick={() => navigate("/spectate")}
          >
            Spectate
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}

