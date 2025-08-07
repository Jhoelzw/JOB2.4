// Chilean specific data for WorkMatch Chile

export const WORK_CATEGORIES = [
  {
    id: 'agricultura',
    name: '🌾 Agricultura y Pesca',
    emoji: '🌾',
    hourlyRange: { min: 2500, max: 3200 },
    dailyRange: { min: 20000, max: 25600 }
  },
  {
    id: 'comercio',
    name: '🛒 Comercio y Venta Ambulante',
    emoji: '🛒',
    hourlyRange: { min: 2800, max: 4000 },
    dailyRange: { min: 22400, max: 32000 }
  },
  {
    id: 'domesticos',
    name: '🏠 Servicios Domésticos y Cuidado',
    emoji: '🏠',
    hourlyRange: { min: 3000, max: 4500 },
    dailyRange: { min: 24000, max: 36000 }
  },
  {
    id: 'transporte',
    name: '🚚 Transporte y Delivery',
    emoji: '🚚',
    hourlyRange: { min: 3200, max: 6000 },
    dailyRange: { min: 25600, max: 48000 }
  },
  {
    id: 'oficios',
    name: '🔧 Artesanos y Oficios',
    emoji: '🔧',
    hourlyRange: { min: 4000, max: 7500 },
    dailyRange: { min: 32000, max: 60000 }
  }
];

export const COMUNAS_SANTIAGO = [
  'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central',
  'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja',
  'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo',
  'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda',
  'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Quinta Normal',
  'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón',
  'Santiago Centro', 'Vitacura'
];

export const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const validateRUT = (rut: string): boolean => {
  // Basic RUT validation for Chilean format XX.XXX.XXX-X
  const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;
  return rutRegex.test(rut);
};