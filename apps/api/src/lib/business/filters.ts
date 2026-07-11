export interface ListFilterParams {
  skip?: number;
  take?: number;
  search?: string;
  status?: string;
}

export function parseListFilters(searchParams: URLSearchParams): ListFilterParams {
  const skip = searchParams.get('skip');
  const take = searchParams.get('take');
  const search = searchParams.get('search');
  const status = searchParams.get('status');

  return {
    ...(skip !== null && skip !== '' ? { skip: Number(skip) } : {}),
    ...(take !== null && take !== '' ? { take: Number(take) } : {}),
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  };
}

export function parsePagination(searchParams: URLSearchParams): { skip?: number; take?: number } {
  const skip = searchParams.get('skip');
  const take = searchParams.get('take');

  return {
    ...(skip !== null && skip !== '' ? { skip: Number(skip) } : {}),
    ...(take !== null && take !== '' ? { take: Number(take) } : {}),
  };
}
