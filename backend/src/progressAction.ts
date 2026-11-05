// Only actions reviewed for server execution may cross this boundary.
// Economy actions and client-supplied state/timestamps are deliberately rejected.
export const parseProgressAction = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const action = value as Record<string, unknown>;
  const keys = Object.keys(action).sort().join(',');
  if (keys === 'type' && (action.type === 'NEXT_TUTORIAL' || action.type === 'SKIP_TUTORIAL')) {
    return { type: action.type };
  }
  if (keys === 'appearance,type' && action.type === 'SET_APPEARANCE' &&
      Number.isInteger(action.appearance) && Number(action.appearance) >= 0 && Number(action.appearance) <= 5) {
    return { type: action.type, appearance: action.appearance };
  }
  return null;
};
