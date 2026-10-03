export enum ResourceType {
  CHURCH = 'CHURCH',
  USER = 'USER',
  MEMBER = 'MEMBER',
  TEAM = 'TEAM',
  TEAM_MEMBER = 'TEAM_MEMBER',
  TEAM_ROLE = 'TEAM_ROLE',
  EVENT = 'EVENT',
  SCHEDULE = 'SCHEDULE',
  SCHEDULE_SWAP = 'SCHEDULE_SWAP',
  AVAILABILITY = 'AVAILABILITY',
  NOTIFICATION = 'NOTIFICATION',
}

export const RESOURCE_NOT_FOUND_MESSAGES: Record<ResourceType, string> = {
  [ResourceType.CHURCH]: 'Igreja não encontrada',
  [ResourceType.USER]: 'Usuário não encontrado',
  [ResourceType.MEMBER]: 'Membro não encontrado',
  [ResourceType.TEAM]: 'Equipe não encontrada',
  [ResourceType.TEAM_MEMBER]: 'Membro da equipe não encontrado',
  [ResourceType.TEAM_ROLE]: 'Função não encontrada',
  [ResourceType.EVENT]: 'Evento não encontrado',
  [ResourceType.SCHEDULE]: 'Escala não encontrada',
  [ResourceType.SCHEDULE_SWAP]: 'Pedido de troca não encontrado',
  [ResourceType.AVAILABILITY]: 'Disponibilidade não encontrada',
  [ResourceType.NOTIFICATION]: 'Notificação não encontrada',
};
