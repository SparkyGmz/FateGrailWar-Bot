/**
 * Erro "de jogo": mensagem segura para mostrar ao jogador.
 * Qualquer outro erro é tratado como bug e logado.
 */
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

export class SummonCooldownError extends GameError {
  constructor(public readonly nextAvailableAt: Date) {
    super('Seu círculo de invocação ainda está se recarregando.');
    this.name = 'SummonCooldownError';
  }
}

export class NotFoundError extends GameError {}
