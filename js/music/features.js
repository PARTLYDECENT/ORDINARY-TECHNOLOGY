/**
 * features.js
 * Playlist Management, Controls, and UI Sync
 */

const tracks = [
    { src: 'assets/music/1.mp3',  title: 'Signal 01' },
    { src: 'assets/music/2.mp3',  title: 'Signal 02' },
    { src: 'assets/music/3.mp3',  title: 'Signal 03' },
    { src: 'assets/music/4.mp3',  title: 'Signal 04' },
    { src: 'assets/music/5.mp3',  title: 'Signal 05' },
    { src: 'assets/music/6.mp3',  title: 'Signal 06' },
    { src: 'assets/music/7.mp3',  title: 'Signal 07' },
    { src: 'assets/music/8.mp3',  title: 'Signal 08' },
    { src: 'assets/music/9.mp3',  title: 'Signal 09' },
    { src: 'assets/music/10.mp3', title: 'Signal 10' }
];

let currentTrackIndex = 0;

function formatTime(s) {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
}

function loadTrack(index, musicPlayer, trackTitleEl, currentTrackNumEl, updatePlaylistActiveState) {
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentTrackIndex];
    musicPlayer.src = track.src;
    trackTitleEl.textContent = track.title;
    currentTrackNumEl.textContent = (currentTrackIndex + 1).toString().padStart(2, '0');
    if(updatePlaylistActiveState) updatePlaylistActiveState(currentTrackIndex);
    return currentTrackIndex;
}

export { tracks, currentTrackIndex, formatTime, loadTrack };
