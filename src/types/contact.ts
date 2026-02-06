export type RequestType =
  | 'booking_gig'
  | 'collaboration'
  | 'photo_video'
  | 'tech_sound'
  | 'other';

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  booking_gig: 'Booking / gig',
  collaboration: 'Samarbeid / prosjekt',
  photo_video: 'Foto / video',
  tech_sound: 'Teknisk / lyd',
  other: 'Annet',
};

export const REQUEST_TYPE_OPTIONS = Object.entries(REQUEST_TYPE_LABELS).map(
  ([key, label]) => ({ key: key as RequestType, label })
);

export function getRequestTypeLabel(type: RequestType | string): string {
  return REQUEST_TYPE_LABELS[type as RequestType] || type;
}

export type ContactMode = 'free' | 'template';

export interface ContactRequest {
  id: string;
  created_at: string;
  status: 'opened_mailto';
  recipient_persona_id: string;
  recipient_name: string;
  recipient_email: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  mode: ContactMode;
  subject: string | null;
  message: string;
  template_payload: {
    request_type: RequestType;
    date_or_timeframe?: string | null;
    location?: string | null;
    budget?: string | null;
    details: string;
  } | null;
}

export interface UserContactInfo {
  user_id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  use_as_default: boolean;
  updated_at: string;
}
