import { Gain, Player, ToneAudioBuffer } from 'tone';

export default class PolyPlayer extends Gain {
  buffer = new ToneAudioBuffer();

  private players: Player[] = [];

  setPolyphony(voices: number) {
    if (voices > this.players.length) {
      this.players = [
        ...this.players,
        ...Array.from({ length: voices - this.players.length }).map(() => {
          const player = new Player(this.buffer);
          player.connect(this);
          return player;
        }),
      ];
    }

    if (voices < this.players.length) {
      const remainingPlayers = this.players.slice(0, voices);
      const disposablePlayers = this.players.slice(voices);
      disposablePlayers.forEach((player) => player.dispose());
      this.players = remainingPlayers;
    }
  }

  async load(url: string) {
    await this.buffer.load(url);
    this.players.forEach((player) => {
      player.buffer = this.buffer;
    });
    return this;
  }

  getPlayer(voice: number) {
    return this.players[voice];
  }

  stop() {
    this.players.forEach((player) => player.stop());
  }
}
