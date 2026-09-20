# nuphaser

Status: design only. Not implemented.

nuphaser is a pygame-shaped Python game library for Nuilith. Students write a normal pygame loop in Python. Phaser.js is only the display backend: it opens a canvas in the top of the right-hand pane and paints whatever Python blitted this frame.

The same file should run inside Nuilith and, later, on CPython via `pip install nuphaser` (local web server plus Phaser). Babylon.js is not part of v1.

This is more plausible than pygame-ce in Nuilith. Phaser already wants a browser canvas. Python stays in `worker.js`. The IDE main thread stays free.

## Verdict

Plausible, with one hard limit: the Python package cannot open the game panel by itself. Pyodide runs in a Web Worker. Workers have no DOM. On Nuilith the library can only send a message. `index.js` must create the panel and load Phaser.

Local-first still means two pieces:

1. A pure-Python package that looks like pygame.
2. A small JS host inside Nuilith (the panel plus Phaser).

Desktop CPython does not need the IDE host. `display.set_mode()` starts `http.server` on `127.0.0.1` and opens a browser.

Do not wrap Phaser's API. Wrap pygame's. Phaser never appears in student code.

## Why not pygame-ce

pygame-ce in Pyodide needs a real DOM canvas, SDL/Emscripten input, and a page main thread. PyScript's `py-game` type cannot use workers. Putting pygame-ce in `worker.js` will load, then fail or draw nowhere. Putting it on the IDE main thread would freeze the editor.

nuphaser is not pygame-ce. It is a pygame-compatible facade. Game state, the `while` loop, events, rects, and collision live in Python. Phaser only presents frames.

## Background: Python owns the game

Phaser does not run the game. It does not move sprites, check keys, or resolve hits. Each frame:

1. JS waits for the next `requestAnimationFrame`.
2. JS sends one input snapshot to the worker (keys, mouse, dt).
3. Python runs the body of the student loop: events, update, draw onto Surfaces.
4. `display.flip()` (or `clock.tick`) flushes a batched draw list to Phaser.
5. Phaser paints the canvas.

Student memory is Python memory. A `Rect` is a Python object. `player.x += 5` does not touch JS until flip. Collision is `Rect.colliderect` in Python, not Phaser Arcade Physics.

`clock.tick(fps)` is the yield. On Nuilith it blocks the worker until the host has a frame token (same idea as the `/get_input` XHR bridge). That is how a synchronous pygame loop can exist without freezing the editor. The editor lives on the main thread. The loop lives in the worker.

Do not use a `@game.update` callback API. Students write `while running:`.

## Syntax

Preferred import, so pygame tutorials almost paste:

```python
import nuphaser as pygame
```

On Nuilith, `import pygame` may be aliased to nuphaser so unmodified tutorials run. On a laptop, `import nuphaser as pygame` keeps using this library (Phaser in a browser). `import pygame` on a laptop is real pygame, not nuphaser.

### Canonical loop

```python
import nuphaser as pygame

pygame.init()
screen = pygame.display.set_mode((800, 600))
pygame.display.set_caption("Platform")
clock = pygame.time.Clock()

player = pygame.Rect(100, 100, 40, 40)
velocity = 0
running = True

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
            velocity = -12

    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]:
        player.x -= 5
    if keys[pygame.K_RIGHT]:
        player.x += 5

    velocity += 1
    player.y += velocity
    if player.bottom >= 600:
        player.bottom = 600
        velocity = 0

    screen.fill((24, 24, 32))
    pygame.draw.rect(screen, (220, 80, 80), player)
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
```

`display.set_mode` is the moment the panel opens (Nuilith) or the server starts (desktop). `QUIT` fires when the user hits Stop or closes the desktop tab. `clock.tick(60)` waits for the next frame and returns milliseconds since the last tick, same as pygame.

### Images and blit

```python
import nuphaser as pygame

pygame.init()
screen = pygame.display.set_mode((640, 480))
ball = pygame.image.load("ball.png").convert_alpha()
rect = ball.get_rect(center=(320, 240))
dx, dy = 4, 3
clock = pygame.time.Clock()
running = True

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    rect.x += dx
    rect.y += dy
    if rect.left < 0 or rect.right > 640:
        dx = -dx
    if rect.top < 0 or rect.bottom > 480:
        dy = -dy

    screen.fill((0, 0, 0))
    screen.blit(ball, rect)
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
```

