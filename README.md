# Another Robban Quiz Game (working title)

A real-time quiz-night app with a host (technician) dashboard, phone-based player controls,
and a spectator screen for TVs. Built with TypeScript, Express, Socket.IO,
React, Vite, and Material UI. The game rounds are based off the Serbian TV game
show "TV Slagalica", which has two players playing head-to-head. New episodes
can be watched
[on the official Youtube channel](https://www.youtube.com/@SlagalicaRTS/videos).
This version does not implement some of rounds such as Skočko (Mastermind).

While the original TV show is always played with 2 people, this version allows
up to **8 players** to join each room. The associations finale is played by the
**top two scoring players** using spoken answers judged by the host. Refer to the
[Rounds and scoring](#rounds) section for more gameplay details.

## Getting started

Install dependencies from the repository root (npm workspaces):

```powershell
npm install
```

Run these in separate terminals:

```powershell
npm run dev:server
```

```powershell
npm run dev:client
```

The server defaults to port **4000** and the client to **5173**. Check Vite's
terminal output: it may choose another port if 5173 is occupied.

| View | Local URL | Purpose |
| --- | --- | --- |
| Home | `http://localhost:5173/` | Choose a view |
| Host | `http://localhost:5173/host` | Create a room and control play |
| Player | `http://localhost:5173/join` | Enter a room code and player name |
| Spectator | `http://localhost:5173/spectate` | Enter a room code to watch |

## Playing over the local network

Keep both servers running on the serving computer. The host dashboard and
spectator screen can run on other devices; they do not have to run on the
computer serving the app.

Use the serving computer's **LAN IP**, not `localhost`, on other devices.
For example, if its address is `192.168.11.75`:

```text
Host:      http://192.168.11.75:5173/host
Players:   http://192.168.11.75:5173/join
Spectator: http://192.168.11.75:5173/spectate
```

Use Vite's printed Network URL to confirm the current IP. Devices need network
access to that computer; guest Wi-Fi or client isolation can prevent this.

By default, Socket.IO uses the page's origin and Vite proxies `/socket.io` to
`http://localhost:4000`. Only port 5173 needs to be reachable by players in
this setup. If connecting directly to the backend instead, start the client
with this variable in the **same PowerShell terminal**:

```powershell
$env:VITE_SERVER_URL="http://192.168.11.75:4000"
npm run dev:client
```

Direct connections also require port 4000 to be reachable. Never set the
client's server URL to `http://localhost:4000` for remote players: that points
to each player's own device.

To return to same-origin/proxy connections, remove the shell override and any
`VITE_SERVER_URL` entry in client environment files, then restart Vite:

```powershell
Remove-Item Env:VITE_SERVER_URL -ErrorAction SilentlyContinue
npm run dev:client
```

### Windows Firewall

If needed, allow the client port from the local network in an **Administrator
PowerShell** window:

```powershell
New-NetFirewallRule -DisplayName "Quiz Night - Client (5173)" -Direction Inbound -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet -Action Allow -Profile Any
```

For direct backend connections, add the same rule for port 4000:

```powershell
New-NetFirewallRule -DisplayName "Quiz Night - Server (4000)" -Direction Inbound -Protocol TCP -LocalPort 4000 -RemoteAddress LocalSubnet -Action Allow -Profile Any
```

### Connection troubleshooting

- Confirm both dev servers are running and check their actual ports.
- On the affected device, try `http://192.168.11.75:4000/health`; it should
  return `{"ok":true}` (substitute the current LAN IP).
- Check the running client's `VITE_SERVER_URL` if the page loads but joining
  times out. Restart Vite after changing environment variables.
- Reload the page after updating the app. If a phone retains an old page,
  fully close and reopen its browser.
- Keep the serving computer awake and connected. Locking its screen normally
  leaves the servers running; signing out or restarting stops them.

## Running a session

1. Open `/host` to create a room and obtain its four-digit code.
2. Open `/spectate` on the TVs and enter that code.
3. Players join through `/join`. The initial spectator lobby displays a QR
   code linking to `/join?code=1234`, with the room code prefilled and the name
   field focused.
4. The host chooses a round, selects questions/boards (or a round count for
   letters/maths), shows the tutorial, then starts play.
5. The host reveals answers and advances through the selection. **Change
   Round** clears the current selection on the server.
6. Between rounds, players see their current score and position; spectators
   see the leaderboard and a waiting message. The host selects the next round.
7. Use **Finish Game** to display the final standings.

New players cannot join once the first round has started, including between
rounds. Returning players with a saved session can resume their existing place.
The QR code is hidden for the rest of the session.

Tutorials are grouped separately in the host picker. Regular selections have
dividers every 10 quiz questions, 3 matching boards, or 2 associations boards.

<a id="rounds"></a>
## Rounds and scoring

| Round | Gameplay | Scoring |
| --- | --- | --- |
| **Should I know this?** | Multiple-choice quiz; selecting an option locks it in | 1 point per correct answer; +2 for getting every selected question correct |
| **You took the words out of my mouth** | Build a word from 12 letters and lock it in | Valid words under 8 letters: their length; 8/9/10/11 letters: 8/10/12/14 points; 12 letters: 20 points |
| **Let me give you my number** | Combine supplied numbers with arithmetic and lock in an expression | Exact target: 15; difference ≤5: 10; difference ≤10: 5; otherwise 0 |
| **Will you be my match?** | Match the two columns; pairs remain editable until submission | 1 per correct pair; +2 for a perfect board (12 maximum for 10 pairs) |
| **Do we have a connection?** | Top-two, host-mediated associations wall | 5 per column; 10 for the final connection, plus 5 for each column still unsolved when the final is guessed |

Invalid words score zero. Word generation checks for a constructible dictionary
word of at least 10 letters before the reveal animation, with a bounded retry
limit. Maths targets range from **300–999** and exclude exact solutions using
only two supplied tiles and one operation. Numbers cannot be reused beyond
their supplied counts, and intermediate arithmetic must stay positive and
whole, with exact division.

Letters and maths answer countdowns start after their reveal animations.
Matching shows a **three-second title-only preview** before its 90-second
answer window. Incorrect matching pairs are marked red after reveal, with a
correction displayed in the right column.

### Associations finale

- The top two players are selected when the round starts; their existing
  scores carry forward.
- The lower-scoring finalist starts board 1, then starters alternate.
- Correct guesses keep control. An incorrect guess gives the opponent a
  guess-only opportunity; another failure returns control to the opener.
- Solving a column reveals its remaining clues.
- Solving the final reveals the entire board, awards any remaining column
  points to the solver, and automatically enters the reveal phase.
- Solved tiles use the solver's colour. Manual host reveals award no points
  for unsolved answers.
- Players answer aloud; phone input is not required for this round.

## Timers and reconnection

Countdowns use **synchronized server time**, rather than trusting device wall
clocks. Clients sample server time with network-delay compensation on connect,
every 30 seconds, and when returning to the foreground. Timing then uses a
monotonic clock to avoid device clock adjustments shifting the countdown.
The server remains authoritative for answer deadlines.

Temporary connection loss does not remove players or their scores. Socket.IO
can recover a surviving page's connection and missed events within **10
minutes**. Views show a connection-status banner and attempt reconnection on
wake/network return.

Player joins also save a private session token in the browser's `sessionStorage`.
If a phone reloads the page after sleeping, the same tab can reclaim the
existing player without joining as a new participant. This does not survive
clearing the tab's saved session or restarting the backend. Unsaved, local
answer drafts should not be assumed to survive a full page reload.

Explicitly leaving clears the player's saved session and removes them.
A deliberate host departure closes the room; an unexpected host disconnect
keeps it available for up to 10 minutes for connection recovery. Host-page
reloads are not covered by the player's saved-session mechanism.

## Questions and tutorial media

- Edit `server/src/questions.ts` for quiz questions, matching boards,
  associations boards, round names, descriptions, and tutorial URLs.
- Quiz `correctIndex` values are **zero-based**.
- Keep IDs unique and matching answers unambiguous. Identical answer text
  with different IDs is still scored as separate items.
- Store static media under `client/public/tutorials/` and reference it as
  `/tutorials/filename.mp4` or `/tutorials/filename.png`.
- Tutorial metadata supports `type: "image"` (including GIFs) and
  `type: "video"`. Videos autoplay muted, play once, and have controls on the
  spectator screen.
- The dictionary used for validating words lives in `server/src/data/words.txt`.
- The shared player limit is `MAX_PLAYERS_PER_ROOM` in `shared/types.ts`.

## Optional tunnel access

For access outside the LAN, tunnel the **Vite client port**, which also proxies
Socket.IO. Start the server normally, then in the client terminal:

```powershell
Remove-Item Env:VITE_SERVER_URL -ErrorAction SilentlyContinue
$env:TUNNEL_HOST="arqg.loca.lt"
npm run dev:client
```

In another terminal:

```powershell
npx localtunnel --port 5173 --subdomain arqg
```

Use the URL actually printed by localtunnel; requested subdomains may be
unavailable. Set `TUNNEL_HOST` to that hostname (without `https://`) and restart
the client if it differs. Ensure client environment files do not override the
socket URL with a LAN or localhost address when using a tunnel. Localtunnel
may show visitors an access/interstitial page before the app loads.

## Environment variables

| Variable | Used by | Default / purpose |
| --- | --- | --- |
| `PORT` | Server | `4000` |
| `HOST` | Server | `0.0.0.0` (accept LAN connections) |
| `CLIENT_ORIGIN` | Server | Optional exact allowed origin; overrides the built-in localhost, private-network and tunnel-origin checks |
| `VITE_SERVER_URL` | Client | Current page origin, unless overridden; Vite's dev proxy forwards sockets to port 4000 |
| `TUNNEL_HOST` | Vite config | Optional public hostname for HTTPS tunnel hot-reload connections |

Server environment variables can be set in the shell before starting the
server. Client environment variables can also be supplied through Vite's
environment files. Restart the relevant process after changing configuration.

## Project structure

```text
shared/                  Socket.IO contracts, game state types, player limit
server/src/index.ts      HTTP server, socket handlers, connection recovery
server/src/roomManager.ts Game state, turn handling, scoring
server/src/questions.ts Question/board banks and round metadata
server/src/letters.ts    Dictionary validation and letter generation
server/src/math.ts       Number generation, evaluation and solver
client/src/pages/       Host, player, spectator and home views
client/src/components/  Shared UI, timers, previews and scoreboard animations
client/public/tutorials/ Static tutorial media
```

Rooms and scores are held **in memory**. Restarting the backend clears all games.

## Type-checking and building

```powershell
npm run typecheck
npm run build
```

You can run individual workspaces with `--workspace server` or
`--workspace client`. To start the compiled backend:

```powershell
npm run start --workspace server
```

The client build is written to `client/dist`. Vite's `preview` command serves
the built frontend on port 4173 but does not configure the dev Socket.IO proxy;
set `VITE_SERVER_URL` **before building** for a separate reachable backend, or
serve the frontend behind a reverse proxy that also routes `/socket.io` to the
backend.
