const getSongInfo = () => {
  const player = document.getElementById("movie_player");

  const { title, author } = player.getVideoData();
  return {
    song: title,
    artist: author,
  };
};

document.addEventListener("blyrics-get-song-info", function () {
  const data = getSongInfo();
  const event = new CustomEvent("blyrics-send-song-info", { detail: data });
  document.dispatchEvent(event);
});


(function() {
  setInterval(function() {
    try {
      const player = document.getElementById("movie_player");
      if (player) {
        const currentTime = player.getCurrentTime();
        const event = new CustomEvent("blyrics-send-player-time", { detail: { currentTime: currentTime } });
        document.dispatchEvent(event);}
    } catch (err) {
      console.error("Error getting time:", err);
    }
  }, 20);
})();