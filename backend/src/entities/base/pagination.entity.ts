/* eslint-disable max-classes-per-file */
import { Expose as JsonProperty, Type } from "class-transformer";
import { BaseEntity } from "./base.entity";

export class Sort {
  public property: string;
  public direction: "ASC" | "DESC" | string;
  constructor(sort: string) {
    if (sort) {
      [this.property, this.direction] = sort.split(",");
    }
  }

  asOrder(): any {
    const order = {};
    order[this.property] = this.direction;
    return order;
  }
}

export class PageRequest {
  @JsonProperty()
  page = 1;
  @JsonProperty()
  size = 12;
  @JsonProperty()
  skip = 0;
  @Type(() => Sort)
  sort: Sort = new Sort("id,ASC");

 // constructor(page?: number | string, size?: number | string, sort?: string) {
  //  this.page = +page >= 0 ? +page : 0 || this.page;
  //  this.size = +size || this.size;
   // this.sort = sort ? new Sort(sort) : this.sort;
   // this.skip = this.page * this.size;
 // }
constructor(page?: string | number, size?: string | number, sort?: string) {
  const parsedPage = Number(page ?? 1);
  const parsedSize = Number(size ?? this.size);

  this.page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  this.size =
    Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : this.size;

  this.sort = sort ? new Sort(sort) : this.sort;

  this.skip = (this.page - 1) * this.size;
}
}

export class Page<T extends BaseEntity> {
  constructor(
    public content: T[],
    public total: number,
    public pageable: PageRequest
  ) {}
}
