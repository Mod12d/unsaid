<script setup lang="ts">
const props = defineProps<{ review: Review }>()

const rows = computed(() =>
  REVIEW_AXES.map((a) => ({
    ...a,
    score: props.review[`score_${a.key}` as const],
    comment: props.review.comments[a.key],
  })),
)
const total = computed(() => rows.value.reduce((s, r) => s + r.score, 0))
</script>

<template>
  <section class="review">
    <header class="review-head">
      <h2>講評</h2>
      <p class="total">{{ total }}<small> / 20</small></p>
    </header>
    <p class="constraint-flag" :class="{ ng: !review.constraint_kept }">
      制約：{{ review.constraint_kept ? '守れている' : '守れていない' }}
    </p>
    <dl class="axes">
      <div v-for="r in rows" :key="r.key" class="axis">
        <dt>
          {{ r.label }}
          <span class="dots" :aria-label="`${r.score} / 5`">
            <i v-for="n in 5" :key="n" :class="{ on: n <= r.score }" />
          </span>
        </dt>
        <dd>{{ r.comment }}</dd>
      </div>
    </dl>
    <p class="overall">{{ review.overall }}</p>
  </section>
</template>
