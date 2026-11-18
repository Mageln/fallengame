export type StaffRole = 'admin' | 'moderator' | 'player';
const readIds = (value: string | undefined): Set<number> => new Set((value ?? '').split(',').map((s) => s.trim()).filter((s) => /^[1-9]\d{0,9}$/.test(s)).map(Number).filter((n) => Number.isSafeInteger(n) && n <= 2147483647));
export const staffRole = (id: number, env: NodeJS.ProcessEnv = process.env): StaffRole =>
  readIds(env.ADMIN_VK_IDS).has(id) ? 'admin' : readIds(env.MODERATOR_VK_IDS).has(id) ? 'moderator' : 'player';
export const parseBan = (input: unknown): { target: number; reason: string; durationHours: number | null } | null => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  if (Object.keys(body).sort().join(',') !== 'durationHours,reason,targetVkId') return null;
  const target = body.targetVkId;
  if (!Number.isInteger(target) || Number(target) < 1 || Number(target) > 2147483647 || typeof body.reason !== 'string') return null;
  const reason = body.reason.trim();
  if (reason.length < 3 || reason.length > 300) return null;
  const durationHours = body.durationHours;
  if (durationHours !== null && (!Number.isInteger(durationHours) || Number(durationHours) < 1 || Number(durationHours) > 24 * 365)) return null;
  return { target: Number(target), reason, durationHours: durationHours as number | null };
};
export const canModerate = (actor: number, target: number, env: NodeJS.ProcessEnv = process.env): boolean =>
  actor !== target && staffRole(actor, env) !== 'player' && staffRole(target, env) === 'player';
