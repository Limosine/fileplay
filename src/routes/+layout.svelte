<script lang="ts">
  
  import TopAppBar from '../lib/components/TopAppBar.svelte';
  import Drawer from '../lib/components/Drawer.svelte';
  import Input from '../lib/components/Input.svelte'

</script>

<TopAppBar/>

<Drawer>
  <slot />
</Drawer>

<Input />