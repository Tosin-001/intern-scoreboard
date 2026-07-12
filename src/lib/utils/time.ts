export function timeAgo(isoString: string | null): string {
  if (!isoString) return "just now";
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

/** Full date + time for display alongside the relative timeAgo() string. */
export function formatFullDateTime(isoString: string | null): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
