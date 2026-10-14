<script setup lang="ts">
const { data, refresh, pending } = await useFetch<TodayResponse>('/api/prompts/today')

const draft = ref('')
const submitting = ref(false)
const reviewing = ref(false)
const errorMessage = ref('')

const prompt = computed(() => data.value?.prompt ?? null)
const count = computed(() => countChars(draft.value))
const target = computed(() => prompt.value?.target_length ?? 400)

async function submit() {
  if (!prompt.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/submissions', {
      method: 'POST',
      body: { promptId: prompt.value.id, body: draft.value },
    })
    await refresh()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage ?? '投稿に失敗しました'
  } finally {
    submitting.value = false
  }
}

async function retryReview() {
  const id = data.value?.submission?.id
  if (!id) return
  reviewing.value = true
  try {
    await $fetch(`/api/submissions/${id}/review`, { method: 'POST' })
    await refresh()
  } finally {
    reviewing.value = false
  }
}
</script>

<template>
  <section v-if="pending" class="narrow"><p>読み込み中…</p></section>

  <section v-else-if="!prompt" class="narrow">
    <p>今日のお題はまだ用意されていません。</p>
  </section>

  <article v-else class="today">
    <figure class="artwork">
      <img :src="prompt.artworks.image_url" :alt="prompt.artworks.title" />
      <figcaption>
        <span class="title">{{ prompt.artworks.title }}</span>
        <span>{{ prompt.artworks.artist }}</span>
        <span>{{ prompt.artworks.date_display }}</span>
        <a v-if="prompt.artworks.source_url" :href="prompt.artworks.source_url" target="_blank" rel="noopener">
          所蔵：Art Institute of Chicago
        </a>
      </figcaption>
    </figure>

    <div class="desk">
      <p class="date">{{ prompt.date }}</p>
      <p class="constraint">{{ prompt.constraint_text }}</p>
      <p class="target">{{ prompt.target_length }}字</p>

      <!-- 未投稿: 書く -->
      <form v-if="!data?.submission" class="compose" @submit.prevent="submit">
        <textarea v-model="draft" rows="14" placeholder="ここに描写を書く" />
        <div class="compose-foot">
          <span class="count" :class="{ over: count > target * 1.1 }">{{ count }} / {{ target }}</span>
          <button type="submit" :disabled="submitting || count === 0">
            {{ submitting ? '講評を待っています…' : '投稿する' }}
          </button>
        </div>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </form>

      <!-- 投稿済み: 自分の文 → 講評 → 模範文 -->
      <template v-else>
        <section class="mine">
          <h2>あなたの描写 <small>{{ data.submission.char_count }}字</small></h2>
          <p class="prose">{{ data.submission.body }}</p>
        </section>

        <ReviewCard v-if="data.review" :review="data.review" />
        <p v-else class="narrow">
          講評がまだありません。
          <button :disabled="reviewing" @click="retryReview">
            {{ reviewing ? '講評中…' : '講評を実行する' }}
          </button>
        </p>

        <details v-if="data.reference" class="reference">
          <summary>AI の模範文を読む</summary>
          <p class="prose">{{ data.reference }}</p>
        </details>
      </template>
    </div>
  </article>
</template>
