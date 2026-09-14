import { describe, expect, it } from 'vitest';
import { applyFieldChange, revertFieldChange } from './apply-field-change';

const STEP_ID = 'step-1777763600421';
const stepBefore = {
  id: STEP_ID,
  order: 0,
  instruction: 'Saludar y preguntar qué necesita.',
};
const stepAfter = {
  id: STEP_ID,
  order: 0,
  instruction:
    'Saludar y preguntar qué necesita. Si ya es cliente, ofrecé reactivar el plan anterior.',
};

describe('applyFieldChange', () => {
  it('set reemplaza un campo de texto', () => {
    const data = { generalPolicies: 'Regla A', customInstructions: [] };
    const patched = applyFieldChange(data, 'generalPolicies', 'set', 'Regla B');
    expect(patched.generalPolicies).toBe('Regla B');
    expect(patched).not.toBe(data);
    expect(data.generalPolicies).toBe('Regla A');
    expect(applyFieldChange(patched, 'generalPolicies', 'set', 'Regla B')).toEqual(patched);
  });

  it('edit actualiza un paso de salesFlowSteps por id (caso WELL-V)', () => {
    const data = {
      salesFlowSteps: [stepBefore, { id: 'step-2', order: 1, instruction: 'Cerrar' }],
    };
    const patched = applyFieldChange(data, 'salesFlowSteps', 'edit', stepAfter);
    expect(patched.salesFlowSteps).toEqual([
      stepAfter,
      { id: 'step-2', order: 1, instruction: 'Cerrar' },
    ]);
    expect(applyFieldChange(patched, 'salesFlowSteps', 'edit', stepAfter)).toEqual(patched);
  });

  it('edit inserta el item si el id no existe', () => {
    const data = { salesFlowSteps: [{ id: 'step-2', order: 1, instruction: 'Cerrar' }] };
    const patched = applyFieldChange(data, 'salesFlowSteps', 'edit', stepAfter);
    expect(patched.salesFlowSteps).toEqual([
      { id: 'step-2', order: 1, instruction: 'Cerrar' },
      stepAfter,
    ]);
  });

  it('add en customInstructions es idempotente por id', () => {
    const item = { id: 'ci-1', instruction: 'No uses emojis', priority: 'alta' };
    const data = { customInstructions: [] as unknown[] };
    const once = applyFieldChange(data, 'customInstructions', 'add', item);
    const twice = applyFieldChange(once, 'customInstructions', 'add', item);
    expect(once.customInstructions).toEqual([item]);
    expect(twice).toEqual(once);

    const edited = { ...item, instruction: 'Evitar emojis en el cierre' };
    const replaced = applyFieldChange(once, 'customInstructions', 'add', edited);
    expect(replaced.customInstructions).toEqual([edited]);
  });

  it('add/remove en prohibitedTopics (lista de strings)', () => {
    const data = { prohibitedTopics: ['política'] };
    const added = applyFieldChange(data, 'prohibitedTopics', 'add', 'precios de la competencia');
    expect(added.prohibitedTopics).toEqual(['política', 'precios de la competencia']);
    expect(applyFieldChange(added, 'prohibitedTopics', 'add', 'precios de la competencia')).toEqual(
      added
    );

    const removed = applyFieldChange(
      added,
      'prohibitedTopics',
      'remove',
      'precios de la competencia'
    );
    expect(removed.prohibitedTopics).toEqual(['política']);
    expect(
      applyFieldChange(removed, 'prohibitedTopics', 'remove', 'precios de la competencia')
    ).toEqual(removed);
  });

  it('lanza si add/edit/remove llegan a un campo que no es lista', () => {
    const data = { generalPolicies: 'texto' };
    expect(() => applyFieldChange(data, 'generalPolicies', 'add', 'otro')).toThrow(
      /no es una lista/
    );
    expect(() =>
      applyFieldChange(data, 'generalPolicies', 'edit', { id: 'x', instruction: 'no' })
    ).toThrow(/no es una lista/);
    expect(() => applyFieldChange(data, 'generalPolicies', 'remove', 'texto')).toThrow(
      /no es una lista/
    );
  });
});

describe('revertFieldChange', () => {
  it('set restaura value_before', () => {
    const original = { generalPolicies: 'Regla A' };
    const patched = applyFieldChange(original, 'generalPolicies', 'set', 'Regla B');
    const reverted = revertFieldChange(
      patched,
      'generalPolicies',
      'set',
      'Regla A',
      'Regla B'
    );
    expect(reverted).toEqual(original);
  });

  it('edit de salesFlowSteps vuelve al paso original', () => {
    const original = { salesFlowSteps: [stepBefore] };
    const patched = applyFieldChange(original, 'salesFlowSteps', 'edit', stepAfter);
    const reverted = revertFieldChange(
      patched,
      'salesFlowSteps',
      'edit',
      stepBefore,
      stepAfter
    );
    expect(reverted).toEqual(original);
  });

  it('add de customInstructions se deshace quitando el item', () => {
    const item = { id: 'ci-1', instruction: 'Confirmar el barrio', priority: 'media' };
    const original = { customInstructions: [] as unknown[] };
    const patched = applyFieldChange(original, 'customInstructions', 'add', item);
    const reverted = revertFieldChange(patched, 'customInstructions', 'add', null, item);
    expect(reverted.customInstructions).toEqual([]);
  });

  it('remove de prohibitedTopics reinserta el string', () => {
    const original = { prohibitedTopics: ['política', 'religión'] };
    const patched = applyFieldChange(original, 'prohibitedTopics', 'remove', 'religión');
    const reverted = revertFieldChange(
      patched,
      'prohibitedTopics',
      'remove',
      'religión',
      'religión'
    );
    expect(reverted.prohibitedTopics).toEqual(['política', 'religión']);
    expect(
      revertFieldChange(reverted, 'prohibitedTopics', 'remove', 'religión', 'religión')
    ).toEqual(reverted);
  });
});
