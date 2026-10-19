import { AuthUser } from "../auth/entities/auth-user.entity.js";
import { AuthSession } from "../auth/entities/auth-session.entity.js";
import { AuthAccount } from "../auth/entities/auth-account.entity.js";
import { AuthVerification } from "../auth/entities/auth-verification.entity.js";
import { PushSubscription } from "../modules/push/entities/push-subscription.entity.js";
import { Facility } from "../modules/facilities/entities/facility.entity.js";
import { ConsentRecord } from "../modules/consent/entities/consent-record.entity.js";
import { TreatmentPlan } from "../modules/patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../modules/patients/entities/pmo-assignment.entity.js";
import { FamilyContact } from "../modules/family-contacts/entities/family-contact.entity.js";
import { WhatsappVerification } from "../modules/whatsapp/entities/whatsapp-verification.entity.js";
import { DailyCheckIn } from "../modules/check-ins/entities/daily-check-in.entity.js";
import { SafetyEvaluation } from "../modules/rule-engine/entities/safety-evaluation.entity.js";
import { InterventionTicket } from "../modules/tickets/entities/intervention-ticket.entity.js";
import { FacilityAlert } from "../modules/alerts/entities/facility-alert.entity.js";
import { PatientStatusHistory } from "../modules/patients/entities/patient-status-history.entity.js";
import { NotificationLog } from "../modules/whatsapp/entities/notification-log.entity.js";
import { AuditLog } from "../modules/audit/entities/audit-log.entity.js";

export const entities = [
  AuthUser,
  AuthSession,
  AuthAccount,
  AuthVerification,
  PushSubscription,
  Facility,
  ConsentRecord,
  TreatmentPlan,
  PmoAssignment,
  FamilyContact,
  WhatsappVerification,
  DailyCheckIn,
  SafetyEvaluation,
  InterventionTicket,
  FacilityAlert,
  PatientStatusHistory,
  NotificationLog,
  AuditLog,
];

export {
  AuthUser,
  AuthSession,
  AuthAccount,
  AuthVerification,
  PushSubscription,
  Facility,
  ConsentRecord,
  TreatmentPlan,
  PmoAssignment,
  FamilyContact,
  WhatsappVerification,
  DailyCheckIn,
  SafetyEvaluation,
  InterventionTicket,
  FacilityAlert,
  PatientStatusHistory,
  NotificationLog,
  AuditLog,
};
