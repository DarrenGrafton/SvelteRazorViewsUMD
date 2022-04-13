<script>
	export let name;
	export let id;

	import Logo from './components/SvelteLogo.svelte'
	import Clock from './components/Clock.svelte'
</script>

<main class="d-flex">
	<Logo />
	<div>
		<h1 id="{id}">Hello {name}!</h1>
		<p>how are you doing?</p>
	</div>
	<Clock />
</main>

<style>
    h1 {
        font-size: 5em;
		color: green;
		margin-bottom: 0;
    }
</style>
