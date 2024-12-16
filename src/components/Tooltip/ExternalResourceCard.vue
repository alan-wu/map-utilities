<template>
  <div class="resource-container">
    <div class="attribute-title-container">
      <div class="attribute-title">References</div>
    </div>
    <div class="citation-tabs">
      <el-button
        link
        v-for="citationOption of citationOptions"
        :key="citationOption.value"
        :type="citationType === citationOption.value ? 'primary' : ''"
        @click="onCitationFormatChange(citationOption.value)"
      >
        {{ citationOption.label }}
      </el-button>
    </div>
    <ul class="citation-list">
      <li
        v-for="url of urls"
        :key="url.id"
        :class="{'loading': url.citation && url.citation[citationType] === ''}"
      >
        <template v-if="url.citation && url.citation[citationType]">
          <span>
            {{ url.citation[citationType] }}
          </span>
          <CopyToClipboard :content="url.citation[citationType]" />
        </template>
      </li>
    </ul>
  </div>
</template>

<script>
import CopyToClipboard from '../CopyToClipboard/CopyToClipboard.vue';

const CROSSCITE_API_HOST = 'https://citation.crosscite.org';
const CITATION_OPTIONS = [
  {
    label: 'APA',
    value: 'apa',
  },
  {
    label: 'Chicago',
    value: 'chicago-note-bibliography',
  },
  {
    label: 'IEEE',
    value: 'ieee',
  },
  {
    label: 'Bibtex',
    value: 'bibtex',
  },
];
const CITATION_DEFAULT = 'apa';

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
      urls: [],
      citationOptions: CITATION_OPTIONS,
      citationType: CITATION_DEFAULT,
    }
  },
  watch: {
    resources: function (_resources) {
      this.urls = this.getURLsForPubMed(_resources);
      this.urls = this.formatURLs([..._resources]);
    }
  },
  mounted: function () {
    this.urls = this.formatURLs([...this.resources]);
    this.getCitationText(CITATION_DEFAULT);
  },
  methods: {
    formatURLs: function (urls) {
      const nonPubMedURLs = this.extractNonPubMedURLs(urls);
      const pubMedURLs = urls.filter(url => !nonPubMedURLs.includes(url));
      const formattedURLs = pubMedURLs.map((url) =>
        (typeof url === 'object') ?
        this.extractPublicationIdFromURLString(url[0]) :
        this.extractPublicationIdFromURLString(url)
      );
      return formattedURLs;
    },
    extractNonPubMedURLs: function (urls) {
      const extractedURLs = [];
      const names = this.getPubMedDomains();

      urls.forEach((url) => {
        let count = 0;
        names.forEach((name) => {
          if (url.includes(name)) {
            count++;
          }
        });
        if (!count) {
          extractedURLs.push(url);
        }
      });

      return extractedURLs;
    },
    getURLsForPubMed: function (data) {
      return new Promise((resolve) => {
        const ids = data.map((id) =>
          (typeof id === 'object') ?
          this.extractPublicationIdFromURLString(id[0]) :
          this.extractPublicationIdFromURLString(id)
        )
        this.convertPublicationIds(ids).then((pmids) => {
          if (pmids.length > 0) {
            const transformedIDs = [];
            pmids.forEach(pmid => {
              transformedIDs.push({
                id: pmid,
                link: this.pubmedSearchUrl(pmid),
              })
            })
            resolve(transformedIDs)
          } else {
            resolve([])
          }
        })
      })
    },
    extractPublicationIdFromURLString: function (urlStr) {
      if (!urlStr) return

      const str = decodeURIComponent(urlStr)

      let term = {id: '', type: '', citation: {}}

      const names = this.getPubMedDomains()

      names.forEach((name) => {
        const lastIndex = str.lastIndexOf(name)
        if (lastIndex !== -1) {
          term.id = str.slice(lastIndex + name.length)
          if (name === 'doi.org/') {
            term.type = "doi"
          } else if (name === 'pmc/articles/') {
            term.type = "pmc"
          } else {
            term.type = "pmid"
          }
        }
      })

      //Backward compatability with doi: and PMID:
      if (term.id === '') {
        if (urlStr.includes("doi:")) {
          term.id = this.stripPMIDPrefix(urlStr)
          term.type = "doi"
        } else if (urlStr.includes("PMID:")) {
          term.id = this.stripPMIDPrefix(urlStr)
          term.type = "pmid"
        }
      }

      if (term.id.endsWith('/')) {
        term.id = term.id.slice(0, -1)
      }

      return term
    },
    getPubMedDomains: function () {
      const names = [
        'doi.org/',
        'nih.gov/pubmed/',
        'pmc/articles/',
        'pubmed.ncbi.nlm.nih.gov/',
      ]

      return names;
    },
    convertPublicationIds: function (ids) {
      return new Promise((resolve) => {
        const pmids = []
        const toBeConverted = []
        ids.forEach((id) => {
          if (id.type === "pmid") {
            pmids.push(id.id)
          } else if (id.type === "doi" || id.type === "pmc") {
            toBeConverted.push(id.id)
          }
        })
        this.getPMID(toBeConverted).then((idList) => {
          pmids.push(...idList)
          resolve(pmids)
        })
        .catch(() => {
          resolve(pmids)
        })
      })
    },
    pubmedSearchUrl: function (ids) {
      let url = 'https://pubmed.ncbi.nlm.nih.gov/?'
      let params = new URLSearchParams()
      params.append('term', ids)
      return url + params.toString()
    },
    stripPMIDPrefix: function (pubmedId) {
      return pubmedId.split(':')[1]
    },
    getPMID: function(idsList) {
      return new Promise((resolve) => {
        if (idsList.length > 0) {
          //Muliple term search does not work well,
          //DOIs term get splitted unexpectedly
          //
          const promises = []
          const results = []
          let wrapped = ''
          idsList.forEach((id, i) => {
            wrapped += i > 0 ? 'OR"' + id + '"' : '"' + id + '"'
          })

          const params = new URLSearchParams({
            db: 'pubmed',
            term: wrapped,
            format: 'json'
          })
          const promise = fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params}`, {
            method: 'GET',
          })
          .then((response) => response.json())
          .then((data) => {
            const newIds = data.esearchresult ? data.esearchresult.idlist : []
            results.push(...newIds)
          })
          promises.push(promise)

          Promise.all(promises).then(() => {
            resolve(results)
          }).catch(() => {
            resolve(results)
          })
        } else {
          resolve([])
        }
      })
    },
    onCitationFormatChange: function(citationType) {
      this.citationType = citationType;
      this.getCitationText(citationType);
    },
    getCitationText: function(citationType) {
      this.urls.forEach((url) => {
        const {id, type} = url;
        if (
          !(url.citation && url.citation[citationType])
          && type === 'doi'
          && id
        ) {
          url.citation[citationType] = ''; // loading
          const citationAPI = `${CROSSCITE_API_HOST}/format?doi=${id}&style=${citationType}&lang=en-US`;
          fetch(citationAPI)
            .then((response) => {
              if (response.status !== 200) {
                throw Error
              }
              return response.text();
            }).then((text) => {
              url.citation[citationType] = text;
            }).catch((err) => {
              console.error('Error', err)
            });
        }
      });
    },
  },
}
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

.citation-list {
  margin: 0;
  margin-top: 0.5rem;
  padding: 0;
  list-style: none;
  line-height: 1.3;

  li {
    margin: 0;
    padding: 0.25rem 0.5rem;
    border-radius: var(--el-border-radius-base);
    background-color: var(--el-bg-color-page);
    position: relative;

    + li {
      margin-top: 0.5rem;
    }

    &.loading {
      padding: 1rem;
    }

    :deep(.copy-clipboard-button) {
      position: absolute;
      bottom: 0.25rem;
      right: 0.5rem;
      opacity: 0;
      visibility: hidden;
    }

    &:hover {
      :deep(.copy-clipboard-button) {
        opacity: 1;
        visibility: visible;
      }
    }
  }
}

.citation-tabs {
  .el-button {
    &:hover {
      color: var(--el-button-text-color);
    }
  }

  .el-button + .el-button {
    margin-left: 0.25rem;
  }
}
</style>
