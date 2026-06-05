export interface VigenciaInfo {
  diasRestantes: number;
  mesesRestantes: number;
  expirado: boolean;
  urgencia: 'expirado' | 'critico' | 'atencao' | 'normal';
}

export function getVigenciaRestante(endDate: Date): VigenciaInfo {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - now.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const mesesRestantes = parseFloat((diasRestantes / 30).toFixed(1));
  const expirado = diasRestantes < 0;

  let urgencia: VigenciaInfo['urgencia'];
  if (expirado) urgencia = 'expirado';
  else if (diasRestantes <= 7) urgencia = 'critico';
  else if (diasRestantes <= 30) urgencia = 'atencao';
  else urgencia = 'normal';

  return { diasRestantes, mesesRestantes, expirado, urgencia };
}

// Ordena contratos por urgência: expirado > critico > atencao > normal, depois por diasRestantes asc
const urgenciaOrder: Record<VigenciaInfo['urgencia'], number> = {
  expirado: 0,
  critico: 1,
  atencao: 2,
  normal: 3,
};

export function sortByUrgencia<T extends { vigencia: VigenciaInfo }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderDiff = urgenciaOrder[a.vigencia.urgencia] - urgenciaOrder[b.vigencia.urgencia];
    if (orderDiff !== 0) return orderDiff;
    return a.vigencia.diasRestantes - b.vigencia.diasRestantes;
  });
}
