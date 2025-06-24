/**
 * Competency Queries
 *
 * competencyQuery: base function
 * query[functionName]: specific queries
 *
 * Note: use named-export for better tree-shaking.
 */

async function postRequest(API_URL, payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
}

/**
 * Competency Query
 *
 * @param {Object} options - Query options.
 * @param {string} options.flatmapAPI - Base URL of the flatmap server.
 * @param {string} options.knowledgeSource - SCKAN source ID.
 * @param {string} options.queryId - Competency query ID.
 * @param {Array} options.parameters - Parameters specific to the query.
 * @param {string} [options.orderId] - Optional order ID for sorting.
 * @returns {Promise<any>} - JSON response.
 */
async function competencyQuery(options) {
  const { flatmapAPI, knowledgeSource, queryId, parameters, orderId } = options;
  const API_URL = `${flatmapAPI}competency/query`;

  const params = Array.isArray(parameters) ? [...parameters] : [];

  params.push({
    "column": "source_id",
    "value": knowledgeSource,
  });

  let queryIdStr;
  if (typeof queryId === 'number') {
    queryIdStr = queryId.toString();
  } else if (typeof queryId === 'string') {
    queryIdStr = queryId;
  } else {
    throw new TypeError('queryId must be a string or a number convertible to string.');
  }

  const payload = {
    "query_id": queryIdStr,
    "parameters": params,
  };

  // Currently only query 12 has an order parameter
  if (orderId) {
    payload.order = [orderId];
  }

  return postRequest(API_URL, payload);
}

// Neuron populations associated with a location
async function queryAllConnectedPaths(flatmapAPI, knowledgeSource, featureId) {
  const data = await competencyQuery({
    flatmapAPI: flatmapAPI,
    knowledgeSource: knowledgeSource,
    queryId: 1,
    parameters: [
      {
        column: 'feature_id',
        value: featureId
      },
    ]
  });
  if (data?.results?.values) {
    const paths = data.results.values.map((value) => {
      // value => [ 'source_id', 'path_id', 'axon_terminal']
      return value[1];
    });
    // remove duplicates
    return [...new Set(paths)];
  }
  return [];
}

// Neuron populations terminating at a location
async function queryPathsByDestinations(flatmapAPI, knowledgeSource, featureId) {
  const data = await competencyQuery({
    flatmapAPI: flatmapAPI,
    knowledgeSource: knowledgeSource,
    queryId: 2,
    parameters: [
      {
        column: 'feature_id',
        value: featureId
      },
    ]
  });
  if (data?.results?.values) {
    const paths = data.results.values.map((value) => {
      // value => [ 'source_id', 'path_id', 'axon_terminal']
      return value[1];
    });
    // remove duplicates
    return [...new Set(paths)];
  }
  return [];
}

export {
  competencyQuery,
  queryAllConnectedPaths,
  queryPathsByDestinations,
};
