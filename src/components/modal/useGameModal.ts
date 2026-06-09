import { useSearchParams } from 'react-router-dom';

export type GameModalMode = 'create' | 'view' | 'edit';

/**
 * Drives the global CRUD modal through URL search params (`?game=&mode=`),
 * preserving any other params (like the active `preset`) when opening/closing.
 */
export function useGameModal() {
  const [params, setParams] = useSearchParams();
  const gameId = params.get('game');
  const mode = (params.get('mode') as GameModalMode | null) ?? null;

  const open = (game: string, m: GameModalMode) => {
    const next = new URLSearchParams(params);
    next.set('game', game);
    next.set('mode', m);
    setParams(next);
  };

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete('game');
    next.delete('mode');
    setParams(next);
  };

  return {
    gameId,
    mode,
    isOpen: Boolean(gameId),
    openCreate: () => open('new', 'create'),
    openView: (id: string) => open(id, 'view'),
    openEdit: (id: string) => open(id, 'edit'),
    close,
  };
}
