<script setup lang="ts">
// パイロットでも本物の認証（メールのマジックリンク）にしておく。多人数化のとき作り直さないため。
const supabase = useSupabaseClient()
const email = ref('')
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const errorMessage = ref('')

async function send() {
  state.value = 'sending'
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: { emailRedirectTo: `${window.location.origin}/confirm` },
  })
  if (error) {
    state.value = 'error'
    errorMessage.value = error.message
  } else {
    state.value = 'sent'
  }
}
</script>

<template>
  <section class="narrow">
    <h1>ログイン</h1>
    <p v-if="state === 'sent'">{{ email }} にログイン用のリンクを送りました。メールを開いてください。</p>
    <form v-else @submit.prevent="send">
      <label for="email">メールアドレス</label>
      <input id="email" v-model="email" type="email" required autocomplete="email" />
      <button type="submit" :disabled="state === 'sending'">リンクを送る</button>
      <p v-if="state === 'error'" class="error">{{ errorMessage }}</p>
    </form>
  </section>
</template>
