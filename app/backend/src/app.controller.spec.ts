import { Test, TestingModule } from "@nestjs/testing";
import { describe, beforeEach, it, expect, vi } from "vitest";
import { DataSource } from "typeorm";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";

describe("AppController", () => {
  let appController: AppController;
  const mockDataSource = {
    query: vi.fn().mockResolvedValue([{ 1: 1 }]),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("health", () => {
    it('should return { status: "ok" }', async () => {
      const result = await appController.getHealth();
      expect(result).toEqual({ status: "ok" });
      expect(mockDataSource.query).toHaveBeenCalledWith("SELECT 1");
    });
  });
});
