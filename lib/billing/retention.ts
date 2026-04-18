/** Data de execução padrão: 90 dias após `from`. */
export function retentionRunAfter(from: Date, days = 90): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}
