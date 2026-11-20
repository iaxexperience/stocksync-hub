import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

// Igual ao useState, mas lembra o valor ao sair da tela e voltar (inclusive
// após F5). Usado nos campos de pesquisa e filtros, para o usuário não ter
// que refazer a busca toda vez que troca de tela.
//
// Fica no sessionStorage: vale enquanto a aba do navegador estiver aberta e
// some ao fechá-la (assim filtros de dias atrás não ficam presos na tela).
// As telas autenticadas têm ssr: false, então ler o storage no primeiro
// render não causa diferença de hidratação.

const PREFIX = "filtros:";

function read<T>(key: string, initial: T): T {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    return raw === null ? initial : (JSON.parse(raw) as T);
  } catch {
    return initial;
  }
}

export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    typeof window === "undefined" ? initial : read(key, initial),
  );

  useEffect(() => {
    try {
      window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage indisponível (aba anônima, cota cheia): segue só em memória.
    }
  }, [key, value]);

  return [value, setValue];
}
