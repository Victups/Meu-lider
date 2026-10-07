import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** "sáb, 10/10 às 17h00" */
export function formatWhen(iso: string): string {
  return format(new Date(iso), "EEE, d/MM 'às' HH'h'mm", { locale: ptBR });
}
