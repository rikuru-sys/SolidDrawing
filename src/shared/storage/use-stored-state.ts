import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

export type StoredStateReader<T> = () => T;
export type StoredStateWriter<T> = (value: T) => unknown;

/**
 * 保存済みの値を初期状態として読み込み、変更後の値を保存する。
 * 保存形式や保存先は、呼び出し側から渡す関数に任せる。
 */
export function useStoredState<T>(
  read: StoredStateReader<T>,
  write: StoredStateWriter<T>,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    write(value);
  }, [value, write]);

  return [value, setValue] as const;
}
