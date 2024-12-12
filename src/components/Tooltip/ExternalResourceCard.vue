<template>
  <div class="resource-container" v-if="resources.length">
    <div class="attribute-title-container">
      <div class="attribute-title">Publications</div>
    </div>
    <div class="resource" v-for="resource in transformedResources" :key="resource.dataId">
      <el-button
        link
        class="button"
        id="open-pubmed-button"
        :icon="getIconByType(resource.id)"
        @click="openUrl(resource.url)"
      >
        {{ resource.title || resource.url }}
      </el-button>
    </div>

  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { shallowRef } from "vue";
import {
  Notebook as ElIconNotebook,
  Reading,
  Memo,
} from "@element-plus/icons-vue";

import EventBus from "../EventBus.js";
import { xmlToJSON } from "../utilities.js";

export default {
  name: "ExternalResourceCard",
  props: {
    resources: {
      type: Array,
      default: () => [],
    },
  },
  data: function () {
    return {
      pubmeds: [],
      pubmedIds: [],
      transformedResources: [],
      ElIconNotebook: shallowRef(ElIconNotebook),
    };
  },
  mounted: function () {
    this.transformResources(this.resources);
  },
  watch: {
    resources: async function (_resources) {
      this.transformResources(_resources);
    }
  },
  methods: {
    transformResources: async function (_resources) {
      this.transformedResources = [];

      if (_resources.length) {
        for (const resource of _resources) {
          try {
            if (resource.id === 'pubmed') {
              const { title, abstract } = await this.fetchArticle(resource.dataId);

              this.transformedResources.push({
                ...resource,
                title,
                abstract,
              });
            } else {
              let title = '';
              const url = resource.url;
              const splitURLs = url.split('/');
              const index = splitURLs.indexOf('books') + 1;
              const id = splitURLs[index];

              if (resource.id === 'openlib') {
                const data = await this.fetchBook(id);
                title = data.title;
              } else {
                title = url;
              }

              this.transformedResources.push({
                ...resource,
                title,
              });
            }
          } catch (error) {
            console.error(`Error fetching data for id ${resource.dataId}:`, error);
          }
        }
      }
    },
    capitalise: function (string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    },
    openUrl: function (url) {
      EventBus.emit("open-pubmed-url", url);
      window.open(url, "_blank");
    },
    getIconByType: function (type) {
      if (type === 'pubmed') {
        return Reading;
      } else if (type === 'openlib') {
        return ElIconNotebook;
      }
      return Memo;
    },
    fetchBook: async function (id) {
      const bookAPI = `https://openlibrary.org/books/${id}.json`;
      const response = await fetch(bookAPI);
      const data = await response.json();
      return data;
    },
    fetchArticle: async function (id) {
      try {
        const eutilsFetchAPI = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${id}`;
        const response = await this.fetchText(eutilsFetchAPI);
        const responseJSON = xmlToJSON(response);
        const article = responseJSON?.PubmedArticleSet?.PubmedArticle?.MedlineCitation?.Article;
        const title = article?.ArticleTitle || '';
        const abstract = article?.AbstractText || '';
        return {title, abstract};
      } catch (error) {
        console.warn('Fetch article error.', error)
        return {title: '', abstract: ''};
      }
    },
    fetchText: async function (url, maxRetries = 3) {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(url);
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            const text = await response.text();
            return text;
          }
        } catch (error) {
          if (i === maxRetries - 1) return error;
          // CORS retry
          const waitTime = 1000 * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.resource-container {
  margin-top: 1em;
}

.attribute-title-container {
  margin-bottom: 0.5rem;
}

.attribute-title {
  font-size: 16px;
  font-weight: 600;
  /* font-weight: bold; */
  text-transform: uppercase;
}

.attribute-content {
  font-size: 14px;
  font-weight: 400;
}

.el-link {
  color: $app-primary-color;
  text-decoration: none;
  word-wrap: break-word;
  &:hover,
  &:focus {
    color: $app-primary-color;
  }
}

:deep(.el-carousel__button) {
  background-color: $app-primary-color;
}

.attribute-title {
  font-size: 16px;
  font-weight: 600;
  /* font-weight: bold; */
  text-transform: uppercase;
}

.resource-container .button.is-link {
  margin-left: 0px !important;
  margin-top: 0px !important;
  padding: 0;
  font-family: inherit;
  font-size: 14px !important;
  color: $app-primary-color;
  max-width: 100%;

  :deep(span) {
    display: inline;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  &:hover {
    color: $app-primary-color;
  }

  & + .button {
    margin-top: 10px !important;
    color: $app-primary-color;
  }
}
</style>
