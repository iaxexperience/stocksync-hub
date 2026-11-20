// O PostgREST (API do Supabase) devolve no máximo 1000 linhas por consulta e
// corta o resto SEM avisar. Toda listagem que pode passar disso deve usar este
// helper, que busca página por página até acabar.
//
// A consulta precisa ter uma ordenação estável (termine com .order("id")),
// senão linhas podem repetir ou sumir entre uma página e outra.

const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: unknown };

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}
