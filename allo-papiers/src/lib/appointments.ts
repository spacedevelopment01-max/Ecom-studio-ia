export const APPOINTMENT_TARGETS = {
  france_services: "Conseiller France Services",
  organisme: "Organisme concerné",
  avocat: "Avocat",
  notaire: "Notaire",
  service_paie: "Service paie / ressources humaines",
} as const;
export type AppointmentTarget = keyof typeof APPOINTMENT_TARGETS;
