# scheduler

A small, dependency-free **lookahead scheduler + transport** for sample-accurate
sequencing on top of any audio clock. No Tone.js, no Web Audio, no app imports —
it's written to be lifted into its own package later.

## Why

Tone's `Transport` + `Sequence`/`Part` are the expensive, always-on part of the
engine: a 20 Hz worker clock plus `Timeline`/`getStateAtTime` lookups, and an
edit-during-playback model that disposes and rebuilds scheduled events. The
audio nodes (players, effects) are cheap native Web Audio and worth keeping.

This module replaces only the timekeeping with the classic
[“two clocks”](https://web.dev/articles/audio-scheduling) pattern.

## Design

- **`Clock`** — the only outside dependency: a `now` (seconds) plus a repeating
  timer. `AudioContextClock` wraps a real context; `ManualClock` makes tests
  deterministic. The tick driver can later be swapped for an AudioWorklet
  without touching scheduling logic.
- **`Transport`** — tempo + playhead. Keeps two timelines apart on purpose:
  _raw_ beats advance monotonically and map linearly to audio time (the
  scheduler walks these, so it never double-fires); _musical_ beats are raw
  beats with the loop applied (what the UI shows).
- **`ClipSource`** — a clip is just live data that answers “which events start
  in `[from, to)`?”. The host implements it over its own pattern model, so
  **editing during playback needs no rescheduling** — the next tick reads the
  new answer. `ArrayClip` is a reference implementation.
- **`Scheduler`** — each ~25 ms tick, queues every event up to `now +
lookahead` with a precise audio time, so timer jitter never affects playback.
  The first pass runs synchronously on `start()`, so playback begins with **no
  added latency** (lookahead is a scheduling horizon, not a start delay). It
  does nothing while stopped.

### Looping

Two independent levels that **compose**:

- **Transport loop** — an optional `[start, end)` region; the playhead jumps
  `end → start`. `Transport.segments()` splits a raw range into linear musical
  segments at each wrap so the scheduler only ever sees monotonic time.
- **Clip loop** — each `ClipSource` repeats over its own `lengthBeats`. The
  scheduler wraps the clip within each transport segment.

## Usage

```ts
const clock = new AudioContextClock(audioContext);
const transport = new Transport(clock, 120);
const scheduler = new Scheduler(clock, transport, { lookahead: 0.1 });

scheduler.onSchedule((event, time) => player(event.data).start(time));
scheduler.add(myClip); // a ClipSource over your live pattern data
transport.setLoop(0, 16); // optional loop brace, in beats

scheduler.start(); // first hits sound immediately
// …edit clip data freely while playing — no rescheduling…
scheduler.stop();
```

## Not here yet (host concerns)

Swing (a per-step time offset when the host builds `ClipSource` events),
parameter automation (schedule ramps in the `onSchedule` window), count-in,
and offline rendering (drive the same scheduler from an offline clock). These
layer on top without changing the core.

## Extracting to a package

Everything imports only from within this folder, so promotion to
`packages/scheduler` is a move + a `package.json`. Keep it that way: **no app,
Tone, or Web Audio imports** — reach the outside world only through `Clock` and
`ClipSource`.
