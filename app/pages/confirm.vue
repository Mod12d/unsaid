<script setup lang="ts">
const user = useSupabaseUser()
watch(user, (u) => { if (u) navigateTo('/') }, { immediate: true })
</script>

<template>
  <section class="narrow"><p>ログインしています…</p></section>
</template>
