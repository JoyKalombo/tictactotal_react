# Tic Tac Total

A React number-based noughts-and-crosses game for two people. Play online from separate devices with a six-character room code or invite link, pass and play on the same device, or play solo against the computer.

## Start a game

The first screen shows all three play modes together, followed by a short How to play guide. Choose online, same-device or computer play first, then select Classic, −4 to 4, Tens or Custom totals. Computer difficulty appears only in computer setup. Online players can create a room or join one; invite links open the join screen directly and use the host’s settings.

## Rules

Choose a number set before starting a game:

| Number set | Player 1 target | Player 2 target |
| --- | --- | --- |
| Standard: 1–9 | 16 | 14 |
| Positive & negative: −4 through 4, including zero | 1 | −1 |
| Counting in tens: 10, 20, …, 90 | 160 | 140 |

All sets work online, on one device and against every computer difficulty. The online host chooses the set; joining players inherit it. Rematches keep it. Players alternate placing unused numbers into a 3×3 grid. A complete row, column or diagonal matching a player’s target wins for that player. Ownership of numbers does not matter. If a move creates both totals, the result is a draw. A full board without either total also draws. Online rematches require both players to agree and alternate who starts.

## Custom targets

Choose Custom in the number-set selector, then enter any two different whole-number totals from −999 to 999. The nine-number bank contains distinct integers. Both totals have exactly the same number of distinct three-number winning combinations, shown in the preview. This balances available combinations; turn order and strategy still matter.

When possible, the generator uses the preset pattern (targets equal three times a centre, plus or minus one step), preserving eight combinations per player. Other target pairs use a deterministic bounded search that prefers more combinations and accepts only equal counts. A constructive fallback guarantees at least three combinations each. The search does not claim a globally maximal bank. Zero and negative numbers may be included. Rematches keep the bank. Online hosts send targets and the server derives and validates the same bank.

## Computer opponent

Choose Easy, Medium or Hard after selecting computer play. You aim for Player 1’s target; the computer aims for Player 2’s target in the chosen number set. Easy chooses random legal moves. Medium searches up to two moves ahead; Hard searches up to four with a larger work budget. Both search levels take immediate wins, weigh threats and avoid gifting the opposing target. Hard is challenging, but not guaranteed unbeatable. Search runs in a Web Worker; leaving the game cancels pending moves. Solo rematches alternate the starting player. Solo play needs no multiplayer server once the page is loaded.

## Background music

A quiet original synthesised loop starts after a tap or keypress. The header’s Music on/off button is available throughout setup and play; the preference is stored on this browser. Music pauses while the tab is hidden. Web Audio generates the loop locally without third-party tracks or downloads. Browsers without Web Audio can still play the game.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the Vite URL. The development proxy connects Socket.IO to port 3001. Same-device play is offline-capable once the page is loaded. Online play requires the server.

```sh
npm test
npm run build
npm start
```

Production serves React and Socket.IO together on `PORT` (default 3001). `/health` reports readiness. For a local production preview, build then run `npm start`.

## Deploy

Use a Render Node web service connected to this repository (or the feature branch while reviewing). The included `render.yaml` declares the free service, build command `npm ci && npm run build`, start command `npm start`, and health check `/health`. A static-only host does not provide online multiplayer.

Rooms live in server memory and expire two hours after all players disconnect. Restarts and redeployments clear rooms; create a new room afterward. Deploy as a single instance. For persistence and multiple instances, add a shared room store and Socket.IO adapter. Free Render services can sleep when idle, so the first connection may require a retry while the server wakes.

Reconnect credentials remain in sessionStorage, separated by room, and are never broadcast. A room has exactly two seats. Refreshing the same tab rejoins your seat; invite links let another tab/device claim the other seat. Closing the tab may lose your seat credential. The server validates turns, numbers, occupied cells, round version and results. A disconnected player pauses online moves.

## Structure

- `src/main.jsx`: home screen, online session, board, number tray, rules and history.
- `src/style.css`: responsive layout and visual styling.
- `game/computer.js`: bounded alpha-beta search and difficulty selection.
- `src/computer.worker.js`: background computer search.
- `game/logic.js`: pure move validation and result evaluation shared by client/server.
- `server/rooms.js`: room membership, reconnection, rematch and cleanup.
- `server/index.js`: Express static hosting and Socket.IO event handlers.
- `game/*.test.js`, `server/*.test.js`: rule and room tests.

DM Sans and Space Grotesk load from Google Fonts with system fallbacks. No accounts or API keys are needed.
