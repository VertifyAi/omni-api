import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";

import { FindOptionsWhere, ObjectLiteral } from "typeorm";
import { GenericFilterDto } from "../dto/generic-filter.dto";

@Injectable()
export class PageService {
  paginate<T extends ObjectLiteral>(
    repository: Repository<T>,
    filter: GenericFilterDto,
    where: FindOptionsWhere<T>,
  ) {
    // Garante que page e pageSize sejam números
    const page = Number(filter.page) || 1;
    const pageSize = Number(filter.pageSize) || 10;
    
    return repository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where: where,
    });
  }
}
