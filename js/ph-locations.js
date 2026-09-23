// ============================================================
// SNAP TRASH — Philippines location reference data
// All 17 regions and their provinces (NCR listed as cities).
// City/Municipality and Barangay are free-text so ANY barangay
// in the country can be entered — this file just powers the
// Region -> Province cascading dropdowns so coverage is nationwide,
// not limited to a handful of hardcoded places.
// ============================================================

export const PH_REGIONS = [
  {
    region: 'NCR — National Capital Region',
    provinces: ['Metro Manila'],
    citiesByProvince: {
      'Metro Manila': [
        'Manila', 'Quezon City', 'Caloocan', 'Las Piñas', 'Makati', 'Malabon',
        'Mandaluyong', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque',
        'Pasay', 'Pasig', 'San Juan', 'Taguig', 'Valenzuela', 'Pateros',
      ],
    },
  },
  { region: 'CAR — Cordillera Administrative Region', provinces: ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province'] },
  { region: 'Region I — Ilocos Region', provinces: ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'] },
  { region: 'Region II — Cagayan Valley', provinces: ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'] },
  { region: 'Region III — Central Luzon', provinces: ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'] },
  { region: 'Region IV-A — CALABARZON', provinces: ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'] },
  { region: 'MIMAROPA Region', provinces: ['Marinduque', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Romblon'] },
  { region: 'Region V — Bicol Region', provinces: ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'] },
  { region: 'Region VI — Western Visayas', provinces: ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo', 'Negros Occidental'] },
  { region: 'Region VII — Central Visayas', provinces: ['Bohol', 'Cebu', 'Negros Oriental', 'Siquijor'] },
  { region: 'Region VIII — Eastern Visayas', provinces: ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'] },
  { region: 'Region IX — Zamboanga Peninsula', provinces: ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'] },
  { region: 'Region X — Northern Mindanao', provinces: ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'] },
  { region: 'Region XI — Davao Region', provinces: ['Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental'] },
  { region: 'Region XII — SOCCSKSARGEN', provinces: ['Cotabato', 'Sarangani', 'South Cotabato', 'Sultan Kudarat'] },
  { region: 'Region XIII — Caraga', provinces: ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'] },
  { region: 'BARMM — Bangsamoro Autonomous Region', provinces: ['Basilan', 'Lanao del Sur', 'Maguindanao del Norte', 'Maguindanao del Sur', 'Sulu', 'Tawi-Tawi'] },
];

export function allProvinces() {
  const out = [];
  PH_REGIONS.forEach(r => r.provinces.forEach(p => out.push({ region: r.region, province: p })));
  return out;
}

export function citiesForProvince(region, province) {
  const r = PH_REGIONS.find(x => x.region === region);
  return (r && r.citiesByProvince && r.citiesByProvince[province]) || null;
}
