
export type USSDStep =
  | 'WELCOME'
  | 'REGISTER_NAME'
  | 'REGISTER_NATIONAL_ID'
  | 'REGISTER_MOBILE_MONEY'
  | 'REGISTER_PIN'
  | 'LOGIN_MEMBER_ID'
  | 'LOGIN_PIN'
  | 'MAIN_MENU'
  | 'SELECT_CIRCLE'
  | 'ENTER_AMOUNT'
  | 'CONFIRM_PAYMENT'
  | 'JOIN_CIRCLE_SELECT'
  | 'STATUS_SELECT_CIRCLE'
  | 'CYCLE_STATUS'
  | 'HELP'
  | 'EXIT';

export interface USSDSession {
  sessionId: string;
  phoneNumber: string;
  step: USSDStep;
  data: Record<string, any>;
  memberId?: string;
  createdAt: number;
}

const sessions = new Map<string, USSDSession>();
const SESSION_TTL_MS = 3 * 60 * 1000;

export function getSession(sessionId: string, phoneNumber: string): USSDSession {
  const existing = sessions.get(sessionId);
  if (existing && Date.now() - existing.createdAt < SESSION_TTL_MS) {
    return existing;
  }
  const fresh: USSDSession = {
    sessionId,
    phoneNumber,
    step: 'WELCOME',
    data: {},
    createdAt: Date.now(),
  };
  sessions.set(sessionId, fresh);
  return fresh;
}

export function updateSession(sessionId: string, updates: Partial<USSDSession>): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.set(sessionId, { ...session, ...updates });
}

export function endSession(sessionId: string): void {
  sessions.delete(sessionId);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 60 * 1000);