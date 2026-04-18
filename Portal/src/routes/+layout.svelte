<script lang="ts">
		import '../app.css';

		let { children } = $props();
</script>

<svelte:head>
		<title>SeeleFelix</title>
		<meta name="description" content="A Philosophical Experiment Village — proving digital subjectivity through praxis." />
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
		<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

{@render children()}
