/* Shared basemap for every Travel map, including generated country pages. */
window.TravelTiles = Object.freeze({
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  bounds: [[-85.05112878, -180], [85.05112878, 180]],
  options() {
    return {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      noWrap: true,
      bounds: this.bounds,
      className: 'travel-base-tiles'
    };
  }
});