### Mouse, text, overlap

```python
import nuphaser as pygame

pygame.init()
screen = pygame.display.set_mode((640, 480))
font = pygame.font.Font(None, 36)
target = pygame.Rect(270, 190, 100, 100)
hits = 0
clock = pygame.time.Clock()
running = True

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if target.collidepoint(event.pos):
                hits += 1

    screen.fill((12, 16, 24))
    pygame.draw.rect(screen, (80, 160, 220), target)
    label = font.render(f"hits: {hits}", True, (240, 240, 240))
    screen.blit(label, (16, 16))
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
```

### Sprites (Python-side)

`Sprite` and `Group` are Python. `update` and `draw` are ordinary method calls. Collision is AABB via `Rect`.

```python
import nuphaser as pygame

class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((40, 40))
        self.image.fill((240, 200, 80))
        self.rect = self.image.get_rect(center=(400, 300))

    def update(self):
        keys = pygame.key.get_pressed()
        self.rect.x += (keys[pygame.K_RIGHT] - keys[pygame.K_LEFT]) * 5
        self.rect.y += (keys[pygame.K_DOWN] - keys[pygame.K_UP]) * 5

pygame.init()
screen = pygame.display.set_mode((800, 600))
player = Player()
all_sprites = pygame.sprite.Group(player)
clock = pygame.time.Clock()
running = True

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    all_sprites.update()
    screen.fill((0, 0, 0))
    all_sprites.draw(screen)
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
```

## Module map (v1)

Match pygame names. If it is not listed, it does not exist yet and should raise `NotImplementedError` with the pygame name, not fail silently.

| nuphaser | pygame equivalent | v1 behavior |
|---|---|---|
| `init()` / `quit()` | same | `init` is idempotent. `quit` closes the panel or desktop page. |
| `display.set_mode((w, h))` | same | Opens the canvas. Returns the screen `Surface`. One mode at a time. |
| `display.set_caption(title)` | same | Panel / tab title. |
| `display.flip()` / `display.update()` | same | Flush the batched draw list to Phaser. |
| `display.get_surface()` | same | The screen from `set_mode`. |
| `Surface`, `Surface.fill`, `Surface.blit`, `Surface.get_rect`, `convert`, `convert_alpha` | same | Surfaces are Python objects plus a backend handle. Pixel-level `pygame.PixelArray` is out of scope. |
| `Rect` (`x`, `y`, `w`, `h`, `move`, `inflate`, `colliderect`, `collidepoint`, `clip`, `copy`, edges/centers) | same | Pure Python. No JS. |
| `Color` or `(r, g, b)` / `(r, g, b, a)` | same | |
| `image.load(path)` | same | Reads project assets. Returns a `Surface`. |
| `draw.rect`, `draw.circle`, `draw.line`, `draw.polygon`, `draw.ellipse` | same | Queued until `flip`. |
| `event.get()` | same | List of events since last tick. |
| `QUIT`, `KEYDOWN`, `KEYUP`, `MOUSEBUTTONDOWN`, `MOUSEBUTTONUP`, `MOUSEMOTION` | same | No `JOY*`, `DROPFILE`, `USEREVENT` in v1. |
| `K_LEFT`, `K_RIGHT`, `K_UP`, `K_DOWN`, `K_SPACE`, `K_RETURN`, `K_ESCAPE`, `K_a`–`K_z`, `K_0`–`K_9` | same | |
| `key.get_pressed()` | same | Indexable by `K_*`. Snapshot from the last tick. |
| `mouse.get_pos()`, `mouse.get_pressed()` | same | Canvas-local coordinates. |
| `time.Clock`, `Clock.tick(fps)`, `time.get_ticks()` | same | `tick` yields to the host and returns ms. |
| `font.Font(None, size)`, `Font.render(text, antialias, color)` | subset | Default font only. `SysFont` can alias `Font`. |
| `sprite.Sprite`, `sprite.Group`, `Group.update`, `Group.draw`, `spritecollide`, `spritecollideany` | subset | Pure Python. `Group.draw` blits `sprite.image` at `sprite.rect`. |
| `mixer` | later | Autoplay needs a canvas click. Stub with a clear error in v1. |
| `transform.scale`, `transform.flip`, `transform.rotate` | later | |
| `mask`, `movie`, `cd`, `sndarray`, `freetype` | no | |

