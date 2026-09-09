import { validateMission } from './missionAuthoring.js';

/** Cancellable mission state machine; every side effect is supplied by the host. */
export function createMissionRunner({ manager, actions = {}, snapshot = () => ({}), restore = async () => {}, now = () => Date.now() } = {}) {
  let epoch = 0;
  let current = null;
  const run = async (missionInput, { keepFinal = false, signal } = {}) => {
    const mission = validateMission(missionInput);
    const runEpoch = ++epoch;
    current = { missionId: mission.id, status: 'RUNNING', stepIndex: -1, startedAt: now() };
    const before = snapshot();
    const isCurrent = () => runEpoch === epoch && !signal?.aborted;
    const pause = async (reason) => {
      if (mission.cleanup !== 'keep-final' && !keepFinal) await restore(before, manager);
      current = { ...current, status: 'PAUSED', reason };
      return current;
    };
    try {
      for (let index = 0; index < mission.steps.length; index += 1) {
        if (!isCurrent()) return await pause(signal?.aborted ? 'CANCELLED' : 'SUPERSEDED');
        const step = mission.steps[index];
        current = { ...current, stepIndex: index };
        if (step.type === 'setLayers') await actions.setLayers?.(step.enabled, manager);
        else if (step.type === 'flyTo') await actions.flyTo?.(step, manager);
        else if (step.type === 'selectEntity') await actions.selectEntity?.(step.entityId, manager);
        else if (step.type === 'enterCockpit') await actions.enterCockpit?.(step, manager);
        else if (step.type === 'setStyle') await actions.setStyle?.(step.style, manager);
        else if (step.type === 'waitForHealth') await actions.waitForHealth?.(step, manager);
        else if (step.type === 'narrate') await actions.narrate?.(String(step.text || ''), manager);
        else if (step.type === 'captureMarker') await actions.captureMarker?.(step, manager);
        else if (step.type === 'end') break;
        if (!isCurrent()) return await pause('CANCELLED_AFTER_STEP');
        const assertion = mission.assertions.find((item) => item.stepIndex === index);
        if (assertion && !(await actions.assert?.(assertion, manager))) return await pause(`ASSERTION_FAILED_${index}`);
      }
      current = { ...current, status: 'COMPLETE', finishedAt: now() };
      if (mission.cleanup !== 'keep-final' && !keepFinal) await restore(before, manager);
      return current;
    } catch (error) {
      return await pause(String(error?.message || error));
    }
  };
  return { run, cancel(reason = 'CANCELLED') { epoch += 1; current = current ? { ...current, status: 'PAUSED', reason } : null; return current; }, getState: () => current };
}
