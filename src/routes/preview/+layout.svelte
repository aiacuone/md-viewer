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
  document.addEventListener('click', function(event){
    var node = event.target;
    var target = node && node.closest && node.closest('[data-preview-disabled]');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    show('Disabled in the preview.');
  });
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
