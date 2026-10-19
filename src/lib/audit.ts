// src/lib/audit.ts
// Audit logging utility — semua aksi penting dicatat

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export interface AuditLogParams {
  actorId?: string | null
  actorName?: string | null
  actorRole?: string | null
  action: string
  entityType: string
  entityId?: string | null
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorName: params.actorName,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: (params.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: (params.newValue ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (err) {
    // Audit log tidak boleh gagalkan flow utama
    console.error('[AUDIT LOG ERROR]', err)
  }
}

// Konstanta aksi audit
export const AUDIT_ACTIONS = {
  // Booking
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_STATUS_CHANGED: 'BOOKING_STATUS_CHANGED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_DELETED: 'BOOKING_DELETED',
  // Inspection
  INSPECTION_SUBMITTED: 'INSPECTION_SUBMITTED',
  INSPECTION_REVIEWED: 'INSPECTION_REVIEWED',
  PHOTO_UPLOADED: 'PHOTO_UPLOADED',
  PHOTO_CORRECTED: 'PHOTO_CORRECTED',
  // Vehicle
  VEHICLE_CREATED: 'VEHICLE_CREATED',
  VEHICLE_UPDATED: 'VEHICLE_UPDATED',
  VEHICLE_STATUS_CHANGED: 'VEHICLE_STATUS_CHANGED',
  VEHICLE_DELETED: 'VEHICLE_DELETED',
  ODOMETER_UPDATED: 'ODOMETER_UPDATED',
  // User
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  // Auth
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  // Settings
  SETTING_UPDATED: 'SETTING_UPDATED',
} as const
