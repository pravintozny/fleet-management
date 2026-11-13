export const FUEL_TYPES = ['diesel', 'petrol', 'electric', 'cng', 'lpg'];

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * Validate and normalise a fuel entry payload.
 * @returns {{ errors: Record<string,string>, value: object|null }}
 */
export function validateFuelEntry(input, { now = new Date() } = {}) {
  const errors = {};
  const body = input && typeof input === 'object' ? input : {};

  if (isBlank(body.vehicleId)) errors.vehicleId = 'vehicleId is required';

  const date = isBlank(body.date) ? null : new Date(body.date);
  if (!date || Number.isNaN(date.getTime())) errors.date = 'date must be a valid date';
  else if (date.getTime() > now.getTime() + 24 * 3600 * 1000) errors.date = 'date cannot be in the future';

  const fuelType = String(body.fuelType ?? '').toLowerCase();
  if (!FUEL_TYPES.includes(fuelType)) errors.fuelType = `fuelType must be one of: ${FUEL_TYPES.join(', ')}`;

  const num = (key, { min = 0, exclusive = true, label = key } = {}) => {
    const n = isBlank(body[key]) ? NaN : Number(body[key]);
    if (!Number.isFinite(n) || (exclusive ? n <= min : n < min)) {
      errors[key] = `${label} must be a number ${exclusive ? 'greater than' : 'at least'} ${min}`;
      return null;
    }
    return n;
  };
  const quantity = num('quantity', { label: 'quantity' });
  const unitPrice = num('unitPrice', { label: 'unitPrice' });
  const odometer = num('odometer', { min: 0, exclusive: false, label: 'odometer' });

  if (Object.keys(errors).length) return { errors, value: null };
  return {
    errors,
    value: {
      vehicleId: String(body.vehicleId).trim(),
      date: date.toISOString(),
      fuelType,
      quantity,
      unitPrice,
      totalCost: Math.round(quantity * unitPrice * 100) / 100,
      odometer,
      fullTank: body.fullTank === undefined ? true : Boolean(body.fullTank),
      station: isBlank(body.station) ? '' : String(body.station).trim().slice(0, 120),
    },
  };
}
