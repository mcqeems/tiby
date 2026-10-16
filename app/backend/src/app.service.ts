import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { Health } from "@tiby/ts-shared";

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  async checkHealth(): Promise<Health> {
    await this.dataSource.query("SELECT 1");
    return { status: "ok" };
  }
}
