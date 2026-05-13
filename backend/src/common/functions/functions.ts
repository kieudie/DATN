export const removeItemUndefine = <T extends Record<string, any>>(
  dataUpdate: T,
): T => {
  Object.keys(dataUpdate).forEach((key) => {
    if (dataUpdate[key] === undefined) {
      delete dataUpdate[key];
    }
  });

  return dataUpdate;
};

export const removeUndefinedField = removeItemUndefine;

export function getFirstDayOfMonth(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();

  return formatDate(new Date(year, month, 1));
}

export function getLastDayOfMonth(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();

  return formatDate(new Date(year, month + 1, 0));
}

export function formatDate(dateStr: Date): string {
  const d = new Date(dateStr);
  let month = `${d.getMonth() + 1}`;
  let day = `${d.getDate()}`;
  const year = d.getFullYear();

  if (month.length < 2) {
    month = `0${month}`;
  }

  if (day.length < 2) {
    day = `0${day}`;
  }

  return [year, month, day].join('-');
}

export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}

export function toNumber(value: any, defaultValue = 0): number {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return defaultValue;
  }

  return numberValue;
}