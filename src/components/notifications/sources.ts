import { departureSource } from "@/components/notifications/departure-source";
import type { NotificationSource } from "@/components/notifications/types";

/** Types de notification de la cloche. V1 : « Départ ». Ajouter un type = ajouter une entrée ici. */
export const NOTIFICATION_SOURCES: NotificationSource[] = [departureSource];
