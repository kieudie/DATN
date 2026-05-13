import type { Response } from 'express';

const applicationName = process.env.CLIENT_NAME || 'datn';
const enableTranslation = true;

export interface PageHeader {
  total: number;
  pageable: {
    page: number;
    size: number;
  };
}

export class HeaderUtil {
  static createAlert(res: Response, message: string, param: string): void {
    res.set(`X-${applicationName}-alert`, message);
    res.set(`X-${applicationName}-params`, param);
  }

  static addEntityCreatedHeaders(
    res: Response,
    entityName: string,
    param: string | number,
  ): void {
    res.status(201);

    const message = enableTranslation
      ? `${applicationName}.${entityName}.created`
      : `A new ${entityName} is created with identifier ${param}`;

    this.createAlert(res, message, String(param));
  }

  static addEntityUpdatedHeaders(
    res: Response,
    entityName: string,
    param: string | number,
  ): void {
    res.status(200);

    const message = enableTranslation
      ? `${applicationName}.${entityName}.updated`
      : `A ${entityName} is updated with identifier ${param}`;

    this.createAlert(res, message, String(param));
  }

  static addEntityDeletedHeaders(
    res: Response,
    entityName: string,
    param: string | number,
  ): void {
    res.status(204);

    const message = enableTranslation
      ? `${applicationName}.${entityName}.deleted`
      : `A ${entityName} is deleted with identifier ${param}`;

    this.createAlert(res, message, String(param));
  }

  static addPaginationHeaders(res: Response, page: PageHeader): void {
    const url = res.req.url;

    res.set('X-Total-Count', page.total.toString());

    const pageNumber = page.pageable.page;
    const pageSize = page.pageable.size;
    const links: string[] = [];

    if (pageNumber < page.total - 1) {
      links.push(this.prepareLink(url, pageNumber + 1, pageSize, 'next'));
    }

    if (pageNumber > 0) {
      links.push(this.prepareLink(url, pageNumber - 1, pageSize, 'prev'));
    }

    links.push(this.prepareLink(url, page.total - 1, pageSize, 'last'));
    links.push(this.prepareLink(url, 0, pageSize, 'first'));

    res.set('Link', links.join(','));
  }

  private static prepareLink(
    url: string,
    pageNumber: number,
    pageSize: number,
    relType: string,
  ): string {
    const parsedUrl = new URL(`http://localhost${url}`);

    parsedUrl.searchParams.set('page', String(pageNumber));
    parsedUrl.searchParams.set('size', String(pageSize));

    const link = parsedUrl.toString().replace('http://localhost', '');

    return `<${link}>; rel="${relType}"`;
  }
}