import type { Event } from "@workspace/api-client-react";

/** Use this `href` for every event row/card so lists stay consistent with routing. */
export function eventDetailHref(id: number): string {
  return `/events/${id}`;
}

/** Query string for Google Maps search from event location fields. */
export function getEventMapsQuery(event: Pick<Event, "venue" | "city" | "country" | "location">): string {
  const storedAddress = (event.city ?? "").trim();
  return (
    [event.venue, storedAddress.replace(/\n/g, ", "), event.country].filter(Boolean).join(", ") ||
    event.location ||
    ""
  );
}

export function getEventMapsUrl(event: Pick<Event, "venue" | "city" | "country" | "location">): string {
  const q = getEventMapsQuery(event);
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`;
}

/** Lines to show as the postal / area address (city holds multiline address in this app). */
export function getEventAddressLines(event: Pick<Event, "city" | "location">): string[] {
  const storedAddress = (event.city ?? "").trim();
  if (storedAddress) {
    return storedAddress.split("\n").map((l) => l.trim()).filter(Boolean);
  }
  return [event.location].filter(Boolean);
}