Event objects: `.type`, and then `.key` / `.mod` for keyboard, `.pos` / `.button` / `.rel` for mouse. That is enough for intro pygame.

Constants live on the top-level module, like pygame: `pygame.QUIT`, `pygame.K_SPACE`.

## Architecture

```
Student code
    import nuphaser as pygame
    pygame.init()
    screen = pygame.display.set_mode((800, 600))
    while running:
        ...
        pygame.display.flip()
        clock.tick(60)

nuphaser (Python)
    detect environment
        Nuilith / Pyodide: postMessage + blocking frame wait
        CPython: localhost HTTP + WebSocket

Nuilith path                         Desktop path
    worker.js  --GAME_*--> index.js      nuphaser.server
    index.js opens panel in #output      serves Phaser page
    Phaser paints flushed draw lists     webbrowser.open(127.0.0.1)
    clock.tick blocks on frame token     clock.tick waits on WebSocket
```

Python never touches the DOM. The draw protocol is pygame operations, not Phaser scene graph commands: `fill`, `blit`, `draw.rect`, `flip`. JS does not know what a Sprite is.

### Environment detection

```python
def in_nuilith():
    import sys
    if sys.platform != "emscripten":
        return False
    try:
        from js import __nuilith__
        return True
    except ImportError:
        return False
```

Nuilith injects `self.__nuilith__ = true` on the worker. `sys.platform == "emscripten"` alone is any Pyodide host, not specifically Nuilith.

### Frame wait (how the pygame loop works)

`clock.tick(fps)` must block, or the loop is not pygame.

On Nuilith, reuse the blocking-IO pattern already used for `input()`: a synchronous XHR the service worker holds until the main thread posts a frame token. Payload of the response: `dt_ms`, key bitmap, mouse pos/buttons, event list. `event.get()` and `key.get_pressed()` read that snapshot. `/get_input` stays for `input()`. Use a separate path, for example `/get_frame`.

`display.flip()` posts the batched draw list first. Then `tick` waits. Order in student code is the pygame order: draw, `flip`, `tick`. If someone omits `flip`, the next tick still waits, but the canvas does not change. That matches pygame well enough.

Do not run `@game.update` from JS. Do not start a Phaser physics step.

`input()` during a game should fail loudly. Two blocking bridges on one worker is a deadlock risk.

Stop (`stopcode()`) terminates the worker, which unblocks any pending `/get_frame`, then tears down Phaser and restores editor focus. Deliver a `QUIT` if the loop is still able to run one more iteration. Killing the worker is sufficient.

### Panel layout

Current shell is a 50/50 split: `#left-pane` (editor) and `#output` (terminal). The game panel splits `#output` vertically:

- Top: game canvas (after `set_mode`, until `quit` or Stop)
- Bottom: existing jQuery Terminal

Zen mode currently hides `#output`. Default: hide the game with the right pane.

Keyboard focus: while the game is running, the canvas must receive keys. Otherwise typing in CodeMirror also moves the player. On Stop, return focus to the editor.

One display mode at a time. A second `set_mode` resizes or replaces the canvas.

### Desktop host (later)

Pure Python plus static JS (vendored or CDN). `set_mode()`:

1. Bind `127.0.0.1` only.
2. Serve the Phaser page and a WebSocket for draw lists plus frame tokens.
3. Open the default browser.
4. `tick()` waits on that socket. `quit()` or a closed tab ends the process loop with `QUIT`.

Firewall and popup blockers are the main desktop friction. Localhost is usually allowed.

This is not a native OS window. Students who want real pygame on a laptop use `import pygame` and `pip install pygame`. nuphaser is the portable Nuilith path.

