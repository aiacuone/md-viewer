<script lang="ts">
	let { children } = $props();

	const boot = `<script>(function(){
  var timer;
  function show(text){
    var el = document.getElementById('preview-toast');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(function(){ el.hidden = true; }, 2200);
  }
  var from = new URLSearchParams(location.search).get('from');
  if (from && from.charAt(0) === '/' && from.charAt(1) !== '/') {
    var backs = document.querySelectorAll('[data-history-back]');
    for (var i = 0; i < backs.length; i++) backs[i].setAttribute('href', from);
  }
  document.addEventListener('click', function(event){
    var node = event.target;
    var back = node && node.closest && node.closest('[data-history-back]');
    var from = new URLSearchParams(location.search).get('from');
    if (back && from && from.charAt(0) === '/' && from.charAt(1) !== '/') {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = from;
      return;
    }
    var target = node && node.closest && node.closest('[data-preview-disabled]');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    show('Disabled in the preview.');
  }, true);
  if (location.search.indexOf('denied=1') !== -1) {
    show('This Google account is not on the allow list.');
  }
})();<\/script>`;
</script>

<div id="preview-toast" class="toast card" hidden>Disabled in the preview.</div>
{@render children()}
{@html boot}

<style>
	.toast {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 80;
		box-shadow: var(--shadow);
	}
</style>
