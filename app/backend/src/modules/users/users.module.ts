import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersController } from "./controllers/users.controller.js";
import { UsersService } from "./services/users.service.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { Facility } from "../facilities/entities/facilities.entity.js";
import { AuditLog } from "../internal/audit/entities/audit-log.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([AuthUser, Facility, AuditLog])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
