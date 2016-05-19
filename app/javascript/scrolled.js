var ticking = false;
var last_known_scroll_position = 0;

window.addEventListener('scroll', function(e) {
  last_known_scroll_position = window.scrollY;
  if (!ticking) {
    window.requestAnimationFrame(function() {
      var html = document.querySelector('html');
      if(last_known_scroll_position > 64) {
        html.classList.toggle('scrolled', true);
      }
      else {
        html.classList.toggle('scrolled', false);
      }
      ticking = false;
    });
  }
  ticking = true;
});