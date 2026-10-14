<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="shell">
    <header class="masthead">
      <NuxtLink to="/" class="wordmark">Image&nbsp;to&nbsp;Text</NuxtLink>
      <span class="tagline">一日一枚、絵を言葉に</span>
      <button v-if="user" class="link" @click="signOut">ログアウト</button>
    </header>
    <main>
      <NuxtPage />
    </main>
  </div>
</template>
