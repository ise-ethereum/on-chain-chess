var ticking = false;
var lastKnownScrollPosition = 0;

window.addEventListener('scroll', function(/* e */) {
  lastKnownScrollPosition = window.scrollY;
  if (!ticking) {
    window.requestAnimationFrame(function() {
      var html = document.querySelector('html');
      if(lastKnownScrollPosition > 64) {
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
