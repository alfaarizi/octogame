import { box, LevelFormatError, object, point3, text } from './validate.js';

function choice(value, choices, path) {
  if (!choices.includes(value)) throw new LevelFormatError(path, `expected one of ${choices.join(', ')}`);
  return value;
}

export function readEquipment(json, path) {
  const item = object(json, path);
  return { kind: choice(item.kind, ['flashlight', 'camera', 'battery'], `${path}.kind`), position: point3(item.position, `${path}.position`) };
}

export function readEvidenceSpot(json, path) {
  const item = object(json, path);
  return {
    ...point3(item, path), id: text(item.id, `${path}.id`), name: text(item.name, `${path}.name`),
    room: text(item.room, `${path}.room`), clue: text(item.clue, `${path}.clue`),
    kind: choice(item.kind, ['handprint', 'phone', 'drawing', 'clock', 'silhouette'], `${path}.kind`),
  };
}

export function readInteractable(json, path) {
  const item = object(json, path);
  const kind = choice(item.kind, ['closet', 'note', 'cache', 'switch'], `${path}.kind`);
  return {
    id: text(item.id, `${path}.id`), name: text(item.name, `${path}.name`), kind,
    position: point3(item.position, `${path}.position`),
    ...(kind === 'note' ? {
      text: text(item.text, `${path}.text`),
      orientation: choice(item.orientation ?? 'wall', ['wall', 'flat'], `${path}.orientation`),
    } : kind === 'switch' ? {
      facing: choice(item.facing, ['north', 'south', 'east', 'west'], `${path}.facing`),
    } : kind === 'cache' ? {
      box: box(item.box, `${path}.box`),
      facing: choice(item.facing ?? 'south', ['north', 'south', 'east', 'west'], `${path}.facing`),
    } : { box: box(item.box, `${path}.box`) }),
  };
}

export function readCeilingLight(json, path) {
  const light = object(json, path);
  return { id: text(light.id, `${path}.id`), switchId: text(light.switchId, `${path}.switchId`), position: point3(light.position, `${path}.position`) };
}

export function validateInvestigationIds(floors) {
  const ids = new Set();
  for (const item of floors.flatMap((floor) => [...floor.evidenceSpots, ...floor.interactables])) {
    if (ids.has(item.id)) throw new LevelFormatError('investigation id', `duplicate id "${item.id}"`);
    ids.add(item.id);
  }
}

export function validateCeilingLightSwitches(floors) {
  const lightIds = new Set();
  for (const floor of floors) {
    const switches = new Set(floor.interactables.filter((item) => item.kind === 'switch').map((item) => item.id));
    for (const light of floor.ceilingLights) {
      if (lightIds.has(light.id)) throw new LevelFormatError('ceiling light', `duplicate id "${light.id}"`);
      if (!switches.has(light.switchId)) throw new LevelFormatError('ceiling light', `unknown switch "${light.switchId}" on ${floor.name}`);
      lightIds.add(light.id);
    }
  }
}
