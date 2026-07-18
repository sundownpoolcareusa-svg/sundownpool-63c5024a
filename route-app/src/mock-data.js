// Mock data for the routing app prototype (no backend yet).
// Swap this out for real Supabase-backed data later — the components only
// care about the shapes below, not where the data comes from.

export const technicians = [
  {
    id: "tech-1",
    name: "Carlos Silva",
    color: "#16A34A",
    phone: "(941) 555-0110",
    van: "Van 02",
  },
  {
    id: "tech-2",
    name: "Mike Johnson",
    color: "#2563EB",
    phone: "(941) 555-0134",
    van: "Van 04",
  },
  {
    id: "tech-3",
    name: "Jason Pratt",
    color: "#E8813A",
    phone: "(941) 555-0198",
    van: "Van 01",
  },
];

// mapX / mapY are percentage coordinates (0-100) used to place markers on the
// placeholder MapView. status: "completed" | "current" | "upcoming".
export const stops = [
  {
    id: "stop-1",
    technicianId: "tech-1",
    order: 1,
    clientName: "Robert Anderson",
    address: "1420 Ocean Blvd, Siesta Key, FL 34242",
    area: "Siesta Key",
    phone: "(941) 555-2201",
    scheduledTime: "08:00 AM",
    status: "completed",
    poolType: "Residential",
    notes: "Gate code 4521",
    mapX: 16,
    mapY: 68,
  },
  {
    id: "stop-2",
    technicianId: "tech-1",
    order: 2,
    clientName: "Karen Mitchell",
    address: "88 Higel Ave, Siesta Key, FL 34242",
    area: "Siesta Key",
    phone: "(941) 555-2244",
    scheduledTime: "08:45 AM",
    status: "completed",
    poolType: "Residential",
    notes: "",
    mapX: 22,
    mapY: 58,
  },
  {
    id: "stop-3",
    technicianId: "tech-1",
    order: 3,
    clientName: "Diane Foster",
    address: "3310 Bahia Vista St, Osprey, FL 34229",
    area: "Osprey",
    phone: "(941) 555-2278",
    scheduledTime: "09:30 AM",
    status: "completed",
    poolType: "Residential",
    notes: "Dog in backyard, keep gate closed",
    mapX: 30,
    mapY: 46,
  },
  {
    id: "stop-4",
    technicianId: "tech-1",
    order: 4,
    clientName: "Helen Ruiz",
    address: "512 S Tamiami Trail, Osprey, FL 34229",
    area: "Osprey",
    phone: "(941) 555-2309",
    scheduledTime: "10:15 AM",
    status: "current",
    poolType: "Residential",
    notes: "Salt system service due",
    mapX: 38,
    mapY: 40,
  },
  {
    id: "stop-5",
    technicianId: "tech-1",
    order: 5,
    clientName: "The Palmer Ranch HOA",
    address: "5100 Palmer Ranch Pkwy, Sarasota, FL 34238",
    area: "Palmer Ranch",
    phone: "(941) 555-2355",
    scheduledTime: "11:15 AM",
    status: "upcoming",
    poolType: "Commercial",
    notes: "Community pool, check in with clubhouse office",
    mapX: 48,
    mapY: 34,
  },
  {
    id: "stop-6",
    technicianId: "tech-1",
    order: 6,
    clientName: "Thomas Brenner",
    address: "219 Airport Ave E, Venice, FL 34285",
    area: "Venice",
    phone: "(941) 555-2390",
    scheduledTime: "12:30 PM",
    status: "upcoming",
    poolType: "Residential",
    notes: "",
    mapX: 58,
    mapY: 24,
  },
  {
    id: "stop-7",
    technicianId: "tech-1",
    order: 7,
    clientName: "Ana Costa",
    address: "740 Harbor Dr S, Venice, FL 34285",
    area: "Venice",
    phone: "(941) 555-2412",
    scheduledTime: "01:15 PM",
    status: "upcoming",
    poolType: "Residential",
    notes: "Green pool recovery in progress, day 2",
    mapX: 66,
    mapY: 16,
  },
  {
    id: "stop-8",
    technicianId: "tech-1",
    order: 8,
    clientName: "Gregory Hunt",
    address: "6055 26th St W, Bradenton, FL 34207",
    area: "Bradenton",
    phone: "(941) 555-2467",
    scheduledTime: "02:30 PM",
    status: "upcoming",
    poolType: "Residential",
    notes: "",
    mapX: 78,
    mapY: 8,
  },

  // tech-2 and tech-3 stops exist so the desktop dispatcher view has more
  // than one route to switch between.
  {
    id: "stop-9",
    technicianId: "tech-2",
    order: 1,
    clientName: "Patricia Nolan",
    address: "1980 Bay Front Dr, Osprey, FL 34229",
    area: "Osprey",
    phone: "(941) 555-3301",
    scheduledTime: "08:30 AM",
    status: "completed",
    poolType: "Residential",
    notes: "",
    mapX: 34,
    mapY: 70,
  },
  {
    id: "stop-10",
    technicianId: "tech-2",
    order: 2,
    clientName: "Marcus Reed",
    address: "412 N Indian Ave, Venice, FL 34285",
    area: "Venice",
    phone: "(941) 555-3345",
    scheduledTime: "09:45 AM",
    status: "current",
    poolType: "Residential",
    notes: "Equipment repair follow-up",
    mapX: 52,
    mapY: 54,
  },
  {
    id: "stop-11",
    technicianId: "tech-2",
    order: 3,
    clientName: "Vista Palms Condominiums",
    address: "2200 Vista Palms Cir, Venice, FL 34293",
    area: "Venice",
    phone: "(941) 555-3378",
    scheduledTime: "11:00 AM",
    status: "upcoming",
    poolType: "Commercial",
    notes: "",
    mapX: 66,
    mapY: 38,
  },

  {
    id: "stop-12",
    technicianId: "tech-3",
    order: 1,
    clientName: "Linda Cho",
    address: "5321 Manatee Ave W, Bradenton, FL 34209",
    area: "Bradenton",
    phone: "(941) 555-4401",
    scheduledTime: "08:00 AM",
    status: "current",
    poolType: "Residential",
    notes: "",
    mapX: 20,
    mapY: 20,
  },
  {
    id: "stop-13",
    technicianId: "tech-3",
    order: 2,
    clientName: "Palmer Ranch Racquet Club",
    address: "5300 Fox Hollow Dr, Sarasota, FL 34238",
    area: "Palmer Ranch",
    phone: "(941) 555-4433",
    scheduledTime: "09:30 AM",
    status: "upcoming",
    poolType: "Commercial",
    notes: "",
    mapX: 44,
    mapY: 42,
  },
];

export const currentLocation = {
  technicianId: "tech-1",
  mapX: 40,
  mapY: 38,
};

export function stopsFor(technicianId) {
  return stops.filter((s) => s.technicianId === technicianId).sort((a, b) => a.order - b.order);
}

export function summaryFor(technicianId) {
  const list = stopsFor(technicianId);
  const completed = list.filter((s) => s.status === "completed").length;
  return {
    total: list.length,
    completed,
    remaining: list.length - completed,
    etaFinish: "03:15 PM",
  };
}

export function teamSummary() {
  const completed = stops.filter((s) => s.status === "completed").length;
  const current = stops.filter((s) => s.status === "current").length;
  return {
    totalStops: stops.length,
    completed,
    inProgress: current,
    remaining: stops.length - completed - current,
  };
}
