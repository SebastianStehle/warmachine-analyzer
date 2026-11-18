import classNames from 'classnames';
import { formatPercent } from 'src/lib/format';
import { texts } from 'src/texts';

// Below this number of games a win rate says very little.
export const MIN_RELIABLE_GAMES = 10;
const STRONG_WIN_RATE = 0.55;
const WEAK_WIN_RATE = 0.45;

export interface WinRateProps {
  winRate: number | null;
  games: number;
}

export function WinRate({ winRate, games }: WinRateProps) {
  const isReliable = games >= MIN_RELIABLE_GAMES;

  return (
    <span
      className={classNames('whitespace-nowrap', { 'opacity-60': !isReliable })}
      title={isReliable ? undefined : texts.common.onlyGames(games)}
    >
      <span
        className={classNames('font-semibold', {
          'text-success': isReliable && winRate !== null && winRate >= STRONG_WIN_RATE,
          'text-danger': isReliable && winRate !== null && winRate <= WEAK_WIN_RATE,
        })}
      >
        {formatPercent(winRate)}
      </span>{' '}
      <span className="text-muted text-xs">({texts.common.gameCount(games)})</span>
    </span>
  );
}

export interface ShareProps {
  part: number;
  total: number;
}

export function Share({ part, total }: ShareProps) {
  return (
    <span className="whitespace-nowrap">
      {formatPercent(total > 0 ? part / total : null)} <span className="text-muted text-xs">({part})</span>
    </span>
  );
}
