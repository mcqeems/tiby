import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { Facility } from "../facilities/entities/facility.entity.js";
import { AuditLog } from "../audit/entities/audit-log.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([AuthUser, Facility, AuditLog])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