## Draw batching

`fill` / `blit` / `draw.*` must not `postMessage` per call. Queue commands on the screen Surface. `flip()` sends one list:

```
[
  ["fill", [24, 24, 32]],
  ["rect", [220, 80, 80], [100, 100, 40, 40], 0],
  ["blit", surface_id, [x, y]]
]
```

Loaded images get an integer handle when `image.load` succeeds. Phaser caches the texture. Python `Surface` created with `Surface((w, h))` is a render texture on the JS side, created lazily on first blit.

60 fps of one batch per frame is the budget. Fine for sprites and draw calls. Not for per-pixel effects.

## Assets

The project file model is text in IndexedDB for CodeMirror. Games need binaries: `.png`, `.jpg`, `.gif`, `.wav`, `.ogg`, `.mp3`.

- Store those files as `Blob` / `ArrayBuffer`, not strings.
- `image.load("ball.png")` reads the project tree / Pyodide FS.
- Do not open images in CodeMirror.

Browser autoplay: mixer (when it exists) needs a click on the canvas first.

## Package shape

Local now, PyPI later. Do not publish until the pygame subset above is stable.

```
nuphaser/
  __init__.py       # init, quit, constants, re-exports (pygame layout)
  display.py
  event.py
  time.py
  image.py
  draw.py
  key.py
  mouse.py
  font.py
  sprite.py
  surface.py
  rect.py
  locals.py         # QUIT, KEYDOWN, K_*
  runtime.py        # in_nuilith() / backend pick
  bridge.py         # worker postMessage + /get_frame
  server.py         # CPython HTTP + WebSocket (stub until desktop)
  static/           # phaser + host page
```

Nuilith local install: vendor the package in the repo and write it into Pyodide's FS before `RUN`. Students `import nuphaser as pygame` with no extra step.

Later PyPI: pure Python wheel. The wheel cannot ship the Nuilith panel. The wheel can ship `static/` for desktop.

## Nuilith touch points (when built)

| Layer | Change |
|---|---|
| `index.html` | Split `#output`: canvas above terminal |
| `index.js` | `GAME_OPEN` on `set_mode`, apply draw batches, frame tokens, focus, Stop teardown |
| `static/worker.js` | Inject `__nuilith__`; optional `pygame` alias; do not stringify game payloads |
| `static/sw.js` | `/get_frame` intercept (like `/get_input`); precache Phaser |
| Project FS | Binary assets |
| `nuphaser/` | Python package in the repo |

`worker.js` `RUN` path otherwise stays as it is. Normal scripts still print to the terminal. nuphaser is opt-in via import.

## What not to do

- Put Phaser in the worker. No DOM, no WebGL canvas of the kind Phaser expects.
- Drive Phaser from the IDE main-thread Python. There is no main-thread Pyodide today, and a Python loop there would stall CodeMirror.
- Use pygbag or pygame-ce as the Run button.
- Invent a `Game` / `@update` API. The loop is pygame's loop.
- Let Phaser Arcade Physics move objects. Python moves `Rect`s.
- Bind all of pygame, or Phaser and Babylon, in v1.
- Open `0.0.0.0` on desktop. Localhost only.
- Encode the protocol in stdout. Use real message types.
- `postMessage` on every `draw.rect`. Batch until `flip`.

## Implementation order

1. Repo-local `nuphaser` with `init`, `set_mode`, `Surface.fill`, `draw.rect`, `flip`, `Clock.tick`, `QUIT`.
2. Right-pane canvas, Phaser boot, one moving rectangle using the canonical loop.
3. `event.get`, `key.get_pressed`, `K_*`.
4. `image.load` + `blit` from project assets.
5. `Rect` helpers, `sprite.Sprite` / `Group`, `font.Font`.
6. Stop / focus / `quit`.
7. Desktop `server.py` with the same draw protocol.
8. PyPI only after the pygame subset above has stopped moving.

Smallest proof: the canonical loop with a bouncing `draw.rect`, no images, no font, no desktop server. That proves `set_mode`, the panel, batched `flip`, and blocking `tick`.
