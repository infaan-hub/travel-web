/** Resolve detail and booking routes from the currently public catalogue. */
export async function getPublicTourPaths(base) {
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/tours/`);
    if (!response.ok) return [];
    const payload = await response.json();
    const tours = Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];
    const id = tours[0]?.id;
    return id ? [`/tour/${id}/`, `/booking/${id}/`] : [];
  } catch {
    return [];
  }
}
