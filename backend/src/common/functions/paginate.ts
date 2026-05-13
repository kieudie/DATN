import { Expose } from 'class-transformer';

@Expose()
export class ResponsePagination<T = any> {
  data: T[];

  totalItems: number;

  currentPage: number;

  totalPages: number;

  detail?: any;
}

export function handleResPagination<T = any>(
  data: T[],
  totalItems: number,
  page: number,
  size: number,
  detail?: any,
): ResponsePagination<T> {
  const responsePagination = new ResponsePagination<T>();

  responsePagination.data = data;
  responsePagination.totalItems = totalItems;
  responsePagination.currentPage = Number(page) || 0;
  responsePagination.totalPages = Math.ceil(totalItems / (size || 1));

  if (detail) {
    responsePagination.detail = detail;
  }

  return responsePagination;
}