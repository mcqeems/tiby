import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { FamilyContact } from '../entities/family-contact.entity.js';
import { TreatmentPlan } from '../entities/treatment-plan.entity.js';
import { PmoAssignment } from '../entities/pmo-assignment.entity.js';
import type { FamilyContactInput, FamilyContactItem } from '@tiby/ts-shared';

function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return createHash('sha256').update(digits).digest('hex');
}

@Injectable()
export class FamilyContactsService {
  constructor(
    @InjectRepository(FamilyContact)
    private readonly familyRepo: Repository<FamilyContact>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
  ) {}

  private async resolvePlan(patientOrPlanId: string): Promise<TreatmentPlan> {
    let plan = await this.planRepo.findOne({
      where: { patientUserId: patientOrPlanId },
    });
    if (!plan) {
      plan = await this.planRepo.findOne({
        where: { id: patientOrPlanId },
      });
    }
    if (!plan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Treatment plan or patient not found',
      });
    }
    return plan;
  }

  private async verifyAccess(
    caller: { id: string; role: string; facilityId?: string | null },
    plan: TreatmentPlan,
    requireDeleteRole = false,
  ): Promise<void> {
    if (caller.role === 'ADMIN') {
      return;
    }

    if (caller.role === 'PASIEN') {
      if (caller.id !== plan.patientUserId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Cannot access family contacts for another patient',
        });
      }
      return;
    }

    if (caller.role === 'NAKES') {
      if (caller.facilityId && caller.facilityId !== plan.facilityId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Cannot access family contacts outside your facility',
        });
      }
      return;
    }

    if (caller.role === 'PMO') {
      if (requireDeleteRole) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'PMO cannot delete family contacts',
        });
      }
      const assignment = await this.pmoRepo.findOne({
        where: { pmoUserId: caller.id, treatmentPlanId: plan.id, active: true },
      });
      if (!assignment) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'PMO is not assigned to this patient',
        });
      }
      return;
    }

    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
    });
  }

  async listFamilyContacts(
    caller: { id: string; role: string; facilityId?: string | null },
    patientOrPlanId: string,
  ): Promise<FamilyContactItem[]> {
    const plan = await this.resolvePlan(patientOrPlanId);
    await this.verifyAccess(caller, plan);

    const contacts = await this.familyRepo.find({
      where: { treatmentPlanId: plan.id },
      order: { createdAt: 'ASC' },
    });

    return contacts.map((c) => ({
      id: c.id,
      treatmentPlanId: c.treatmentPlanId,
      fullName: c.nameEncrypted,
      whatsappNumber: c.whatsappEncrypted,
      whatsappVerified: c.whatsappVerified,
      notifyOnEscalation: c.notifyOnEscalation,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async createFamilyContact(
    caller: { id: string; role: string; facilityId?: string | null },
    patientOrPlanId: string,
    dto: FamilyContactInput,
  ): Promise<FamilyContactItem> {
    const plan = await this.resolvePlan(patientOrPlanId);
    await this.verifyAccess(caller, plan);

    const cleanPhone = dto.whatsappNumber.replace(/\D/g, '');
    const whatsappHash = hashPhone(cleanPhone);

    const contact = await this.familyRepo.save(
      this.familyRepo.create({
        treatmentPlanId: plan.id,
        addedByUserId: caller.id,
        nameEncrypted: dto.fullName,
        whatsappEncrypted: dto.whatsappNumber,
        whatsappHash,
        whatsappVerified: false,
        notifyOnEscalation: dto.notifyOnEscalation ?? true,
      }),
    );

    return {
      id: contact.id,
      treatmentPlanId: contact.treatmentPlanId,
      fullName: contact.nameEncrypted,
      whatsappNumber: contact.whatsappEncrypted,
      whatsappVerified: contact.whatsappVerified,
      notifyOnEscalation: contact.notifyOnEscalation,
      createdAt: contact.createdAt
        ? contact.createdAt.toISOString()
        : new Date().toISOString(),
    };
  }

  async deleteFamilyContact(
    caller: { id: string; role: string; facilityId?: string | null },
    patientOrPlanId: string,
    contactId: string,
  ): Promise<{ success: boolean; message: string }> {
    const plan = await this.resolvePlan(patientOrPlanId);
    await this.verifyAccess(caller, plan, true);

    const contact = await this.familyRepo.findOne({
      where: { id: contactId, treatmentPlanId: plan.id },
    });

    if (!contact) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Family contact not found',
      });
    }

    await this.familyRepo.delete({ id: contactId });

    return {
      success: true,
      message: 'Family contact removed successfully',
    };
  }
}
