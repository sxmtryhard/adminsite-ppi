import { useCallback, useEffect, useState } from 'react';
import { toUserMessage } from '@/services/firebase/helpers';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

/**
 * Carga datos asíncronos con estados de carga y error. `reload` vuelve a ejecutar la carga.
 * `deps` debe contener todo lo que use `loader` (igual que en useEffect).
 */
export const useAsync = <T,>(loader: () => Promise<T>, deps: unknown[]) => {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loader().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: unknown) => {
        if (!cancelled) setState((prev) => ({ data: prev.data, loading: false, error: toUserMessage(err, 'No fue posible cargar la información.') }));
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    setVersion((v) => v + 1);
  }, []);

  return { ...state, reload, setData: (data: T) => setState({ data, loading: false, error: null }) };
};
