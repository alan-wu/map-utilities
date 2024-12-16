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
        v-for="reference of references"
        :key="reference.id"
        :class="{'loading': reference.citation && reference.citation[citationType] === ''}"
      >
        <template v-if="reference.citation && reference.citation[citationType]">
          <span v-html="reference.citation[citationType]"></span>
          <CopyToClipboard :content="reference.citation[citationType]" />
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
      references: [],
      citationOptions: CITATION_OPTIONS,
      citationType: CITATION_DEFAULT,
    }
  },
  watch: {
    resources: function (_resources) {
      this.references = this.formatURLs([..._resources]);
    }
  },
  mounted: function () {
    this.references = this.formatURLs([...this.resources]);
    this.getCitationText(CITATION_DEFAULT);
  },
  methods: {
    formatURLs: function (references) {
      const nonPubMedURLs = this.extractNonPubMedURLs(references);
      const pubMedURLs = references.filter((reference) => !nonPubMedURLs.includes(reference));
      const formattedURLs = pubMedURLs.map((reference) =>
        (typeof reference === 'object') ?
        this.extractPublicationIdFromURLString(reference[0]) :
        this.extractPublicationIdFromURLString(reference)
      );
      return formattedURLs;
    },
    extractNonPubMedURLs: function (references) {
      const extractedURLs = [];
      const names = this.getPubMedDomains();

      references.forEach((reference) => {
        let count = 0;
        names.forEach((name) => {
          if (reference.includes(name)) {
            count++;
          }
        });
        if (!count) {
          extractedURLs.push(reference);
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
      this.references.forEach((reference) => {
        const { id, type, doi } = reference;

        if (
          !(reference.citation && reference.citation[citationType])
          && id
        ) {
          reference.citation[citationType] = ''; // loading

          if (type === 'doi' || doi) {
            const doiID = type === 'doi' ? id : doi;

            this.getCitationTextByDOI(doiID)
              .then((text) => {
                reference.citation[citationType] = this.replaceLinkInText(text);
              });
          } else if (type === 'pmid') {
            this.getDOIFromPubMedID(id)
              .then((data) => {
                if (data?.result) {
                  const resultObj = data.result[id];
                  const articleIDs = resultObj?.articleids || [];
                  const doiObj = articleIDs.find((item) => item.idtype === 'doi');
                  const doiID = doiObj?.value;
                  reference['doi'] = doiID;

                  this.getCitationTextByDOI(doiID)
                    .then((text) => {
                      reference.citation[citationType] = this.replaceLinkInText(text);
                    });
                }
              });
          }
        }
      });
    },
    replaceLinkInText: function (text) {
      const protocol = 'https://';
      let linkBody = text.split(protocol)[1];

      if (linkBody) {
        linkBody = linkBody.split(' ')[0];
        linkBody = linkBody.trim();

        if (linkBody.endsWith('.')) {
          linkBody = linkBody.substring(0, linkBody.length - 1);
        }

        const fullLink = protocol + linkBody;
        const htmlLink = `<a href="${fullLink}" target="_blank">${fullLink}</a>`;

        return text.replace(fullLink, htmlLink);
      }

      return text;
    },
    getCitationTextByDOI: async function (id) {
      const citationAPI = `${CROSSCITE_API_HOST}/format?doi=${id}&style=${this.citationType}&lang=en-US`;
      try {
        const response = await fetch(citationAPI);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        const data = await response.text();
        return data;
      } catch (error) {
        console.error(`Fetch citation text error: ${error}`);
      }
    },
    getDOIFromPubMedID: async function (pubmedId) {
      const summaryAPI = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pubmedId}&format=json`;
      try {
        const response = await fetch(summaryAPI);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`Fetch article summary error: ${error}`);
      }
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
    padding: 0.5rem 1.5rem 0.5rem 0.75rem;
    border-radius: var(--el-border-radius-base);
    background-color: var(--el-bg-color-page);
    position: relative;

    + li {
      margin-top: 0.5rem;
    }

    &.loading {
      padding: 1rem;

      &::before {
        content: "";
        display: block;
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        animation-duration: 3s;
        animation-fill-mode: forwards;
        animation-iteration-count: infinite;
        animation-name: loadingAnimation;
        animation-timing-function: linear;
        background: linear-gradient(to right,
          var(--el-bg-color-page) 5%,
          var(--el-color-info-light-8) 15%,
          var(--el-bg-color-page) 30%
        );
      }
    }

    :deep(.copy-clipboard-button) {
      position: absolute;
      bottom: 0.25rem;
      right: 0.25rem;
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
    &:hover,
    &:focus,
    &:active {
      color: $app-primary-color;
    }
  }

  .el-button + .el-button {
    margin-left: 0.25rem;
  }
}

@keyframes loadingAnimation {
  0% {
    background-position: -30vw 0;
  }
  100% {
    background-position: 70vw 0;
  }
}
</style>
