import { useEffect, useState } from 'react';

import { getDatabase } from '@/data/database';

type State = { ready: boolean; error: string | null };

export function useDatabaseReady(): State {
  const [state, setState] = useState<State>({ ready: false, error: null });

  useEffect(() => {
    let active = true;
    getDatabase()
      .then(() => active && setState({ ready: true, error: null }))
      .catch(() => active && setState({
        ready: false,
        error: 'Não foi possível abrir o armazenamento seguro. Use um development build com SQLCipher.',
      }));
    return () => { active = false; };
  }, []);

  return state;
}
