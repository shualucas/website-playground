/** Curated playlist sources. Tracks can be refreshed here without Spotify credentials. */
export const playlists = [
  "6zzjHOepTk7IvWlg65FleT",
  "0hnvSTkZfhxoT5vcT4VziF",
  "2f6LpRq43zqqsMEIo6rv8Y",
  "4GfTi3o0uDRap9rFdCHHaL",
  "37Mzw88R6I7HoZ7HKHU7Hw",
].map((id) => ({ id, url: `https://open.spotify.com/playlist/${id}` }));

// Only add verified playlist members, with their corresponding album artwork:
// { title, artist, url, artwork, playlistId }
// Spotify's public pages are blocked in the current build environment.
export const playlistTracks = [];

/** A stable pick for the current page load; no playback or live-listening claim. */
export function pickMusic() {
  const tracks = playlistTracks.filter((track) => track.title && track.artist && track.url && track.artwork && playlists.some((playlist) => playlist.id === track.playlistId));
  const track = tracks[Math.floor(Math.random() * tracks.length)] ?? null;
  return { track, playlist: playlists.find((playlist) => playlist.id === track?.playlistId) ?? playlists[Math.floor(Math.random() * playlists.length)] };
}
