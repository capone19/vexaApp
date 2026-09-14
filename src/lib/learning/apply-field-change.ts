export type FieldOp = 'set' | 'add' | 'edit' | 'remove';

const STRING_LIST_FIELDS = new Set([
  'requirements',
  'prohibitedTopics',
  'avoidedLanguage',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function itemId(value: unknown): string | null {
  return isRecord(value) && typeof value.id === 'string' ? value.id : null;
}

function isStringList(
  field: string,
  current: unknown[],
  sample: unknown
): boolean {
  if (STRING_LIST_FIELDS.has(field)) return true;
  if (typeof sample === 'string') return true;
  if (current.length > 0 && current.every((item) => typeof item === 'string')) return true;
  return false;
}

function assertListOp(
  field: string,
  current: unknown,
  op: FieldOp
): unknown[] {
  if (current === undefined || current === null) return [];
  if (Array.isArray(current)) return current;
  throw new Error(
    `No se puede ${op} en el campo "${field}" porque no es una lista.`
  );
}

function removeFromList(list: unknown[], sample: unknown, asStrings: boolean): unknown[] {
  if (asStrings || typeof sample === 'string') {
    return list.filter((item) => item !== sample);
  }
  const id = itemId(sample);
  if (id === null) return list;
  return list.filter((item) => itemId(item) !== id);
}

function upsertById(list: unknown[], incoming: Record<string, unknown> & { id: string }): unknown[] {
  const next = [...list];
  const idx = next.findIndex((item) => itemId(item) === incoming.id);
  if (idx >= 0) next[idx] = incoming;
  else next.push(incoming);
  return next;
}

export function applyFieldChange(
  sectionData: Record<string, unknown>,
  target_field: string,
  field_op: FieldOp,
  value_after: unknown
): Record<string, unknown> {
  const data = { ...sectionData };

  if (field_op === 'set') {
    data[target_field] = value_after;
    return data;
  }

  const current = assertListOp(target_field, data[target_field], field_op);
  const asStrings = isStringList(target_field, current, value_after);

  if (field_op === 'add') {
    if (asStrings) {
      if (typeof value_after === 'string' && !current.includes(value_after)) {
        data[target_field] = [...current, value_after];
      } else {
        data[target_field] = [...current];
      }
      return data;
    }
    const id = itemId(value_after);
    if (id === null || !isRecord(value_after)) {
      throw new Error(`add en "${target_field}" requiere un item con id.`);
    }
    data[target_field] = upsertById(current, { ...value_after, id });
    return data;
  }

  if (field_op === 'edit') {
    const id = itemId(value_after);
    if (id === null || !isRecord(value_after)) {
      throw new Error(`edit en "${target_field}" requiere un item con id.`);
    }
    data[target_field] = upsertById(current, { ...value_after, id });
    return data;
  }

  data[target_field] = removeFromList(current, value_after, asStrings);
  return data;
}

export function revertFieldChange(
  sectionData: Record<string, unknown>,
  target_field: string,
  field_op: FieldOp,
  value_before: unknown,
  value_after: unknown
): Record<string, unknown> {
  if (field_op === 'set') {
    return applyFieldChange(sectionData, target_field, 'set', value_before);
  }
  if (field_op === 'add') {
    return applyFieldChange(sectionData, target_field, 'remove', value_after);
  }
  if (field_op === 'edit') {
    if (value_before == null) {
      return applyFieldChange(sectionData, target_field, 'remove', value_after);
    }
    return applyFieldChange(sectionData, target_field, 'edit', value_before);
  }
  if (value_before == null) {
    return { ...sectionData };
  }
  if (typeof value_before === 'string') {
    return applyFieldChange(sectionData, target_field, 'add', value_before);
  }
  return applyFieldChange(sectionData, target_field, 'add', value_before);
}
