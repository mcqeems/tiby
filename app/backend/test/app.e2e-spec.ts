import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  afterEach(async () => {
    await app.close();
  });
});
