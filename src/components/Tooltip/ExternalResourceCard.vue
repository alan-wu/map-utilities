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

      <li v-for="reference of openLibReferences">
        <div v-html="formatCopyReference(reference)"></div>
        <CopyToClipboard :content="formatCopyReference(reference)" />
      </li>

      <li v-for="reference of isbnDBReferences">
        <a :href="reference.url" target="_blank">{{ reference.url }}</a>
        <CopyToClipboard :content="reference.url" />
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
      pubMedReferences: [],
      openLibReferences: [],
      isbnDBReferences: [],
      citationOptions: CITATION_OPTIONS,
      citationType: CITATION_DEFAULT,
    }
  },
  watch: {
    resources: function (_resources) {
      this.formatReferences([..._resources]);
    }
  },
  mounted: function () {
    this.formatReferences([...this.resources]);
    this.getCitationText(CITATION_DEFAULT);
  },
  methods: {
    formatReferences: function (references) {
      const nonPubMedReferences = this.extractNonPubMedReferences(references);
      const pubMedReferences = references.filter((reference) => !nonPubMedReferences.includes(reference));

      this.pubMedReferences = pubMedReferences.map((reference) =>
        (typeof reference === 'object') ?
        this.extractPublicationIdFromURLString(reference[0]) :
        this.extractPublicationIdFromURLString(reference)
      );

      this.formatNonPubMedReferences(nonPubMedReferences).then((responses) => {
        this.openLibReferences = responses.filter((response) => response.type === 'openlib');
        this.isbnDBReferences = responses.filter((response) => response.type === 'isbndb');

        this.formatOpenLibReferences();
      });

      this.references = [
        ...this.pubMedReferences,
      ];
    },
    extractNonPubMedReferences: function (references) {
      const extractedReferences = [];
      const pubmedDomains = this.getPubMedDomains();

      references.forEach((reference) => {
        let count = 0;
        pubmedDomains.forEach((name) => {
          if (reference.includes(name)) {
            count++;
          }
        });
        if (!count) {
          extractedReferences.push(reference);
        }
      });

      return extractedReferences;
    },
    formatNonPubMedReferences: async function (references) {
      const transformedReferences = [];
      const filteredReferences = references.filter((referenceURL) => referenceURL.indexOf('isbn') !== -1);
      const isbnIDs = filteredReferences.map((url) => {
        const isbnId = url.split('/').pop();
        return 'ISBN:' + isbnId;
      });
      const isbnIDsKey = isbnIDs.join(',');
      const failedIDs = isbnIDs.slice();

      const openlibAPI = `https://openlibrary.org/api/books?bibkeys=${isbnIDsKey}&format=json`;
      const response = await fetch(openlibAPI);
      const data = await response.json();

      for (const key in data) {
        const successKeyIndex = failedIDs.indexOf(key);
        failedIDs.splice(successKeyIndex, 1);

        const url = data[key].info_url;
        const urlSegments = url.split('/');
        const endpointIndex = urlSegments.indexOf('books');
        const bookId = urlSegments[endpointIndex + 1];

        transformedReferences.push({
          id: key.split(':')[1], // Key => "ISBN:1234"
          type: 'openlib',
          url: url,
          bookId: bookId,
        });
      }

      failedIDs.forEach((failedID) => {
        const id = failedID.split(':')[1];
        // Data does not exist in OpenLibrary
        // Provide ISBNDB link for reference
        const url = `https://isbndb.com/book/${id}`;
        transformedReferences.push({
          id: id,
          url: url,
          type: 'isbndb'
        });
      });

      return transformedReferences;
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
    stripPMIDPrefix: function (pubmedId) {
      return pubmedId.split(':')[1]
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
    formatOpenLibReferences: function () {
      this.openLibReferences.forEach((reference) => {
        const { bookId } = reference;
        this.getBookData(bookId)
          .then((data) => {
            const { title, authors, publish_date } = data;
            if (title) {
              reference['title'] = title;
            }

            if (publish_date) {
              reference['date'] = publish_date;
            }

            if (authors) {
              reference['authors'] = [];

              authors.forEach((author) => {
                this.getBookAuthor(author.key)
                  .then((data) => {
                    const { name } = data;
                    if (name) {
                      reference['authors'].push(name);
                    }
                  });
              });
            }
          });
      });
    },
    getBookData: async function (bookId) {
      const apiURL = `https://openlibrary.org/books/${bookId}.json`;
      try {
        const response = await fetch(apiURL);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`Fetch book data error: ${error}`);
      }
    },
    getBookAuthor: async function (key) {
      const apiURL = `https://openlibrary.org${key}.json`;
      try {
        const response = await fetch(apiURL);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`Fetch book author error: ${error}`);
      }
    },
    formatCopyReference: function (reference) {
      const copyContents = [];
      const { title, date, authors, url } = reference;

      if (title) {
        copyContents.push(title);
      }

      if (date) {
        copyContents.push(`(${date})`);
      }

      if (authors) {
        copyContents.push(`- ${authors.join(', ')}`);
      }

      copyContents.push(`<div><a href="${url}" target="_blank">${url}</a></div>`);

      return copyContents.join(' ');
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

    :deep(a) {
      word-wrap: break-word;
    }

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
