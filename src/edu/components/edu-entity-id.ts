const EDU_ENTITY_PREFIX = "edu-sat-";

export function getEduSatelliteEntityId(id: string): string {
  return `${EDU_ENTITY_PREFIX}${id}`;
}
