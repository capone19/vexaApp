import { loadAgentSection, saveAgentSection } from '@/lib/api/save-agent-section';
import { getEmptyAgentSettings } from '@/lib/mock/empty-defaults';
import { isAgentSettingsSectionId } from '@/lib/agent-settings-sections';
import type { Experiment } from '@/types/learning';
import {
  applyFieldChange,
  revertFieldChange,
  type FieldOp,
} from './apply-field-change';

function asFieldOp(op: Experiment['field_op']): FieldOp {
  if (op === 'set' || op === 'add' || op === 'edit' || op === 'remove') return op;
  throw new Error('La propuesta no tiene una operación de campo válida.');
}

export async function persistExperimentFieldChange(
  experiment: Experiment,
  mode: 'apply' | 'revert',
  tenantId: string,
  userId: string | null
): Promise<void> {
  if (!experiment.target_field) {
    throw new Error('La propuesta no apunta a un campo del formulario.');
  }
  if (!isAgentSettingsSectionId(experiment.settings_section_key)) {
    throw new Error('La propuesta no tiene una sección de ajustes válida.');
  }

  const sectionKey = experiment.settings_section_key;
  const current = await loadAgentSection(sectionKey, tenantId);
  const empty = getEmptyAgentSettings()[sectionKey] as unknown as Record<string, unknown>;
  const base = current ?? empty;
  const op = asFieldOp(experiment.field_op);

  const patched =
    mode === 'apply'
      ? applyFieldChange(base, experiment.target_field, op, experiment.value_after)
      : revertFieldChange(
          base,
          experiment.target_field,
          op,
          experiment.value_before,
          experiment.value_after
        );

  const result = await saveAgentSection(sectionKey, patched, tenantId, userId);
  if (!result.cloudSaved || !result.webhookSent) {
    throw new Error(result.error || 'No se pudo guardar el cambio en el formulario.');
  }
}
