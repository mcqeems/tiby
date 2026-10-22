import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentController } from './controllers/consent.controller.js';
import { ConsentService } from './services/consent.service.js';
import { ConsentRecord } from './entities/consent-record.entity.js';
import { AuthUser } from '../../auth/entities/auth-user.entity.js';
import { TreatmentPlan } from '../patients/entities/treatment-plan.entity.js';
import { FacilityAlert } from '../alerts/entities/facility-alert.entity.js';
import { PatientStatusHistory } from '../patients/entities/patient-status-history.entity.js';
import { AuditLog } from '../internal/audit/entities/audit-log.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsentRecord,
      AuthUser,
      TreatmentPlan,
      FacilityAlert,
      PatientStatusHistory,
      AuditLog,
    ]),
  ],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
