export type AccessRequestRoleType =
  | 'musician'
  | 'organizer'
  | 'technician'
  | 'photographer'
  | 'booking'
  | 'other';

export type AccessRequestStatus =
  | 'new'
  | 'approved'
  | 'rejected';

export interface AccessRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  role_type: AccessRequestRoleType;
  message: string | null;
  status: AccessRequestStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  email_verified: boolean;
  verification_token: string | null;
  verification_sent_at: string | null;
}

export const ROLE_TYPE_OPTIONS: Array<{
  value: AccessRequestRoleType;
  label: string;
}> = [
  { value: 'musician', label: 'Musiker' },
  { value: 'organizer', label: 'Arrangør' },
  { value: 'technician', label: 'Tekniker' },
  { value: 'photographer', label: 'Fotograf / Video' },
  { value: 'booking', label: 'Booking / Management' },
  { value: 'other', label: 'Annet' },
];

export const STATUS_LABELS: Record<AccessRequestStatus, string> = {
  new: 'Ny',
  approved: 'Godkjent',
  rejected: 'Avslått',
};
